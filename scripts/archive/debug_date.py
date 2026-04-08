#!/usr/bin/env python3
"""
Debug script for date usage
"""

import sys
import os
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from datetime import date
from app.services.expense_service import ExpenseService

def debug_date():
    """Debug date usage"""
    print("🔍 Debugging Date Usage")
    print("=" * 50)
    
    print(f"Current date: {date.today()}")
    
    # Get a test employee
    from app.repos.employee_repo_ext import list_active_employees
    employees = list_active_employees()
    if not employees:
        print("❌ No employees found")
        return
    
    employee = employees[0]
    employee_id = employee.id
    print(f"👤 Testing with employee: {employee.full_name} ({employee_id})")
    
    # Test the available entitlement calculation with today's date
    from app.repos.expense_entitlement_repo import get_entitlement_by_employee_and_type
    entitlement = get_entitlement_by_employee_and_type(employee_id, "Gas")
    if entitlement:
        available = ExpenseService._calculate_available_yearly_entitlement(
            employee_id, "Gas", entitlement, date.today()
        )
        print(f"Available entitlement for today ({date.today()}): ${available:.2f}")
    
    # Test the calculate_claimable_amount method
    print(f"\n💰 Testing calculate_claimable_amount with $600:")
    claimable, message = ExpenseService.calculate_claimable_amount(employee_id, "Gas", 600.0)
    print(f"   Claimable amount: ${claimable:.2f}")
    print(f"   Message: {message}")

if __name__ == "__main__":
    debug_date()
