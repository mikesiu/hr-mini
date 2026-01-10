#!/usr/bin/env python3
"""
Migration script to add work_permit table to the database.
Run this script to create the work_permit table in your existing database.
"""

import sys
import os
from pathlib import Path

# Add the parent directory to the path so we can import from app
sys.path.insert(0, str(Path(__file__).parent.parent))

from app.models.base import engine, Base
from app.models.work_permit import WorkPermit

def migrate():
    """Create the work_permit table"""
    print("Creating work_permit table...")
    
    try:
        # First, check if the employees table exists
        from sqlalchemy import inspect, text
        inspector = inspect(engine)
        tables = inspector.get_table_names()
        
        if 'employees' not in tables:
            print("❌ Employees table not found. Cannot create work_permits table with foreign key constraint.")
            return False
        
        print("✅ Employees table found, proceeding with work_permits table creation...")
        
        # Create the table
        WorkPermit.__table__.create(engine, checkfirst=True)
        print("✅ Work permit table created successfully!")
        
        # Verify the table was created
        tables = inspector.get_table_names()
        
        if 'work_permits' in tables:
            print("✅ Table 'work_permits' verified in database")
            
            # Show table structure
            columns = inspector.get_columns('work_permits')
            print("\nTable structure:")
            for column in columns:
                print(f"  - {column['name']}: {column['type']}")
        else:
            print("❌ Table 'work_permits' not found in database")
            
    except Exception as e:
        print(f"❌ Error creating work permit table: {e}")
        print("Trying alternative approach...")
        
        # Try creating the table without foreign key constraint first
        try:
            from sqlalchemy import MetaData, Table, Column, String, Date, Integer
            metadata = MetaData()
            
            work_permits_table = Table(
                'work_permits',
                metadata,
                Column('id', Integer, primary_key=True, autoincrement=True),
                Column('employee_id', String, nullable=False),
                Column('permit_type', String, nullable=False),
                Column('expiry_date', Date, nullable=False)
            )
            
            work_permits_table.create(engine, checkfirst=True)
            print("✅ Work permit table created without foreign key constraint!")
            
            # Add foreign key constraint separately
            with engine.connect() as conn:
                conn.execute(text("PRAGMA foreign_keys=ON"))
                conn.execute(text("""
                    CREATE TABLE work_permits_new (
                        id INTEGER PRIMARY KEY AUTOINCREMENT,
                        employee_id TEXT NOT NULL,
                        permit_type TEXT NOT NULL,
                        expiry_date DATE NOT NULL,
                        FOREIGN KEY (employee_id) REFERENCES employees(id) ON DELETE CASCADE
                    )
                """))
                conn.execute(text("INSERT INTO work_permits_new SELECT * FROM work_permits"))
                conn.execute(text("DROP TABLE work_permits"))
                conn.execute(text("ALTER TABLE work_permits_new RENAME TO work_permits"))
                conn.commit()
            
            print("✅ Foreign key constraint added successfully!")
            
        except Exception as e2:
            print(f"❌ Alternative approach also failed: {e2}")
            return False
    
    return True

if __name__ == "__main__":
    print("Work Permit Table Migration")
    print("=" * 40)
    
    if migrate():
        print("\n🎉 Migration completed successfully!")
        print("You can now use the Work Permit Management feature in the HR system.")
    else:
        print("\n💥 Migration failed!")
        sys.exit(1)
