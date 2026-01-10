#!/usr/bin/env python3
"""
Debug script for calculate_claimable_amount method
"""

import sys
import os
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from datetime import date
from app.services.expense_service import ExpenseService

def debug_calculate_claimable():
    """Debug calculate_claimable_amount method"""
    print("🔍 Debugging calculate_claimable_amount Method")
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
    
    # Test with a mock date to simulate 2024
    from unittest.mock import patch
    with patch('app.services.expense_service.date') as mock_date:
        mock_date.today.return_value = date(2024, 12, 15)
        
        print(f"\n💰 Testing calculate_claimable_amount with $600 (simulating 2024-12-15):")
        claimable, message = ExpenseService.calculate_claimable_amount(employee_id, "Gas", 600.0)
        print(f"   Claimable amount: ${claimable:.2f}")
        print(f"   Message: {message}")
        
        print(f"\n💰 Testing calculate_claimable_amount with $100 (simulating 2024-12-15):")
        claimable, message = ExpenseService.calculate_claimable_amount(employee_id, "Gas", 100.0)
        print(f"   Claimable amount: ${claimable:.2f}")
        print(f"   Message: {message}")

if __name__ == "__main__":
    debug_calculate_claimable()
