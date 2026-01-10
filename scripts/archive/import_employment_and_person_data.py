#!/usr/bin/env python3
"""
Import employment and person data from Excel files into MySQL database.
This script reads data from files/employment.xlsx and files/person.xlsx and imports them.
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
from app.models.salary_history import SalaryHistory

def clean_data(value):
    """Clean and convert data values"""
    if pd.isna(value) or value == '':
        return None
    if isinstance(value, str):
        return value.strip()
    return value

def parse_full_name(full_name):
    """Parse full_name to extract first_name and last_name"""
    if pd.isna(full_name) or not full_name:
        return None, None
    
    # Handle format like "Commodore, Wilf" or "Xiao Ming Shu"
    if ',' in full_name:
        # Format: "Last, First"
        parts = full_name.split(',', 1)
        last_name = parts[0].strip()
        first_name = parts[1].strip() if len(parts) > 1 else ""
    else:
        # Format: "First Last" or "First Middle Last"
        parts = full_name.strip().split()
        if len(parts) >= 2:
            first_name = parts[0]
            last_name = ' '.join(parts[1:])
        else:
            first_name = full_name
            last_name = ""
    
    return first_name, last_name

def convert_paystub(value):
    """Convert paystub value to boolean"""
    if pd.isna(value) or value == '':
        return False
    if isinstance(value, str):
        return value.lower() in ['yes', 'true', '1', 'y']
    return bool(value)

def validate_employee_data(df):
    """Validate the employee data before import"""
    print("Validating employee data...")
    
    issues = []
    
    # Check required columns
    required_columns = ['id', 'full_name']
    missing_columns = [col for col in required_columns if col not in df.columns]
    if missing_columns:
        issues.append(f"Missing required columns: {missing_columns}")
    
    # Check for empty employee IDs
    empty_ids = df['id'].isna().sum()
    if empty_ids > 0:
        issues.append(f"Found {empty_ids} records with empty employee ID")
    
    # Check for empty full names
    empty_full_names = df['full_name'].isna().sum()
    if empty_full_names > 0:
        issues.append(f"Found {empty_full_names} records with empty full_name")
    
    # Parse names and check for valid first/last names
    valid_names = 0
    for index, row in df.iterrows():
        if pd.notna(row.get('full_name')):
            first_name, last_name = parse_full_name(row['full_name'])
            if first_name and last_name:
                valid_names += 1
    
    if valid_names < len(df):
        issues.append(f"Only {valid_names} out of {len(df)} records have valid names after parsing")
    
    # Check date formats
    required_date_columns = ['dob', 'hire_date']
    optional_date_columns = ['probation_end_date']
    
    for col in required_date_columns:
        if col in df.columns:
            try:
                df[col] = pd.to_datetime(df[col], errors='coerce')
                invalid_dates = df[col].isna().sum()
                if invalid_dates > 0:
                    issues.append(f"Found {invalid_dates} records with invalid {col}")
            except Exception as e:
                issues.append(f"Error parsing {col}: {e}")
    
    for col in optional_date_columns:
        if col in df.columns:
            try:
                df[col] = pd.to_datetime(df[col], errors='coerce')
                # Don't count NaT as invalid for optional fields
            except Exception as e:
                issues.append(f"Error parsing {col}: {e}")
    
    if issues:
        print("Validation issues found:")
        for issue in issues:
            print(f"  - {issue}")
        return False
    
    print("Employee data validation passed!")
    return True

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
    
    if issues:
        print("Validation issues found:")
        for issue in issues:
            print(f"  - {issue}")
        return False
    
    print("Employment data validation passed!")
    return True

def check_company_references(session, df):
    """Check if all company IDs in employment data exist"""
    print("Checking company references...")
    
    company_ids = df['company_id'].unique()
    existing_companies = session.query(Company.id).filter(Company.id.in_(company_ids)).all()
    existing_company_ids = {c.id for c in existing_companies}
    
    missing_companies = set(company_ids) - existing_company_ids
    if missing_companies:
        print(f"Warning: The following companies do not exist in the database: {missing_companies}")
        print("These employment records will be skipped.")
        return False
    
    print("All company references are valid!")
    return True

def import_employee_data(session, df):
    """Import employee data into the database"""
    print("Importing employee data...")
    
    imported_count = 0
    updated_count = 0
    skipped_count = 0
    error_count = 0
    
    for index, row in df.iterrows():
        try:
            # Clean and prepare data
            emp_id = clean_data(row['id'])
            if not emp_id:
                print(f"  Row {index + 1}: Skipping - No employee ID")
                skipped_count += 1
                continue
            
            # Parse names from full_name
            full_name = clean_data(row.get('full_name'))
            first_name, last_name = parse_full_name(full_name)
            
            if not first_name or not last_name:
                print(f"  Row {index + 1} ({emp_id}): Skipping - Could not parse valid first_name and last_name from '{full_name}'")
                skipped_count += 1
                continue
            
            # Check if employee already exists
            existing_employee = session.query(Employee).filter(Employee.id == emp_id).first()
            
            if existing_employee:
                # Update existing employee
                existing_employee.full_name = full_name
                existing_employee.first_name = first_name
                existing_employee.last_name = last_name
                existing_employee.other_name = clean_data(row.get('other_name'))
                existing_employee.email = clean_data(row.get('email'))
                existing_employee.phone = clean_data(row.get('phone'))
                existing_employee.street = clean_data(row.get('Street'))
                existing_employee.city = clean_data(row.get('City'))
                existing_employee.province = clean_data(row.get('Province'))
                existing_employee.postal_code = clean_data(row.get('Postal Code'))
                existing_employee.dob = row['dob'].date() if pd.notna(row.get('dob')) else None
                existing_employee.sin = clean_data(row.get('sin'))
                existing_employee.hire_date = row['hire_date'].date() if pd.notna(row.get('hire_date')) else None
                existing_employee.probation_end_date = row['probation_end_date'].date() if pd.notna(row.get('probation_end_date')) else None
                existing_employee.status = clean_data(row.get('status'))
                existing_employee.remarks = clean_data(row.get('remarks'))
                existing_employee.paystub = convert_paystub(row.get('paystub'))
                
                updated_count += 1
                print(f"  Row {index + 1} ({emp_id}): Updated existing employee")
            else:
                # Create new employee
                employee = Employee(
                    id=emp_id,
                    full_name=full_name,
                    first_name=first_name,
                    last_name=last_name,
                    other_name=clean_data(row.get('other_name')),
                    email=clean_data(row.get('email')),
                    phone=clean_data(row.get('phone')),
                    street=clean_data(row.get('Street')),
                    city=clean_data(row.get('City')),
                    province=clean_data(row.get('Province')),
                    postal_code=clean_data(row.get('Postal Code')),
                    dob=row['dob'].date() if pd.notna(row.get('dob')) else None,
                    sin=clean_data(row.get('sin')),
                    hire_date=row['hire_date'].date() if pd.notna(row.get('hire_date')) else None,
                    probation_end_date=row['probation_end_date'].date() if pd.notna(row.get('probation_end_date')) else None,
                    status=clean_data(row.get('status')),
                    remarks=clean_data(row.get('remarks')),
                    paystub=convert_paystub(row.get('paystub'))
                )
                
                session.add(employee)
                imported_count += 1
                print(f"  Row {index + 1} ({emp_id}): Created new employee")
            
        except Exception as e:
            print(f"  Row {index + 1} ({emp_id}): Error - {e}")
            error_count += 1
            continue
    
    session.commit()
    
    print(f"  Imported: {imported_count}")
    print(f"  Updated: {updated_count}")
    print(f"  Skipped: {skipped_count}")
    print(f"  Errors: {error_count}")
    
    return imported_count, updated_count, skipped_count, error_count

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
                print(f"  Row {index + 1}: Skipping - Employment record already exists")
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
                notes=row.get('notes') if pd.notna(row.get('notes')) else None
            )
            
            session.add(employment)
            session.flush()  # Flush to get the employment ID
            
            # Create salary history record if pay_rate and pay_type are provided
            if pd.notna(row.get('pay_rate')) and pd.notna(row.get('pay_type')):
                salary_history = SalaryHistory(
                    employment_id=employment.id,
                    pay_rate=row['pay_rate'],
                    pay_type=row['pay_type'],
                    effective_date=row['start_date'].date() if pd.notna(row['start_date']) else None,
                    end_date=row['end_date'].date() if 'end_date' in row and pd.notna(row['end_date']) else None,
                    notes=row.get('notes') if pd.notna(row.get('notes')) else None
                )
                session.add(salary_history)
            
            imported_count += 1
            print(f"  Row {index + 1} ({row['employee_id']}): Created employment record with salary history")
            
        except Exception as e:
            print(f"  Row {index + 1}: Error - {e}")
            error_count += 1
            continue
    
    session.commit()
    
    print(f"  Imported: {imported_count}")
    print(f"  Skipped: {skipped_count}")
    print(f"  Errors: {error_count}")
    
    return imported_count, skipped_count, error_count

def main():
    """Main import function"""
    print("Starting employment and person data import from Excel...")
    print(f"Import timestamp: {datetime.now().isoformat()}")
    print("=" * 80)
    
    # Check if Excel files exist
    employment_file = pathlib.Path("files/employment.xlsx")
    person_file = pathlib.Path("files/person.xlsx")
    
    if not employment_file.exists():
        print(f"Error: Employment file {employment_file} not found!")
        return
    
    if not person_file.exists():
        print(f"Error: Person file {person_file} not found!")
        return
    
    try:
        # Read Excel files
        print(f"Reading employment file: {employment_file}")
        df_employment = pd.read_excel(employment_file)
        print(f"  Found {len(df_employment)} employment records")
        
        print(f"Reading person file: {person_file}")
        df_person = pd.read_excel(person_file)
        print(f"  Found {len(df_person)} person records")
        
        # Validate data
        print("\n" + "-" * 60)
        print("VALIDATING DATA")
        print("-" * 60)
        
        if not validate_employee_data(df_person):
            print("Employee data validation failed. Please fix the issues and try again.")
            return
        
        if not validate_employment_data(df_employment):
            print("Employment data validation failed. Please fix the issues and try again.")
            return
        
        # Import data
        print("\n" + "-" * 60)
        print("IMPORTING DATA")
        print("-" * 60)
        
        with Session(engine) as session:
            # Check company references
            if not check_company_references(session, df_employment):
                print("Some employment records will be skipped due to missing company references.")
            
            # Import employee data first
            print("\n1. Importing Employee Data")
            print("-" * 30)
            emp_imported, emp_updated, emp_skipped, emp_errors = import_employee_data(session, df_person)
            
            # Import employment data
            print("\n2. Importing Employment Data")
            print("-" * 30)
            emp_job_imported, emp_job_skipped, emp_job_errors = import_employment_data(session, df_employment)
            
            # Show final summary
            print("\n" + "=" * 80)
            print("IMPORT SUMMARY")
            print("=" * 80)
            print(f"Employee Data:")
            print(f"  Total records in file: {len(df_person)}")
            print(f"  Successfully imported: {emp_imported}")
            print(f"  Updated existing: {emp_updated}")
            print(f"  Skipped: {emp_skipped}")
            print(f"  Errors: {emp_errors}")
            
            print(f"\nEmployment Data:")
            print(f"  Total records in file: {len(df_employment)}")
            print(f"  Successfully imported: {emp_job_imported}")
            print(f"  Skipped (duplicates): {emp_job_skipped}")
            print(f"  Errors: {emp_job_errors}")
            
            # Show current counts
            total_employees = session.query(Employee).count()
            total_employment = session.query(Employment).count()
            print(f"\nCurrent Database Counts:")
            print(f"  Total employees: {total_employees}")
            print(f"  Total employment records: {total_employment}")
            
            if emp_imported > 0 or emp_updated > 0 or emp_job_imported > 0:
                print(f"\nData import completed successfully!")
            else:
                print(f"\nWARNING: No new records were imported.")
    
    except Exception as e:
        print(f"Error during import: {e}")
        import traceback
        traceback.print_exc()
        return

if __name__ == "__main__":
    main()
