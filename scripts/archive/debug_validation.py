#!/usr/bin/env python3
"""
Debug script for validation logic
"""

import sys
import os
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from datetime import date
from app.services.expense_service import ExpenseService
from app.repos.expense_entitlement_repo import get_entitlement_by_employee_and_type

def debug_validation():
    """Debug the validation logic"""
    print("🔍 Debugging Validation Logic")
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
    
    # Test the calculation directly
    print(f"\n💰 Testing calculate_claimable_amount with $600:")
    claimable, message = ExpenseService.calculate_claimable_amount(employee_id, "Gas", 600.0)
    print(f"   Claimable amount: ${claimable:.2f}")
    print(f"   Message: {message}")
    
    # Test with a smaller amount
    print(f"\n💰 Testing calculate_claimable_amount with $100:")
    claimable, message = ExpenseService.calculate_claimable_amount(employee_id, "Gas", 100.0)
    print(f"   Claimable amount: ${claimable:.2f}")
    print(f"   Message: {message}")
    
    # Test the available entitlement calculation directly
    print(f"\n📅 Testing _calculate_available_yearly_entitlement:")
    available = ExpenseService._calculate_available_yearly_entitlement(
        employee_id, "Gas", entitlement, date.today()
    )
    print(f"   Available entitlement: ${available:.2f}")

if __name__ == "__main__":
    debug_validation()
