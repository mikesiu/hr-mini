#!/usr/bin/env python3
"""
Create the holidays table in the database.
"""

import sys
import pathlib

# Add the backend directory to the path
sys.path.append(str(pathlib.Path(__file__).resolve().parents[1] / 'backend'))

from sqlalchemy.orm import Session
from models.base import Base, engine
# Import Holiday model to ensure it's registered
from models.holiday import Holiday
from models.company import Company  # Ensure Company exists for foreign key

def create_holidays_table():
    """Create the holidays table."""
    print("Creating holidays table...")
    
    try:
        # Import all models to ensure they're registered
        from models import holiday, company
        
        # Create the table
        Holiday.__table__.create(bind=engine, checkfirst=True)
        print("[OK] Holidays table created successfully!")
        
        # Verify the table exists
        from sqlalchemy import inspect
        inspector = inspect(engine)
        tables = inspector.get_table_names()
        
        if 'holidays' in tables:
            print(f"[OK] Verified: 'holidays' table exists in database")
            
            # Show table structure
            columns = inspector.get_columns('holidays')
            print("\nTable structure:")
            for col in columns:
                print(f"  - {col['name']}: {col['type']}")
        else:
            print("[WARNING] Table 'holidays' not found after creation")
            
    except Exception as e:
        print(f"[ERROR] Error creating holidays table: {e}")
        import traceback
        traceback.print_exc()
        return False
    
    return True


def main():
    """Main function."""
    print("=" * 50)
    print("Creating Holidays Table")
    print("=" * 50)
    
    success = create_holidays_table()
    
    if success:
        print("\n" + "=" * 50)
        print("SUCCESS: Holidays table creation completed!")
        print("=" * 50)
        return 0
    else:
        print("\n" + "=" * 50)
        print("ERROR: Failed to create holidays table")
        print("=" * 50)
        return 1


if __name__ == "__main__":
    sys.exit(main())

