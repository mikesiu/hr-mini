#!/usr/bin/env python3
"""
Test script for yearly expense report functionality
"""

import sys
import os
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.services.expense_service import ExpenseService

def test_yearly_report():
    """Test yearly expense report functionality"""
    print("🧪 Testing Yearly Expense Report")
    print("=" * 50)
    
    # Test for 2025 (current year)
    year = 2025
    print(f"📊 Generating yearly report for {year}")
    
    try:
        report = ExpenseService.get_yearly_expense_report(year)
        
        if report:
            print("✅ Yearly report generated successfully!")
            
            # Summary
            summary = report['summary']
            print(f"\n📈 Summary for {year}:")
            print(f"  Total Claims: {summary['total_claims']}")
            print(f"  Total Receipts: ${summary['total_receipts']:.2f}")
            print(f"  Total Claimed: ${summary['total_claimed']:.2f}")
            print(f"  Active Employees: {summary['total_employees']}")
            
            # Monthly breakdown
            print(f"\n📅 Monthly Breakdown:")
            monthly_data = report['monthly_breakdown']
            for month_data in monthly_data:
                if month_data['total_claims'] > 0:
                    print(f"  Month {month_data['month']:02d}: {month_data['total_claims']} claims, "
                          f"${month_data['total_receipts']:.2f} receipts, ${month_data['total_claimed']:.2f} claimed")
            
            # Expense type breakdown
            print(f"\n💰 Expense Type Breakdown:")
            expense_types = report['expense_type_breakdown']
            for exp_type, data in expense_types.items():
                print(f"  {exp_type}: {data['total_claims']} claims, "
                      f"${data['total_receipts']:.2f} receipts, ${data['total_claimed']:.2f} claimed "
                      f"(avg: ${data['average_per_claim']:.2f})")
            
            # Top employees
            print(f"\n👥 Top Employees by Claims:")
            top_employees = report['top_employees']
            for i, emp in enumerate(top_employees[:5], 1):
                print(f"  {i}. {emp['employee_name']} ({emp['employee_id']}): "
                      f"{emp['total_claims']} claims, ${emp['total_claimed']:.2f} claimed")
            
            # Sample detailed claims
            print(f"\n📋 Sample Detailed Claims (first 3):")
            detailed_claims = report['detailed_claims']
            for claim in detailed_claims[:3]:
                print(f"  {claim['employee_name']} - {claim['expense_type']} - "
                      f"${claim['claims_amount']:.2f} on {claim['paid_date']}")
            
            print(f"\n✅ Yearly report test completed successfully!")
            return True
        else:
            print(f"ℹ️ No claims found for {year}")
            return True
            
    except Exception as e:
        print(f"❌ Error generating yearly report: {e}")
        return False

if __name__ == "__main__":
    success = test_yearly_report()
    if not success:
        sys.exit(1)
