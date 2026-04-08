#!/usr/bin/env python3
"""
Test script for end date clear functionality
"""

import sys
import os
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from datetime import date
from app.services.expense_service import ExpenseService
from app.repos.employee_repo_ext import list_active_employees

def test_end_date_clear():
    """Test end date clear functionality"""
    print("🧪 Testing End Date Clear Functionality")
    print("=" * 50)
    
    # Get a test employee
    employees = list_active_employees()
    if not employees:
        print("❌ No employees found. Please add employees first.")
        return False
    
    employee = employees[0]
    employee_id = employee.id
    print(f"👤 Testing with employee: {employee.full_name} ({employee_id})")
    
    # Test 1: Create an entitlement with end date
    print("\n📝 Test 1: Creating entitlement with end date")
    try:
        entitlement = ExpenseService.create_entitlement_for_employee(
            employee_id=employee_id,
            expense_type="Mobile",
            entitlement_amount=50.0,
            unit="monthly",
            start_date=date(2025, 1, 1),
            end_date=date(2025, 12, 31),  # Has end date
            rollover="No",
            performed_by="test_user"
        )
        print(f"✅ Created entitlement: {entitlement['id']} with end date {entitlement['end_date']}")
        entitlement_id = entitlement['id']
    except Exception as e:
        print(f"❌ Error creating entitlement: {e}")
        return False
    
    # Test 2: Update entitlement to remove end date (make it ongoing)
    print("\n✏️ Test 2: Removing end date to make entitlement ongoing")
    try:
        updated_entitlement = ExpenseService.update_entitlement_for_employee(
            entitlement_id=entitlement_id,
            end_date=None,  # Clear the end date
            performed_by="test_user"
        )
        
        if updated_entitlement:
            print(f"✅ Updated entitlement: {updated_entitlement['id']}")
            print(f"   End date: {updated_entitlement['end_date']} (should be None)")
            
            if updated_entitlement['end_date'] is None:
                print("✅ End date successfully cleared - entitlement is now ongoing")
            else:
                print("❌ End date was not cleared properly")
                return False
        else:
            print("❌ Failed to update entitlement")
            return False
    except Exception as e:
        print(f"❌ Error updating entitlement: {e}")
        return False
    
    # Test 3: Create an entitlement without end date from the start
    print("\n📝 Test 3: Creating entitlement without end date (ongoing)")
    try:
        ongoing_entitlement = ExpenseService.create_entitlement_for_employee(
            employee_id=employee_id,
            expense_type="Boots",
            entitlement_amount=200.0,
            unit="yearly",
            start_date=date(2025, 1, 1),
            end_date=None,  # No end date from the start
            rollover="Yes",
            performed_by="test_user"
        )
        print(f"✅ Created ongoing entitlement: {ongoing_entitlement['id']}")
        print(f"   End date: {ongoing_entitlement['end_date']} (should be None)")
        
        if ongoing_entitlement['end_date'] is None:
            print("✅ Ongoing entitlement created successfully")
        else:
            print("❌ Ongoing entitlement has unexpected end date")
            return False
    except Exception as e:
        print(f"❌ Error creating ongoing entitlement: {e}")
        return False
    
    print("\n✅ All end date clear tests completed successfully!")
    return True

if __name__ == "__main__":
    success = test_end_date_clear()
    if not success:
        sys.exit(1)
