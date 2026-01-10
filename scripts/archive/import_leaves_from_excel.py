#!/usr/bin/env python3
"""
Import leave data from Excel file to database.
"""

import pandas as pd
import sys
import os
from datetime import datetime
from typing import Dict, List, Optional

# Add the parent directory to the path so we can import from app
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.repos.leave_repo import list_leave_types, create_leave
from app.repos.employee_repo import get_employee

def get_leave_type_mapping() -> Dict[str, int]:
    """Get mapping from leave type codes to IDs."""
    leave_types = list_leave_types()
    return {lt.code: lt.id for lt in leave_types}

def validate_employee_exists(employee_id: str) -> bool:
    """Check if employee exists in database."""
    return get_employee(employee_id) is not None

def import_leaves_from_excel(file_path: str) -> None:
    """Import leave data from Excel file."""
    print(f"Reading Excel file: {file_path}")
    
    # Read the Excel file
    try:
        df = pd.read_excel(file_path)
        print(f"Found {len(df)} leave records in Excel file")
    except Exception as e:
        print(f"Error reading Excel file: {e}")
        return
    
    # Get leave type mapping
    leave_type_mapping = get_leave_type_mapping()
    print(f"Leave type mapping: {leave_type_mapping}")
    
    # Validate data
    print("\nValidating data...")
    
    # Check for missing required fields
    required_fields = ['employee_id', 'leave_type_id', 'start_date', 'end_date', 'days']
    missing_fields = [field for field in required_fields if field not in df.columns]
    if missing_fields:
        print(f"Error: Missing required fields: {missing_fields}")
        return
    
    # Check for invalid leave types
    invalid_leave_types = set(df['leave_type_id'].unique()) - set(leave_type_mapping.keys())
    if invalid_leave_types:
        print(f"Error: Invalid leave type codes: {invalid_leave_types}")
        return
    
    # Check for non-existent employees
    invalid_employees = []
    for emp_id in df['employee_id'].unique():
        if not validate_employee_exists(emp_id):
            invalid_employees.append(emp_id)
    
    if invalid_employees:
        print(f"Error: Non-existent employees: {invalid_employees}")
        return
    
    print("Data validation passed!")
    
    # Import the data
    print("\nImporting leave records...")
    
    success_count = 0
    error_count = 0
    
    for index, row in df.iterrows():
        try:
            # Convert leave type code to ID
            leave_type_code = row['leave_type_id']
            leave_type_id = leave_type_mapping[leave_type_code]
            
            # Convert dates
            start_date = pd.to_datetime(row['start_date']).date()
            end_date = pd.to_datetime(row['end_date']).date()
            
            # Get other fields
            employee_id = row['employee_id']
            days = float(row['days'])
            note = str(row['note']) if pd.notna(row['note']) else None
            created_by = str(row['created_by']) if pd.notna(row['created_by']) else "Excel Import"
            
            # Handle status - convert old statuses to new ones
            status = str(row['status']) if pd.notna(row['status']) else "Active"
            if status in ["Approved", "Pending"]:
                status = "Active"
            elif status == "Rejected":
                status = "Cancelled"
            
            # Create the leave record
            leave_record = create_leave(
                employee_id=employee_id,
                leave_type_code=leave_type_code,
                start=start_date,
                end=end_date,
                days=days,
                note=note,
                created_by=created_by,
                status=status
            )
            
            print(f"[OK] Imported leave record {leave_record.id} for employee {employee_id} ({leave_type_code})")
            success_count += 1
            
        except Exception as e:
            print(f"[ERROR] Error importing row {index + 1}: {e}")
            error_count += 1
    
    print(f"\nImport completed!")
    print(f"Successfully imported: {success_count} records")
    print(f"Errors: {error_count} records")

def main():
    """Main function."""
    file_path = "files/leave.xlsx"
    
    if not os.path.exists(file_path):
        print(f"Error: File not found: {file_path}")
        return
    
    print("Leave Import Tool")
    print("================")
    
    # Show preview of data
    try:
        df = pd.read_excel(file_path)
        print(f"\nPreview of data to import:")
        print(f"Total records: {len(df)}")
        print(f"Columns: {list(df.columns)}")
        print(f"Date range: {df['start_date'].min()} to {df['end_date'].max()}")
        print(f"Leave types: {sorted(df['leave_type_id'].unique())}")
        print(f"Employees: {sorted(df['employee_id'].unique())}")
        
        # Show sample records
        print(f"\nSample records:")
        print(df.head(3).to_string(index=False))
        
    except Exception as e:
        print(f"Error reading Excel file: {e}")
        return
    
    # Auto-proceed with import
    print(f"\nProceeding with import...")
    
    # Perform import
    import_leaves_from_excel(file_path)

if __name__ == "__main__":
    main()
