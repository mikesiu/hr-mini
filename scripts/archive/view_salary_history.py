#!/usr/bin/env python3
"""
Script to view salary history for employees.
This demonstrates how salary changes are tracked over time.
"""

import sys
import pathlib

sys.path.append(str(pathlib.Path(__file__).resolve().parents[1]))

from sqlalchemy.orm import Session
from app.models.base import engine
from app.models.employment import Employment
from app.models.employee import Employee
from app.models.company import Company
from datetime import datetime

def get_salary_history(employee_id: str = None):
    """Get salary history for an employee or all employees."""
    
    with Session(engine) as session:
        query = session.query(Employment, Employee, Company).join(
            Employee, Employment.employee_id == Employee.id
        ).join(
            Company, Employment.company_id == Company.id
        )
        
        if employee_id:
            query = query.filter(Employment.employee_id == employee_id)
        
        # Order by employee and start date
        results = query.order_by(Employee.full_name, Employment.start_date).all()
        
        return results

def format_salary_history(records):
    """Format salary history for display."""
    
    if not records:
        print("No employment records found.")
        return
    
    current_employee = None
    print("=" * 80)
    print("SALARY HISTORY REPORT")
    print("=" * 80)
    
    for employment, employee, company in records:
        # New employee section
        if current_employee != employee.id:
            if current_employee is not None:
                print()  # Add spacing between employees
            print(f"\nEMPLOYEE: {employee.full_name} (ID: {employee.id})")
            print("-" * 60)
            current_employee = employee.id
        
        # Employment record
        start_date = employment.start_date.strftime('%Y-%m-%d') if employment.start_date else 'N/A'
        end_date = employment.end_date.strftime('%Y-%m-%d') if employment.end_date else 'Current'
        
        print(f"  Position: {employment.position or 'N/A'}")
        print(f"  Company: {company.legal_name}")
        print(f"  Period: {start_date} to {end_date}")
        
        if employment.pay_rate:
            pay_type = employment.pay_type or 'Unknown'
            print(f"  Salary: ${employment.pay_rate:,.2f} ({pay_type})")
        else:
            print(f"  Salary: Not recorded")
        
        if employment.department:
            print(f"  Department: {employment.department}")
        
        if employment.notes:
            print(f"  Notes: {employment.notes}")
        
        print()

def main():
    """Main function to display salary history."""
    
    print("Salary History Viewer")
    print("====================")
    
    # Get all salary history
    records = get_salary_history()
    
    if not records:
        print("No employment records found in the database.")
        return
    
    format_salary_history(records)
    
    # Summary statistics
    print("\n" + "=" * 80)
    print("SUMMARY STATISTICS")
    print("=" * 80)
    
    # Count employees with salary data
    employees_with_salary = set()
    total_records = 0
    records_with_salary = 0
    
    for employment, employee, company in records:
        total_records += 1
        if employment.pay_rate:
            records_with_salary += 1
            employees_with_salary.add(employee.id)
    
    print(f"Total employment records: {total_records}")
    print(f"Records with salary data: {records_with_salary}")
    print(f"Employees with salary data: {len(employees_with_salary)}")
    
    if records_with_salary > 0:
        percentage = (records_with_salary / total_records) * 100
        print(f"Salary data coverage: {percentage:.1f}%")

if __name__ == "__main__":
    main()
