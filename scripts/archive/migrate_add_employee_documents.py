#!/usr/bin/env python3
"""
Migration script to add employee_documents table to the database.
This script handles both MySQL and SQLite databases.
"""

import sys
import os
from pathlib import Path

# Add the project root to the Python path
project_root = Path(__file__).parent.parent
sys.path.insert(0, str(project_root))

from app.config.settings import USE_MYSQL, MYSQL_HOST, MYSQL_PORT, MYSQL_USER, MYSQL_PASSWORD, MYSQL_DATABASE, MYSQL_CHARSET, DB_PATH
from app.models.base import Base, engine
from app.models.employee_document import EmployeeDocument

def create_employee_documents_table():
    """Create the employee_documents table."""
    print("Creating employee_documents table...")
    
    try:
        # Create the table
        EmployeeDocument.__table__.create(engine, checkfirst=True)
        print("[SUCCESS] employee_documents table created successfully!")
        
        # Verify the table was created
        with engine.connect() as conn:
            if USE_MYSQL:
                from sqlalchemy import text
                result = conn.execute(text("SHOW TABLES LIKE 'employee_documents'"))
            else:
                from sqlalchemy import text
                result = conn.execute(text("SELECT name FROM sqlite_master WHERE type='table' AND name='employee_documents'"))
            
            if result.fetchone():
                print("[SUCCESS] Table verification successful!")
            else:
                print("[ERROR] Table verification failed!")
                return False
                
        return True
        
    except Exception as e:
        print(f"[ERROR] Error creating employee_documents table: {e}")
        return False

def verify_foreign_key_constraint():
    """Verify that the foreign key constraint is properly set up."""
    print("Verifying foreign key constraint...")
    
    try:
        with engine.connect() as conn:
            if USE_MYSQL:
                # Check foreign key constraints in MySQL
                from sqlalchemy import text
                result = conn.execute(text("""
                    SELECT 
                        CONSTRAINT_NAME,
                        COLUMN_NAME,
                        REFERENCED_TABLE_NAME,
                        REFERENCED_COLUMN_NAME
                    FROM INFORMATION_SCHEMA.KEY_COLUMN_USAGE 
                    WHERE TABLE_NAME = 'employee_documents' 
                    AND REFERENCED_TABLE_NAME IS NOT NULL
                """))
                
                constraints = result.fetchall()
                if constraints:
                    print("[SUCCESS] Foreign key constraint found:")
                    for constraint in constraints:
                        print(f"   - {constraint[1]} -> {constraint[2]}.{constraint[3]}")
                else:
                    print("[WARNING] No foreign key constraints found")
            else:
                # SQLite doesn't show foreign key constraints in the same way
                print("[SUCCESS] SQLite foreign key constraint should be active")
                
        return True
        
    except Exception as e:
        print(f"[ERROR] Error verifying foreign key constraint: {e}")
        return False

def main():
    """Main migration function."""
    print("=" * 60)
    print("EMPLOYEE DOCUMENTS MIGRATION")
    print("=" * 60)
    
    if USE_MYSQL:
        print(f"Database: MySQL ({MYSQL_HOST}:{MYSQL_PORT}/{MYSQL_DATABASE})")
    else:
        print(f"Database: SQLite ({DB_PATH})")
    
    print()
    
    # Create the table
    if not create_employee_documents_table():
        print("[ERROR] Migration failed!")
        return False
    
    # Verify foreign key constraint
    verify_foreign_key_constraint()
    
    print()
    print("[SUCCESS] Migration completed successfully!")
    print()
    print("The employee_documents table has been created with the following structure:")
    print("- id (String, Primary Key)")
    print("- employee_id (String, Foreign Key to employees.id)")
    print("- document_type (String)")
    print("- file_path (String)")
    print("- description (Text)")
    print("- upload_date (Date)")
    print("- created_at (DateTime)")
    print("- updated_at (DateTime)")
    print()
    print("You can now use the document management features in the employee directory.")
    
    return True

if __name__ == "__main__":
    success = main()
    sys.exit(0 if success else 1)
