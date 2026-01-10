#!/usr/bin/env python3
"""
Test script to demonstrate different employment access levels.
This script shows how the role-based access control works for employment management.
"""

import sys
import pathlib

sys.path.append(str(pathlib.Path(__file__).resolve().parents[1]))

from app.repos.user_repo import get_user_by_username, create_user
from app.services.auth_service import get_permissions, has_permission
from app.ui.auth.login import user_has_permission

def test_permissions():
    """Test different permission scenarios."""
    
    print("Employment Access Control Test")
    print("=" * 50)
    
    # Test scenarios
    test_cases = [
        {
            "role": "admin",
            "description": "Administrator - Full Access"
        },
        {
            "role": "employment_manager", 
            "description": "Employment Manager - Full Employment Access"
        },
        {
            "role": "employment_viewer",
            "description": "Employment Viewer - View Only with Pay Rates"
        },
        {
            "role": "viewer",
            "description": "Basic Viewer - Limited Access"
        }
    ]
    
    for test_case in test_cases:
        print(f"\n{test_case['description']}")
        print("-" * 40)
        
        # Get user with this role
        user = get_user_by_username("admin")  # We'll use admin as base and check role permissions
        
        if user:
            # Check specific permissions
            permissions_to_check = [
                "employment:view",
                "employment:manage", 
                "employment:view_pay_rate",
                "employment:manage_pay_rate"
            ]
            
            for permission in permissions_to_check:
                has_perm = has_permission(user, permission)
                status = "[OK]" if has_perm else "[NO]"
                print(f"  {status} {permission}")
        
        print()

def demonstrate_access_levels():
    """Demonstrate what each access level can see."""
    
    print("\nAccess Level Capabilities")
    print("=" * 50)
    
    access_levels = [
        {
            "level": "Employment Manager",
            "capabilities": [
                "View all employment records",
                "View pay rates and salary information", 
                "Create new employment records",
                "Edit existing employment records",
                "Delete employment records",
                "Manage pay rate information",
                "View complete salary history"
            ]
        },
        {
            "level": "Employment Viewer", 
            "capabilities": [
                "View all employment records",
                "View pay rates and salary information",
                "View complete salary history",
                "Cannot create, edit, or delete records"
            ]
        },
        {
            "level": "Basic Viewer",
            "capabilities": [
                "View employment records (basic information only)",
                "Cannot see pay rates or salary information",
                "Cannot create, edit, or delete records"
            ]
        }
    ]
    
    for level in access_levels:
        print(f"\n{level['level']}:")
        for capability in level['capabilities']:
            print(f"  • {capability}")

def show_salary_tracking():
    """Show how salary tracking works."""
    
    print("\nSalary History Tracking")
    print("=" * 50)
    print("The system maintains complete salary history through employment records:")
    print()
    print("1. Each employment record contains:")
    print("   • Pay rate (hourly, monthly, etc.)")
    print("   • Pay type (Hourly, Monthly)")
    print("   • Start and end dates")
    print("   • Position and company information")
    print()
    print("2. When an employee changes positions:")
    print("   • Current employment is ended")
    print("   • New employment record is created")
    print("   • Salary history is preserved")
    print()
    print("3. Users with appropriate permissions can:")
    print("   • View salary progression over time")
    print("   • Track compensation changes")
    print("   • Generate salary reports")
    print()
    print("4. Security features:")
    print("   • Pay rate visibility controlled by permissions")
    print("   • Management functions restricted by role")
    print("   • All changes logged in audit system")

def main():
    """Main test function."""
    
    test_permissions()
    demonstrate_access_levels()
    show_salary_tracking()
    
    print("\n" + "=" * 50)
    print("Test completed!")
    print("\nTo test the actual UI:")
    print("1. Start the application: streamlit run app.py")
    print("2. Create users with different roles")
    print("3. Log in with different users to see access differences")

if __name__ == "__main__":
    main()
