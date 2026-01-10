#!/usr/bin/env python3
"""
Test script to verify the login process and permission checking.
"""

import sys
import pathlib

sys.path.append(str(pathlib.Path(__file__).resolve().parents[1]))

from app.services.auth_service import authenticate, serialize_user

def test_login_process():
    """Test the login process for different users."""
    
    print("Testing Login Process")
    print("=" * 50)
    print()
    
    # Test users and their expected permissions
    test_users = [
        {
            "username": "admin",
            "password": "ChangeMe123!",
            "expected_permissions": ["*"],
            "expected_access": True
        },
        {
            "username": "leave", 
            "password": "password123",
            "expected_permissions": ["employee:view", "employment:view", "leave:manage", "work_permit:manage"],
            "expected_access": True
        },
        {
            "username": "test_viewer",
            "password": "test123", 
            "expected_permissions": ["employment:view"],
            "expected_access": True
        }
    ]
    
    for user_info in test_users:
        print(f"Testing user: {user_info['username']}")
        print("-" * 30)
        
        try:
            # Test authentication
            user = authenticate(user_info['username'], user_info['password'])
            if user:
                print(f"[OK] Authentication successful")
                
                # Serialize user (this is what gets stored in session state)
                serialized_user = serialize_user(user)
                print(f"[OK] User serialized successfully")
                
                # Check permissions
                permissions = serialized_user.get('permissions', [])
                print(f"Permissions: {permissions}")
                
                # Check employment access
                has_wildcard = '*' in permissions
                has_employment_view = 'employment:view' in permissions
                can_access = has_wildcard or has_employment_view
                
                print(f"Can access Employment Management: {can_access}")
                
                if can_access == user_info['expected_access']:
                    print(f"[OK] Access check correct")
                else:
                    print(f"[ERROR] Access check incorrect")
                
            else:
                print(f"[ERROR] Authentication failed")
                
        except Exception as e:
            print(f"[ERROR] Exception during authentication: {str(e)}")
        
        print()

def show_troubleshooting_steps():
    """Show troubleshooting steps for the user."""
    
    print("Troubleshooting Steps")
    print("=" * 50)
    print()
    print("If you're still getting 'insufficient permissions' error:")
    print()
    print("1. VERIFY LOGIN:")
    print("   - Make sure you're logged in as the correct user")
    print("   - Check the username in the top-right corner")
    print("   - Try logging out and logging back in")
    print()
    print("2. CHECK USER STATUS:")
    print("   - Go to User Management -> Users")
    print("   - Find your user and verify they're active")
    print("   - Check that they have the correct role assigned")
    print()
    print("3. CHECK ROLE PERMISSIONS:")
    print("   - Go to User Management -> Roles")
    print("   - Find your user's role and verify it has 'employment:view'")
    print("   - Or assign a role that has this permission")
    print()
    print("4. CLEAR BROWSER CACHE:")
    print("   - Clear browser cache and cookies")
    print("   - Try accessing in incognito/private window")
    print("   - Check browser console for JavaScript errors")
    print()
    print("5. TEST WITH ADMIN USER:")
    print("   - Try logging in as 'admin' with password 'ChangeMe123!'")
    print("   - Admin should have full access to everything")
    print()
    print("6. CHECK APPLICATION LOGS:")
    print("   - Look for any error messages in the terminal")
    print("   - Check if there are any database connection issues")

def main():
    """Main test function."""
    
    test_login_process()
    show_troubleshooting_steps()
    
    print("=" * 50)
    print("Test completed!")
    print()
    print("The most common cause is that the user is not properly logged in")
    print("or the session state is not working correctly.")

if __name__ == "__main__":
    main()
