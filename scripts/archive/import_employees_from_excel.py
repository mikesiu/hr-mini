#!/usr/bin/env python3
"""
Script to import employee data from person.xlsx to the database.
This script reads the Excel file and creates employee records in the database.
"""

import pandas as pd
import sys
from pathlib import Path
from datetime import datetime
import sqlite3

# Add the parent directory to the path so we can import app modules
sys.path.append(str(Path(__file__).parent.parent))

from app.config.settings import DB_PATH
from app.repos.employee_repo import create_employee, update_employee, employee_exists

def clean_data(value):
    """Clean and convert data values."""
    if pd.isna(value) or value == '' or value == 'nan':
        return None
    if isinstance(value, str):
        return value.strip()
    return value

def convert_paystub(value):
    """Convert paystub value to boolean."""
    if pd.isna(value) or value == '' or value == 'nan':
        return False
    if isinstance(value, str):
        return value.lower() in ['yes', 'true', '1', 'y']
    return bool(value)

def import_employees():
    """Import employees from Excel file to database."""
    print("Starting employee import from person.xlsx...")
    
    try:
        # Read the Excel file
        df = pd.read_excel('files/person.xlsx')
        print(f"Found {len(df)} employees in Excel file")
        
        # Initialize counters
        created_count = 0
        updated_count = 0
        skipped_count = 0
        error_count = 0
        
        # Process each row
        for index, row in df.iterrows():
            try:
                # Clean and prepare data
                emp_id = clean_data(row['id'])
                if not emp_id:
                    print(f"Row {index + 1}: Skipping - No employee ID")
                    skipped_count += 1
                    continue
                
                first_name = clean_data(row['first_name'])
                last_name = clean_data(row['last_name'])
                
                if not first_name or not last_name:
                    print(f"Row {index + 1} ({emp_id}): Skipping - Missing first_name or last_name")
                    skipped_count += 1
                    continue
                
                # Prepare employee data
                employee_data = {
                    'emp_id': emp_id,
                    'first_name': first_name,
                    'last_name': last_name,
                    'full_name': clean_data(row['full_name']) or f"{first_name} {last_name}",
                    'other_name': clean_data(row['other_name']),
                    'email': clean_data(row['email']),
                    'phone': clean_data(row['phone']),
                    'street': clean_data(row['Street']),
                    'city': clean_data(row['City']),
                    'province': clean_data(row['Province']),
                    'postal_code': clean_data(row['Postal Code']),
                    'dob': row['dob'] if not pd.isna(row['dob']) else None,
                    'sin': clean_data(row['sin']),
                    'hire_date': row['hire_date'] if not pd.isna(row['hire_date']) else None,
                    'probation_end_date': row['probation_end_date'] if not pd.isna(row['probation_end_date']) else None,
                    'status': clean_data(row['status']) or 'Active',
                    'remarks': clean_data(row['remarks']),
                    'paystub': convert_paystub(row['paystub'])
                }
                
                # Check if employee already exists
                if employee_exists(emp_id):
                    print(f"Row {index + 1} ({emp_id}): Employee exists, updating...")
                    
                    # Update existing employee
                    updated_emp = update_employee(emp_id, **{k: v for k, v in employee_data.items() if k != 'emp_id'})
                    if updated_emp:
                        updated_count += 1
                        print(f"  [OK] Updated: {updated_emp.first_name} {updated_emp.last_name}")
                    else:
                        print(f"  [ERROR] Failed to update employee {emp_id}")
                        error_count += 1
                else:
                    print(f"Row {index + 1} ({emp_id}): Creating new employee...")
                    
                    # Create new employee
                    emp = create_employee(
                        emp_id=employee_data['emp_id'],
                        first_name=employee_data['first_name'],
                        last_name=employee_data['last_name'],
                        email=employee_data['email'],
                        hire_date=employee_data['hire_date'],
                        probation_end_date=employee_data['probation_end_date']
                    )
                    
                    if emp:
                        # Update with additional fields
                        update_data = {}
                        for key, value in employee_data.items():
                            if key not in ['emp_id', 'first_name', 'last_name', 'email', 'hire_date', 'probation_end_date'] and value is not None:
                                update_data[key] = value
                        
                        if update_data:
                            update_employee(emp_id, **update_data)
                        
                        created_count += 1
                        print(f"  [OK] Created: {emp.first_name} {emp.last_name}")
                    else:
                        print(f"  [ERROR] Failed to create employee {emp_id}")
                        error_count += 1
                        
            except Exception as e:
                print(f"Row {index + 1}: Error processing employee - {e}")
                error_count += 1
        
        # Print summary
        print(f"\n=== Import Summary ===")
        print(f"Total rows processed: {len(df)}")
        print(f"Created: {created_count}")
        print(f"Updated: {updated_count}")
        print(f"Skipped: {skipped_count}")
        print(f"Errors: {error_count}")
        
        if error_count == 0:
            print("\n[SUCCESS] Import completed successfully!")
        else:
            print(f"\n[WARNING] Import completed with {error_count} errors")
            
    except Exception as e:
        print(f"[ERROR] Import failed: {e}")
        return False
    
    return True

def preview_data():
    """Preview the data that will be imported."""
    print("Previewing data from person.xlsx...")
    
    try:
        df = pd.read_excel('files/person.xlsx')
        
        print(f"\nFound {len(df)} employees:")
        print("-" * 80)
        
        for index, row in df.iterrows():
            emp_id = clean_data(row['id'])
            first_name = clean_data(row['first_name'])
            last_name = clean_data(row['last_name'])
            email = clean_data(row['email'])
            phone = clean_data(row['phone'])
            street = clean_data(row['Street'])
            city = clean_data(row['City'])
            province = clean_data(row['Province'])
            postal_code = clean_data(row['Postal Code'])
            
            print(f"{index + 1:2d}. {emp_id}: {first_name} {last_name}")
            if email:
                print(f"    Email: {email}")
            if phone:
                print(f"    Phone: {phone}")
            if street or city or province or postal_code:
                address_parts = [part for part in [street, city, province, postal_code] if part]
                print(f"    Address: {', '.join(address_parts)}")
            print()
            
    except Exception as e:
        print(f"Error previewing data: {e}")

if __name__ == "__main__":
    if len(sys.argv) > 1 and sys.argv[1] == "--preview":
        preview_data()
    else:
        # Ask for confirmation
        print("This will import employee data from person.xlsx into the database.")
        print("Existing employees with the same ID will be updated.")
        response = input("Do you want to continue? (y/N): ").strip().lower()
        
        if response in ['y', 'yes']:
            success = import_employees()
            sys.exit(0 if success else 1)
        else:
            print("Import cancelled.")
            sys.exit(0)
