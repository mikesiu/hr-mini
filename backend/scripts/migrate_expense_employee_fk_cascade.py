"""
Alter expense_entitlements and expense_claims so employee_id FK uses ON DELETE CASCADE.

Run once against MySQL after updating SQLAlchemy models. Safe to re-run if constraints
already match (will fail harmlessly on duplicate constraint names — adjust names if needed).

SQLite: new installs get CASCADE from create_all; existing SQLite DBs need manual rebuild
or migration tools — this script skips SQLite.
"""
from __future__ import annotations

import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from sqlalchemy import text  # noqa: E402

from config.settings import USE_MYSQL  # noqa: E402
from models.base import engine  # noqa: E402


def _mysql_fk_name(conn, table: str, column: str) -> str | None:
    row = conn.execute(
        text(
            """
            SELECT CONSTRAINT_NAME
            FROM information_schema.KEY_COLUMN_USAGE
            WHERE TABLE_SCHEMA = DATABASE()
              AND TABLE_NAME = :t
              AND COLUMN_NAME = :c
              AND REFERENCED_TABLE_NAME = 'employees'
            """
        ),
        {"t": table, "c": column},
    ).fetchone()
    return row[0] if row else None


def main() -> None:
    if not USE_MYSQL:
        print("USE_MYSQL is false — skipping (SQLite/new installs: rely on model metadata or manual migration).")
        return

    tables = [
        ("expense_entitlements", "employee_id"),
        ("expense_claims", "employee_id"),
    ]

    with engine.connect() as conn:
        for table, col in tables:
            fk = _mysql_fk_name(conn, table, col)
            if not fk:
                print(f"No FK from {table}.{col} to employees — skip or check table name.")
                continue
            print(f"Dropping FK {fk} on {table}...")
            conn.execute(text(f"ALTER TABLE `{table}` DROP FOREIGN KEY `{fk}`"))
            conn.commit()
            new_fk = f"fk_{table}_{col}_employees"
            print(f"Adding CASCADE FK {new_fk} on {table}...")
            conn.execute(
                text(
                    f"""
                    ALTER TABLE `{table}`
                    ADD CONSTRAINT `{new_fk}`
                    FOREIGN KEY (`{col}`) REFERENCES `employees` (`id`)
                    ON DELETE CASCADE
                    """
                )
            )
            conn.commit()
            print(f"Done: {table}")

    print("Migration finished.")


if __name__ == "__main__":
    main()
