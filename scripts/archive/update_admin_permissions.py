#!/usr/bin/env python3
"""
Update admin role to include audit:view permission.
"""

import sys
import os

# Add the parent directory to the path so we can import from app
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.models.base import SessionLocal
from app.models.user import Role


def update_admin_permissions():
    """Update admin role to include audit:view permission."""
    print("Updating admin role permissions...")
    
    with SessionLocal() as session:
        try:
            # Get admin role
            admin_role = session.query(Role).filter(Role.code == "admin").first()
            
            if not admin_role:
                print("[ERROR] Admin role not found!")
                return False
            
            # Current permissions
            current_permissions = admin_role.permissions or []
            print(f"Current permissions: {current_permissions}")
            
            # Add audit:view if not already present
            if "audit:view" not in current_permissions:
                current_permissions.append("audit:view")
                admin_role.permissions = current_permissions
                session.commit()
                print(f"[OK] Added audit:view permission to admin role")
                print(f"Updated permissions: {current_permissions}")
            else:
                print("[INFO] audit:view permission already exists in admin role")
            
            return True
            
        except Exception as e:
            session.rollback()
            print(f"[ERROR] Error updating admin role: {e}")
            return False


def main():
    """Main function."""
    print("HR Mini - Update Admin Permissions")
    print("=" * 40)
    
    if update_admin_permissions():
        print("\n" + "=" * 40)
        print("Admin permissions updated successfully!")
        print("Admin users can now access the Audit Report.")
        return 0
    else:
        print("\n" + "=" * 40)
        print("Failed to update admin permissions.")
        return 1


if __name__ == "__main__":
    sys.exit(main())
