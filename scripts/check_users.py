#!/usr/bin/env python3
"""
Script to check users and their details
"""

import sys
from pathlib import Path

# Add the parent directory to Python path
sys.path.append(str(Path(__file__).parent.parent))

from app.models.base import SessionLocal
from app.models.user import User

def check_users():
    """Check all users in the database"""
    with SessionLocal() as session:
        try:
            users = session.query(User).all()
            
            print("All users in database:")
            print("=" * 50)
            
            for user in users:
                print(f"ID: {user.id}")
                print(f"Username: {user.username}")
                print(f"Display Name: {user.display_name}")
                print(f"Email: {user.email}")
                print(f"Roles: {[role.code for role in user.roles]}")
                print("-" * 30)
            
        except Exception as e:
            print(f"Error checking users: {str(e)}")
            raise

if __name__ == "__main__":
    check_users()
