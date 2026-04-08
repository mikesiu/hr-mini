#!/usr/bin/env python3
"""
Create authentication tables in the database.
"""

import sys
import os

# Add the parent directory to the path so we can import from app
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.models.base import Base, engine
from app.models.user import User, Role, UserRole
from app.models.audit import Audit


def create_auth_tables():
    """Create authentication and audit tables."""
    print("Creating authentication tables...")
    
    try:
        # Create all tables
        Base.metadata.create_all(engine)
        print("[OK] Authentication tables created successfully!")
        
        # List created tables
        print("\nCreated tables:")
        print("  - users")
        print("  - roles") 
        print("  - user_roles")
        print("  - audit_log")
        
    except Exception as e:
        print(f"[ERROR] Error creating tables: {e}")
        return False
    
    return True


def main():
    """Main function."""
    print("HR Mini - Create Authentication Tables")
    print("=" * 40)
    
    if create_auth_tables():
        print("\n" + "=" * 40)
        print("Authentication tables created successfully!")
        print("You can now run the authentication setup script.")
        return 0
    else:
        print("\n" + "=" * 40)
        print("Failed to create authentication tables.")
        return 1


if __name__ == "__main__":
    sys.exit(main())
