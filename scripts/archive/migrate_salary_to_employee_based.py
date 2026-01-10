#!/usr/bin/env python3
"""
Migration script to move salary history from employment-based to employee-based structure.

This script:
1. Creates a backup of the current salary_history table
2. Migrates existing salary records to reference employee_id directly
3. Validates the migration was successful
4. Provides rollback instructions if needed
"""

import sys
import os
from datetime import date
from sqlalchemy import text, create_engine, MetaData, Table, Column, String, Integer, Numeric, Date, DateTime, Text
from sqlalchemy.sql import func

# Add the parent directory to the path so we can import our app modules
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.models.base import SessionLocal, engine
from app.models.salary_history import SalaryHistory
from app.models.employment import Employment
from app.models.employee import Employee


def backup_salary_history():
    """Create a backup of the current salary_history table."""
    print("Creating backup of salary_history table...")
    
    with SessionLocal() as session:
        # Create backup table
        session.execute(text("""
            CREATE TABLE IF NOT EXISTS salary_history_backup AS 
            SELECT * FROM salary_history
        """))
        session.commit()
        
        # Count records in backup
        result = session.execute(text("SELECT COUNT(*) FROM salary_history_backup"))
        count = result.scalar()
        print(f"Backup created with {count} records")


def migrate_salary_records():
    """Migrate salary records from employment-based to employee-based."""
    print("Migrating salary records...")
    
    with SessionLocal() as session:
        # Get all salary records with their employment data
        salary_records = session.execute(text("""
            SELECT sh.id, sh.employment_id, sh.pay_rate, sh.pay_type, 
                   sh.effective_date, sh.end_date, sh.notes, sh.created_at, sh.updated_at,
                   e.employee_id
            FROM salary_history sh
            JOIN employment e ON sh.employment_id = e.id
        """)).fetchall()
        
        print(f"Found {len(salary_records)} salary records to migrate")
        
        # Clear the current salary_history table
        session.execute(text("DELETE FROM salary_history"))
        
        # Insert migrated records
        migrated_count = 0
        for record in salary_records:
            session.execute(text("""
                INSERT INTO salary_history 
                (id, employee_id, pay_rate, pay_type, effective_date, end_date, notes, created_at, updated_at)
                VALUES (:id, :employee_id, :pay_rate, :pay_type, :effective_date, :end_date, :notes, :created_at, :updated_at)
            """), {
                'id': record.id,
                'employee_id': record.employee_id,
                'pay_rate': record.pay_rate,
                'pay_type': record.pay_type,
                'effective_date': record.effective_date,
                'end_date': record.end_date,
                'notes': record.notes,
                'created_at': record.created_at,
                'updated_at': record.updated_at
            })
            migrated_count += 1
        
        session.commit()
        print(f"Successfully migrated {migrated_count} salary records")


def validate_migration():
    """Validate that the migration was successful."""
    print("Validating migration...")
    
    with SessionLocal() as session:
        # Check that all salary records now have employee_id
        result = session.execute(text("""
            SELECT COUNT(*) FROM salary_history 
            WHERE employee_id IS NULL
        """))
        null_employee_ids = result.scalar()
        
        if null_employee_ids > 0:
            print(f"ERROR: {null_employee_ids} salary records have NULL employee_id")
            return False
        
        # Check that all employee_ids in salary_history exist in employees table
        result = session.execute(text("""
            SELECT COUNT(*) FROM salary_history sh
            LEFT JOIN employees e ON sh.employee_id = e.id
            WHERE e.id IS NULL
        """))
        invalid_employee_ids = result.scalar()
        
        if invalid_employee_ids > 0:
            print(f"ERROR: {invalid_employee_ids} salary records reference non-existent employees")
            return False
        
        # Count total records
        result = session.execute(text("SELECT COUNT(*) FROM salary_history"))
        total_records = result.scalar()
        
        result = session.execute(text("SELECT COUNT(*) FROM salary_history_backup"))
        backup_records = result.scalar()
        
        if total_records != backup_records:
            print(f"ERROR: Record count mismatch. Original: {backup_records}, Migrated: {total_records}")
            return False
        
        print(f"Validation successful: {total_records} records migrated correctly")
        return True


def rollback_migration():
    """Rollback the migration by restoring from backup."""
    print("Rolling back migration...")
    
    with SessionLocal() as session:
        # Clear current salary_history
        session.execute(text("DELETE FROM salary_history"))
        
        # Restore from backup
        session.execute(text("""
            INSERT INTO salary_history 
            SELECT * FROM salary_history_backup
        """))
        
        session.commit()
        print("Migration rolled back successfully")


def main():
    """Main migration function."""
    print("Starting salary history migration from employment-based to employee-based...")
    print("=" * 70)
    
    try:
        # Step 1: Create backup
        backup_salary_history()
        
        # Step 2: Migrate records
        migrate_salary_records()
        
        # Step 3: Validate migration
        if validate_migration():
            print("\n" + "=" * 70)
            print("✅ Migration completed successfully!")
            print("\nNext steps:")
            print("1. Test the application to ensure salary management works correctly")
            print("2. If everything works, you can drop the backup table:")
            print("   DROP TABLE salary_history_backup;")
            print("\nIf you need to rollback:")
            print("   python scripts/migrate_salary_to_employee_based.py --rollback")
        else:
            print("\n" + "=" * 70)
            print("❌ Migration validation failed!")
            print("Rolling back to original state...")
            rollback_migration()
            print("Migration rolled back. Please check the data and try again.")
            
    except Exception as e:
        print(f"\n❌ Migration failed with error: {str(e)}")
        print("Attempting rollback...")
        try:
            rollback_migration()
            print("Rollback completed.")
        except Exception as rollback_error:
            print(f"Rollback also failed: {str(rollback_error)}")
            print("Manual intervention required!")
        raise


if __name__ == "__main__":
    if len(sys.argv) > 1 and sys.argv[1] == "--rollback":
        rollback_migration()
    else:
        main()
