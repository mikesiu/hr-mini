#!/usr/bin/env python3
"""
Debug script for entitlement details
"""

import sys
import os
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from datetime import date
from app.repos.expense_entitlement_repo import get_entitlement_by_employee_and_type

def debug_entitlement():
    """Debug entitlement details"""
    print("🔍 Debugging Entitlement Details")
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
    
    print(f"📋 Entitlement details:")
    print(f"   ID: {entitlement.id}")
    print(f"   Amount: ${entitlement.entitlement_amount}")
    print(f"   Unit: {entitlement.unit}")
    print(f"   Start Date: {entitlement.start_date}")
    print(f"   End Date: {entitlement.end_date}")
    print(f"   Rollover: {entitlement.rollover}")
    print(f"   Created: {entitlement.created_at}")
    
    # Test rollover calculation
    from app.services.expense_service import ExpenseService
    print(f"\n🔄 Rollover calculation for 2024:")
    rollover_2024 = ExpenseService._calculate_previous_year_rollover(
        employee_id, "Gas", entitlement, date(2024, 12, 15)
    )
    print(f"   Rollover amount: ${rollover_2024:.2f}")
    
    print(f"\n🔄 Rollover calculation for 2025:")
    rollover_2025 = ExpenseService._calculate_previous_year_rollover(
        employee_id, "Gas", entitlement, date(2025, 3, 15)
    )
    print(f"   Rollover amount: ${rollover_2025:.2f}")

if __name__ == "__main__":
    debug_entitlement()
