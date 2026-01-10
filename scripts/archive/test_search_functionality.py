#!/usr/bin/env python3
"""
Test script for search functionality in yearly report
"""

import sys
import os
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.services.expense_service import ExpenseService

def test_search_functionality():
    """Test search functionality in yearly report"""
    print("🔍 Testing Search Functionality in Yearly Report")
    print("=" * 60)
    
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
        
        # Test different search scenarios
        test_cases = [
            ("Xiao", "Search by partial employee name"),
            ("Gas", "Search by expense type"),
            ("100", "Search by amount"),
            ("PR8", "Search by employee ID"),
            ("2025-10", "Search by date"),
            ("nonexistent", "Search for non-existent term")
        ]
        
        for search_term, description in test_cases:
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
            
            print(f"   Found {len(filtered_claims)} matching claims")
            
            if filtered_claims:
                print("   Sample results:")
                for i, claim in enumerate(filtered_claims[:3]):  # Show first 3 results
                    print(f"     {i+1}. {claim['employee_name']} - {claim['expense_type']} - ${claim['claims_amount']:.2f} - {claim['paid_date']}")
                if len(filtered_claims) > 3:
                    print(f"     ... and {len(filtered_claims) - 3} more")
            else:
                print("   No matches found")
        
        print(f"\n✅ Search functionality test completed!")
        return True
        
    except Exception as e:
        print(f"❌ Error testing search functionality: {e}")
        return False

if __name__ == "__main__":
    success = test_search_functionality()
    if not success:
        sys.exit(1)
