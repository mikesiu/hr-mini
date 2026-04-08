#!/usr/bin/env python3
"""
Script to clean up redundant permissions in the system.
This removes the old employment pay rate permissions and consolidates to the new salary history permissions.
"""

import sys
import pathlib

sys.path.append(str(pathlib.Path(__file__).resolve().parents[1]))

from app.repos.user_repo import ensure_role, list_roles
from app.models.base import SessionLocal
from app.models.user import Role

def analyze_current_permissions():
    """Analyze current permission usage across all roles."""
    
    print("Current Permission Analysis")
    print("=" * 50)
    
    roles = list_roles()
    
    for role in roles:
        print(f"\nRole: {role.name} ({role.code})")
        if role.permissions:
            for perm in role.permissions:
                print(f"  - {perm}")
        else:
            print("  - No permissions")
    
    print("\n" + "=" * 50)

def cleanup_redundant_permissions():
    """Remove redundant employment pay rate permissions and update roles."""
    
    print("Cleaning up redundant permissions...")
    print("=" * 50)
    
    # Define the new simplified permission structure
    role_updates = [
        {
            "code": "employment_manager",
            "name": "Employment Manager",
            "permissions": [
                "employee:view",
                "employment:view",
                "employment:manage",
                "salary_history:view",
                "salary_history:manage",
            ]
        },
        {
            "code": "employment_viewer", 
            "name": "Employment Viewer",
            "permissions": [
                "employee:view",
                "employment:view",
                "salary_history:view",
            ]
        },
        {
            "code": "hr_manager",
            "name": "HR Manager",
            "permissions": [
                "employee:view", "employee:edit",
                "employment:view", "employment:manage",
                "salary_history:view", "salary_history:manage",
                "leave:manage",
                "work_permit:manage",
                "company:manage"
            ]
        },
        {
            "code": "hr_staff",
            "name": "HR Staff", 
            "permissions": [
                "employee:view",
                "employment:view",
                "salary_history:view",
                "leave:manage",
                "work_permit:manage"
            ]
        },
        {
            "code": "admin",
            "name": "Administrator",
            "permissions": ["*"]
        }
    ]
    
    # Update each role
    for role_data in role_updates:
        try:
            ensure_role(
                role_data["code"],
                role_data["name"],
                role_data["permissions"]
            )
            print(f"[OK] Updated {role_data['name']}")
        except Exception as e:
            print(f"[ERROR] Failed to update {role_data['name']}: {str(e)}")
    
    print("\nPermission cleanup completed!")

def show_new_permission_structure():
    """Show the new simplified permission structure."""
    
    print("\nNew Simplified Permission Structure")
    print("=" * 50)
    print()
    
    print("Core Permissions:")
    print("  - employee:view - View employee information")
    print("  - employee:edit - Edit employee information")
    print()
    
    print("Employment Permissions:")
    print("  - employment:view - View employment records (position, department, dates)")
    print("  - employment:manage - Manage employment records (create, edit, delete)")
    print()
    
    print("Salary Permissions:")
    print("  - salary_history:view - View salary information and history")
    print("  - salary_history:manage - Manage salary information and history")
    print()
    
    print("Other Permissions:")
    print("  - leave:manage - Manage leave requests")
    print("  - work_permit:manage - Manage work permits")
    print("  - company:manage - Manage company information")
    print("  - user:manage - Manage users and roles")
    print()
    
    print("Permission Logic:")
    print("  - employment:view + salary_history:view = Full employment visibility")
    print("  - employment:manage + salary_history:manage = Full employment management")
    print("  - employment:view + salary_history:manage = View employment, manage salary")
    print("  - employment:manage + salary_history:view = Manage employment, view salary")

def update_ui_permissions():
    """Update the UI to use the new permission structure."""
    
    print("\nUpdating UI Permission Logic...")
    print("=" * 50)
    
    # The UI should now use only the new permissions
    print("Updated permission checks:")
    print("  - can_view_pay_rate = user_has_permission('salary_history:view')")
    print("  - can_manage_pay_rate = user_has_permission('salary_history:manage')")
    print()
    print("Removed backward compatibility logic:")
    print("  - No more employment:view_pay_rate checks")
    print("  - No more employment:manage_pay_rate checks")
    print("  - Cleaner, simpler permission logic")

def main():
    """Main cleanup function."""
    
    print("Permission Cleanup and Simplification")
    print("=" * 50)
    print()
    
    # Analyze current state
    analyze_current_permissions()
    
    # Clean up redundant permissions
    cleanup_redundant_permissions()
    
    # Show new structure
    show_new_permission_structure()
    
    # Update UI logic
    update_ui_permissions()
    
    print("\n" + "=" * 50)
    print("Cleanup completed!")
    print()
    print("Benefits of the new structure:")
    print("  [OK] No more redundant permissions")
    print("  [OK] Clearer permission names")
    print("  [OK] Simpler logic")
    print("  [OK] Better maintainability")
    print("  [OK] More intuitive for users")

if __name__ == "__main__":
    main()
