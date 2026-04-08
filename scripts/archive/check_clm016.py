#!/usr/bin/env python3
"""
Check CLM016 claim details
"""

import sys
import os
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.repos.expense_claim_repo import get_claims_by_employee

def check_clm016():
    """Check CLM016 claim details"""
    print("🔍 Checking CLM016 claim details")
    print("=" * 40)
    
    # Get all claims for PR62
    claims = get_claims_by_employee('PR62')
    
    # Find CLM016
    clm016 = None
    for claim in claims:
        if claim.id == 'CLM016':
            clm016 = claim
            break
    
    if clm016:
        print(f"Claim ID: {clm016.id}")
        print(f"Employee ID: {clm016.employee_id}")
        print(f"Paid Date: {clm016.paid_date}")
        print(f"Expense Type: {clm016.expense_type}")
        print(f"Receipts Amount: {clm016.receipts_amount}")
        print(f"Claims Amount: {clm016.claims_amount}")
        print(f"Notes: {clm016.notes}")
        print(f"Created: {clm016.created_at}")
        print(f"Updated: {clm016.updated_at}")
        
        if clm016.receipts_amount != clm016.claims_amount:
            print(f"\n⚠️ MISMATCH DETECTED:")
            print(f"  Receipts: {clm016.receipts_amount}")
            print(f"  Claims: {clm016.claims_amount}")
            print(f"  Difference: {clm016.claims_amount - clm016.receipts_amount}")
    else:
        print("CLM016 not found")

if __name__ == "__main__":
    check_clm016()
