"""
One-time migration (safe to re-run):

1. Create the code_values table and seed Employee Type, Wage Classification,
   Department and Position values (existing values are taken from employment records).
2. Add employment.employee_type.
3. Add salary_history.wage_classification, copy each employee's employment
   wage classification onto their current salary record, export every old value
   to backups/wage_classification_export_<timestamp>.csv, list the ones that
   could not be copied (no current salary record), then drop
   employment.wage_classification.
"""
from __future__ import annotations

import csv
import sys
from datetime import datetime
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from sqlalchemy import inspect, text  # noqa: E402

from config.settings import USE_MYSQL  # noqa: E402
from models.base import engine  # noqa: E402
from models.code_value import CodeValue  # noqa: E402

DEFAULT_EMPLOYEE_TYPES = ["Full-time", "Part-time", "Casual"]
EXPORT_DIR = Path(__file__).resolve().parent.parent.parent / "backups"


def _columns(table: str) -> set[str]:
    return {c["name"] for c in inspect(engine).get_columns(table)}


def _seed(conn, category: str, values: list[str]) -> int:
    existing = {
        r[0].lower()
        for r in conn.execute(
            text("SELECT code FROM code_values WHERE category = :c"), {"c": category}
        )
    }
    added = 0
    for order, value in enumerate(values, start=1):
        value = (value or "").strip()
        if not value or value.lower() in existing:
            continue
        conn.execute(
            text(
                "INSERT INTO code_values (category, code, sort_order, is_active) "
                "VALUES (:c, :v, :o, 1)"
            ),
            {"c": category, "v": value, "o": order * 10},
        )
        existing.add(value.lower())
        added += 1
    return added


def _distinct(conn, column: str) -> list[str]:
    rows = conn.execute(
        text(
            f"SELECT DISTINCT TRIM({column}) FROM employment "
            f"WHERE {column} IS NOT NULL AND TRIM({column}) <> '' ORDER BY 1"
        )
    )
    return [r[0] for r in rows]


def main() -> None:
    if not USE_MYSQL:
        print("Note: USE_MYSQL is false; running against SQLite.")

    CodeValue.__table__.create(bind=engine, checkfirst=True)
    print("code_values table ready.")

    employment_cols = _columns("employment")
    salary_cols = _columns("salary_history")

    with engine.begin() as conn:
        if "employee_type" not in employment_cols:
            conn.execute(text("ALTER TABLE employment ADD COLUMN employee_type VARCHAR(50) NULL"))
            print("Added employment.employee_type")
        if "wage_classification" not in salary_cols:
            conn.execute(text("ALTER TABLE salary_history ADD COLUMN wage_classification VARCHAR(100) NULL"))
            print("Added salary_history.wage_classification")

        print("Seeded employee_type:", _seed(conn, "employee_type", DEFAULT_EMPLOYEE_TYPES))
        print("Seeded department:", _seed(conn, "department", _distinct(conn, "department")))
        print("Seeded position:", _seed(conn, "position", _distinct(conn, "position")))

        if "wage_classification" not in employment_cols:
            print("employment.wage_classification already removed; nothing to move.")
            return

        print(
            "Seeded wage_classification:",
            _seed(conn, "wage_classification", _distinct(conn, "wage_classification")),
        )

        rows = conn.execute(
            text(
                """
                SELECT e.id, e.employee_id, emp.first_name, emp.last_name,
                       e.company_id, TRIM(e.wage_classification) AS wc,
                       (SELECT s.id FROM salary_history s
                         WHERE s.employee_id = e.employee_id AND s.end_date IS NULL
                         ORDER BY s.effective_date DESC LIMIT 1) AS salary_id
                FROM employment e
                LEFT JOIN employees emp ON emp.id = e.employee_id
                WHERE e.wage_classification IS NOT NULL AND TRIM(e.wage_classification) <> ''
                ORDER BY e.employee_id, e.start_date
                """
            )
        ).fetchall()

        EXPORT_DIR.mkdir(parents=True, exist_ok=True)
        export_path = EXPORT_DIR / f"wage_classification_export_{datetime.now():%Y%m%d_%H%M%S}.csv"
        not_copied = []
        with export_path.open("w", newline="", encoding="utf-8") as fh:
            writer = csv.writer(fh)
            writer.writerow(
                ["employment_id", "employee_id", "first_name", "last_name", "company_id",
                 "wage_classification", "copied_to_salary_id"]
            )
            for r in rows:
                copied_to = None
                if r.salary_id:
                    conn.execute(
                        text(
                            "UPDATE salary_history SET wage_classification = :wc "
                            "WHERE id = :sid AND (wage_classification IS NULL OR wage_classification = '')"
                        ),
                        {"wc": r.wc, "sid": r.salary_id},
                    )
                    copied_to = r.salary_id
                else:
                    not_copied.append(r)
                writer.writerow(
                    [r.id, r.employee_id, r.first_name, r.last_name, r.company_id, r.wc, copied_to or ""]
                )

        print(f"Copied to current salary record: {len(rows) - len(not_copied)}")
        print(f"Exported all {len(rows)} values to: {export_path}")
        if not_copied:
            print(f"\nNOT copied (no current salary record) - re-enter these in Salary Management ({len(not_copied)}):")
            for r in not_copied:
                name = f"{r.first_name or ''} {r.last_name or ''}".strip()
                print(f"  {r.employee_id:<8} {name:<30} {r.wc}")

        conn.execute(text("ALTER TABLE employment DROP COLUMN wage_classification"))
        print("\nDropped employment.wage_classification")

    print("Migration finished.")


if __name__ == "__main__":
    main()
