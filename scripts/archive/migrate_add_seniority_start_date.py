#!/usr/bin/env python3
"""
Migration script to add seniority_start_date column to employees table
"""

import sys
import os
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.models.base import SessionLocal, engine
from sqlalchemy import text

def migrate_add_seniority_start_date():
    """Add seniority_start_date column to employees table"""
    print("Adding seniority_start_date column to employees table...")
    
    try:
        with SessionLocal() as session:
            # Check if column already exists
            result = session.execute(text("""
                SELECT COUNT(*) 
                FROM INFORMATION_SCHEMA.COLUMNS 
                WHERE TABLE_SCHEMA = DATABASE() 
                AND TABLE_NAME = 'employees' 
                AND COLUMN_NAME = 'seniority_start_date'
            """))
            
            column_exists = result.scalar() > 0
            
            if column_exists:
                print("[OK] seniority_start_date column already exists")
                return True
            
            # Add the column
            session.execute(text("""
                ALTER TABLE employees 
                ADD COLUMN seniority_start_date DATE NULL 
                AFTER probation_end_date
            """))
            
            session.commit()
            print("[OK] Successfully added seniority_start_date column to employees table")
            return True
            
    except Exception as e:
        print(f"[ERROR] Error adding seniority_start_date column: {e}")
        return False

if __name__ == "__main__":
    migrate_add_seniority_start_date()
