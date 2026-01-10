#!/usr/bin/env python3
"""
Import expense data from Excel file into the database.
This script reads the Entitle and Claim sheets from the expenses.xlsx file
and imports them into the expense_entitlements and expense_claims tables.
"""

import pandas as pd
import sys
import os
from datetime import datetime, date
from pathlib import Path

# Add the parent directory to the path so we can import from app
sys.path.append(str(Path(__file__).parent.parent))

from app.models.base import SessionLocal, engine
from app.models.expense_entitlement import ExpenseEntitlement
from app.models.expense_claim import ExpenseClaim
from app.models.employee import Employee
from app.repos.employee_repo import employee_exists


def create_tables():
    """Create the expense tables if they don't exist"""
    print("Creating expense tables...")
    ExpenseEntitlement.__table__.create(engine, checkfirst=True)
    ExpenseClaim.__table__.create(engine, checkfirst=True)
    print("Tables created successfully!")


def import_entitlements(excel_file: str):
    """Import entitlements from the Entitle sheet"""
    print("Importing entitlements...")
    
    try:
        # Read the Entitle sheet
        df_entitle = pd.read_excel(excel_file, sheet_name='Entitle')
        print(f"Found {len(df_entitle)} entitlement records")
        
        # Clean the data
        df_entitle = df_entitle.dropna(subset=['Emp No', 'Expense Type'])
        df_entitle['Emp No'] = df_entitle['Emp No'].astype(str).str.strip()
        df_entitle['Expense Type'] = df_entitle['Expense Type'].astype(str).str.strip()
        
        # Convert dates
        df_entitle['Start Date'] = pd.to_datetime(df_entitle['Start Date'], errors='coerce').dt.date
        df_entitle['End Date'] = pd.to_datetime(df_entitle['End Date'], errors='coerce').dt.date
        
        # Convert entitlement amount
        df_entitle['Entitlement'] = pd.to_numeric(df_entitle['Entitlement'], errors='coerce')
        
        with SessionLocal() as session:
            imported_count = 0
            skipped_count = 0
            next_entitlement_id = 1
            
            for _, row in df_entitle.iterrows():
                emp_no = row['Emp No']
                expense_type = row['Expense Type']
                
                # Check if employee exists
                if not employee_exists(emp_no):
                    print(f"Warning: Employee {emp_no} not found, skipping entitlement")
                    skipped_count += 1
                    continue
                
                # Generate entitlement ID
                entitlement_id = f"ENT{next_entitlement_id:03d}"
                next_entitlement_id += 1
                
                # Create entitlement
                entitlement = ExpenseEntitlement(
                    id=entitlement_id,
                    employee_id=emp_no,
                    expense_type=expense_type,
                    entitlement_amount=row['Entitlement'] if pd.notna(row['Entitlement']) else None,
                    unit=row['Unit'] if pd.notna(row['Unit']) else 'monthly',
                    start_date=row['Start Date'] if pd.notna(row['Start Date']) else None,
                    end_date=row['End Date'] if pd.notna(row['End Date']) else None,
                    is_active="Yes"
                )
                
                session.add(entitlement)
                imported_count += 1
            
            session.commit()
            print(f"Successfully imported {imported_count} entitlements")
            if skipped_count > 0:
                print(f"Skipped {skipped_count} entitlements due to missing employees")
                
    except Exception as e:
        print(f"Error importing entitlements: {str(e)}")
        raise


def import_claims(excel_file: str):
    """Import claims from the Claim sheet"""
    print("Importing claims...")
    
    try:
        # Read the Claim sheet
        df_claim = pd.read_excel(excel_file, sheet_name='Claim')
        print(f"Found {len(df_claim)} claim records")
        
        # Clean the data
        df_claim = df_claim.dropna(subset=['Emp no', 'Type', 'Receipts Amount', 'Claims Amount'])
        df_claim['Emp no'] = df_claim['Emp no'].astype(str).str.strip()
        df_claim['Type'] = df_claim['Type'].astype(str).str.strip()
        
        # Convert dates
        df_claim['Paid Date'] = pd.to_datetime(df_claim['Paid Date'], errors='coerce').dt.date
        
        # Convert amounts
        df_claim['Receipts Amount'] = pd.to_numeric(df_claim['Receipts Amount'], errors='coerce')
        df_claim['Claims Amount'] = pd.to_numeric(df_claim['Claims Amount'], errors='coerce')
        
        with SessionLocal() as session:
            imported_count = 0
            skipped_count = 0
            next_claim_id = 1
            
            for _, row in df_claim.iterrows():
                emp_no = row['Emp no']
                expense_type = row['Type']
                
                # Check if employee exists
                if not employee_exists(emp_no):
                    print(f"Warning: Employee {emp_no} not found, skipping claim")
                    skipped_count += 1
                    continue
                
                # Skip if required data is missing
                if pd.isna(row['Paid Date']) or pd.isna(row['Receipts Amount']) or pd.isna(row['Claims Amount']):
                    print(f"Warning: Missing required data for claim, skipping")
                    skipped_count += 1
                    continue
                
                # Generate claim ID
                claim_id = f"CLM{next_claim_id:03d}"
                next_claim_id += 1
                
                # Create claim
                claim = ExpenseClaim(
                    id=claim_id,
                    employee_id=emp_no,
                    paid_date=row['Paid Date'],
                    expense_type=expense_type,
                    receipts_amount=float(row['Receipts Amount']),
                    claims_amount=float(row['Claims Amount']),
                    paid_status=row['Paid'] if pd.notna(row['Paid']) else 'Pending',
                    is_approved=row['Paid'] not in ['Pending', None] if pd.notna(row['Paid']) else False,
                    approval_date=row['Paid Date'] if row['Paid'] not in ['Pending', None] and pd.notna(row['Paid']) else None
                )
                
                session.add(claim)
                imported_count += 1
            
            session.commit()
            print(f"Successfully imported {imported_count} claims")
            if skipped_count > 0:
                print(f"Skipped {skipped_count} claims due to missing data or employees")
                
    except Exception as e:
        print(f"Error importing claims: {str(e)}")
        raise


def main():
    """Main function to import expense data"""
    excel_file = "files/expenses.xlsx"
    
    if not os.path.exists(excel_file):
        print(f"Error: Excel file {excel_file} not found!")
        print("Please make sure the file exists in the files/ directory.")
        return
    
    print("Starting expense data import...")
    print(f"Reading from: {excel_file}")
    
    try:
        # Create tables
        create_tables()
        
        # Import entitlements
        import_entitlements(excel_file)
        
        # Import claims
        import_claims(excel_file)
        
        print("\nSUCCESS: Expense data import completed successfully!")
        print("\nNext steps:")
        print("1. Run the application: streamlit run app.py")
        print("2. Navigate to 'Expense Reimbursement' page")
        print("3. Verify the imported data")
        
    except Exception as e:
        print(f"\nERROR: Error during import: {str(e)}")
        print("Please check the error message and try again.")


if __name__ == "__main__":
    main()
