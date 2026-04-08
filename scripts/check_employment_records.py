"""
Script to check employment records for an employee
"""
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent.parent / "backend"))

from models.base import SessionLocal
from models.employment import Employment
from models.employee import Employee

def check_employment_records(employee_id: str):
    """Check employment records for an employee"""
    with SessionLocal() as session:
        # Check current employee
        employee = session.get(Employee, employee_id)
        if not employee:
            print(f"Employee {employee_id} not found")
            return
        
        print(f"Employee: {employee.full_name} (ID: {employee.id})")
        
        # Check employment records
        employments = session.query(Employment).filter(
            Employment.employee_id == employee_id
        ).all()
        
        if not employments:
            print(f"\nNo employment records found for {employee_id}")
            
            # Check for orphaned records with old ID
            print("\nChecking for orphaned records with old ID 'COGA-987795'...")
            old_employments = session.query(Employment).filter(
                Employment.employee_id == "COGA-987795"
            ).all()
            
            if old_employments:
                print(f"Found {len(old_employments)} orphaned employment record(s):")
                for emp in old_employments:
                    print(f"  Employment ID: {emp.id}")
                    print(f"  Company ID: {emp.company_id}")
                    print(f"  Start Date: {emp.start_date}")
                    print(f"  End Date: {emp.end_date}")
                    print(f"  Position: {emp.position}")
        else:
            print(f"\nFound {len(employments)} employment record(s):")
            for emp in employments:
                print(f"  Employment ID: {emp.id}")
                print(f"  Company ID: {emp.company_id}")
                print(f"  Start Date: {emp.start_date}")
                print(f"  End Date: {emp.end_date}")
                print(f"  Position: {emp.position}")

if __name__ == "__main__":
    import sys
    employee_id = sys.argv[1] if len(sys.argv) > 1 else "TPR20"
    check_employment_records(employee_id)

