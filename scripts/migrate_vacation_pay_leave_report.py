#!/usr/bin/env python3
"""
Migration: vacation pay leave report support.

Adds:
- companies.vacation_pay_with_payroll
- employees.vacation_percent, employees.vacation_percent_override
- vacation_percent_tiers
- vacation_dollar_openings
- payroll_employee_periods
"""

import sys
from pathlib import Path

backend_dir = Path(__file__).parent.parent / "backend"
sys.path.insert(0, str(backend_dir))

from sqlalchemy import text, inspect
from models.base import engine


def _existing_columns(table_name: str) -> set[str]:
    inspector = inspect(engine)
    if table_name not in inspector.get_table_names():
        return set()
    return {c["name"] for c in inspector.get_columns(table_name)}


def _add_column_if_missing(table: str, column: str, ddl_type: str, default_sql: str | None = None):
    cols = _existing_columns(table)
    if column in cols:
        print(f"[SKIP] {table}.{column} already exists")
        return
    default_clause = f" DEFAULT {default_sql}" if default_sql is not None else ""
    sql = f"ALTER TABLE {table} ADD COLUMN {column} {ddl_type}{default_clause}"
    print(f"[ADD] {sql}")
    with engine.connect() as conn:
        conn.execute(text(sql))
        conn.commit()


def _mysql_id_collation(table: str, column: str) -> tuple[str, str]:
    """Return (charset, collation) for a string PK/FK column."""
    with engine.connect() as conn:
        row = conn.execute(
            text(f"SHOW FULL COLUMNS FROM {table} WHERE Field=:f"),
            {"f": column},
        ).fetchone()
    if not row:
        return "utf8mb4", "utf8mb4_unicode_ci"
    # Row keys vary; typically Field, Type, Collation, ...
    mapping = row._mapping if hasattr(row, "_mapping") else None
    collation = None
    if mapping is not None:
        collation = mapping.get("Collation") or mapping.get("collation")
    else:
        # positional: Field, Type, Null, Key, Default, Extra, Privileges, Comment, Collation often index 2 or -1
        for val in row:
            if isinstance(val, str) and "utf8" in val and "_" in val:
                collation = val
                break
    if not collation:
        return "utf8mb4", "utf8mb4_unicode_ci"
    charset = collation.split("_")[0]
    if charset.startswith("utf8mb4"):
        charset = "utf8mb4"
    elif charset.startswith("utf8"):
        charset = "utf8"
    return charset, collation


def _create_tables_mysql():
    company_cs, company_col = _mysql_id_collation("companies", "id")
    emp_cs, emp_col = _mysql_id_collation("employees", "id")
    print(f"companies.id collation: {company_cs}/{company_col}")
    print(f"employees.id collation: {emp_cs}/{emp_col}")

    ddl_statements = [
        f"""
        CREATE TABLE IF NOT EXISTS vacation_percent_tiers (
            id INT NOT NULL AUTO_INCREMENT,
            company_id VARCHAR(50) CHARACTER SET {company_cs} COLLATE {company_col} NOT NULL,
            union_member TINYINT(1) NOT NULL DEFAULT 0,
            min_years DECIMAL(6,2) NOT NULL,
            max_years DECIMAL(6,2) NULL,
            percent DECIMAL(6,3) NOT NULL,
            PRIMARY KEY (id),
            UNIQUE KEY uq_vac_tier_company_union_min_years (company_id, union_member, min_years),
            KEY ix_vac_tier_company (company_id),
            CONSTRAINT vacation_percent_tiers_ibfk_1
                FOREIGN KEY (company_id) REFERENCES companies (id) ON DELETE CASCADE
        ) ENGINE=InnoDB DEFAULT CHARSET={company_cs} COLLATE={company_col}
        """,
        f"""
        CREATE TABLE IF NOT EXISTS vacation_dollar_openings (
            id INT NOT NULL AUTO_INCREMENT,
            employee_id VARCHAR(50) CHARACTER SET {emp_cs} COLLATE {emp_col} NOT NULL,
            company_id VARCHAR(50) CHARACTER SET {company_cs} COLLATE {company_col} NOT NULL,
            year INT NOT NULL,
            opening_amount DECIMAL(12,2) NOT NULL DEFAULT 0,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME NULL ON UPDATE CURRENT_TIMESTAMP,
            PRIMARY KEY (id),
            UNIQUE KEY uq_vac_opening_emp_co_year (employee_id, company_id, year),
            KEY ix_vac_opening_emp (employee_id),
            KEY ix_vac_opening_co (company_id),
            CONSTRAINT vacation_dollar_openings_ibfk_1
                FOREIGN KEY (employee_id) REFERENCES employees (id) ON DELETE CASCADE,
            CONSTRAINT vacation_dollar_openings_ibfk_2
                FOREIGN KEY (company_id) REFERENCES companies (id) ON DELETE CASCADE
        ) ENGINE=InnoDB DEFAULT CHARSET={company_cs} COLLATE={company_col}
        """,
        f"""
        CREATE TABLE IF NOT EXISTS payroll_employee_periods (
            id INT NOT NULL AUTO_INCREMENT,
            company_id VARCHAR(50) CHARACTER SET {company_cs} COLLATE {company_col} NOT NULL,
            employee_id VARCHAR(50) CHARACTER SET {emp_cs} COLLATE {emp_col} NOT NULL,
            pay_date DATE NOT NULL,
            period_start DATE NULL,
            period_end DATE NULL,
            cheque_no VARCHAR(50) NOT NULL DEFAULT '',
            gross DECIMAL(12,2) NOT NULL DEFAULT 0,
            benefits DECIMAL(12,2) NOT NULL DEFAULT 0,
            vacation_paid DECIMAL(12,2) NOT NULL DEFAULT 0,
            vacation_earned DECIMAL(12,2) NOT NULL DEFAULT 0,
            source_filename VARCHAR(255) NULL,
            notes TEXT NULL,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME NULL ON UPDATE CURRENT_TIMESTAMP,
            PRIMARY KEY (id),
            UNIQUE KEY uq_payroll_emp_co_date_cheque (employee_id, company_id, pay_date, cheque_no),
            KEY ix_payroll_co (company_id),
            KEY ix_payroll_emp (employee_id),
            KEY ix_payroll_pay_date (pay_date),
            CONSTRAINT payroll_employee_periods_ibfk_1
                FOREIGN KEY (company_id) REFERENCES companies (id) ON DELETE CASCADE,
            CONSTRAINT payroll_employee_periods_ibfk_2
                FOREIGN KEY (employee_id) REFERENCES employees (id) ON DELETE CASCADE
        ) ENGINE=InnoDB DEFAULT CHARSET={company_cs} COLLATE={company_col}
        """,
    ]

    with engine.connect() as conn:
        for ddl in ddl_statements:
            conn.execute(text(ddl))
        conn.commit()


def _create_tables_sqlite():
    from models.vacation_percent_tier import VacationPercentTier
    from models.vacation_dollar_opening import VacationDollarOpening
    from models.payroll_employee_period import PayrollEmployeePeriod
    from models.company import Company  # noqa: F401
    from models.employee import Employee  # noqa: F401

    VacationPercentTier.__table__.create(bind=engine, checkfirst=True)
    VacationDollarOpening.__table__.create(bind=engine, checkfirst=True)
    PayrollEmployeePeriod.__table__.create(bind=engine, checkfirst=True)


def migrate():
    print("Migrating vacation pay leave report schema...")

    dialect = engine.dialect.name
    bool_type = "BOOLEAN"
    numeric_type = "DECIMAL(6,3)" if dialect != "sqlite" else "NUMERIC"

    _add_column_if_missing(
        "companies",
        "vacation_pay_with_payroll",
        bool_type,
        default_sql="1" if dialect == "sqlite" else "TRUE",
    )
    _add_column_if_missing("employees", "vacation_percent", numeric_type)
    _add_column_if_missing(
        "employees",
        "vacation_percent_override",
        bool_type,
        default_sql="0" if dialect == "sqlite" else "FALSE",
    )

    if dialect == "mysql":
        _create_tables_mysql()
        _migrate_vacation_tiers_union_scope_mysql()
    else:
        _create_tables_sqlite()
        _migrate_vacation_tiers_union_scope_sqlite()

    money_type = "DECIMAL(12,2)" if dialect != "sqlite" else "NUMERIC"
    _add_column_if_missing(
        "payroll_employee_periods",
        "benefits",
        money_type,
        default_sql="0",
    )

    print("[OK] Tables ensured: vacation_percent_tiers, vacation_dollar_openings, payroll_employee_periods")

    inspector = inspect(engine)
    for table in ("vacation_percent_tiers", "vacation_dollar_openings", "payroll_employee_periods"):
        if table in inspector.get_table_names():
            print(f"[OK] Verified table {table}")
        else:
            raise RuntimeError(f"Missing table {table}")

    print("Migration completed successfully.")


def _migrate_vacation_tiers_union_scope_mysql():
    """Add union_member to tiers; duplicate existing rows for union schedule."""
    inspector = inspect(engine)
    if "vacation_percent_tiers" not in inspector.get_table_names():
        return

    cols = {c["name"] for c in inspector.get_columns("vacation_percent_tiers")}
    with engine.connect() as conn:
        if "union_member" not in cols:
            print("Adding vacation_percent_tiers.union_member...")
            conn.execute(
                text(
                    "ALTER TABLE vacation_percent_tiers "
                    "ADD COLUMN union_member TINYINT(1) NOT NULL DEFAULT 0"
                )
            )
            conn.commit()

        # Drop legacy unique if present
        indexes = inspector.get_indexes("vacation_percent_tiers")
        # Re-inspect after possible column add
        inspector = inspect(engine)
        index_names = {ix["name"] for ix in inspector.get_indexes("vacation_percent_tiers")}
        if "uq_vac_tier_company_min_years" in index_names:
            print("Dropping legacy unique uq_vac_tier_company_min_years...")
            conn.execute(text("ALTER TABLE vacation_percent_tiers DROP INDEX uq_vac_tier_company_min_years"))
            conn.commit()

        inspector = inspect(engine)
        index_names = {ix["name"] for ix in inspector.get_indexes("vacation_percent_tiers")}
        if "uq_vac_tier_company_union_min_years" not in index_names:
            print("Adding unique uq_vac_tier_company_union_min_years...")
            conn.execute(
                text(
                    "ALTER TABLE vacation_percent_tiers "
                    "ADD UNIQUE KEY uq_vac_tier_company_union_min_years "
                    "(company_id, union_member, min_years)"
                )
            )
            conn.commit()

        # Duplicate non-union tiers into union schedule when union has none for that company
        print("Ensuring union schedule copies of existing non-union tiers...")
        conn.execute(
            text(
                """
                INSERT INTO vacation_percent_tiers (company_id, union_member, min_years, max_years, percent)
                SELECT t.company_id, 1, t.min_years, t.max_years, t.percent
                FROM vacation_percent_tiers t
                WHERE t.union_member = 0
                  AND NOT EXISTS (
                    SELECT 1 FROM vacation_percent_tiers u
                    WHERE u.company_id = t.company_id AND u.union_member = 1
                  )
                """
            )
        )
        conn.commit()
    print("[OK] vacation_percent_tiers union_member scope ready")


def _migrate_vacation_tiers_union_scope_sqlite():
    inspector = inspect(engine)
    if "vacation_percent_tiers" not in inspector.get_table_names():
        return
    cols = {c["name"] for c in inspector.get_columns("vacation_percent_tiers")}
    if "union_member" in cols:
        return
    print("Recreating vacation_percent_tiers with union_member (sqlite)...")
    with engine.connect() as conn:
        conn.execute(text("ALTER TABLE vacation_percent_tiers RENAME TO vacation_percent_tiers_old"))
        conn.execute(
            text(
                """
                CREATE TABLE vacation_percent_tiers (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    company_id VARCHAR(50) NOT NULL,
                    union_member BOOLEAN NOT NULL DEFAULT 0,
                    min_years NUMERIC NOT NULL,
                    max_years NUMERIC,
                    percent NUMERIC NOT NULL,
                    UNIQUE (company_id, union_member, min_years)
                )
                """
            )
        )
        conn.execute(
            text(
                """
                INSERT INTO vacation_percent_tiers (company_id, union_member, min_years, max_years, percent)
                SELECT company_id, 0, min_years, max_years, percent FROM vacation_percent_tiers_old
                """
            )
        )
        conn.execute(
            text(
                """
                INSERT INTO vacation_percent_tiers (company_id, union_member, min_years, max_years, percent)
                SELECT company_id, 1, min_years, max_years, percent FROM vacation_percent_tiers_old
                """
            )
        )
        conn.execute(text("DROP TABLE vacation_percent_tiers_old"))
        conn.commit()
    print("[OK] sqlite vacation_percent_tiers union_member scope ready")


if __name__ == "__main__":
    try:
        migrate()
    except Exception as e:
        print(f"Migration failed: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)
