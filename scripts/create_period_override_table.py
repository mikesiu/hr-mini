#!/usr/bin/env python3
"""
Create attendance_period_overrides table in the database.
"""

import sys
import os

# Add the backend directory to the path so we can import from models
backend_dir = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), 'backend')
sys.path.insert(0, backend_dir)

from models.base import Base, engine
from models.attendance_period_override import AttendancePeriodOverride
from sqlalchemy import inspect

def create_period_override_table():
    """Create the attendance_period_overrides table."""
    print("Creating attendance_period_overrides table...")
    
    try:
        # Import all related models to ensure foreign keys are available
        from models.employee import Employee
        from models.company import Company
        
        # Check if table already exists
        inspector = inspect(engine)
        tables = inspector.get_table_names()
        
        if 'attendance_period_overrides' in tables:
            print("[INFO] attendance_period_overrides table already exists")
            return True
        
        # Create the table
        print("Creating attendance_period_overrides table...")
        AttendancePeriodOverride.__table__.create(bind=engine, checkfirst=True)
        print("[OK] attendance_period_overrides table created successfully!")
        
        # Verify the table exists
        inspector = inspect(engine)
        tables = inspector.get_table_names()
        
        if 'attendance_period_overrides' in tables:
            print("[OK] Table verified in database")
            
            # Show table structure
            columns = inspector.get_columns('attendance_period_overrides')
            print("\nTable structure:")
            for col in columns:
                print(f"  - {col['name']}: {col['type']}")
            
            return True
        else:
            print("[ERROR] Table was not created")
            return False
            
    except Exception as e:
        print(f"[ERROR] Error creating table: {e}")
        import traceback
        traceback.print_exc()
        return False


def main():
    """Main function."""
    success = create_period_override_table()
    sys.exit(0 if success else 1)


if __name__ == "__main__":
    main()

