#!/usr/bin/env python3
"""
Database migration script to add hire_date and probation_end_date fields to employees table.
This script safely adds the new columns to the existing database.
"""

import sqlite3
import sys
from pathlib import Path

# Add the parent directory to the path so we can import app modules
sys.path.append(str(Path(__file__).parent.parent))

from app.config.settings import DB_PATH

def migrate_database():
    """Add hire_date and probation_end_date columns to employees table."""
    print(f"Migrating database: {DB_PATH}")
    
    try:
        with sqlite3.connect(str(DB_PATH)) as conn:
            cursor = conn.cursor()
            
            # Check if columns already exist
            cursor.execute("PRAGMA table_info(employees)")
            columns = [row[1] for row in cursor.fetchall()]
            
            print(f"Current columns: {columns}")
            
            # Add hire_date column if it doesn't exist
            if 'hire_date' not in columns:
                print("Adding hire_date column...")
                cursor.execute("ALTER TABLE employees ADD COLUMN hire_date DATE")
                print("✓ hire_date column added")
            else:
                print("✓ hire_date column already exists")
            
            # Add probation_end_date column if it doesn't exist
            if 'probation_end_date' not in columns:
                print("Adding probation_end_date column...")
                cursor.execute("ALTER TABLE employees ADD COLUMN probation_end_date DATE")
                print("✓ probation_end_date column added")
            else:
                print("✓ probation_end_date column already exists")
            
            # Verify the changes
            cursor.execute("PRAGMA table_info(employees)")
            new_columns = [row[1] for row in cursor.fetchall()]
            print(f"Updated columns: {new_columns}")
            
            print("\n✅ Database migration completed successfully!")
            
    except Exception as e:
        print(f"❌ Migration failed: {e}")
        return False
    
    return True

if __name__ == "__main__":
    success = migrate_database()
    sys.exit(0 if success else 1)
