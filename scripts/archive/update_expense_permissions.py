#!/usr/bin/env python3
"""
Script to update existing roles with expense reimbursement permissions.
This adds the expense:manage permission to appropriate existing roles.
"""

import sys
import pathlib

sys.path.append(str(pathlib.Path(__file__).resolve().parents[1]))

from app.repos.user_repo import ensure_role, list_roles

def main():
    """Update existing roles with expense permissions."""
    
    print("Updating roles with expense reimbursement permissions...")
    print("=" * 60)
    
    # Get current roles
    current_roles = list_roles()
    print(f"Found {len(current_roles)} existing roles:")
    for role in current_roles:
        print(f"  - {role.name} ({role.code})")
    print()
    
    # Define the role updates - add expense:manage to HR-related roles
    role_updates = [
        {
            "code": "hr_manager",
            "name": "HR Manager",
            "permissions": [
                "employee:view", "employee:edit",
                "employment:view", "employment:manage",
                "employment:view_pay_rate", "employment:manage_pay_rate",
                "leave:manage",
                "work_permit:manage",
                "expense:manage",  # NEW
                "company:manage"
            ]
        },
        {
            "code": "hr_staff",
            "name": "HR Staff",
            "permissions": [
                "employee:view",
                "employment:view",
                "leave:manage",
                "work_permit:manage",
                "expense:manage"  # NEW
            ]
        },
        {
            "code": "employment_manager",
            "name": "Employment Manager",
            "permissions": [
                "employee:view",
                "employment:view",
                "employment:manage",
                "employment:view_pay_rate",
                "employment:manage_pay_rate",
                "salary_history:view",
                "salary_history:manage",
                "expense:manage"  # NEW
            ]
        },
        {
            "code": "data_entry",
            "name": "Data Entry",
            "permissions": [
                "employee:view",
                "employment:view",
                "leave:manage",
                "work_permit:manage",
                "expense:manage"  # NEW
            ]
        }
    ]
    
    print("Updating roles with expense:manage permission...")
    print("-" * 40)
    
    updated_count = 0
    for role_data in role_updates:
        try:
            ensure_role(
                role_data["code"],
                role_data["name"], 
                role_data["permissions"]
            )
            print(f"[OK] Updated role: {role_data['name']} ({role_data['code']})")
            updated_count += 1
        except Exception as e:
            print(f"[ERROR] Failed to update {role_data['name']}: {str(e)}")
    
    print()
    print(f"Expense permission updates completed! Updated {updated_count} roles.")
    print()
    print("New permission available:")
    print("- expense:manage - Access to expense reimbursement system")
    print()
    print("Roles that now have expense access:")
    print("- hr_manager: Full HR management including expenses")
    print("- hr_staff: Basic HR functions including expenses")
    print("- employment_manager: Employment and salary management including expenses")
    print("- data_entry: Data entry functions including expenses")
    print()
    print("Note: The 'admin' role already has all permissions including expense:manage")

if __name__ == "__main__":
    main()
