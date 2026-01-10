#!/usr/bin/env python3
"""
Check for data integrity issues in claims
"""

import sys
import os
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.repos.expense_claim_repo import get_claims_by_employee
from app.repos.employee_repo_ext import list_active_employees

def check_data_integrity():
    """Check for data integrity issues in claims"""
    print("🔍 Checking Data Integrity Issues")
    print("=" * 50)
    
    employees = list_active_employees()
    total_issues = 0
    
    for emp in employees:
        claims = get_claims_by_employee(emp.id)
        emp_issues = 0
        
        for claim in claims:
            if claim.claims_amount > claim.receipts_amount:
                if emp_issues == 0:
                    print(f"\n👤 {emp.full_name} ({emp.id}):")
                print(f"  ❌ {claim.id}: Claims ${claim.claims_amount:.2f} > Receipts ${claim.receipts_amount:.2f} on {claim.paid_date}")
                emp_issues += 1
                total_issues += 1
        
        if emp_issues > 0:
            print(f"  Total issues for {emp.full_name}: {emp_issues}")
    
    if total_issues == 0:
        print("✅ No data integrity issues found!")
    else:
        print(f"\n⚠️ Found {total_issues} total data integrity issues")

if __name__ == "__main__":
    check_data_integrity()
