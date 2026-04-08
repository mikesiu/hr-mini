"""
Read-only check: report ON DELETE behavior for expense_entitlements / expense_claims -> employees.

MySQL: information_schema.REFERENTIAL_CONSTRAINTS.DELETE_RULE
SQLite: PRAGMA foreign_key_list(<table>) on_delete column

Run from backend directory: python scripts/verify_expense_employee_fk.py
"""
from __future__ import annotations

import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from sqlalchemy import text  # noqa: E402

from config.settings import USE_MYSQL, DB_PATH  # noqa: E402
from models.base import engine  # noqa: E402

TABLES = ("expense_entitlements", "expense_claims")


def main() -> None:
    if USE_MYSQL:
        with engine.connect() as conn:
            for table in TABLES:
                rows = conn.execute(
                    text(
                        """
                        SELECT CONSTRAINT_NAME, DELETE_RULE
                        FROM information_schema.REFERENTIAL_CONSTRAINTS
                        WHERE CONSTRAINT_SCHEMA = DATABASE()
                          AND TABLE_NAME = :t
                        """
                    ),
                    {"t": table},
                ).fetchall()
                print(f"\n=== {table} (MySQL) ===")
                if not rows:
                    print("  (no referential constraints found for this table)")
                    continue
                for name, rule in rows:
                    print(f"  {name}: ON DELETE {rule}")
                expected = any(str(r[1]).upper() == "CASCADE" for r in rows)
                if expected:
                    print("  OK: at least one FK uses CASCADE")
                else:
                    print("  NOTE: no CASCADE — run scripts/migrate_expense_employee_fk_cascade.py if needed")
    else:
        print(f"SQLite database: {DB_PATH}")
        with engine.connect() as conn:
            for table in TABLES:
                print(f"\n=== {table} (SQLite) ===")
                try:
                    rows = conn.execute(text(f"PRAGMA foreign_key_list({table})")).fetchall()
                except Exception as e:
                    print(f"  Error: {e}")
                    continue
                if not rows:
                    print("  (no foreign keys or table missing)")
                    continue
                # SQLite pragma columns: id, seq, table, from, to, on_update, on_delete, match
                for row in rows:
                    ref_table = row[2]
                    if ref_table != "employees":
                        continue
                    on_delete = row[6] if len(row) > 6 else "?"
                    print(f"  FK -> {ref_table}: ON DELETE {on_delete}")
                    if str(on_delete).upper() != "CASCADE":
                        print("  NOTE: not CASCADE — recreate table or migrate for CASCADE deletes")


if __name__ == "__main__":
    main()
