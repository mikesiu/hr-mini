#!/usr/bin/env python3
"""
Migration script to create salary_history table and migrate existing pay data.
This script will:
1. Create the salary_history table
2. Migrate existing pay_rate and pay_type data from employment table
3. Optionally remove pay_rate and pay_type columns from employment table
"""

import sys
import pathlib

sys.path.append(str(pathlib.Path(__file__).resolve().parents[1]))

from sqlalchemy import text
from app.models.base import Base, engine
from app.repos.salary_history_repo import migrate_existing_pay_data
from app.models.salary_history import SalaryHistory

def create_salary_history_table():
    """Create the salary_history table."""
    print("Creating salary_history table...")
    Base.metadata.create_all(bind=engine, tables=[SalaryHistory.__table__])
    print("[OK] salary_history table created successfully")

def migrate_pay_data():
    """Migrate existing pay data from employment to salary_history."""
    print("Migrating existing pay data...")
    
    try:
        migrated_count = migrate_existing_pay_data()
        print(f"[OK] Migrated {migrated_count} salary records")
        return migrated_count
    except Exception as e:
        print(f"[ERROR] Error migrating pay data: {str(e)}")
        return 0

def remove_pay_columns():
    """Remove pay_rate and pay_type columns from employment table."""
    print("Removing pay_rate and pay_type columns from employment table...")
    
    try:
        with engine.connect() as conn:
            # Check if columns exist before dropping
            result = conn.execute(text("""
                SELECT COUNT(*) as count 
                FROM information_schema.columns 
                WHERE table_name = 'employment' 
                AND column_name IN ('pay_rate', 'pay_type')
            """))
            
            column_count = result.fetchone()[0]
            
            if column_count > 0:
                conn.execute(text("ALTER TABLE employment DROP COLUMN pay_rate"))
                conn.execute(text("ALTER TABLE employment DROP COLUMN pay_type"))
                conn.commit()
                print("[OK] Removed pay_rate and pay_type columns from employment table")
            else:
                print("[OK] Pay columns already removed from employment table")
                
    except Exception as e:
        print(f"[ERROR] Error removing pay columns: {str(e)}")
        print("  You may need to remove these columns manually if they exist")

def verify_migration():
    """Verify the migration was successful."""
    print("\nVerifying migration...")
    
    try:
        with engine.connect() as conn:
            # Check salary_history table exists
            result = conn.execute(text("""
                SELECT COUNT(*) as count 
                FROM information_schema.tables 
                WHERE table_name = 'salary_history'
            """))
            
            if result.fetchone()[0] > 0:
                print("[OK] salary_history table exists")
                
                # Check data was migrated
                result = conn.execute(text("SELECT COUNT(*) FROM salary_history"))
                salary_count = result.fetchone()[0]
                print(f"[OK] salary_history table contains {salary_count} records")
                
                # Check employment table structure
                result = conn.execute(text("""
                    SELECT column_name 
                    FROM information_schema.columns 
                    WHERE table_name = 'employment' 
                    AND column_name IN ('pay_rate', 'pay_type')
                """))
                
                pay_columns = [row[0] for row in result.fetchall()]
                if not pay_columns:
                    print("[OK] Pay columns removed from employment table")
                else:
                    print(f"[WARNING] Pay columns still exist in employment table: {pay_columns}")
                    
            else:
                print("[ERROR] salary_history table does not exist")
                
    except Exception as e:
        print(f"[ERROR] Error verifying migration: {str(e)}")

def main():
    """Main migration function."""
    print("Salary History Migration")
    print("=" * 50)
    print()
    
    # Step 1: Create salary_history table
    create_salary_history_table()
    print()
    
    # Step 2: Migrate existing pay data
    migrated_count = migrate_pay_data()
    print()
    
    if migrated_count > 0:
        # Step 3: Remove pay columns from employment table
        remove_pay_columns()
        print()
    
    # Step 4: Verify migration
    verify_migration()
    
    print("\n" + "=" * 50)
    print("Migration completed!")
    print()
    print("Next steps:")
    print("1. Update the employment management UI to use salary_history table")
    print("2. Test the new salary history functionality")
    print("3. Update any reports or queries that reference pay_rate/pay_type")

if __name__ == "__main__":
    main()
