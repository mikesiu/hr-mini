#!/usr/bin/env python3
"""
Setup authentication system with default admin user and roles.
"""

import sys
import os
from getpass import getpass

# Add the parent directory to the path so we can import from app
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.repos.user_repo import create_user, ensure_role, list_roles
from app.services.audit_service import log_action


def create_default_roles():
    """Create default system roles."""
    print("Creating default roles...")
    
    roles = [
        {
            "code": "admin",
            "name": "Administrator",
            "permissions": ["*"]  # Full access
        },
        {
            "code": "hr_manager", 
            "name": "HR Manager",
            "permissions": [
                "employee:view", "employee:edit",
                "employment:manage",
                "leave:manage", 
                "work_permit:manage",
                "expense:manage",
                "company:manage"
            ]
        },
        {
            "code": "hr_staff",
            "name": "HR Staff", 
            "permissions": [
                "employee:view",
                "leave:manage",
                "work_permit:manage",
                "expense:manage"
            ]
        },
        {
            "code": "employee",
            "name": "Employee",
            "permissions": [
                "employee:view"
            ]
        }
    ]
    
    for role_data in roles:
        try:
            role = ensure_role(
                code=role_data["code"],
                name=role_data["name"], 
                permissions=role_data["permissions"]
            )
            print(f"[OK] Created role: {role.name} ({role.code})")
        except Exception as e:
            print(f"[ERROR] Error creating role {role_data['code']}: {e}")


def create_admin_user():
    """Create default admin user."""
    print("\nCreating admin user...")
    
    try:
        # Check if admin user already exists
        from app.repos.user_repo import get_user_by_username
        existing_admin = get_user_by_username("admin")
        if existing_admin:
            print("Admin user already exists.")
            return
        
        # Get admin credentials
        print("Enter admin user credentials:")
        username = input("Username (default: admin): ").strip() or "admin"
        password = getpass("Password: ")
        
        if not password:
            print("Password is required.")
            return
        
        # Create admin user
        admin_user = create_user(
            username=username,
            password=password,
            display_name="System Administrator",
            email="admin@company.com",
            is_active=True,
            role_codes=["admin"]
        )
        
        print(f"[OK] Admin user '{username}' created successfully!")
        
        # Log the creation
        log_action(
            entity="user",
            entity_id=admin_user.id,
            action="create",
            changed_by="system",
            after={
                "username": admin_user.username,
                "display_name": admin_user.display_name,
                "email": admin_user.email,
                "is_active": admin_user.is_active,
                "roles": ["admin"]
            }
        )
        
    except Exception as e:
        print(f"[ERROR] Error creating admin user: {e}")


def main():
    """Main setup function."""
    print("HR Mini - Authentication Setup")
    print("=" * 40)
    
    try:
        # Create default roles
        create_default_roles()
        
        # Create admin user
        create_admin_user()
        
        print("\n" + "=" * 40)
        print("Authentication setup completed!")
        print("\nYou can now log in with the admin credentials.")
        print("Default roles created:")
        
        # List created roles
        roles = list_roles()
        for role in roles:
            print(f"  - {role.name} ({role.code}): {', '.join(role.permissions)}")
            
    except Exception as e:
        print(f"Setup failed: {e}")
        return 1
    
    return 0


if __name__ == "__main__":
    sys.exit(main())
