#!/usr/bin/env python3
"""
Migration script to add union_member field to employees table and wage_classification field to employment table.
"""

import sys
from pathlib import Path

# Add the backend directory to the Python path
backend_dir = Path(__file__).parent.parent / "backend"
sys.path.insert(0, str(backend_dir))

from models.base import SessionLocal, engine
from sqlalchemy import text

def migrate_database():
    """
    Add union_member field to employees table and wage_classification field to employment table.
    """
    print("Starting migration: Adding union_member and wage_classification fields...")
    
    try:
        # Check if columns already exist
        with engine.connect() as conn:
            # Get employees table info - MySQL syntax
            result = conn.execute(text("DESCRIBE employees"))
            employee_columns = [row[0] for row in result.fetchall()]
            
            print(f"Existing employees columns: {employee_columns}")
            
            # Add union_member column to employees table if it doesn't exist
            if "union_member" not in employee_columns:
                print("Adding column: union_member (BOOLEAN) to employees table")
                conn.execute(text("ALTER TABLE employees ADD COLUMN union_member BOOLEAN DEFAULT 0"))
                conn.commit()
            else:
                print("Column union_member already exists in employees table, skipping...")
            
            # Get employment table info - MySQL syntax
            result = conn.execute(text("DESCRIBE employment"))
            employment_columns = [row[0] for row in result.fetchall()]
            
            print(f"Existing employment columns: {employment_columns}")
            
            # Add wage_classification column to employment table if it doesn't exist
            if "wage_classification" not in employment_columns:
                print("Adding column: wage_classification (VARCHAR(100)) to employment table")
                conn.execute(text("ALTER TABLE employment ADD COLUMN wage_classification VARCHAR(100)"))
                conn.commit()
            else:
                print("Column wage_classification already exists in employment table, skipping...")
        
        print("Migration completed successfully!")
        
    except Exception as e:
        print(f"Migration failed: {e}")
        sys.exit(1)

def verify_migration():
    """
    Verify that the migration was successful.
    """
    print("\nVerifying migration...")
    
    try:
        with engine.connect() as conn:
            # Verify employees table
            result = conn.execute(text("DESCRIBE employees"))
            employee_columns = [row[0] for row in result.fetchall()]
            
            if "union_member" in employee_columns:
                print("[OK] union_member column exists in employees table")
            else:
                print("[ERROR] union_member column missing in employees table")
                return False
            
            # Verify employment table
            result = conn.execute(text("DESCRIBE employment"))
            employment_columns = [row[0] for row in result.fetchall()]
            
            if "wage_classification" in employment_columns:
                print("[OK] wage_classification column exists in employment table")
            else:
                print("[ERROR] wage_classification column missing in employment table")
                return False
            
            print("All columns verified successfully!")
            return True
            
    except Exception as e:
        print(f"Verification failed: {e}")
        return False

if __name__ == "__main__":
    migrate_database()
    if verify_migration():
        print("\nMigration completed and verified successfully!")
    else:
        print("\nMigration verification failed!")
        sys.exit(1)

