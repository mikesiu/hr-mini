#!/usr/bin/env python3
"""
Add sample companies to the database for testing the company management functionality.
"""

import sys
import os
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.repos.company_repo import create_company

def add_sample_companies():
    """Add sample companies to the database."""
    
    sample_companies = [
        {
            "company_id": "TOPCO",
            "legal_name": "Topco Pallet Recycling Ltd.",
            "trade_name": "Topco Recycling",
            "address_line1": "123 Industrial Way",
            "city": "Vancouver",
            "province": "BC",
            "postal_code": "V6B 1A1",
            "country": "Canada",
            "notes": "Main pallet recycling facility"
        },
        {
            "company_id": "RPP",
            "legal_name": "RPP Manufacturing Inc.",
            "trade_name": "RPP Mfg",
            "address_line1": "456 Factory Road",
            "address_line2": "Unit 100",
            "city": "Burnaby",
            "province": "BC",
            "postal_code": "V5C 2B2",
            "country": "Canada",
            "notes": "Manufacturing division"
        },
        {
            "company_id": "LOGISTICS",
            "legal_name": "Logistics Solutions Corp.",
            "trade_name": "LogiSol",
            "address_line1": "789 Distribution Blvd",
            "city": "Richmond",
            "province": "BC",
            "postal_code": "V7A 3C3",
            "country": "Canada",
            "notes": "Transportation and logistics services"
        },
        {
            "company_id": "ADMIN",
            "legal_name": "Administrative Services Ltd.",
            "address_line1": "321 Office Plaza",
            "city": "Surrey",
            "province": "BC",
            "postal_code": "V3R 4D4",
            "country": "Canada",
            "notes": "Corporate headquarters and administrative services"
        }
    ]
    
    print("Adding sample companies...")
    
    for company_data in sample_companies:
        try:
            company = create_company(
                company_id=company_data["company_id"],
                legal_name=company_data["legal_name"],
                trade_name=company_data.get("trade_name"),
                address_line1=company_data.get("address_line1"),
                address_line2=company_data.get("address_line2"),
                city=company_data.get("city"),
                province=company_data.get("province"),
                postal_code=company_data.get("postal_code"),
                country=company_data.get("country", "Canada"),
                notes=company_data.get("notes"),
                performed_by="system"
            )
            print(f"[OK] Created company: {company.legal_name} ({company.id})")
        except ValueError as e:
            if "already exists" in str(e):
                print(f"[SKIP] Company {company_data['company_id']} already exists, skipping...")
            else:
                print(f"[ERROR] Error creating company {company_data['company_id']}: {e}")
        except Exception as e:
            print(f"[ERROR] Unexpected error creating company {company_data['company_id']}: {e}")
    
    print("\nSample companies setup complete!")

if __name__ == "__main__":
    add_sample_companies()