"""Parse and import company holidays from an Excel workbook."""
from __future__ import annotations

import io
from dataclasses import dataclass
from datetime import date, datetime
from typing import Any, Optional

import pandas as pd

from repos.company_repo import get_all_companies
from repos.holiday_repo import create_holiday

_COLUMN_ALIASES = {
    "date": "date",
    "holiday_date": "date",
    "holiday date": "date",
    "name": "name",
    "holiday": "name",
    "holiday_name": "name",
    "holiday name": "name",
    "company": "company",
    "company_id": "company",
    "company id": "company",
    "active": "active",
    "is_active": "active",
    "status": "active",
    "union_only": "union_only",
    "union only": "union_only",
    "union members only": "union_only",
}


@dataclass
class ParsedHoliday:
    row: int
    company_id: str
    holiday_date: date
    name: str
    is_active: bool
    union_only: bool


@dataclass
class HolidayImportIssue:
    row: int
    message: str


@dataclass
class HolidayImportResult:
    created: int
    skipped: int
    failed: int
    errors: list[HolidayImportIssue]

    @property
    def message(self) -> str:
        return (
            f"Created {self.created} holiday(s). "
            f"{self.skipped} skipped. "
            f"{self.failed} failed."
        )


def _blank(value: Any) -> bool:
    if value is None:
        return True
    try:
        if pd.isna(value):
            return True
    except TypeError:
        pass
    return str(value).strip() == "" or str(value).strip().lower() == "nan"


def _header_key(label: Any) -> Optional[str]:
    spaced = " ".join(str(label or "").strip().lower().replace("_", " ").replace("-", " ").split())
    underscored = spaced.replace(" ", "_")
    return _COLUMN_ALIASES.get(underscored) or _COLUMN_ALIASES.get(spaced)


def _parse_date(value: Any) -> Optional[date]:
    if _blank(value):
        return None
    if isinstance(value, datetime):
        return value.date()
    if isinstance(value, date):
        return value
    if hasattr(value, "to_pydatetime"):
        try:
            return value.to_pydatetime().date()
        except Exception:
            pass
    text = str(value).strip().split(" ")[0]
    for fmt in ("%Y-%m-%d", "%Y/%m/%d", "%m/%d/%Y", "%d/%m/%Y", "%m-%d-%Y", "%d-%m-%Y"):
        try:
            return datetime.strptime(text, fmt).date()
        except ValueError:
            continue
    parsed = pd.to_datetime(text, errors="coerce")
    if pd.isna(parsed):
        return None
    return parsed.date()


def _parse_bool(value: Any, default: bool) -> bool:
    if _blank(value):
        return default
    text = str(value).strip().lower()
    if text in {"1", "y", "yes", "true", "t", "active"}:
        return True
    if text in {"0", "n", "no", "false", "f", "inactive"}:
        return False
    raise ValueError(f"Unrecognized yes/no value '{value}'")


def _company_index(companies) -> dict[str, str]:
    index: dict[str, str] = {}
    for company in companies:
        company_id = str(company.id).strip()
        for label in (company_id, getattr(company, "legal_name", None), getattr(company, "trade_name", None)):
            if label and str(label).strip():
                index[str(label).strip().lower()] = company_id
    return index


def parse_holiday_sheet(df: pd.DataFrame, companies, default_company_id: Optional[str]) -> tuple[list[ParsedHoliday], list[HolidayImportIssue], list[HolidayImportIssue]]:
    """Return holidays to create, skipped issues, and failed issues."""
    if df is None or df.empty:
        raise ValueError("Excel file has no data rows")

    columns: dict[str, str] = {}
    for column in df.columns:
        key = _header_key(column)
        if key and key not in columns:
            columns[key] = column

    if "date" not in columns or "name" not in columns:
        raise ValueError("The sheet needs Date and Name columns")

    company_index = _company_index(companies)
    default_id = None
    if default_company_id and str(default_company_id).strip():
        default_id = company_index.get(str(default_company_id).strip().lower())
        if not default_id:
            raise ValueError(f"Company '{default_company_id}' was not found")

    to_create: list[ParsedHoliday] = []
    skipped: list[HolidayImportIssue] = []
    failed: list[HolidayImportIssue] = []
    seen: dict[tuple[str, date], int] = {}

    for index, row in df.iterrows():
        row_number = int(index) + 2
        raw_date = row.get(columns["date"])
        raw_name = row.get(columns["name"])
        raw_company = row.get(columns["company"]) if "company" in columns else None
        if _blank(raw_date) and _blank(raw_name) and _blank(raw_company):
            continue

        try:
            holiday_date = _parse_date(raw_date)
            if holiday_date is None:
                raise ValueError("Date is required (use a date cell or YYYY-MM-DD)")
            name = "" if _blank(raw_name) else str(raw_name).strip()
            if not name:
                raise ValueError("Name is required")

            if not _blank(raw_company):
                company_id = company_index.get(str(raw_company).strip().lower())
                if not company_id:
                    raise ValueError(f"Company '{raw_company}' was not found")
            elif default_id:
                company_id = default_id
            else:
                raise ValueError("Company is required when no company is selected for the upload")

            is_active = _parse_bool(row.get(columns["active"]) if "active" in columns else None, True)
            union_only = _parse_bool(row.get(columns["union_only"]) if "union_only" in columns else None, False)
        except ValueError as exc:
            failed.append(HolidayImportIssue(row=row_number, message=str(exc)))
            continue

        key = (company_id, holiday_date)
        if key in seen:
            skipped.append(HolidayImportIssue(
                row=row_number,
                message=f"Same company and date as row {seen[key]}",
            ))
            continue
        seen[key] = row_number
        to_create.append(ParsedHoliday(
            row=row_number,
            company_id=company_id,
            holiday_date=holiday_date,
            name=name,
            is_active=is_active,
            union_only=union_only,
        ))

    if not to_create and not skipped and not failed:
        raise ValueError("Excel file has no holiday rows")
    return to_create, skipped, failed


def build_holiday_template() -> bytes:
    """Workbook with the columns the importer expects, plus a short instruction sheet."""
    sample = pd.DataFrame([
        {"Date": "2026-01-01", "Name": "New Year's Day", "Company": "", "Active": "Yes", "Union Only": "No"},
        {"Date": "2026-12-25", "Name": "Christmas Day", "Company": "", "Active": "Yes", "Union Only": "No"},
    ])
    instructions = pd.DataFrame([
        ["Column", "Required", "Notes"],
        ["Date", "Yes", "Excel date or YYYY-MM-DD"],
        ["Name", "Yes", "Holiday name"],
        ["Company", "No", "Company id or name. Leave blank to use the company selected when uploading."],
        ["Active", "No", "Yes or No. Blank means Yes."],
        ["Union Only", "No", "Yes or No. Blank means No."],
        ["", "", "A date that already exists for that company is skipped."],
    ])
    output = io.BytesIO()
    with pd.ExcelWriter(output, engine="openpyxl") as writer:
        sample.to_excel(writer, sheet_name="Holidays", index=False)
        instructions.to_excel(writer, sheet_name="Instructions", index=False, header=False)
    return output.getvalue()


def read_holiday_workbook(contents: bytes) -> pd.DataFrame:
    try:
        return pd.read_excel(io.BytesIO(contents))
    except Exception as exc:
        raise ValueError("Could not read the Excel file. Use .xlsx or .xls.") from exc


def import_holiday_workbook(
    contents: bytes,
    default_company_id: Optional[str],
    *,
    performed_by: str | None = None,
) -> HolidayImportResult:
    companies = get_all_companies()
    df = read_holiday_workbook(contents)
    to_create, skipped, failed = parse_holiday_sheet(df, companies, default_company_id)

    created = 0
    for holiday in to_create:
        try:
            create_holiday(
                company_id=holiday.company_id,
                holiday_date=holiday.holiday_date,
                name=holiday.name,
                is_active=holiday.is_active,
                union_only=holiday.union_only,
                performed_by=performed_by,
            )
            created += 1
        except ValueError as exc:
            skipped.append(HolidayImportIssue(row=holiday.row, message=str(exc)))
        except Exception as exc:
            failed.append(HolidayImportIssue(row=holiday.row, message=str(exc)))

    errors = sorted(skipped + failed, key=lambda item: item.row)
    return HolidayImportResult(
        created=created,
        skipped=len(skipped),
        failed=len(failed),
        errors=errors,
    )
