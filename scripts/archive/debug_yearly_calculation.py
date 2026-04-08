#!/usr/bin/env python3
"""
Debug script for yearly calculation
"""

import sys
import os
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from datetime import date
from app.services.expense_service import ExpenseService
from app.repos.expense_entitlement_repo import get_entitlement_by_employee_and_type

def debug_yearly_calculation():
    """Debug the yearly calculation logic"""
    print("🔍 Debugging Yearly Calculation")
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
    
    # Test the calculation for 2024
    print(f"\n📅 Testing for 2024:")
    available_2024 = ExpenseService._calculate_available_yearly_entitlement(
        employee_id, "Gas", entitlement, date(2024, 12, 15)
    )
    print(f"   Available entitlement: ${available_2024:.2f}")
    
    # Test the calculation for 2025
    print(f"\n📅 Testing for 2025:")
    available_2025 = ExpenseService._calculate_available_yearly_entitlement(
        employee_id, "Gas", entitlement, date(2025, 3, 15)
    )
    print(f"   Available entitlement: ${available_2025:.2f}")
    
    # Test individual claim validation
    print(f"\n💰 Testing claim validation:")
    validation = ExpenseService.validate_claim_against_entitlements(
        employee_id, "Gas", 600.0
    )
    print(f"   Validation result: {validation}")

if __name__ == "__main__":
    debug_yearly_calculation()
