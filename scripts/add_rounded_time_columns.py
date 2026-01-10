"""
Script to add rounded_check_in and rounded_check_out columns to the attendance table.
Also calculates and populates rounded times for existing records.
"""
import sys
import pathlib

# Add the backend directory to the path
sys.path.append(str(pathlib.Path(__file__).resolve().parents[1] / 'backend'))

from sqlalchemy import text
from models.base import engine, SessionLocal
from models.attendance import Attendance
from utils.time_rounding import round_time

def add_rounded_time_columns():
    """Add rounded_check_in and rounded_check_out columns to attendance table"""
    print("Adding rounded_check_in and rounded_check_out columns...")
    
    with engine.connect() as conn:
        try:
            # Check if columns already exist
            result = conn.execute(text("""
                SELECT COLUMN_NAME 
                FROM INFORMATION_SCHEMA.COLUMNS 
                WHERE TABLE_SCHEMA = DATABASE() 
                AND TABLE_NAME = 'attendance' 
                AND COLUMN_NAME IN ('rounded_check_in', 'rounded_check_out')
            """))
            existing_columns = [row[0] for row in result]
            
            if 'rounded_check_in' not in existing_columns:
                conn.execute(text("ALTER TABLE attendance ADD COLUMN rounded_check_in TIME NULL"))
                conn.commit()
                print("✓ Added rounded_check_in column")
            else:
                print("✓ rounded_check_in column already exists")
            
            if 'rounded_check_out' not in existing_columns:
                conn.execute(text("ALTER TABLE attendance ADD COLUMN rounded_check_out TIME NULL"))
                conn.commit()
                print("✓ Added rounded_check_out column")
            else:
                print("✓ rounded_check_out column already exists")
                
        except Exception as e:
            print(f"✗ Error adding columns: {str(e)}")
            raise

def populate_rounded_times():
    """Calculate and populate rounded times for existing records"""
    print("\nPopulating rounded times for existing records...")
    
    with SessionLocal() as session:
        try:
            records = session.query(Attendance).all()
            updated_count = 0
            
            for record in records:
                if record.check_in and not record.rounded_check_in:
                    record.rounded_check_in = round_time(record.check_in)
                    updated_count += 1
                
                if record.check_out and not record.rounded_check_out:
                    record.rounded_check_out = round_time(record.check_out)
                    updated_count += 1
            
            if updated_count > 0:
                session.commit()
                print(f"✓ Updated {updated_count} time fields in {len(records)} records")
            else:
                print("✓ No records need updating (rounded times already exist)")
                
        except Exception as e:
            session.rollback()
            print(f"✗ Error populating rounded times: {str(e)}")
            raise

if __name__ == "__main__":
    try:
        add_rounded_time_columns()
        populate_rounded_times()
        print("\n✓ Migration completed successfully!")
    except Exception as e:
        print(f"\n✗ Migration failed: {str(e)}")
        sys.exit(1)

