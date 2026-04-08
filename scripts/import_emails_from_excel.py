#!/usr/bin/env python3
"""
Script to import email addresses from email.xlsx into the employee database.
Matches employees by name and updates their email addresses.
"""

import sys
from pathlib import Path
import pandas as pd

# Add the backend directory to the Python path
backend_dir = Path(__file__).parent.parent / "backend"
sys.path.insert(0, str(backend_dir))

from models.base import SessionLocal
from models.employee import Employee
from repos.employee_repo import update_employee, search_employees
from sqlalchemy import select


def normalize_name(name: str) -> str:
    """Normalize name for comparison: strip whitespace, uppercase, remove extra spaces."""
    if not name:
        return ""
    return " ".join(name.strip().upper().split())


def find_employee_by_name(name: str, employees: list[Employee]) -> list[Employee]:
    """
    Find employees matching the given name.
    Returns list of matching employees.
    """
    normalized_input = normalize_name(name)
    if not normalized_input:
        return []
    
    matches = []
    
    for emp in employees:
        # Try exact full_name match (case-insensitive)
        if emp.full_name:
            if normalize_name(emp.full_name) == normalized_input:
                matches.append(emp)
                continue
        
        # Try first_name + last_name combination match
        if emp.first_name and emp.last_name:
            full_name_from_parts = normalize_name(f"{emp.first_name} {emp.last_name}")
            if full_name_from_parts == normalized_input:
                matches.append(emp)
                continue
    
    return matches


def import_emails_from_excel(file_path: str = "files/email.xlsx", update_existing: bool = False):
    """
    Import email addresses from Excel file into employee database.
    
    Args:
        file_path: Path to the Excel file
        update_existing: If True, update emails even if they already exist. 
                         If False, skip employees that already have emails.
    """
    print(f"Reading email file: {file_path}")
    
    try:
        # Read Excel file
        df = pd.read_excel(file_path)
        
        # Check required columns
        if 'Name' not in df.columns or 'E-mail Address' not in df.columns:
            print("ERROR: Excel file must contain 'Name' and 'E-mail Address' columns")
            print(f"Found columns: {df.columns.tolist()}")
            return False
        
        print(f"Found {len(df)} rows in Excel file")
        
        # Get all employees from database
        print("Loading employees from database...")
        all_employees = search_employees("")
        print(f"Found {len(all_employees)} employees in database")
        
        # Statistics
        stats = {
            'total_rows': len(df),
            'matched': 0,
            'updated': 0,
            'skipped_existing': 0,
            'not_found': [],
            'multiple_matches': [],
            'errors': []
        }
        
        # Process each row
        print("\nProcessing email imports...")
        print("-" * 80)
        
        for index, row in df.iterrows():
            name = str(row['Name']).strip() if pd.notna(row['Name']) else ""
            email = str(row['E-mail Address']).strip() if pd.notna(row['E-mail Address']) else ""
            
            if not name:
                stats['errors'].append(f"Row {index + 2}: Missing name")
                continue
            
            if not email:
                stats['errors'].append(f"Row {index + 2}: Missing email for {name}")
                continue
            
            # Find matching employee(s)
            matches = find_employee_by_name(name, all_employees)
            
            if not matches:
                stats['not_found'].append({
                    'row': index + 2,
                    'name': name,
                    'email': email
                })
                print(f"[X] Row {index + 2}: No match found for '{name}'")
                continue
            
            if len(matches) > 1:
                stats['multiple_matches'].append({
                    'row': index + 2,
                    'name': name,
                    'email': email,
                    'matches': [f"{m.id} - {m.full_name}" for m in matches]
                })
                print(f"[!] Row {index + 2}: Multiple matches for '{name}': {[m.id for m in matches]}")
                continue
            
            # Single match found
            employee = matches[0]
            stats['matched'] += 1
            
            # Check if email already exists
            if employee.email and not update_existing:
                stats['skipped_existing'] += 1
                print(f"[>] Row {index + 2}: Skipped {employee.id} ({employee.full_name}) - email already exists: {employee.email}")
                continue
            
            # Update email
            try:
                update_employee(
                    employee.id,
                    email=email,
                    performed_by="Email Import Script"
                )
                stats['updated'] += 1
                old_email = f" (was: {employee.email})" if employee.email else ""
                print(f"[OK] Row {index + 2}: Updated {employee.id} ({employee.full_name}) - {email}{old_email}")
            except Exception as e:
                stats['errors'].append(f"Row {index + 2}: Error updating {employee.id} - {str(e)}")
                print(f"[ERR] Row {index + 2}: Error updating {employee.id} ({employee.full_name}): {str(e)}")
        
        # Print summary
        print("\n" + "=" * 80)
        print("IMPORT SUMMARY")
        print("=" * 80)
        print(f"Total rows processed: {stats['total_rows']}")
        print(f"Matched employees: {stats['matched']}")
        print(f"Email addresses updated: {stats['updated']}")
        print(f"Skipped (already has email): {stats['skipped_existing']}")
        print(f"Not found: {len(stats['not_found'])}")
        print(f"Multiple matches: {len(stats['multiple_matches'])}")
        print(f"Errors: {len(stats['errors'])}")
        
        if stats['not_found']:
            print("\n" + "-" * 80)
            print("EMPLOYEES NOT FOUND:")
            print("-" * 80)
            for item in stats['not_found']:
                print(f"  Row {item['row']}: {item['name']} ({item['email']})")
        
        if stats['multiple_matches']:
            print("\n" + "-" * 80)
            print("MULTIPLE MATCHES (manual review needed):")
            print("-" * 80)
            for item in stats['multiple_matches']:
                print(f"  Row {item['row']}: {item['name']} ({item['email']})")
                for match in item['matches']:
                    print(f"    - {match}")
        
        if stats['errors']:
            print("\n" + "-" * 80)
            print("ERRORS:")
            print("-" * 80)
            for error in stats['errors']:
                print(f"  {error}")
        
        print("\n" + "=" * 80)
        
        return True
        
    except FileNotFoundError:
        print(f"ERROR: File not found: {file_path}")
        return False
    except Exception as e:
        print(f"ERROR: {str(e)}")
        import traceback
        traceback.print_exc()
        return False


if __name__ == "__main__":
    import argparse
    
    parser = argparse.ArgumentParser(description='Import email addresses from Excel file')
    parser.add_argument(
        '--file',
        type=str,
        default='files/email.xlsx',
        help='Path to Excel file (default: files/email.xlsx)'
    )
    parser.add_argument(
        '--update-existing',
        action='store_true',
        help='Update emails even if employee already has an email address'
    )
    
    args = parser.parse_args()
    
    success = import_emails_from_excel(
        file_path=args.file,
        update_existing=args.update_existing
    )
    
    sys.exit(0 if success else 1)

