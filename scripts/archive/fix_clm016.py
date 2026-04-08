#!/usr/bin/env python3
"""
Fix CLM016 incorrect data
"""

import sys
import os
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.repos.expense_claim_repo import update_claim

def fix_clm016():
    """Fix CLM016 incorrect data"""
    print("🔧 Fixing CLM016 incorrect data")
    print("=" * 40)
    
    # CLM016 has receipts_amount=230.0 but claims_amount=530.0
    # For a "No Cap" entitlement, both should be the same (230.0)
    
    print("Current CLM016 data:")
    print("  Receipts Amount: $230.00")
    print("  Claims Amount: $530.00")
    print("  This is incorrect for a 'No Cap' entitlement")
    
    print("\nFixing CLM016...")
    try:
        # Update the claim to set claims_amount = receipts_amount
        updated_claim = update_claim(
            claim_id="CLM016",
            claims_amount=230.0,  # Set to match receipts_amount
            performed_by="system_fix"
        )
        
        if updated_claim:
            print("✅ Successfully fixed CLM016")
            print(f"  New Receipts Amount: ${updated_claim.receipts_amount:.2f}")
            print(f"  New Claims Amount: ${updated_claim.claims_amount:.2f}")
        else:
            print("❌ Failed to fix CLM016")
    except Exception as e:
        print(f"❌ Error fixing CLM016: {e}")

if __name__ == "__main__":
    fix_clm016()
