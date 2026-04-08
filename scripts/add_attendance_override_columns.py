"""
Script to add override columns to the attendance table.
Adds: override_regular_hours, override_stat_holiday_hours, time_edit_reason, hours_edit_reason
"""
import sys
import pathlib

# Add the backend directory to the path
sys.path.append(str(pathlib.Path(__file__).resolve().parents[1] / 'backend'))

from sqlalchemy import text
from models.base import engine, SessionLocal
from models.attendance import Attendance

def add_override_columns():
    """Add override columns to attendance table"""
    print("Adding override columns to attendance table...")
    
    with engine.connect() as conn:
        try:
            # Check if columns already exist
            result = conn.execute(text("""
                SELECT COLUMN_NAME 
                FROM INFORMATION_SCHEMA.COLUMNS 
                WHERE TABLE_SCHEMA = DATABASE() 
                AND TABLE_NAME = 'attendance' 
                AND COLUMN_NAME IN ('override_regular_hours', 'override_stat_holiday_hours', 'time_edit_reason', 'hours_edit_reason')
            """))
            existing_columns = [row[0] for row in result]
            
            if 'override_regular_hours' not in existing_columns:
                conn.execute(text("ALTER TABLE attendance ADD COLUMN override_regular_hours FLOAT NULL"))
                conn.commit()
                print("✓ Added override_regular_hours column")
            else:
                print("✓ override_regular_hours column already exists")
            
            if 'override_stat_holiday_hours' not in existing_columns:
                conn.execute(text("ALTER TABLE attendance ADD COLUMN override_stat_holiday_hours FLOAT NULL"))
                conn.commit()
                print("✓ Added override_stat_holiday_hours column")
            else:
                print("✓ override_stat_holiday_hours column already exists")
            
            if 'time_edit_reason' not in existing_columns:
                conn.execute(text("ALTER TABLE attendance ADD COLUMN time_edit_reason TEXT NULL"))
                conn.commit()
                print("✓ Added time_edit_reason column")
            else:
                print("✓ time_edit_reason column already exists")
            
            if 'hours_edit_reason' not in existing_columns:
                conn.execute(text("ALTER TABLE attendance ADD COLUMN hours_edit_reason TEXT NULL"))
                conn.commit()
                print("✓ Added hours_edit_reason column")
            else:
                print("✓ hours_edit_reason column already exists")
                
        except Exception as e:
            print(f"✗ Error adding columns: {str(e)}")
            raise

if __name__ == "__main__":
    add_override_columns()
    print("\n✓ Migration completed successfully!")

