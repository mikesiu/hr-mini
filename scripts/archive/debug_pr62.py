#!/usr/bin/env python3
"""
Debug script for employee PR62 claims issue
"""

import sys
import os
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.repos.employee_repo_ext import get_employee
from app.services.expense_service import ExpenseService
from app.repos.expense_entitlement_repo import get_entitlements_by_employee

def debug_pr62():
    """Debug employee PR62 claims issue"""
    print("🔍 Debugging Employee PR62 Claims Issue")
    print("=" * 50)
    
    # Get employee PR62
    emp = get_employee('PR62')
    if not emp:
        print("❌ Employee PR62 not found")
        return
    
    print(f"👤 Employee: {emp.full_name} ({emp.id})")
    
    # Get entitlements
    entitlements = get_entitlements_by_employee('PR62')
    print(f"\n📋 Entitlements for PR62:")
    for ent in entitlements:
        print(f"  {ent.expense_type}: ${ent.entitlement_amount or 'No Cap'} - {ent.unit} - Rollover: {ent.rollover}")
    
    # Get recent claims
    claims = ExpenseService.get_employee_claims('PR62', limit=5)
    print(f"\n💰 Recent claims for PR62:")
    for claim in claims:
        print(f"  {claim['id']}: {claim['expense_type']} - Receipts: ${claim['receipts_amount']:.2f}, Claims: ${claim['claims_amount']:.2f} on {claim['paid_date']}")
    
    # Test validation for a Gas claim
    print(f"\n🧪 Testing validation for Gas claim with $500:")
    validation = ExpenseService.validate_claim_against_entitlements('PR62', 'Gas', 500.0)
    print(f"  Valid: {validation['valid']}")
    print(f"  Claimable: ${validation['claimable_amount']:.2f}")
    print(f"  Message: {validation['message']}")

if __name__ == "__main__":
    debug_pr62()
