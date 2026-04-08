#!/usr/bin/env python3
"""
Script to update existing roles with new employment permissions.
This adds the new pay rate viewing and management permissions to existing roles.
"""

import sys
import pathlib

sys.path.append(str(pathlib.Path(__file__).resolve().parents[1]))

from sqlalchemy.orm import Session
from app.models.base import engine
from app.models.user import Role
from app.repos.user_repo import ensure_role

def main():
    """Update existing roles with new employment permissions."""
    
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
            ]
        },
        {
            "code": "employment_viewer",
            "name": "Employment Viewer",
            "permissions": [
                "employee:view",
                "employment:view",
                "employment:view_pay_rate",
            ]
        }
    ]
    
    print("Updating employment roles with new permissions...")
    
    for role_data in role_updates:
        ensure_role(
            role_data["code"],
            role_data["name"], 
            role_data["permissions"]
        )
        print(f"[OK] Updated role: {role_data['name']}")
    
    print("\nEmployment permission updates completed!")
    print("\nNew roles available:")
    print("- employment_manager: Full employment management including pay rates")
    print("- employment_viewer: View employment records and pay rates (read-only)")
    print("\nExisting roles updated with new permissions where applicable.")

if __name__ == "__main__":
    main()
