#!/usr/bin/env python3
"""
Test script to verify user permissions by directly checking the database.
This bypasses the Streamlit session state issue.
"""

import sys
import pathlib

sys.path.append(str(pathlib.Path(__file__).resolve().parents[1]))

from app.repos.user_repo import ensure_role, create_user, assign_roles, get_user_by_username
from app.models.base import SessionLocal
from app.models.user import User, Role, UserRole

def test_user_permissions_direct():
    """Test user permissions by directly checking the database."""
    
    print("Testing User Permissions (Direct Database Check)")
    print("=" * 60)
    print()
    
    # Create a test role with only employment:view permission
    print("1. Creating test role with employment:view permission...")
    try:
        ensure_role(
            code="test_employment_viewer",
            name="Test Employment Viewer",
            permissions=["employment:view"]
        )
        print("[OK] Test role created successfully")
    except Exception as e:
        print(f"[ERROR] Failed to create test role: {str(e)}")
        return
    
    # Create a test user with this role
    print("\n2. Creating test user...")
    try:
        # Check if user already exists
        existing_user = get_user_by_username("test_viewer")
        if existing_user:
            print("[INFO] Test user already exists, using existing user")
            test_user = existing_user
        else:
            test_user = create_user(
                username="test_viewer",
                password="test123",
                display_name="Test Viewer",
                role_codes=["test_employment_viewer"]
            )
            print("[OK] Test user created successfully")
    except Exception as e:
        print(f"[ERROR] Failed to create test user: {str(e)}")
        return
    
    # Check permissions directly from database
    print("\n3. Checking permissions directly from database...")
    
    with SessionLocal() as session:
        # Get user with roles and permissions
        user = session.query(User).filter(User.username == "test_viewer").first()
        if not user:
            print("[ERROR] User not found in database")
            return
        
        print(f"User: {user.username} (ID: {user.id})")
        print(f"Display Name: {user.display_name}")
        print(f"Active: {user.is_active}")
        
        # Get user roles
        user_roles = session.query(Role).join(UserRole).filter(UserRole.user_id == user.id).all()
        print(f"\nUser Roles ({len(user_roles)}):")
        for role in user_roles:
            print(f"  - {role.name} ({role.code})")
            if role.permissions:
                print(f"    Permissions: {', '.join(role.permissions)}")
            else:
                print("    Permissions: None")
        
        # Collect all permissions
        all_permissions = set()
        for role in user_roles:
            if role.permissions:
                all_permissions.update(role.permissions)
        
        print(f"\nAll User Permissions ({len(all_permissions)}):")
        for perm in sorted(all_permissions):
            print(f"  - {perm}")
        
        # Test specific permissions (including wildcard)
        has_wildcard = '*' in all_permissions
        print(f"\nPermission Checks:")
        print(f"  Wildcard (*) = {has_wildcard}")
        print(f"  employment:view = {'employment:view' in all_permissions or has_wildcard}")
        print(f"  salary_history:view = {'salary_history:view' in all_permissions or has_wildcard}")
        print(f"  employment:manage = {'employment:manage' in all_permissions or has_wildcard}")
        print(f"  salary_history:manage = {'salary_history:manage' in all_permissions or has_wildcard}")
        
        # Test access logic (including wildcard)
        can_view_employment = 'employment:view' in all_permissions or has_wildcard
        can_view_pay_rate = 'salary_history:view' in all_permissions or has_wildcard
        can_manage_employment = 'employment:manage' in all_permissions or has_wildcard
        can_manage_pay_rate = 'salary_history:manage' in all_permissions or has_wildcard
        
        print(f"\nAccess Logic Test:")
        if not can_view_employment:
            print("[ERROR] User should have employment:view permission but doesn't!")
            print("This would cause the 'insufficient permissions' error.")
        else:
            print("[OK] User has employment:view permission - should be able to access the page")
        
        # Test the mode logic
        print(f"\nMode Logic Test:")
        if can_manage_employment:
            print("  Mode: User can manage employment (full access)")
        else:
            print("  Mode: User has view-only access to employment records")
            print("  This should show the 'You have view-only access' message")
        
        # Test salary access
        print(f"\nSalary Access Test:")
        if can_view_pay_rate:
            print("  User can view salary information")
        else:
            print("  User cannot view salary information")
            print("  This should show 'You do not have permission to view salary information'")

def test_existing_users():
    """Test permissions for existing users in the system."""
    
    print("\nTesting Existing Users")
    print("=" * 60)
    
    with SessionLocal() as session:
        # Get all users
        users = session.query(User).all()
        print(f"Found {len(users)} users in the system:")
        
        for user in users:
            print(f"\nUser: {user.username} (ID: {user.id})")
            print(f"  Display Name: {user.display_name}")
            print(f"  Active: {user.is_active}")
            
            # Get user roles
            user_roles = session.query(Role).join(UserRole).filter(UserRole.user_id == user.id).all()
            print(f"  Roles ({len(user_roles)}):")
            for role in user_roles:
                print(f"    - {role.name} ({role.code})")
            
            # Collect all permissions
            all_permissions = set()
            for role in user_roles:
                if role.permissions:
                    all_permissions.update(role.permissions)
            
            print(f"  Permissions ({len(all_permissions)}):")
            for perm in sorted(all_permissions):
                print(f"    - {perm}")
            
            # Test employment access (including wildcard)
            has_wildcard = '*' in all_permissions
            can_view_employment = 'employment:view' in all_permissions or has_wildcard
            can_manage_employment = 'employment:manage' in all_permissions or has_wildcard
            
            print(f"  Employment Access:")
            print(f"    Can view: {can_view_employment}")
            print(f"    Can manage: {can_manage_employment}")
            
            if can_view_employment:
                print("    [OK] Should be able to access employment management page")
            else:
                print("    [ERROR] Cannot access employment management page")

def main():
    """Main test function."""
    
    test_user_permissions_direct()
    test_existing_users()
    
    print("\n" + "=" * 60)
    print("Test completed!")
    print()
    print("If you're still getting 'insufficient permissions' error:")
    print("1. Check that the user has the 'employment:view' permission")
    print("2. Verify the role is assigned correctly")
    print("3. Make sure the user is logged in with the correct account")
    print("4. Check the browser console for any JavaScript errors")
    print("5. Verify the user is active (not deactivated)")

if __name__ == "__main__":
    main()
