#!/usr/bin/env python3
"""
Test amount search functionality
"""

import sys
import os
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.services.expense_service import ExpenseService

def test_amount_search():
    """Test amount search functionality"""
    print("🔍 Testing Amount Search Functionality")
    print("=" * 50)
    
    # Get yearly report for 2025
    report = ExpenseService.get_yearly_expense_report(2025)
    claims = report['detailed_claims']
    
    print("Sample amounts in claims:")
    for i, claim in enumerate(claims[:5]):
        print(f"  {claim['claims_amount']} - {claim['receipts_amount']}")
    
    print("\nTesting search for '180':")
    filtered = [c for c in claims if '180' in str(c['claims_amount']) or '180' in str(c['receipts_amount'])]
    print(f"Found {len(filtered)} claims with 180")
    
    if filtered:
        print("Sample results:")
        for claim in filtered[:3]:
            print(f"  {claim['employee_name']} - {claim['expense_type']} - ${claim['claims_amount']:.2f}")

if __name__ == "__main__":
    test_amount_search()
