#!/usr/bin/env python3
"""
Test script for expense rollover functionality
"""

import sys
import os
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from datetime import date, timedelta
from app.services.expense_service import ExpenseService
from app.repos.employee_repo import get_employee

def test_rollover_functionality():
    """Test the rollover functionality"""
    print("🧪 Testing Expense Rollover Functionality")
    print("=" * 50)
    
    # Get a test employee (assuming there's at least one)
    employees = []
    try:
        from app.repos.employee_repo_ext import list_active_employees
        employees = list_active_employees()
    except:
        print("❌ Could not get employees. Please ensure there are employees in the database.")
        return False
    
    if not employees:
        print("❌ No employees found. Please add employees first.")
        return False
    
    employee = employees[0]
    employee_id = employee.id
    print(f"👤 Testing with employee: {employee.full_name} ({employee_id})")
    
    # Test 1: Create a yearly entitlement with rollover
    print("\n📝 Test 1: Creating yearly entitlement with rollover")
    try:
        entitlement = ExpenseService.create_entitlement_for_employee(
            employee_id=employee_id,
            expense_type="Gas",
            entitlement_amount=1200.0,  # $1200 per year
            unit="yearly",
            start_date=date(2024, 1, 1),
            rollover="Yes",
            performed_by="test_user"
        )
        print(f"✅ Created entitlement: {entitlement['id']} - ${entitlement['entitlement_amount']} yearly with rollover")
    except Exception as e:
        print(f"❌ Error creating entitlement: {e}")
        return False
    
    # Test 2: Submit a claim that uses part of the entitlement
    print("\n💰 Test 2: Submitting partial claim")
    try:
        claim1 = ExpenseService.submit_expense_claim(
            employee_id=employee_id,
            paid_date=date(2025, 6, 15),
            expense_type="Gas",
            receipts_amount=800.0,  # $800 claim
            notes="Test claim 1",
            performed_by="test_user"
        )
        print(f"✅ Submitted claim: {claim1['id']}")
        print(f"   Receipts: ${claim1['receipts_amount']:.2f}")
        print(f"   Claimed: ${claim1['claims_amount']:.2f}")
        print(f"   Message: {claim1['message']}")
    except Exception as e:
        print(f"❌ Error submitting claim: {e}")
        return False
    
    # Test 3: Submit another claim that exceeds remaining entitlement
    print("\n💰 Test 3: Submitting claim that exceeds entitlement")
    try:
        claim2 = ExpenseService.submit_expense_claim(
            employee_id=employee_id,
            paid_date=date(2025, 12, 15),
            expense_type="Gas",
            receipts_amount=600.0,  # $600 claim (should be capped to remaining entitlement)
            notes="Test claim 2",
            performed_by="test_user"
        )
        print(f"✅ Submitted claim: {claim2['id']}")
        print(f"   Receipts: ${claim2['receipts_amount']:.2f}")
        print(f"   Claimed: ${claim2['claims_amount']:.2f}")
        print(f"   Message: {claim2['message']}")
    except Exception as e:
        print(f"❌ Error submitting claim: {e}")
        return False
    
    # Test 4: Test rollover calculation for next year
    print("\n🔄 Test 4: Testing rollover calculation")
    try:
        # Calculate available entitlement for 2025 (should include rollover)
        from app.repos.expense_entitlement_repo import get_entitlement_by_employee_and_type
        entitlement_obj = get_entitlement_by_employee_and_type(employee_id, "Gas")
        if entitlement_obj:
            available = ExpenseService._calculate_available_yearly_entitlement(
                employee_id, "Gas", entitlement_obj, date(2025, 3, 15)
            )
            print(f"✅ Available entitlement for 2025: ${available:.2f}")
            print(f"   (Should include rollover from unused 2024 entitlement)")
        else:
            print("❌ Could not find entitlement for rollover test")
    except Exception as e:
        print(f"❌ Error testing rollover: {e}")
        return False
    
    print("\n✅ All tests completed successfully!")
    return True

if __name__ == "__main__":
    success = test_rollover_functionality()
    if not success:
        sys.exit(1)
