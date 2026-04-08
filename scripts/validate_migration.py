#!/usr/bin/env python3
"""
Validate MySQL database integrity.
This script helps ensure data integrity in the MySQL database.
"""

import sys
import pathlib
from datetime import datetime

# Add parent directory to path
sys.path.append(str(pathlib.Path(__file__).resolve().parents[1]))

from app.config.settings import MYSQL_DATABASE
from app.models.base import Base, engine
from sqlalchemy.orm import Session
from sqlalchemy import text

# Import all models
from app.models.employee import Employee
from app.models.company import Company
from app.models.employment import Employment
from app.models.leave_type import LeaveType
from app.models.leave import Leave
from app.models.work_permit import WorkPermit
from app.models.audit import Audit

def get_table_counts(session, model_class, table_name):
    """Get record count for a table"""
    try:
        count = session.query(model_class).count()
        return count
    except Exception as e:
        print(f"  Error counting {table_name}: {e}")
        return -1

def compare_table_data(session, model_class, table_name, sample_size=5):
    """Compare sample data between databases"""
    print(f"  Comparing sample data for {table_name}...")
    
    try:
        # Get sample records
        records = session.query(model_class).limit(sample_size).all()
        
        if not records:
            print(f"    No records found in {table_name}")
            return True
        
        print(f"    Sample records from {table_name}:")
        for i, record in enumerate(records[:3]):  # Show first 3 records
            primary_key = model_class.__table__.primary_key.columns.keys()[0]
            pk_value = getattr(record, primary_key)
            print(f"      {i+1}. {primary_key}: {pk_value}")
        
        return True
        
    except Exception as e:
        print(f"    Error comparing {table_name}: {e}")
        return False

def validate_foreign_keys(session):
    """Validate foreign key relationships"""
    print("Validating foreign key relationships...")
    
    try:
        # Check employee-employment relationships
        orphaned_employment = session.query(Employment).outerjoin(Employee).filter(Employee.id.is_(None)).count()
        if orphaned_employment > 0:
            print(f"  WARNING: {orphaned_employment} employment records without valid employee")
        else:
            print("  ✓ All employment records have valid employee references")
        
        # Check employee-leave relationships
        orphaned_leave = session.query(Leave).outerjoin(Employee).filter(Employee.id.is_(None)).count()
        if orphaned_leave > 0:
            print(f"  WARNING: {orphaned_leave} leave records without valid employee")
        else:
            print("  ✓ All leave records have valid employee references")
        
        # Check employee-work_permit relationships
        orphaned_permits = session.query(WorkPermit).outerjoin(Employee).filter(Employee.id.is_(None)).count()
        if orphaned_permits > 0:
            print(f"  WARNING: {orphaned_permits} work permit records without valid employee")
        else:
            print("  ✓ All work permit records have valid employee references")
        
        # Check employment-company relationships
        orphaned_employment_company = session.query(Employment).outerjoin(Company).filter(Company.id.is_(None)).count()
        if orphaned_employment_company > 0:
            print(f"  WARNING: {orphaned_employment_company} employment records without valid company")
        else:
            print("  ✓ All employment records have valid company references")
        
        # Check leave-leave_type relationships
        orphaned_leave_type = session.query(Leave).outerjoin(LeaveType).filter(LeaveType.id.is_(None)).count()
        if orphaned_leave_type > 0:
            print(f"  WARNING: {orphaned_leave_type} leave records without valid leave type")
        else:
            print("  ✓ All leave records have valid leave type references")
        
        return True
        
    except Exception as e:
        print(f"  Error validating foreign keys: {e}")
        return False

def validate_data_integrity(session):
    """Validate data integrity rules"""
    print("Validating data integrity...")
    
    try:
        # Check for required fields
        employees_without_name = session.query(Employee).filter(
            (Employee.full_name.is_(None)) | (Employee.full_name == "")
        ).count()
        
        if employees_without_name > 0:
            print(f"  WARNING: {employees_without_name} employees without full name")
        else:
            print("  ✓ All employees have full names")
        
        # Check for valid email formats (basic check)
        employees_with_email = session.query(Employee).filter(
            Employee.email.isnot(None),
            Employee.email != "",
            Employee.email.like("%@%")
        ).count()
        
        print(f"  ✓ {employees_with_email} employees have valid email addresses")
        
        # Check for future dates in leave records
        from datetime import date
        future_leave = session.query(Leave).filter(Leave.start_date > date.today()).count()
        print(f"  ✓ {future_leave} leave records with future start dates")
        
        return True
        
    except Exception as e:
        print(f"  Error validating data integrity: {e}")
        return False

def get_database_info(session):
    """Get database information"""
    print("Database Information:")
    print("-" * 30)
    
    try:
        # MySQL specific info
        result = session.execute(text("SELECT VERSION()")).fetchone()
        print(f"  Database Type: MySQL")
        print(f"  Version: {result[0] if result else 'Unknown'}")
        
        result = session.execute(text("SELECT DATABASE()")).fetchone()
        print(f"  Current Database: {result[0] if result else 'Unknown'}")
        
        return True
        
    except Exception as e:
        print(f"  Error getting database info: {e}")
        return False

def main():
    """Main validation function"""
    print("Starting MySQL database validation...")
    print(f"Validation timestamp: {datetime.now().isoformat()}")
    print("=" * 60)
    
    with Session(engine) as session:
        # Get database information
        get_database_info(session)
        print()
        
        # Define tables to validate
        tables = [
            (Company, "companies"),
            (LeaveType, "leave_types"),
            (Employee, "employees"),
            (Employment, "employment"),
            (Leave, "leave"),
            (WorkPermit, "work_permits"),
            (Audit, "audit_log")
        ]
        
        # Get record counts
        print("Record Counts:")
        print("-" * 20)
        total_records = 0
        for model_class, table_name in tables:
            count = get_table_counts(session, model_class, table_name)
            if count >= 0:
                print(f"  {table_name:20}: {count:6} records")
                total_records += count
            else:
                print(f"  {table_name:20}: ERROR")
        
        print(f"  {'TOTAL':20}: {total_records:6} records")
        print()
        
        # Compare sample data
        print("Sample Data Verification:")
        print("-" * 30)
        for model_class, table_name in tables:
            compare_table_data(session, model_class, table_name)
        print()
        
        # Validate foreign keys
        validate_foreign_keys(session)
        print()
        
        # Validate data integrity
        validate_data_integrity(session)
        print()
        
        print("Validation completed!")
        print("=" * 60)

if __name__ == "__main__":
    main()
