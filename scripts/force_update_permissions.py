#!/usr/bin/env python3
"""
Script to force update role permissions
"""

import sys
from pathlib import Path

# Add the parent directory to Python path
sys.path.append(str(Path(__file__).parent.parent))

from app.models.base import SessionLocal
from app.models.user import Role

def force_update_permissions():
    """Force update role permissions"""
    with SessionLocal() as session:
        try:
            # Get all roles
            roles = session.query(Role).all()
            
            for role in roles:
                print(f"Updating role: {role.name} ({role.code})")
                
                # Force update based on role code
                if role.code == "admin":
                    role.permissions = ["*"]
                elif role.code == "hr_manager":
                    role.permissions = [
                        "employee:view", "employee:edit",
                        "employment:view", "employment:manage",
                        "employment:view_pay_rate", "employment:manage_pay_rate",
                        "leave:manage",
                        "work_permit:manage",
                        "expense:view", "expense:create", "expense:update", "expense:delete",
                        "company:manage", "company:view"
                    ]
                elif role.code == "hr_staff":
                    role.permissions = [
                        "employee:view",
                        "employment:view",
                        "leave:manage",
                        "work_permit:manage",
                        "expense:view", "expense:create", "expense:update", "expense:delete",
                        "company:view"
                    ]
                elif role.code == "employee":
                    role.permissions = [
                        "employee:view",
                        "expense:view",
                        "company:view"
                    ]
                elif role.code == "data_entry":
                    role.permissions = [
                        "employee:view",
                        "employment:view",
                        "leave:manage",
                        "work_permit:manage",
                        "expense:manage",
                        "company:view"
                    ]
                elif role.code == "employment_manager":
                    role.permissions = [
                        "employee:view",
                        "employment:view",
                        "employment:manage",
                        "employment:view_pay_rate",
                        "employment:manage_pay_rate",
                        "salary_history:view",
                        "salary_history:manage",
                        "expense:manage",
                        "company:view"
                    ]
                
                print(f"  New permissions: {role.permissions}")
            
            # Force commit
            session.commit()
            print("Successfully force updated all role permissions!")
            
        except Exception as e:
            session.rollback()
            print(f"Error force updating permissions: {str(e)}")
            raise

if __name__ == "__main__":
    force_update_permissions()
