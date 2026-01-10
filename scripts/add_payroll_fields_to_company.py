#!/usr/bin/env python3
"""
Migration script to add payroll-related fields to the companies table.
"""

import sqlite3
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
    Add payroll fields to the companies table.
    """
    print("Starting migration: Adding payroll fields to companies table...")
    
    try:
        # Check if columns already exist
        with engine.connect() as conn:
            # Get table info - MySQL syntax
            result = conn.execute(text("DESCRIBE companies"))
            columns = [row[0] for row in result.fetchall()]
            
            print(f"Existing columns: {columns}")
            
            # Add new columns if they don't exist
            new_columns = [
                ("payroll_start_date", "DATE"),
                ("payroll_frequency", "VARCHAR(20)"),
                ("cra_due_dates", "VARCHAR(50)"),
                ("union_due_date", "INTEGER")
            ]
            
            for column_name, column_type in new_columns:
                if column_name not in columns:
                    print(f"Adding column: {column_name} ({column_type})")
                    conn.execute(text(f"ALTER TABLE companies ADD COLUMN {column_name} {column_type}"))
                    conn.commit()
                else:
                    print(f"Column {column_name} already exists, skipping...")
        
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
            result = conn.execute(text("DESCRIBE companies"))
            columns = [row[0] for row in result.fetchall()]
            
            expected_columns = [
                "payroll_start_date",
                "payroll_frequency", 
                "cra_due_dates",
                "union_due_date"
            ]
            
            for col in expected_columns:
                if col in columns:
                    print(f"[OK] {col} column exists")
                else:
                    print(f"[ERROR] {col} column missing")
                    return False
            
            print("All payroll columns verified successfully!")
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
