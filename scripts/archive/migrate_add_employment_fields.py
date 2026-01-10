#!/usr/bin/env python3
"""
Database migration script to add remarks and paystub fields to employment table.
This script safely adds the new columns to the existing database.
"""

import sqlite3
import sys
from pathlib import Path

# Add the parent directory to the path so we can import app modules
sys.path.append(str(Path(__file__).parent.parent))

from app.config.settings import DB_PATH

def migrate_database():
    """Add remarks and paystub columns to employment table."""
    print(f"Migrating database: {DB_PATH}")
    
    try:
        with sqlite3.connect(str(DB_PATH)) as conn:
            cursor = conn.cursor()
            
            # Check if columns already exist
            cursor.execute("PRAGMA table_info(employment)")
            columns = [row[1] for row in cursor.fetchall()]
            
            print(f"Current columns: {columns}")
            
            # Add remarks column if it doesn't exist
            if 'remarks' not in columns:
                print("Adding remarks column...")
                cursor.execute("ALTER TABLE employment ADD COLUMN remarks TEXT")
                print("✓ remarks column added")
            else:
                print("✓ remarks column already exists")
            
            # Add paystub column if it doesn't exist
            if 'paystub' not in columns:
                print("Adding paystub column...")
                cursor.execute("ALTER TABLE employment ADD COLUMN paystub BOOLEAN DEFAULT 0")
                print("✓ paystub column added")
            else:
                print("✓ paystub column already exists")
            
            # Verify the changes
            cursor.execute("PRAGMA table_info(employment)")
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
