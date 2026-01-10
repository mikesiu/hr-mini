#!/usr/bin/env python3
"""
Test script to demonstrate company filtering functionality
"""

import sys
import pathlib

# Add parent directory to path
sys.path.append(str(pathlib.Path(__file__).resolve().parents[1]))

from app.ui.components.company_filter import get_filtered_employees_by_company, get_company_name
from app.repos.company_repo import get_all_companies

def main():
    """Test the company filtering functionality"""
    print("Testing Company Filtering Functionality")
    print("=" * 50)
    
    # Get all companies
    companies = get_all_companies()
    print(f"Available companies: {len(companies)}")
    for company in companies:
        print(f"  [{company.id}] {company.legal_name}")
    
    print("\n" + "-" * 50)
    
    # Test filtering by each company
    for company in companies:
        print(f"\nEmployees for {company.legal_name} ({company.id}):")
        employees = get_filtered_employees_by_company(company.id)
        print(f"  Found {len(employees)} employees")
        
        for emp in employees[:5]:  # Show first 5
            print(f"    {emp.id}: {emp.full_name}")
        
        if len(employees) > 5:
            print(f"    ... and {len(employees) - 5} more")
    
    print("\n" + "-" * 50)
    
    # Test all companies
    print(f"\nAll employees across all companies:")
    all_employees = get_filtered_employees_by_company(None)
    print(f"  Found {len(all_employees)} total employees")
    
    # Group by company for display
    from collections import defaultdict
    employees_by_company = defaultdict(list)
    
    for emp in all_employees:
        # Get current employment to find company
        from app.repos.employment_repo import get_current_employment
        current_employment = get_current_employment(emp.id)
        if current_employment:
            company_name = get_company_name(current_employment.company_id)
            employees_by_company[company_name].append(emp)
        else:
            employees_by_company["No Employment"].append(emp)
    
    for company_name, emps in employees_by_company.items():
        print(f"\n  {company_name}: {len(emps)} employees")
        for emp in emps[:3]:  # Show first 3
            print(f"    {emp.id}: {emp.full_name}")
        if len(emps) > 3:
            print(f"    ... and {len(emps) - 3} more")

if __name__ == "__main__":
    main()
