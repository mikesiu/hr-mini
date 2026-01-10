#!/usr/bin/env python3
"""
Create admin user with default credentials.
"""

import sys
import os

# Add the parent directory to the path so we can import from app
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.repos.user_repo import create_user, ensure_role
from app.services.audit_service import log_action


def create_admin():
    """Create admin user with default credentials."""
    print("Creating admin user...")
    
    try:
        # Ensure admin role exists
        admin_role = ensure_role(
            code="admin",
            name="Administrator", 
            permissions=["*"]
        )
        
        # Create admin user
        admin_user = create_user(
            username="admin",
            password="admin",  # Shorter password
            display_name="System Administrator",
            email="admin@company.com",
            is_active=True,
            role_codes=["admin"]
        )
        
        print(f"[OK] Admin user created successfully!")
        print(f"Username: admin")
        print(f"Password: admin")
        print(f"Please change the password after first login.")
        
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
        
        return True
        
    except Exception as e:
        print(f"[ERROR] Error creating admin user: {e}")
        return False


def main():
    """Main function."""
    print("HR Mini - Create Admin User")
    print("=" * 30)
    
    if create_admin():
        print("\n" + "=" * 30)
        print("Admin user created successfully!")
        print("You can now log in to the system.")
        return 0
    else:
        print("\n" + "=" * 30)
        print("Failed to create admin user.")
        return 1


if __name__ == "__main__":
    sys.exit(main())
