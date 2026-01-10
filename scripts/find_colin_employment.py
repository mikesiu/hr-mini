"""
Script to find and link employment records for Colin
"""
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent.parent / "backend"))

from models.base import SessionLocal
from models.employment import Employment
from models.employee import Employee
from sqlalchemy import text

def find_and_link_employment():
    """Find orphaned employment records and link them to Colin"""
    with SessionLocal() as session:
        # Check for employee
        employee = session.get(Employee, "TPR20")
        if not employee:
            print("Employee TPR20 (Colin) not found")
            return
        
        print(f"Employee: {employee.full_name} (ID: {employee.id})")
        
        # Check all employment records to see if any might belong to Colin
        # Look for records that might have been missed
        all_employments = session.query(Employment).all()
        
        print(f"\nTotal employment records in database: {len(all_employments)}")
        
        # Check for records with old ID
        old_employments = session.query(Employment).filter(
            Employment.employee_id == "COGA-987795"
        ).all()
        
        if old_employments:
            print(f"\nFound {len(old_employments)} employment record(s) with old ID 'COGA-987795':")
            for emp in old_employments:
                print(f"  Employment ID: {emp.id}, Company: {emp.company_id}, Start: {emp.start_date}")
            
            # Update them
            print("\nUpdating employment records to new ID...")
            session.execute(
                text("UPDATE employment SET employee_id = :new_id WHERE employee_id = :old_id"),
                {"new_id": "TPR20", "old_id": "COGA-987795"}
            )
            session.commit()
            print(f"Successfully updated {len(old_employments)} employment record(s)")
        else:
            # Check if there are any employment records without a valid employee
            print("\nChecking for orphaned employment records...")
            query = text("""
                SELECT e.id, e.employee_id, e.company_id, e.start_date
                FROM employment e
                LEFT JOIN employees emp ON e.employee_id = emp.id
                WHERE emp.id IS NULL
            """)
            result = session.execute(query)
            orphaned = result.fetchall()
            
            if orphaned:
                print(f"Found {len(orphaned)} orphaned employment record(s):")
                for row in orphaned:
                    print(f"  Employment ID: {row[0]}, Employee ID: {row[1]}, Company: {row[2]}, Start: {row[3]}")
                    
                # Check if any of these might be Colin's
                for row in orphaned:
                    emp_id = row[1]
                    if emp_id == "COGA-987795" or "COGA" in str(emp_id) or "CO" in str(emp_id):
                        print(f"\n  Found potential Colin record with employee_id: {emp_id}")
                        print(f"  Updating to TPR20...")
                        session.execute(
                            text("UPDATE employment SET employee_id = :new_id WHERE id = :emp_id"),
                            {"new_id": "TPR20", "emp_id": row[0]}
                        )
                        session.commit()
                        print(f"  Updated employment record {row[0]}")
            else:
                print("No orphaned employment records found")
                
                # Check if we need to create a new employment record
                print("\nChecking if we need to create a new employment record...")
                # You might want to manually create one if needed

if __name__ == "__main__":
    find_and_link_employment()

