#!/usr/bin/env python3
"""
Test script for termination functionality
"""

import sys
import os
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from datetime import date
from app.repos.termination_repo import create_termination, get_termination_by_employee_id
from app.repos.employee_repo import get_employee

def test_termination():
    """Test the termination functionality"""
    print("Testing termination functionality...")
    
    # Test with a sample employee (you'll need to replace with actual employee ID)
    test_employee_id = "E001"  # Replace with actual employee ID from your database
    
    try:
        # Check if employee exists
        employee = get_employee(test_employee_id)
        if not employee:
            print(f"❌ Employee {test_employee_id} not found. Please update the test script with a valid employee ID.")
            return
        
        print(f"Found employee: {employee.full_name} (Status: {employee.status})")
        
        if employee.status == "Terminated":
            print("Employee is already terminated. Testing termination retrieval...")
            termination = get_termination_by_employee_id(test_employee_id)
            if termination:
                print(f"✅ Found termination record: {termination.roe_reason_description}")
            else:
                print("❌ No termination record found for terminated employee")
        else:
            print("Creating test termination...")
            termination = create_termination(
                employee_id=test_employee_id,
                last_working_date=date.today(),
                termination_effective_date=date.today(),
                roe_reason_code="M",  # Dismissal or termination
                internal_reason="Test termination",
                remarks="This is a test termination"
            )
            print(f"✅ Termination created successfully: ID {termination.id}")
            
            # Verify employee status was updated
            updated_employee = get_employee(test_employee_id)
            print(f"Employee status updated to: {updated_employee.status}")
    
    except Exception as e:
        print(f"❌ Error testing termination: {e}")

if __name__ == "__main__":
    test_termination()
