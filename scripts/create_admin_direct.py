#!/usr/bin/env python3
"""
Create admin user directly in database.
"""

import sys
import os

# Add the parent directory to the path so we can import from app
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
sys.path.append(os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "old_system"))

from old_system.app.models.base import SessionLocal
from old_system.app.models.user import User, Role, UserRole
from old_system.app.utils.security import get_password_hash


def create_admin_direct():
    """Create admin user directly in database."""
    print("Creating admin user directly...")
    
    with SessionLocal() as session:
        try:
            # Check if admin user already exists
            existing_user = session.query(User).filter(User.username == "admin").first()
            if existing_user:
                print("[INFO] Admin user already exists.")
                return True
            
            # Create admin role if it doesn't exist
            admin_role = session.query(Role).filter(Role.code == "admin").first()
            if not admin_role:
                admin_role = Role(
                    code="admin",
                    name="Administrator",
                    permissions=["*"]
                )
                session.add(admin_role)
                session.flush()
                print("[OK] Created admin role")
            
            # Create admin user
            password_hash = get_password_hash("admin")
            admin_user = User(
                username="admin",
                display_name="System Administrator",
                email="admin@company.com",
                password_hash=password_hash,
                is_active=True
            )
            session.add(admin_user)
            session.flush()
            
            # Assign admin role
            user_role = UserRole(
                user_id=admin_user.id,
                role_id=admin_role.id
            )
            session.add(user_role)
            
            session.commit()
            
            print(f"[OK] Admin user created successfully!")
            print(f"Username: admin")
            print(f"Password: admin")
            print(f"Please change the password after first login.")
            
            return True
            
        except Exception as e:
            session.rollback()
            print(f"[ERROR] Error creating admin user: {e}")
            return False


def main():
    """Main function."""
    print("HR Mini - Create Admin User (Direct)")
    print("=" * 40)
    
    if create_admin_direct():
        print("\n" + "=" * 40)
        print("Admin user created successfully!")
        print("You can now log in to the system.")
        return 0
    else:
        print("\n" + "=" * 40)
        print("Failed to create admin user.")
        return 1


if __name__ == "__main__":
    sys.exit(main())
