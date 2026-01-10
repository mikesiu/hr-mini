#!/usr/bin/env python3
"""
Script to reset admin password
"""

import sys
from pathlib import Path

# Add the parent directory to Python path
sys.path.append(str(Path(__file__).parent.parent))

from app.models.base import SessionLocal
from app.models.user import User
from app.utils.security import get_password_hash

def reset_admin_password():
    """Reset admin password to a known value"""
    with SessionLocal() as session:
        try:
            # Find admin user
            admin_user = session.query(User).filter(User.username == "admin").first()
            if not admin_user:
                print("Admin user not found!")
                return
            
            # Reset password to "admin"
            admin_user.password_hash = get_password_hash("admin")
            session.commit()
            
            print("Admin password reset successfully!")
            print("Username: admin")
            print("Password: admin")
            
        except Exception as e:
            session.rollback()
            print(f"Error resetting admin password: {str(e)}")
            raise

if __name__ == "__main__":
    reset_admin_password()
