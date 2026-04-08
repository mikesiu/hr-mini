#!/usr/bin/env python3
"""
Test script to demonstrate the new "Add New Role" functionality in User Management.
This shows how to create custom roles with specific permissions.
"""

import sys
import pathlib

sys.path.append(str(pathlib.Path(__file__).resolve().parents[1]))

from app.repos.user_repo import ensure_role, list_roles

def test_add_role_functionality():
    """Test the add role functionality."""
    
    print("Add New Role Functionality Test")
    print("=" * 50)
    print()
    
    # Show current roles
    print("Current system roles:")
    roles = list_roles()
    for role in roles:
        print(f"  - {role.name} ({role.code})")
    print()
    
    # Test creating a new custom role
    print("Creating a custom 'Salary Viewer' role...")
    
    try:
        ensure_role(
            code="salary_viewer",
            name="Salary Viewer",
            permissions=[
                "employee:view",
                "employment:view",
                "salary_history:view"
            ]
        )
        print("[OK] Salary Viewer role created successfully!")
    except Exception as e:
        print(f"[ERROR] Failed to create role: {str(e)}")
    
    print()
    
    # Test creating another custom role
    print("Creating a custom 'Data Entry' role...")
    
    try:
        ensure_role(
            code="data_entry",
            name="Data Entry Clerk",
            permissions=[
                "employee:view",
                "employment:view",
                "leave:manage",
                "work_permit:manage"
            ]
        )
        print("[OK] Data Entry Clerk role created successfully!")
    except Exception as e:
        print(f"[ERROR] Failed to create role: {str(e)}")
    
    print()
    
    # Show updated roles
    print("Updated system roles:")
    roles = list_roles()
    for role in roles:
        print(f"  - {role.name} ({role.code})")
        if role.permissions:
            print(f"    Permissions: {', '.join(role.permissions)}")
        print()

def show_role_examples():
    """Show examples of different role configurations."""
    
    print("Role Configuration Examples")
    print("=" * 50)
    print()
    
    examples = [
        {
            "name": "HR Manager",
            "code": "hr_manager",
            "description": "Full HR management access",
            "permissions": [
                "employee:view", "employee:edit",
                "employment:view", "employment:manage",
                "employment:view_pay_rate", "employment:manage_pay_rate",
                "salary_history:view", "salary_history:manage",
                "leave:manage", "work_permit:manage", "company:manage"
            ]
        },
        {
            "name": "Salary Viewer",
            "code": "salary_viewer",
            "description": "View salary information only",
            "permissions": [
                "employee:view",
                "employment:view",
                "salary_history:view"
            ]
        },
        {
            "name": "Data Entry Clerk",
            "code": "data_entry",
            "description": "Basic data entry access",
            "permissions": [
                "employee:view",
                "employment:view",
                "leave:manage",
                "work_permit:manage"
            ]
        },
        {
            "name": "Read Only User",
            "code": "read_only",
            "description": "View-only access to all data",
            "permissions": [
                "employee:view",
                "employment:view",
                "leave:view",
                "company:view",
                "work_permit:view"
            ]
        },
        {
            "name": "Leave Manager",
            "code": "leave_manager",
            "description": "Manage leave requests only",
            "permissions": [
                "employee:view",
                "leave:manage"
            ]
        }
    ]
    
    for example in examples:
        print(f"Role: {example['name']} ({example['code']})")
        print(f"Description: {example['description']}")
        print(f"Permissions: {', '.join(example['permissions'])}")
        print()

def show_ui_instructions():
    """Show instructions for using the UI."""
    
    print("How to Add New Roles in the UI")
    print("=" * 50)
    print()
    print("1. Go to User Management page")
    print("2. Click on the 'Roles' tab")
    print("3. Click the 'Add New Role' button")
    print("4. Fill in the form:")
    print("   - Role Name: Display name (e.g., 'HR Manager')")
    print("   - Role Code: Unique code (e.g., 'hr_manager')")
    print("   - Select permissions by checking the boxes")
    print("5. Click 'Create Role'")
    print()
    print("Role Code Rules:")
    print("- Use lowercase letters only")
    print("- Use underscores for spaces")
    print("- Must be unique")
    print("- Examples: hr_manager, salary_viewer, data_entry")
    print()
    print("Available Permissions:")
    print("- Employee View/Edit")
    print("- Employment View/Manage")
    print("- Employment View Pay Rate/Manage Pay Rate")
    print("- Salary History View/Manage")
    print("- Leave Manage")
    print("- Work Permit Manage")
    print("- Company Manage")
    print("- User Manage")

def main():
    """Main test function."""
    
    test_add_role_functionality()
    show_role_examples()
    show_ui_instructions()
    
    print("=" * 50)
    print("Test completed!")
    print()
    print("The 'Add New Role' functionality is now available in the User Management UI.")
    print("You can create custom roles with specific permission combinations.")

if __name__ == "__main__":
    main()
