"""
Script to check all data for Colin to determine which company he belongs to
"""
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent.parent / "backend"))

from models.base import SessionLocal
from models.attendance import Attendance
from models.employee_schedule import EmployeeSchedule
from sqlalchemy import text

def check_colin_data():
    """Check all data for Colin to determine company"""
    with SessionLocal() as session:
        employee_id = "TPR20"
        
        print(f"Checking data for employee ID: {employee_id}\n")
        
        # Check employee schedules to find company
        schedule_query = text("""
            SELECT DISTINCT ws.company_id, ws.name as schedule_name
            FROM employee_schedules es
            JOIN work_schedules ws ON es.schedule_id = ws.id
            WHERE es.employee_id = :emp_id
        """)
        result = session.execute(schedule_query, {"emp_id": employee_id})
        schedule_data = result.fetchall()
        
        if schedule_data:
            print("Employee schedules found (indicating company):")
            for row in schedule_data:
                print(f"  Company ID: {row[0]}, Schedule: {row[1]}")
        else:
            print("No employee schedules found")
        
        # Check employee schedules
        schedule_query = text("""
            SELECT es.schedule_id, ws.company_id, ws.name
            FROM employee_schedules es
            JOIN work_schedules ws ON es.schedule_id = ws.id
            WHERE es.employee_id = :emp_id
        """)
        result = session.execute(schedule_query, {"emp_id": employee_id})
        schedule_data = result.fetchall()
        
        if schedule_data:
            print("\nEmployee schedules found:")
            for row in schedule_data:
                print(f"  Schedule ID: {row[0]}, Company ID: {row[1]}, Schedule Name: {row[2]}")
        else:
            print("\nNo employee schedules found")
        
        # Check if there are any other employees to see which company is most common
        companies_query = text("""
            SELECT DISTINCT company_id
            FROM employment
            WHERE company_id IS NOT NULL
            LIMIT 10
        """)
        result = session.execute(companies_query)
        companies = result.fetchall()
        
        if companies:
            print("\nAvailable companies in system:")
            for row in companies:
                print(f"  {row[0]}")
        
        # Check for any other references
        print("\nChecking for any other references...")
        # You might want to add more checks here

if __name__ == "__main__":
    check_colin_data()

