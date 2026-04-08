"""
Script to create an employment record for Colin (TPR20)
"""
import sys
from pathlib import Path
from datetime import date

sys.path.insert(0, str(Path(__file__).parent.parent / "backend"))

from models.base import SessionLocal
from models.employment import Employment
from models.employee import Employee

def create_employment_record():
    """Create employment record for Colin"""
    with SessionLocal() as session:
        employee_id = "TPR20"
        company_id = "TP"  # Based on the employee ID pattern
        
        # Check if employee exists
        employee = session.get(Employee, employee_id)
        if not employee:
            print(f"Employee {employee_id} not found")
            return
        
        print(f"Employee: {employee.full_name} (ID: {employee.id})")
        
        # Check if employment record already exists
        existing = session.query(Employment).filter(
            Employment.employee_id == employee_id
        ).first()
        
        if existing:
            print(f"Employment record already exists:")
            print(f"  ID: {existing.id}")
            print(f"  Company: {existing.company_id}")
            print(f"  Start Date: {existing.start_date}")
            print(f"  End Date: {existing.end_date}")
            return
        
        # Get employee hire date if available
        start_date = employee.hire_date if employee.hire_date else date.today()
        
        # Create new employment record
        employment = Employment(
            employee_id=employee_id,
            company_id=company_id,
            start_date=start_date,
            end_date=None,  # Active employment
            position=None,  # Can be updated later
            is_driver=False,  # Default, can be updated later
        )
        
        session.add(employment)
        session.commit()
        session.refresh(employment)
        
        print(f"\nSuccessfully created employment record:")
        print(f"  ID: {employment.id}")
        print(f"  Employee: {employee.full_name}")
        print(f"  Company: {company_id}")
        print(f"  Start Date: {start_date}")
        print(f"  End Date: None (Active)")

if __name__ == "__main__":
    import argparse
    parser = argparse.ArgumentParser(description="Create employment record for Colin")
    parser.add_argument("--company", default="TP", help="Company ID (default: TP)")
    args = parser.parse_args()
    
    # Update company_id if provided
    if args.company != "TP":
        import sys
        sys.path.insert(0, str(Path(__file__).parent.parent / "backend"))
        from scripts.create_employment_for_colin import create_employment_record
        # This would need to be modified to use args.company
        pass
    
    create_employment_record()

