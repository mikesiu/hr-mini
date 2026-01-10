"""
Script to update an employee's ID and all related foreign key references.
This is a sensitive operation that affects multiple tables.
"""
import sys
from pathlib import Path

# Add the backend directory to the path
sys.path.insert(0, str(Path(__file__).parent.parent / "backend"))

from models.base import SessionLocal
from models.employee import Employee
from sqlalchemy import text
from datetime import datetime

def update_employee_id(old_id: str, new_id: str, confirm: bool = False):
    """
    Update an employee's ID and all related foreign key references.
    
    Args:
        old_id: Current employee ID
        new_id: New employee ID
        confirm: If False, will only show what would be changed
    """
    if not confirm:
        print("DRY RUN MODE - No changes will be made")
        print(f"Would update employee ID from '{old_id}' to '{new_id}'")
        print("\nRun with --confirm to actually make the changes")
        return
    
    with SessionLocal() as session:
        try:
            # Check if employee exists
            employee = session.get(Employee, old_id)
            if not employee:
                print(f"Error: Employee with ID '{old_id}' not found")
                return False
            
            # Check if new ID already exists
            existing = session.get(Employee, new_id)
            if existing:
                print(f"Error: Employee with ID '{new_id}' already exists")
                return False
            
            print(f"Updating employee ID from '{old_id}' to '{new_id}'")
            print(f"Employee: {employee.full_name}")
            
            # Get all tables that reference employees
            # These are the tables that have foreign keys to employees.id
            tables_to_update = [
                'employment',
                'attendance',
                'employee_schedules',
                'employee_documents',
                'expense_entitlements',
                'expense_claims',
                'salary_history',
                'terminations',
                'leaves',
            ]
            
            # Step 1: Temporarily disable foreign key checks
            session.execute(text("SET FOREIGN_KEY_CHECKS = 0"))
            
            # Step 2: Create new employee record with new ID first
            employee_dict = {
                'id': new_id,
                'full_name': employee.full_name,
                'first_name': employee.first_name,
                'last_name': employee.last_name,
                'other_name': employee.other_name,
                'email': employee.email,
                'phone': employee.phone,
                'street': employee.street,
                'city': employee.city,
                'province': employee.province,
                'postal_code': employee.postal_code,
                'dob': employee.dob,
                'sin': employee.sin,
                'drivers_license': employee.drivers_license,
                'hire_date': employee.hire_date,
                'probation_end_date': employee.probation_end_date,
                'seniority_start_date': employee.seniority_start_date,
                'status': employee.status,
                'remarks': employee.remarks,
                'paystub': employee.paystub,
                'union_member': employee.union_member,
                'use_mailing_address': employee.use_mailing_address,
                'mailing_street': employee.mailing_street,
                'mailing_city': employee.mailing_city,
                'mailing_province': employee.mailing_province,
                'mailing_postal_code': employee.mailing_postal_code,
                'emergency_contact_name': employee.emergency_contact_name,
                'emergency_contact_phone': employee.emergency_contact_phone,
                'created_at': employee.created_at,
                'updated_at': datetime.now(),
            }
            
            new_employee = Employee(**employee_dict)
            session.add(new_employee)
            session.flush()  # Flush to get the new employee in the database
            
            # Step 3: Update all foreign key references
            updated_counts = {}
            for table in tables_to_update:
                try:
                    query = text(f"UPDATE {table} SET employee_id = :new_id WHERE employee_id = :old_id")
                    result = session.execute(query, {"old_id": old_id, "new_id": new_id})
                    count = result.rowcount
                    if count > 0:
                        updated_counts[table] = count
                        print(f"  Updated {count} record(s) in {table}")
                except Exception as e:
                    # Table might not exist or column might have different name
                    print(f"  Warning: Could not update {table}: {e}")
            
            # Step 4: Delete old employee record
            session.delete(employee)
            
            # Step 5: Re-enable foreign key checks
            session.execute(text("SET FOREIGN_KEY_CHECKS = 1"))
            
            # Commit all changes
            session.commit()
            
            print(f"\nSuccessfully updated employee ID from '{old_id}' to '{new_id}'")
            print(f"Updated {sum(updated_counts.values())} related records across {len(updated_counts)} tables")
            return True
            
        except Exception as e:
            session.rollback()
            print(f"Error updating employee ID: {e}")
            import traceback
            traceback.print_exc()
            return False

if __name__ == "__main__":
    import argparse
    
    parser = argparse.ArgumentParser(description="Update an employee's ID")
    parser.add_argument("old_id", help="Current employee ID")
    parser.add_argument("new_id", help="New employee ID")
    parser.add_argument("--confirm", action="store_true", help="Actually make the changes (default is dry run)")
    
    args = parser.parse_args()
    
    update_employee_id(args.old_id, args.new_id, confirm=args.confirm)

