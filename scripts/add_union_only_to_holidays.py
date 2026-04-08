#!/usr/bin/env python3
"""
Migration script to add union_only field to holidays table.
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
    Add union_only field to holidays table.
    """
    print("Starting migration: Adding union_only field to holidays table...")
    
    try:
        # Check if column already exists
        with engine.connect() as conn:
            # Get holidays table info - MySQL syntax
            result = conn.execute(text("DESCRIBE holidays"))
            holiday_columns = [row[0] for row in result.fetchall()]
            
            print(f"Existing holidays columns: {holiday_columns}")
            
            # Add union_only column to holidays table if it doesn't exist
            if "union_only" not in holiday_columns:
                print("Adding column: union_only (BOOLEAN) to holidays table")
                conn.execute(text("ALTER TABLE holidays ADD COLUMN union_only BOOLEAN DEFAULT 0"))
                conn.commit()
                print("Column union_only added successfully!")
            else:
                print("Column union_only already exists in holidays table, skipping...")
        
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
            # Verify holidays table
            result = conn.execute(text("DESCRIBE holidays"))
            holiday_columns = [row[0] for row in result.fetchall()]
            
            if "union_only" in holiday_columns:
                print("[OK] union_only column exists in holidays table")
                
                # Check default value
                result = conn.execute(text("SHOW COLUMNS FROM holidays WHERE Field = 'union_only'"))
                row = result.fetchone()
                if row:
                    print(f"[OK] union_only column details: {row}")
                
                return True
            else:
                print("[ERROR] union_only column missing in holidays table")
                return False
            
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
        print("\nMigration verification failed!")
        sys.exit(1)

