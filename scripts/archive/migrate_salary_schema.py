#!/usr/bin/env python3
"""
Database migration script to update salary_history table schema.
This adds the employee_id column and removes the employment_id column.
"""

import sys
import os
from sqlalchemy import text, create_engine
from sqlalchemy.exc import OperationalError

# Add the parent directory to the path so we can import our app modules
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.models.base import SessionLocal, engine


def migrate_salary_schema():
    """Migrate the salary_history table schema."""
    print("Migrating salary_history table schema...")
    print("=" * 50)
    
    with SessionLocal() as session:
        try:
            # Step 1: Add employee_id column (if it doesn't exist)
            print("1. Adding employee_id column...")
            try:
                session.execute(text("""
                    ALTER TABLE salary_history 
                    ADD COLUMN employee_id VARCHAR(50) NULL
                """))
                session.commit()
                print("   [OK] employee_id column added")
            except OperationalError as e:
                if "Duplicate column name" in str(e):
                    print("   [INFO] employee_id column already exists")
                else:
                    raise
            
            # Step 2: Populate employee_id from employment table
            print("2. Populating employee_id from employment table...")
            session.execute(text("""
                UPDATE salary_history sh
                JOIN employment e ON sh.employment_id = e.id
                SET sh.employee_id = e.employee_id
            """))
            session.commit()
            print("   [OK] employee_id populated from employment records")
            
            # Step 3: Make employee_id NOT NULL
            print("3. Making employee_id NOT NULL...")
            session.execute(text("""
                ALTER TABLE salary_history 
                MODIFY COLUMN employee_id VARCHAR(50) NOT NULL
            """))
            session.commit()
            print("   [OK] employee_id set to NOT NULL")
            
            # Step 4: Add foreign key constraint
            print("4. Adding foreign key constraint...")
            try:
                session.execute(text("""
                    ALTER TABLE salary_history 
                    ADD CONSTRAINT fk_salary_history_employee_id 
                    FOREIGN KEY (employee_id) REFERENCES employees(id) ON DELETE CASCADE
                """))
                session.commit()
                print("   [OK] Foreign key constraint added")
            except OperationalError as e:
                if "Duplicate foreign key constraint name" in str(e):
                    print("   [INFO] Foreign key constraint already exists")
                else:
                    raise
            
            # Step 5: Drop the old employment_id column
            print("5. Dropping old employment_id column...")
            try:
                session.execute(text("""
                    ALTER TABLE salary_history 
                    DROP FOREIGN KEY salary_history_ibfk_1
                """))
                print("   [OK] Old foreign key constraint dropped")
            except Exception as e:
                print(f"   [INFO] Foreign key constraint not found or already dropped: {str(e)}")
            
            session.execute(text("""
                ALTER TABLE salary_history 
                DROP COLUMN employment_id
            """))
            session.commit()
            print("   [OK] employment_id column removed")
            
            print("\n" + "=" * 50)
            print("[SUCCESS] Schema migration completed successfully!")
            
        except OperationalError as e:
            print(f"\n[ERROR] Schema migration failed: {str(e)}")
            print("This might be because the schema is already migrated or there's a constraint issue.")
            print("Please check the current schema and try again.")
            raise


def check_schema():
    """Check the current schema of salary_history table."""
    print("Checking current salary_history table schema...")
    
    with SessionLocal() as session:
        try:
            result = session.execute(text("DESCRIBE salary_history"))
            columns = result.fetchall()
            
            print("\nCurrent salary_history table structure:")
            print("-" * 50)
            for column in columns:
                print(f"  {column[0]} - {column[1]} - {column[2]}")
            
            # Check if employee_id exists
            employee_id_exists = any(col[0] == 'employee_id' for col in columns)
            employment_id_exists = any(col[0] == 'employment_id' for col in columns)
            
            print(f"\nSchema Status:")
            print(f"  employee_id column: {'EXISTS' if employee_id_exists else 'MISSING'}")
            print(f"  employment_id column: {'EXISTS' if employment_id_exists else 'REMOVED'}")
            
            return employee_id_exists and not employment_id_exists
            
        except Exception as e:
            print(f"Error checking schema: {str(e)}")
            return False


def main():
    """Main migration function."""
    print("Salary History Schema Migration")
    print("=" * 50)
    
    # Check current schema
    if check_schema():
        print("\n[SUCCESS] Schema is already migrated!")
        return
    
    # Auto-proceed with migration
    print("\nThis will modify the salary_history table structure:")
    print("  - Add employee_id column")
    print("  - Remove employment_id column")
    print("  - Update foreign key relationships")
    print("\nProceeding with migration...")
    
    try:
        migrate_salary_schema()
        print("\nNext steps:")
        print("1. Run the data migration script: python scripts/migrate_salary_to_employee_based.py")
        print("2. Test the application to ensure everything works correctly")
        
    except Exception as e:
        print(f"\n[ERROR] Migration failed: {str(e)}")
        print("Please check the error and try again.")


if __name__ == "__main__":
    main()
