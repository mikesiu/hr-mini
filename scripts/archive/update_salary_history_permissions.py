#!/usr/bin/env python3
"""
Script to update existing roles with new salary history permissions.
This adds the new salary history viewing and management permissions to existing roles.
"""

import sys
import pathlib

sys.path.append(str(pathlib.Path(__file__).resolve().parents[1]))

from app.repos.user_repo import ensure_role

def main():
    """Update existing roles with new salary history permissions."""
    
    print("Updating roles with salary history permissions...")
    print("=" * 50)
    
    # Define the role updates
    role_updates = [
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
            ]
        },
        {
            "code": "employment_viewer",
            "name": "Employment Viewer",
            "permissions": [
                "employee:view",
                "employment:view",
                "employment:view_pay_rate",
                "salary_history:view",
            ]
        },
        {
            "code": "admin",
            "name": "Administrator",
            "permissions": ["*"]  # Admin already has all permissions
        }
    ]
    
    for role_data in role_updates:
        ensure_role(
            role_data["code"],
            role_data["name"], 
            role_data["permissions"]
        )
        print(f"[OK] Updated role: {role_data['name']}")
    
    print("\nSalary history permission updates completed!")
    print("\nNew permissions available:")
    print("- salary_history:view - View salary history records")
    print("- salary_history:manage - Create, edit, and delete salary history records")
    print("\nRoles updated:")
    print("- employment_manager: Full salary history management")
    print("- employment_viewer: View salary history (read-only)")
    print("- admin: All permissions (unchanged)")

if __name__ == "__main__":
    main()
