#!/usr/bin/env python3
"""
Add sample leave types to the database for testing the leave management functionality.
"""

import sys
import os
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.models.base import SessionLocal
from app.models.leave_type import LeaveType

def add_leave_types():
    """Add sample leave types to the database."""
    
    leave_types = [
        {
            "code": "VAC",
            "name": "Vacation",
        },
        {
            "code": "SICK",
            "name": "Sick Leave",
        },
        {
            "code": "PERSONAL",
            "name": "Personal Leave",
        },
        {
            "code": "BEREAVEMENT",
            "name": "Bereavement Leave",
        },
        {
            "code": "MATERNITY",
            "name": "Maternity Leave",
        },
        {
            "code": "PATERNITY",
            "name": "Paternity Leave",
        },
        {
            "code": "UNPAID",
            "name": "Unpaid Leave",
        },
        {
            "code": "JURY",
            "name": "Jury Duty",
        },
        {
            "code": "MILITARY",
            "name": "Military Leave",
        },
        {
            "code": "EDUCATION",
            "name": "Education Leave",
        }
    ]
    
    print("Adding leave types...")
    
    with SessionLocal() as session:
        for lt_data in leave_types:
            try:
                # Check if leave type already exists
                existing = session.query(LeaveType).filter(LeaveType.code == lt_data["code"]).first()
                if existing:
                    print(f"[SKIP] Leave type {lt_data['code']} already exists, skipping...")
                    continue
                
                leave_type = LeaveType(
                    code=lt_data["code"],
                    name=lt_data["name"]
                )
                session.add(leave_type)
                session.commit()
                print(f"[OK] Created leave type: {leave_type.name} ({leave_type.code})")
            except Exception as e:
                print(f"[ERROR] Error creating leave type {lt_data['code']}: {e}")
                session.rollback()
    
    print("\nLeave types setup complete!")

if __name__ == "__main__":
    add_leave_types()
