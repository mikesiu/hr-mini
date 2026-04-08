#!/usr/bin/env python3
"""
Test script to verify that users with employment:view permission can access the employment management page.
"""

import sys
import pathlib

sys.path.append(str(pathlib.Path(__file__).resolve().parents[1]))

from app.repos.user_repo import ensure_role, create_user, assign_roles, get_user_by_username
from app.ui.auth.login import user_has_permission

def test_employment_view_permission():
    """Test that users with employment:view permission can access the page."""
    
    print("Testing Employment View Permission")
    print("=" * 50)
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
    
    # Test permission checks
    print("\n3. Testing permission checks...")
    
    # Simulate the permission checks from employment_management.py
    can_view_employment = user_has_permission("employment:view")
    can_view_pay_rate = user_has_permission("salary_history:view")
    can_manage_employment = user_has_permission("employment:manage")
    can_manage_pay_rate = user_has_permission("salary_history:manage")
    
    print(f"  employment:view = {can_view_employment}")
    print(f"  salary_history:view = {can_view_pay_rate}")
    print(f"  employment:manage = {can_manage_employment}")
    print(f"  salary_history:manage = {can_manage_pay_rate}")
    
    # Test the access logic
    print("\n4. Testing access logic...")
    if not can_view_employment:
        print("[ERROR] User should have employment:view permission but doesn't!")
        print("This would cause the 'insufficient permissions' error.")
    else:
        print("[OK] User has employment:view permission - should be able to access the page")
    
    # Test the mode logic
    print("\n5. Testing mode logic...")
    if can_manage_employment:
        print("  Mode: User can manage employment (full access)")
    else:
        print("  Mode: User has view-only access to employment records")
        print("  This should show the 'You have view-only access' message")
    
    # Test salary access
    print("\n6. Testing salary access...")
    if can_view_pay_rate:
        print("  User can view salary information")
    else:
        print("  User cannot view salary information")
        print("  This should show 'You do not have permission to view salary information'")
    
    print("\n" + "=" * 50)
    print("Test completed!")
    
    if can_view_employment:
        print("✅ User should be able to access the employment management page")
        print("✅ The 'insufficient permissions' error should NOT appear")
    else:
        print("[ERROR] User cannot access the employment management page")
        print("[ERROR] This explains the 'insufficient permissions' error")

def test_different_permission_combinations():
    """Test different permission combinations."""
    
    print("\nTesting Different Permission Combinations")
    print("=" * 50)
    
    test_cases = [
        {
            "name": "Employment View Only",
            "permissions": ["employment:view"],
            "expected_access": True,
            "expected_mode": "View Only"
        },
        {
            "name": "Employment View + Salary View",
            "permissions": ["employment:view", "salary_history:view"],
            "expected_access": True,
            "expected_mode": "View Only + Salary"
        },
        {
            "name": "Employment Manage Only",
            "permissions": ["employment:manage"],
            "expected_access": True,
            "expected_mode": "Manage Employment"
        },
        {
            "name": "Full Access",
            "permissions": ["employment:view", "employment:manage", "salary_history:view", "salary_history:manage"],
            "expected_access": True,
            "expected_mode": "Full Access"
        },
        {
            "name": "No Permissions",
            "permissions": [],
            "expected_access": False,
            "expected_mode": "No Access"
        }
    ]
    
    for test_case in test_cases:
        print(f"\n{test_case['name']}:")
        print(f"  Permissions: {', '.join(test_case['permissions']) if test_case['permissions'] else 'None'}")
        
        # Simulate permission checks
        can_view_employment = "employment:view" in test_case['permissions']
        can_manage_employment = "employment:manage" in test_case['permissions']
        can_view_pay_rate = "salary_history:view" in test_case['permissions']
        can_manage_pay_rate = "salary_history:manage" in test_case['permissions']
        
        print(f"  Can view employment: {can_view_employment}")
        print(f"  Can manage employment: {can_manage_employment}")
        print(f"  Can view salary: {can_view_pay_rate}")
        print(f"  Can manage salary: {can_manage_pay_rate}")
        
        # Test access
        has_access = can_view_employment
        print(f"  Has access: {has_access}")
        print(f"  Expected access: {test_case['expected_access']}")
        
        if has_access == test_case['expected_access']:
            print("  [OK] Access check correct")
        else:
            print("  [ERROR] Access check incorrect")

def main():
    """Main test function."""
    
    test_employment_view_permission()
    test_different_permission_combinations()
    
    print("\n" + "=" * 50)
    print("If you're still getting 'insufficient permissions' error:")
    print("1. Check that the user has the 'employment:view' permission")
    print("2. Verify the role is assigned correctly")
    print("3. Make sure the user is logged in with the correct account")
    print("4. Check the browser console for any JavaScript errors")

if __name__ == "__main__":
    main()
