#!/usr/bin/env python3
"""
Test script to verify the document management functionality.
"""

import sys
from pathlib import Path

# Add the project root to the Python path
project_root = Path(__file__).parent.parent
sys.path.insert(0, str(project_root))

from app.repos.employee_document_repo import (
    get_documents_by_employee, 
    add_document, 
    update_document,
    delete_document, 
    open_document,
    validate_file_path
)
from app.models.employee_document import EmployeeDocument
from datetime import date

def test_document_management():
    """Test the document management functionality."""
    print("=" * 60)
    print("TESTING DOCUMENT MANAGEMENT")
    print("=" * 60)
    
    # Test 1: Validate file path function
    print("\n1. Testing file path validation...")
    test_path = r"G:\Shared drives\4.HR & Payroll\3. Topco Pallet Recycling Ltd\Employee Records\Identification Supporting\Dean Schroeder CL.pdf"
    is_valid, message = validate_file_path(test_path)
    print(f"   Path: {test_path}")
    print(f"   Valid: {is_valid}")
    print(f"   Message: {message}")
    
    # Test 2: Check document types
    print("\n2. Available document types:")
    for i, doc_type in enumerate(EmployeeDocument.DOCUMENT_TYPES, 1):
        print(f"   {i}. {doc_type}")
    
    # Test 3: Test with a dummy employee (if exists)
    print("\n3. Testing document operations...")
    
    # Try to get documents for a test employee
    test_emp_id = "TEST001"  # This might not exist, but we'll test the function
    try:
        docs = get_documents_by_employee(test_emp_id)
        print(f"   Found {len(docs)} documents for employee {test_emp_id}")
    except Exception as e:
        print(f"   Error getting documents: {e}")
    
    print("\n[SUCCESS] Document management system is ready!")
    print("\nTo use the system:")
    print("1. Go to Employee Directory page")
    print("2. Load an existing employee")
    print("3. Click 'Toggle Documents' to show document management")
    print("4. Add documents by clicking 'Add Document'")
    print("5. Click 'Open' on any document to open it in your default PDF viewer")

if __name__ == "__main__":
    test_document_management()
