#!/usr/bin/env python3
"""
Verify the imported employment and person data
"""

import sys
import pathlib

# Add parent directory to path
sys.path.append(str(pathlib.Path(__file__).resolve().parents[1]))

from app.models.base import engine
from sqlalchemy.orm import Session
from app.models.employee import Employee
from app.models.employment import Employment
from app.models.salary_history import SalaryHistory

def main():
    """Verify the imported data"""
    print("Verifying imported employment and person data...")
    print("=" * 60)
    
    with Session(engine) as session:
        # Check recent employees (TPR series)
        print("Recent employees (TPR series):")
        recent_emps = session.query(Employee).filter(Employee.id.like('TPR%')).all()
        for emp in recent_emps:
            print(f"  {emp.id}: {emp.full_name} ({emp.first_name} {emp.last_name})")
            print(f"    Email: {emp.email}, Phone: {emp.phone}")
            print(f"    Status: {emp.status}, Hire Date: {emp.hire_date}")
            print()
        
        print("Recent employment records:")
        recent_jobs = session.query(Employment).join(Employee).filter(Employee.id.like('TPR%')).all()
        for job in recent_jobs:
            salary_info = "No salary data"
            if job.salary_history:
                salary = job.salary_history[0]
                salary_info = f"${salary.pay_rate} {salary.pay_type}"
            
            print(f"  {job.employee_id} at {job.company_id}: {job.position}")
            print(f"    Department: {job.department}")
            print(f"    Start: {job.start_date}, End: {job.end_date}")
            print(f"    Salary: {salary_info}")
            print()
        
        # Check PR8 employee
        print("PR8 employee:")
        pr8_emp = session.query(Employee).filter(Employee.id == 'PR8').first()
        if pr8_emp:
            print(f"  {pr8_emp.id}: {pr8_emp.full_name} ({pr8_emp.first_name} {pr8_emp.last_name})")
            print(f"    Email: {pr8_emp.email}, Phone: {pr8_emp.phone}")
            print(f"    Status: {pr8_emp.status}, Hire Date: {pr8_emp.hire_date}")
            
            pr8_job = session.query(Employment).filter(Employment.employee_id == 'PR8').first()
            if pr8_job:
                salary_info = "No salary data"
                if pr8_job.salary_history:
                    salary = pr8_job.salary_history[0]
                    salary_info = f"${salary.pay_rate} {salary.pay_type}"
                
                print(f"    Employment: {pr8_job.position} at {pr8_job.company_id}")
                print(f"    Department: {pr8_job.department}")
                print(f"    Start: {pr8_job.start_date}, End: {pr8_job.end_date}")
                print(f"    Salary: {salary_info}")
        
        # Summary counts
        print("\n" + "=" * 60)
        print("SUMMARY COUNTS")
        print("=" * 60)
        total_employees = session.query(Employee).count()
        total_employment = session.query(Employment).count()
        total_salary_history = session.query(SalaryHistory).count()
        
        print(f"Total employees: {total_employees}")
        print(f"Total employment records: {total_employment}")
        print(f"Total salary history records: {total_salary_history}")

if __name__ == "__main__":
    main()