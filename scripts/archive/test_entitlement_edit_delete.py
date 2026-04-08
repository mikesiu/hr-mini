#!/usr/bin/env python3
"""
Test script for entitlement edit and delete functionality
"""

import sys
import os
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from datetime import date
from app.services.expense_service import ExpenseService
from app.repos.employee_repo_ext import list_active_employees

def test_entitlement_edit_delete():
    """Test entitlement edit and delete functionality"""
    print("🧪 Testing Entitlement Edit and Delete Functionality")
    print("=" * 60)
    
    # Get a test employee
    employees = list_active_employees()
    if not employees:
        print("❌ No employees found. Please add employees first.")
        return False
    
    employee = employees[0]
    employee_id = employee.id
    print(f"👤 Testing with employee: {employee.full_name} ({employee_id})")
    
    # Test 1: Create a test entitlement
    print("\n📝 Test 1: Creating test entitlement")
    try:
        entitlement = ExpenseService.create_entitlement_for_employee(
            employee_id=employee_id,
            expense_type="Mobile",
            entitlement_amount=100.0,
            unit="monthly",
            start_date=date(2025, 1, 1),
            rollover="No",
            performed_by="test_user"
        )
        print(f"✅ Created entitlement: {entitlement['id']} - ${entitlement['entitlement_amount']} monthly")
        entitlement_id = entitlement['id']
    except Exception as e:
        print(f"❌ Error creating entitlement: {e}")
        return False
    
    # Test 2: Update the entitlement
    print("\n✏️ Test 2: Updating entitlement")
    try:
        updated_entitlement = ExpenseService.update_entitlement_for_employee(
            entitlement_id=entitlement_id,
            expense_type="Mobile",
            entitlement_amount=150.0,  # Changed from 100 to 150
            unit="yearly",  # Changed from monthly to yearly
            start_date=date(2025, 1, 1),
            rollover="Yes",  # Changed from No to Yes
            performed_by="test_user"
        )
        
        if updated_entitlement:
            print(f"✅ Updated entitlement: {updated_entitlement['id']}")
            print(f"   Amount: ${updated_entitlement['entitlement_amount']} (was $100)")
            print(f"   Unit: {updated_entitlement['unit']} (was monthly)")
            print(f"   Rollover: {updated_entitlement['rollover']} (was No)")
        else:
            print("❌ Failed to update entitlement")
            return False
    except Exception as e:
        print(f"❌ Error updating entitlement: {e}")
        return False
    
    # Test 3: Verify the update by getting entitlements
    print("\n🔍 Test 3: Verifying update")
    try:
        entitlements = ExpenseService.get_employee_entitlements(employee_id)
        mobile_entitlements = [ent for ent in entitlements if ent['expense_type'] == 'Mobile']
        
        if mobile_entitlements:
            latest_entitlement = mobile_entitlements[0]  # Should be the most recent
            print(f"✅ Found updated entitlement:")
            print(f"   Amount: ${latest_entitlement['entitlement_amount']}")
            print(f"   Unit: {latest_entitlement['unit']}")
            print(f"   Rollover: {latest_entitlement['rollover']}")
            
            if (latest_entitlement['entitlement_amount'] == 150.0 and 
                latest_entitlement['unit'] == 'yearly' and 
                latest_entitlement['rollover'] == 'Yes'):
                print("✅ Update verification successful!")
            else:
                print("❌ Update verification failed - values don't match")
                return False
        else:
            print("❌ No mobile entitlements found")
            return False
    except Exception as e:
        print(f"❌ Error verifying update: {e}")
        return False
    
    # Test 4: Delete the entitlement
    print("\n🗑️ Test 4: Deleting entitlement")
    try:
        delete_result = ExpenseService.delete_expense_entitlement(
            entitlement_id=entitlement_id,
            performed_by="test_user"
        )
        
        if delete_result:
            print(f"✅ Successfully deleted entitlement: {entitlement_id}")
        else:
            print("❌ Failed to delete entitlement")
            return False
    except Exception as e:
        print(f"❌ Error deleting entitlement: {e}")
        return False
    
    # Test 5: Verify deletion
    print("\n🔍 Test 5: Verifying deletion")
    try:
        entitlements = ExpenseService.get_employee_entitlements(employee_id)
        mobile_entitlements = [ent for ent in entitlements if ent['expense_type'] == 'Mobile']
        
        if not mobile_entitlements:
            print("✅ Deletion verification successful - no mobile entitlements found")
        else:
            print(f"❌ Deletion verification failed - found {len(mobile_entitlements)} mobile entitlements")
            return False
    except Exception as e:
        print(f"❌ Error verifying deletion: {e}")
        return False
    
    print("\n✅ All entitlement edit and delete tests completed successfully!")
    return True

if __name__ == "__main__":
    success = test_entitlement_edit_delete()
    if not success:
        sys.exit(1)
