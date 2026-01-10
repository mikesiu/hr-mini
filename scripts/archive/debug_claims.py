#!/usr/bin/env python3
"""
Debug script for claims
"""

import sys
import os
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from datetime import date
from app.repos.expense_claim_repo import get_claims_by_employee

def debug_claims():
    """Debug claims details"""
    print("🔍 Debugging Claims Details")
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
    
    # Get all claims for this employee
    claims = get_claims_by_employee(employee_id)
    print(f"\n📋 All claims for this employee:")
    for claim in claims:
        print(f"   {claim.id}: {claim.expense_type} - ${claim.claims_amount:.2f} on {claim.paid_date}")
    
    # Get claims for 2024
    from app.repos.expense_claim_repo import get_claims_by_date_range
    claims_2024 = get_claims_by_date_range(date(2024, 1, 1), date(2024, 12, 31))
    gas_claims_2024 = [c for c in claims_2024 if c.employee_id == employee_id and c.expense_type == "Gas"]
    print(f"\n📅 Gas claims in 2024:")
    for claim in gas_claims_2024:
        print(f"   {claim.id}: ${claim.claims_amount:.2f} on {claim.paid_date}")
    
    total_2024 = sum(c.claims_amount for c in gas_claims_2024)
    print(f"   Total claimed in 2024: ${total_2024:.2f}")

if __name__ == "__main__":
    debug_claims()
