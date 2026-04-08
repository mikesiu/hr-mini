#!/usr/bin/env python3
"""
Import employment data from Excel file into MySQL database.
This script reads employment data from files/employment.xlsx and imports it into the employment table.
"""

import sys
import pathlib
import pandas as pd
from datetime import datetime

# Add parent directory to path
sys.path.append(str(pathlib.Path(__file__).resolve().parents[1]))

from app.models.base import Base, engine
from sqlalchemy.orm import Session
from app.models.employment import Employment
from app.models.employee import Employee
from app.models.company import Company

def validate_employment_data(df):
    """Validate the employment data before import"""
    print("Validating employment data...")
    
    issues = []
    
    # Check required columns
    required_columns = ['employee_id', 'company_id', 'position', 'start_date', 'pay_rate', 'pay_type']
    missing_columns = [col for col in required_columns if col not in df.columns]
    if missing_columns:
        issues.append(f"Missing required columns: {missing_columns}")
    
    # Check for empty employee_id or company_id
    empty_employee_ids = df['employee_id'].isna().sum()
    empty_company_ids = df['company_id'].isna().sum()
    
    if empty_employee_ids > 0:
        issues.append(f"Found {empty_employee_ids} records with empty employee_id")
    if empty_company_ids > 0:
        issues.append(f"Found {empty_company_ids} records with empty company_id")
    
    # Check date format
    try:
        df['start_date'] = pd.to_datetime(df['start_date'], errors='coerce')
        invalid_dates = df['start_date'].isna().sum()
        if invalid_dates > 0:
            issues.append(f"Found {invalid_dates} records with invalid start_date")
    except Exception as e:
        issues.append(f"Error parsing start_date: {e}")
    
    # Check end_date if present
    if 'end_date' in df.columns:
        try:
            df['end_date'] = pd.to_datetime(df['end_date'], errors='coerce')
        except Exception as e:
            issues.append(f"Error parsing end_date: {e}")
    
    # Check pay_rate
    try:
        df['pay_rate'] = pd.to_numeric(df['pay_rate'], errors='coerce')
        invalid_pay_rates = df['pay_rate'].isna().sum()
        if invalid_pay_rates > 0:
            issues.append(f"Found {invalid_pay_rates} records with invalid pay_rate")
    except Exception as e:
        issues.append(f"Error parsing pay_rate: {e}")
    
    if issues:
        print("Validation issues found:")
        for issue in issues:
            print(f"  - {issue}")
        return False
    else:
        print("Data validation passed")
        return True

def check_references(session, df):
    """Check if employee_id and company_id references exist in the database"""
    print("Checking references...")
    
    # Get existing employee IDs
    existing_employees = {emp.id for emp in session.query(Employee).all()}
    existing_companies = {comp.id for comp in session.query(Company).all()}
    
    # Check employee references
    employee_ids_in_file = set(df['employee_id'].dropna().unique())
    missing_employees = employee_ids_in_file - existing_employees
    
    # Check company references
    company_ids_in_file = set(df['company_id'].dropna().unique())
    missing_companies = company_ids_in_file - existing_companies
    
    if missing_employees:
        print(f"  WARNING: {len(missing_employees)} employee IDs not found in database:")
        for emp_id in sorted(missing_employees):
            print(f"    - {emp_id}")
    
    if missing_companies:
        print(f"  WARNING: {len(missing_companies)} company IDs not found in database:")
        for comp_id in sorted(missing_companies):
            print(f"    - {comp_id}")
    
    if not missing_employees and not missing_companies:
        print("  All references found in database")
        return True
    else:
        print("  WARNING: Some references are missing - import may fail for those records")
        return False

def import_employment_data(session, df):
    """Import employment data into the database"""
    print("Importing employment data...")
    
    imported_count = 0
    skipped_count = 0
    error_count = 0
    
    for index, row in df.iterrows():
        try:
            # Check if employment record already exists
            existing = session.query(Employment).filter(
                Employment.employee_id == row['employee_id'],
                Employment.company_id == row['company_id'],
                Employment.start_date == row['start_date']
            ).first()
            
            if existing:
                print(f"  Skipping row {index + 1}: Employment record already exists")
                skipped_count += 1
                continue
            
            # Create new employment record
            employment = Employment(
                employee_id=row['employee_id'],
                company_id=row['company_id'],
                position=row.get('position') if pd.notna(row.get('position')) else None,
                department=row.get('department') if pd.notna(row.get('department')) else None,
                start_date=row['start_date'].date() if pd.notna(row['start_date']) else None,
                end_date=row['end_date'].date() if 'end_date' in row and pd.notna(row['end_date']) else None,
                pay_rate=row['pay_rate'] if pd.notna(row['pay_rate']) else None,
                pay_type=row.get('pay_type') if pd.notna(row.get('pay_type')) else None,
                notes=row.get('notes') if pd.notna(row.get('notes')) else None
            )
            
            session.add(employment)
            imported_count += 1
            
        except Exception as e:
            print(f"  Error importing row {index + 1}: {e}")
            error_count += 1
            continue
    
    session.commit()
    
    print(f"  Imported: {imported_count}")
    print(f"  Skipped: {skipped_count}")
    print(f"  Errors: {error_count}")
    
    return imported_count, skipped_count, error_count

def main():
    """Main import function"""
    print("Starting employment data import from Excel...")
    print(f"Import timestamp: {datetime.now().isoformat()}")
    print("-" * 60)
    
    # Check if Excel file exists
    excel_file = pathlib.Path("files/employment.xlsx")
    if not excel_file.exists():
        print(f"Error: Excel file {excel_file} not found!")
        return
    
    try:
        # Read Excel file
        print(f"Reading Excel file: {excel_file}")
        df = pd.read_excel(excel_file)
        print(f"  Found {len(df)} records")
        
        # Validate data
        if not validate_employment_data(df):
            print("Data validation failed. Please fix the issues and try again.")
            return
        
        # Check references
        with Session(engine) as session:
            check_references(session, df)
            
            # Import data
            imported, skipped, errors = import_employment_data(session, df)
            
            # Show final summary
            print("\n" + "=" * 60)
            print("IMPORT SUMMARY")
            print("=" * 60)
            print(f"Total records in file: {len(df)}")
            print(f"Successfully imported: {imported}")
            print(f"Skipped (duplicates): {skipped}")
            print(f"Errors: {errors}")
            
            if imported > 0:
                print(f"\nEmployment data import completed successfully!")
                
                # Show current employment count
                total_employment = session.query(Employment).count()
                print(f"Total employment records in database: {total_employment}")
            else:
                print(f"\nWARNING: No new records were imported.")
    
    except Exception as e:
        print(f"Error during import: {e}")
        return

if __name__ == "__main__":
    main()
