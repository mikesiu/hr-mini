"""
Parse EmplDetl-style payroll Excel (Employee Detail reports).
"""

from __future__ import annotations

import io
import re
from datetime import date, datetime
from typing import Any, Dict, List, Optional, Tuple

from openpyxl import load_workbook

from models.base import SessionLocal
from models.employee import Employee
from models.employment import Employment
from sqlalchemy import select
from repos.vacation_payroll_repo import upsert_payroll_period


PERIOD_TITLE_RE = re.compile(
    r"Employee\s+Detail\s+(\d{4}-\d{2}-\d{2})\s+to\s+(\d{4}-\d{2}-\d{2})",
    re.IGNORECASE,
)


def _normalize_name(name: str) -> str:
    return re.sub(r"\s+", " ", (name or "").strip().upper())


def _parse_date(value: Any) -> Optional[date]:
    if value is None:
        return None
    if isinstance(value, datetime):
        return value.date()
    if isinstance(value, date):
        return value
    if isinstance(value, str):
        text = value.strip()
        for fmt in ("%Y-%m-%d", "%m/%d/%Y", "%d/%m/%Y"):
            try:
                return datetime.strptime(text, fmt).date()
            except ValueError:
                continue
    return None


def _as_float(value: Any) -> float:
    if value is None or value == "":
        return 0.0
    try:
        return float(value)
    except (TypeError, ValueError):
        return 0.0


def build_employee_name_index(company_id: Optional[str] = None) -> Dict[str, List[Employee]]:
    """Map normalized names -> employees (optionally restricted to company employment)."""
    with SessionLocal() as session:
        employees = list(session.execute(select(Employee)).scalars().all())
        if company_id:
            emp_ids = set(
                session.execute(
                    select(Employment.employee_id).where(Employment.company_id == company_id)
                ).scalars().all()
            )
            employees = [e for e in employees if e.id in emp_ids]

        index: Dict[str, List[Employee]] = {}
        for e in employees:
            keys = set()
            if e.full_name:
                keys.add(_normalize_name(e.full_name))
            if e.first_name and e.last_name:
                keys.add(_normalize_name(f"{e.first_name} {e.last_name}"))
                keys.add(_normalize_name(f"{e.last_name} {e.first_name}"))
            for k in keys:
                index.setdefault(k, []).append(e)
        return index


def match_employee_by_name(
    name: str,
    index: Dict[str, List[Employee]],
) -> Tuple[Optional[Employee], str]:
    """Return (employee, status) where status is matched|ambiguous|unmatched."""
    key = _normalize_name(name)
    candidates = index.get(key, [])
    if len(candidates) == 1:
        return candidates[0], "matched"
    if len(candidates) > 1:
        return None, "ambiguous"
    # Soft: strip middle initials / extra spaces already handled; try contains unique
    soft = []
    for k, emps in index.items():
        if key == k or key in k or k in key:
            soft.extend(emps)
    # unique by id
    by_id = {e.id: e for e in soft}
    if len(by_id) == 1:
        return next(iter(by_id.values())), "matched"
    if len(by_id) > 1:
        return None, "ambiguous"
    return None, "unmatched"


def parse_empldetl_workbook(file_bytes: bytes) -> Dict[str, Any]:
    """
    Parse EmplDetl Excel into structured rows.

    Supports both:
    - All-staff single-pay export (e.g. EmplDetl_QWP.xlsx): many employees, one cheque each
    - Single-staff multi-pay export (e.g. EmplDetl_Harjit.xlsx): one employee, many cheques

    Returns dict with company_header, period_start, period_end, report_kind, rows, column_map.
    """
    wb = load_workbook(io.BytesIO(file_bytes), data_only=True)
    ws = wb.active

    company_header = None
    title_start = None
    title_end = None
    col_map: Dict[str, int] = {}
    rows: List[Dict[str, Any]] = []

    current_name: Optional[str] = None

    for row_idx, row in enumerate(ws.iter_rows(values_only=True), start=1):
        cells = list(row)
        a = cells[0] if cells else None
        b = cells[1] if len(cells) > 1 else None

        # Header company name (first non-empty A without Date label)
        if row_idx == 1 and isinstance(a, str) and a.strip():
            company_header = a.strip()
            continue

        if isinstance(a, str) and PERIOD_TITLE_RE.search(a):
            m = PERIOD_TITLE_RE.search(a)
            title_start = datetime.strptime(m.group(1), "%Y-%m-%d").date()
            title_end = datetime.strptime(m.group(2), "%Y-%m-%d").date()
            continue

        # Column header row
        if isinstance(b, str) and b.strip().lower() == "date":
            for idx, val in enumerate(cells):
                if not isinstance(val, str):
                    continue
                label = val.strip().lower()
                if label == "date":
                    col_map["date"] = idx
                elif "cheque" in label:
                    col_map["cheque_no"] = idx
                elif label == "gross":
                    col_map["gross"] = idx
                elif label == "benefits":
                    col_map["benefits"] = idx
                elif "vacation paid" in label:
                    col_map["vacation_paid"] = idx
                elif label == "vacation earned" or (
                    "vacation earned" in label and "adj" not in label
                ):
                    col_map["vacation_earned"] = idx
            continue

        # Name row: A has name, B empty/None, not Total / Generated On
        if (
            isinstance(a, str)
            and a.strip()
            and a.strip().lower() != "total"
            and not a.strip().lower().startswith("generated on")
            and b is None
            and "date" not in a.lower()
            and "employee detail" not in a.lower()
        ):
            if re.search(r"[A-Za-z]", a):
                current_name = a.strip()
            continue

        if isinstance(a, str) and a.strip().lower() == "total":
            current_name = None
            continue

        # Detail row
        if current_name and "date" in col_map:
            pay_date = _parse_date(cells[col_map["date"]] if col_map["date"] < len(cells) else None)
            if not pay_date:
                continue
            cheque = ""
            if "cheque_no" in col_map and col_map["cheque_no"] < len(cells):
                raw = cells[col_map["cheque_no"]]
                cheque = str(raw).strip() if raw is not None else ""
            gross = _as_float(cells[col_map["gross"]] if "gross" in col_map and col_map["gross"] < len(cells) else 0)
            benefits = _as_float(
                cells[col_map["benefits"]]
                if "benefits" in col_map and col_map["benefits"] < len(cells)
                else 0
            )
            vac_paid = _as_float(
                cells[col_map["vacation_paid"]]
                if "vacation_paid" in col_map and col_map["vacation_paid"] < len(cells)
                else 0
            )
            vac_earned = _as_float(
                cells[col_map["vacation_earned"]]
                if "vacation_earned" in col_map and col_map["vacation_earned"] < len(cells)
                else 0
            )
            # Only stamp title range onto rows when it is a single-pay export (start == end).
            # YTD / multi-pay exports use pay_date alone; report resolves the pay period.
            single_pay_title = title_start is not None and title_start == title_end
            rows.append(
                {
                    "employee_name": current_name,
                    "pay_date": pay_date.isoformat(),
                    "cheque_no": cheque,
                    "gross": gross,
                    "benefits": benefits,
                    "vacation_paid": vac_paid,
                    "vacation_earned": vac_earned,
                    "period_start": title_start.isoformat() if single_pay_title else None,
                    "period_end": title_end.isoformat() if single_pay_title else None,
                    "excel_row": row_idx,
                }
            )

    unique_names = {r["employee_name"] for r in rows}
    if len(unique_names) <= 1 and len(rows) > 1:
        report_kind = "single_employee_multi_pay"
    elif title_start is not None and title_start == title_end:
        report_kind = "all_staff_single_pay"
    else:
        report_kind = "mixed_or_unknown"

    return {
        "company_header": company_header,
        "period_start": title_start.isoformat() if title_start else None,
        "period_end": title_end.isoformat() if title_end else None,
        "report_kind": report_kind,
        "column_map": col_map,
        "rows": rows,
    }


def preview_payroll_import(file_bytes: bytes, company_id: str) -> Dict[str, Any]:
    parsed = parse_empldetl_workbook(file_bytes)
    index = build_employee_name_index(company_id)

    preview_rows = []
    matched = unmatched = ambiguous = 0
    for r in parsed["rows"]:
        emp, status = match_employee_by_name(r["employee_name"], index)
        if status == "matched":
            matched += 1
        elif status == "ambiguous":
            ambiguous += 1
        else:
            unmatched += 1
        preview_rows.append(
            {
                **r,
                "match_status": status,
                "employee_id": emp.id if emp else None,
                "matched_name": emp.full_name if emp else None,
            }
        )

    return {
        **parsed,
        "rows": preview_rows,
        "summary": {
            "total": len(preview_rows),
            "matched": matched,
            "unmatched": unmatched,
            "ambiguous": ambiguous,
        },
        "can_import": unmatched == 0 and ambiguous == 0 and len(preview_rows) > 0,
    }


def commit_payroll_import(
    file_bytes: bytes,
    company_id: str,
    source_filename: Optional[str] = None,
) -> Dict[str, Any]:
    preview = preview_payroll_import(file_bytes, company_id)
    if not preview["can_import"]:
        raise ValueError(
            "Cannot import: resolve unmatched/ambiguous employee names first "
            f"(unmatched={preview['summary']['unmatched']}, ambiguous={preview['summary']['ambiguous']})"
        )

    imported = 0
    for r in preview["rows"]:
        upsert_payroll_period(
            company_id=company_id,
            employee_id=r["employee_id"],
            pay_date=date.fromisoformat(r["pay_date"]),
            cheque_no=r.get("cheque_no") or "",
            gross=r["gross"],
            benefits=r.get("benefits") or 0,
            vacation_paid=r["vacation_paid"],
            vacation_earned=r["vacation_earned"],
            period_start=date.fromisoformat(r["period_start"]) if r.get("period_start") else None,
            period_end=date.fromisoformat(r["period_end"]) if r.get("period_end") else None,
            source_filename=source_filename,
        )
        imported += 1

    return {"imported": imported, "summary": preview["summary"]}
