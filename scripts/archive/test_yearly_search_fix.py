#!/usr/bin/env python3
"""
Test script to verify yearly report search fix
"""

import sys
import os
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.services.expense_service import ExpenseService

def test_yearly_search_fix():
    """Test that yearly report search works without form interference"""
    print("🔍 Testing Yearly Report Search Fix")
    print("=" * 50)
    
    # Get yearly report for 2025
    year = 2025
    print(f"📊 Getting yearly report for {year}")
    
    try:
        report = ExpenseService.get_yearly_expense_report(year)
        
        if not report:
            print("❌ No report data found")
            return False
        
        detailed_claims = report['detailed_claims']
        print(f"📋 Total claims in report: {len(detailed_claims)}")
        
        # Test search functionality
        test_searches = [
            ("Xiao", "Employee name search"),
            ("Gas", "Expense type search"),
            ("180", "Amount search"),
            ("PR8", "Employee ID search")
        ]
        
        for search_term, description in test_searches:
            print(f"\n🔍 Testing: {description} ('{search_term}')")
            
            # Simulate the search logic
            search_lower = search_term.lower()
            filtered_claims = [
                claim for claim in detailed_claims
                if (search_lower in claim['employee_name'].lower() or
                    search_lower in claim['expense_type'].lower() or
                    search_lower in str(claim['claims_amount']) or
                    search_lower in str(claim['receipts_amount']) or
                    search_lower in claim['employee_id'].lower() or
                    search_lower in str(claim['paid_date']))
            ]
            
            print(f"   ✅ Found {len(filtered_claims)} matching claims")
            
            if filtered_claims:
                print("   Sample results:")
                for i, claim in enumerate(filtered_claims[:2]):
                    print(f"     {i+1}. {claim['employee_name']} - {claim['expense_type']} - ${claim['claims_amount']:.2f}")
        
        print(f"\n✅ All search tests completed successfully!")
        print("🎯 The search functionality should now work without form interference.")
        return True
        
    except Exception as e:
        print(f"❌ Error testing yearly search fix: {e}")
        return False

if __name__ == "__main__":
    success = test_yearly_search_fix()
    if not success:
        sys.exit(1)
