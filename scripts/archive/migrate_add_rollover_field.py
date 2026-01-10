#!/usr/bin/env python3
"""
Migration script to add rollover field to expense entitlements table
"""

import sys
import os
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from sqlalchemy import text
from app.models.base import SessionLocal

def migrate_add_rollover_field():
    """Add rollover field to expense entitlements table"""
    with SessionLocal() as session:
        try:
            # Add rollover column with default value 'No'
            session.execute(text("""
                ALTER TABLE expense_entitlements 
                ADD COLUMN rollover VARCHAR(10) DEFAULT 'No'
            """))
            session.commit()
            print("✅ Successfully added rollover field to expense_entitlements table")
            
        except Exception as e:
            session.rollback()
            print(f"❌ Error adding rollover field: {e}")
            return False
    
    return True

if __name__ == "__main__":
    print("Starting migration: Add rollover field to expense entitlements...")
    success = migrate_add_rollover_field()
    if success:
        print("✅ Migration completed successfully!")
    else:
        print("❌ Migration failed!")
        sys.exit(1)
