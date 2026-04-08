#!/usr/bin/env python3
"""
Migration script to:
1. Add pay_period_start_date column to companies table
2. Rename payroll_start_date to payroll_due_start_date
3. Copy existing payroll_start_date values to both new fields (for backward compatibility)
"""

import sys
from pathlib import Path

# Add the backend directory to the Python path
backend_dir = Path(__file__).parent.parent / "backend"
sys.path.insert(0, str(backend_dir))

from models.base import SessionLocal, engine
from models.company import Company
from sqlalchemy import text

def migrate_database():
    """
    Migrate payroll fields in the companies table.
    """
    print("Starting migration: Renaming payroll_start_date and adding pay_period_start_date...")
    
    try:
        with engine.connect() as conn:
            # Get table info - MySQL syntax
            result = conn.execute(text("DESCRIBE companies"))
            columns = [row[0] for row in result.fetchall()]
            
            print(f"Existing columns: {columns}")
            
            # Step 1: Add pay_period_start_date column if it doesn't exist
            if "pay_period_start_date" not in columns:
                print("Adding column: pay_period_start_date (DATE)")
                conn.execute(text("ALTER TABLE companies ADD COLUMN pay_period_start_date DATE"))
                conn.commit()
            else:
                print("Column pay_period_start_date already exists, skipping...")
            
            # Step 2: Check if payroll_start_date exists and rename it
            if "payroll_start_date" in columns:
                if "payroll_due_start_date" not in columns:
                    print("Renaming column: payroll_start_date -> payroll_due_start_date")
                    # MySQL syntax for renaming column
                    conn.execute(text("ALTER TABLE companies CHANGE COLUMN payroll_start_date payroll_due_start_date DATE"))
                    conn.commit()
                
                # Step 3: Copy existing payroll_start_date values to pay_period_start_date
                # (if payroll_due_start_date exists, use it as source)
                print("Copying existing payroll_due_start_date values to pay_period_start_date...")
                conn.execute(text("""
                    UPDATE companies 
                    SET pay_period_start_date = payroll_due_start_date 
                    WHERE payroll_due_start_date IS NOT NULL 
                    AND pay_period_start_date IS NULL
                """))
                conn.commit()
                print("Data migration completed!")
            else:
                print("Column payroll_start_date not found. It may have already been renamed.")
            
        print("Migration completed successfully!")
        
    except Exception as e:
        print(f"Migration failed: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)

def verify_migration():
    """
    Verify that the migration was successful.
    """
    print("\nVerifying migration...")
    
    try:
        with engine.connect() as conn:
            result = conn.execute(text("DESCRIBE companies"))
            columns = [row[0] for row in result.fetchall()]
            
            expected_columns = [
                "payroll_due_start_date",  # Renamed from payroll_start_date
                "pay_period_start_date",   # New column
                "payroll_frequency", 
                "cra_due_dates",
                "union_due_date"
            ]
            
            for col in expected_columns:
                if col in columns:
                    print(f"[OK] {col} column exists")
                else:
                    print(f"[WARNING] {col} column missing (may not exist yet)")
            
            # Check that old column doesn't exist
            if "payroll_start_date" in columns:
                print("[WARNING] payroll_start_date still exists (should be renamed to payroll_due_start_date)")
                return False
            
            print("Migration verification completed!")
            return True
            
    except Exception as e:
        print(f"Verification failed: {e}")
        import traceback
        traceback.print_exc()
        return False

if __name__ == "__main__":
    migrate_database()
    if verify_migration():
        print("\nMigration completed and verified successfully!")
    else:
        print("\nMigration verification completed with warnings.")
        print("Please review the output above.")

