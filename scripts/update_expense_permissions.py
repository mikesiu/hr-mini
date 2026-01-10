#!/usr/bin/env python3
"""
Script to update existing roles with new expense permissions
"""

import sys
from pathlib import Path

# Add the parent directory to Python path
sys.path.append(str(Path(__file__).parent.parent))

from app.models.base import SessionLocal
from app.models.user import Role

def update_expense_permissions():
    """Update existing roles with new expense permissions"""
    with SessionLocal() as session:
        try:
            # Get all roles
            roles = session.query(Role).all()
            
            for role in roles:
                if not role.permissions:
                    role.permissions = []
                
                # Update based on role code
                if role.code == "admin":
                    # Admin already has "*" permission, no change needed
                    continue
                elif role.code == "hr_manager":
                    # Add specific expense permissions
                    new_permissions = [
                        "expense:view", "expense:create", "expense:update", "expense:delete",
                        "company:view"
                    ]
                    for perm in new_permissions:
                        if perm not in role.permissions:
                            role.permissions.append(perm)
                elif role.code == "hr_staff":
                    # Add specific expense permissions
                    new_permissions = [
                        "expense:view", "expense:create", "expense:update", "expense:delete",
                        "company:view"
                    ]
                    for perm in new_permissions:
                        if perm not in role.permissions:
                            role.permissions.append(perm)
                elif role.code == "employee":
                    # Add view permission for employees
                    if "expense:view" not in role.permissions:
                        role.permissions.append("expense:view")
                    if "company:view" not in role.permissions:
                        role.permissions.append("company:view")
                
                print(f"Updated role '{role.name}' ({role.code}) with permissions: {role.permissions}")
            
            session.commit()
            print("Successfully updated all roles with expense permissions!")
            
        except Exception as e:
            session.rollback()
            print(f"Error updating permissions: {str(e)}")
            raise

if __name__ == "__main__":
    update_expense_permissions()
