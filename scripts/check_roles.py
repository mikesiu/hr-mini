#!/usr/bin/env python3
"""
Script to check current role permissions
"""

import sys
from pathlib import Path

# Add the parent directory to Python path
sys.path.append(str(Path(__file__).parent.parent))

from app.models.base import SessionLocal
from app.models.user import Role

def check_roles():
    """Check current role permissions"""
    with SessionLocal() as session:
        try:
            roles = session.query(Role).all()
            
            print("Current role permissions:")
            print("=" * 50)
            
            for role in roles:
                print(f"Role: {role.name} ({role.code})")
                print(f"  Permissions: {role.permissions}")
                print("-" * 30)
            
        except Exception as e:
            print(f"Error checking roles: {str(e)}")
            raise

if __name__ == "__main__":
    check_roles()
