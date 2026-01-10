"""
Script to find an employee by name
"""
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent.parent / "backend"))

from models.base import SessionLocal
from models.employee import Employee

def find_employee(name: str):
    """Find employee by name (partial match)"""
    with SessionLocal() as session:
        employees = session.query(Employee).filter(
            Employee.full_name.like(f"%{name}%")
        ).all()
        
        if not employees:
            print(f"No employees found matching '{name}'")
            return
        
        print(f"Found {len(employees)} employee(s):")
        for emp in employees:
            print(f"  ID: {emp.id}, Name: {emp.full_name}")

if __name__ == "__main__":
    import sys
    name = sys.argv[1] if len(sys.argv) > 1 else "Colin"
    find_employee(name)

