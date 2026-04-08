#!/usr/bin/env python3
"""
Create the attendance-related tables in the database:
- work_schedules
- employee_schedules  
- attendance
Also updates the employment table to add is_driver column.
"""

import sys
import pathlib

# Add the backend directory to the path
sys.path.append(str(pathlib.Path(__file__).resolve().parents[1] / 'backend'))

from sqlalchemy.orm import Session
from sqlalchemy import inspect, text
from models.base import Base, engine
# Import models to ensure they're registered
from models.work_schedule import WorkSchedule
from models.employee_schedule import EmployeeSchedule
from models.attendance import Attendance
from models.employment import Employment
from models.company import Company  # Ensure Company exists for foreign key
from models.employee import Employee  # Ensure Employee exists for foreign key

def create_attendance_tables():
    """Create the attendance-related tables."""
    print("Creating attendance-related tables...")
    
    try:
        # Import all models to ensure they're registered
        from models import work_schedule, employee_schedule, attendance, employment
        
        # Check if employment table needs is_driver column
        inspector = inspect(engine)
        tables = inspector.get_table_names()
        
        if 'employment' in tables:
            columns = [col['name'] for col in inspector.get_columns('employment')]
            if 'is_driver' not in columns:
                print("Adding is_driver column to employment table...")
                with engine.connect() as conn:
                    conn.execute(text("ALTER TABLE employment ADD COLUMN is_driver BOOLEAN DEFAULT FALSE"))
                    conn.commit()
                print("[OK] is_driver column added to employment table")
        
        # Create the tables
        print("Creating work_schedules table...")
        WorkSchedule.__table__.create(bind=engine, checkfirst=True)
        print("[OK] work_schedules table created successfully!")
        
        print("Creating employee_schedules table...")
        EmployeeSchedule.__table__.create(bind=engine, checkfirst=True)
        print("[OK] employee_schedules table created successfully!")
        
        print("Creating attendance table...")
        Attendance.__table__.create(bind=engine, checkfirst=True)
        print("[OK] attendance table created successfully!")
        
        # Verify the tables exist
        inspector = inspect(engine)
        tables = inspector.get_table_names()
        
        required_tables = ['work_schedules', 'employee_schedules', 'attendance']
        for table_name in required_tables:
            if table_name in tables:
                print(f"[OK] Verified: '{table_name}' table exists in database")
                
                # Show table structure
                columns = inspector.get_columns(table_name)
                print(f"\n{table_name} structure:")
                for col in columns:
                    print(f"  - {col['name']}: {col['type']}")
            else:
                print(f"[WARNING] Table '{table_name}' not found after creation")
                
    except Exception as e:
        print(f"[ERROR] Error creating tables: {e}")
        import traceback
        traceback.print_exc()
        return False
    
    return True


def main():
    """Main function."""
    print("=" * 50)
    print("Creating Attendance-Related Tables")
    print("=" * 50)
    
    if create_attendance_tables():
        print("\n" + "=" * 50)
        print("[SUCCESS] All attendance tables created successfully!")
        print("=" * 50)
        return 0
    else:
        print("\n" + "=" * 50)
        print("[FAILED] Error creating tables")
        print("=" * 50)
        return 1


if __name__ == "__main__":
    sys.exit(main())

