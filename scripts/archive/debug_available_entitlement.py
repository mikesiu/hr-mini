#!/usr/bin/env python3
"""
Debug script for available entitlement calculation
"""

import sys
import os
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from datetime import date
from app.services.expense_service import ExpenseService
from app.repos.expense_entitlement_repo import get_entitlement_by_employee_and_type

def debug_available_entitlement():
    """Debug available entitlement calculation"""
    print("🔍 Debugging Available Entitlement Calculation")
    print("=" * 50)
    
    # Get a test employee
    from app.repos.employee_repo_ext import list_active_employees
    employees = list_active_employees()
    if not employees:
        print("❌ No employees found")
        return
    
    employee = employees[0]
    employee_id = employee.id
    print(f"👤 Testing with employee: {employee.full_name} ({employee_id})")
    
    # Get the entitlement
    entitlement = get_entitlement_by_employee_and_type(employee_id, "Gas")
    if not entitlement:
        print("❌ No entitlement found")
        return
    
    print(f"📋 Entitlement: ${entitlement.entitlement_amount} yearly, rollover: {entitlement.rollover}")
    
    # Test the period calculation
    print(f"\n📅 Testing _get_existing_claims_for_period for 2024:")
    claims_2024 = ExpenseService._get_existing_claims_for_period(
        employee_id, "Gas", "yearly", date(2024, 12, 15)
    )
    print(f"   Found {len(claims_2024)} claims in 2024")
    for claim in claims_2024:
        print(f"   {claim.id}: ${claim.claims_amount:.2f} on {claim.paid_date}")
    
    total_2024 = sum(claim.claims_amount for claim in claims_2024)
    print(f"   Total claimed in 2024: ${total_2024:.2f}")
    
    # Test the available entitlement calculation step by step
    print(f"\n💰 Testing _calculate_available_yearly_entitlement step by step:")
    
    # Step 1: Get current year's claims
    current_year_claims = ExpenseService._get_existing_claims_for_period(
        employee_id, "Gas", "yearly", date(2024, 12, 15)
    )
    current_year_claimed = sum(claim.claims_amount for claim in current_year_claims)
    print(f"   Step 1 - Current year claimed: ${current_year_claimed:.2f}")
    
    # Step 2: Calculate base entitlement
    base_entitlement = entitlement.entitlement_amount - current_year_claimed
    print(f"   Step 2 - Base entitlement: ${base_entitlement:.2f}")
    
    # Step 3: Calculate rollover
    rollover = ExpenseService._calculate_previous_year_rollover(
        employee_id, "Gas", entitlement, date(2024, 12, 15)
    )
    print(f"   Step 3 - Rollover: ${rollover:.2f}")
    
    # Step 4: Final calculation
    available = base_entitlement + rollover
    print(f"   Step 4 - Available entitlement: ${available:.2f}")
    
    # Test the full method
    print(f"\n🧮 Full method result:")
    full_result = ExpenseService._calculate_available_yearly_entitlement(
        employee_id, "Gas", entitlement, date(2024, 12, 15)
    )
    print(f"   Available entitlement: ${full_result:.2f}")

if __name__ == "__main__":
    debug_available_entitlement()
