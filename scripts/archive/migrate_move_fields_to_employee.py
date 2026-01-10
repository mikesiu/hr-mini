#!/usr/bin/env python3
"""
Database migration script to move remarks and paystub fields from employment table to employees table.
This script safely moves the data and removes the old columns.
"""

import sqlite3
import sys
from pathlib import Path

# Add the parent directory to the path so we can import app modules
sys.path.append(str(Path(__file__).parent.parent))

from app.config.settings import DB_PATH

def migrate_database():
    """Move remarks and paystub fields from employment to employees table."""
    print(f"Migrating database: {DB_PATH}")
    
    try:
        with sqlite3.connect(str(DB_PATH)) as conn:
            cursor = conn.cursor()
            
            # Check current table structures
            cursor.execute("PRAGMA table_info(employees)")
            employee_columns = [row[1] for row in cursor.fetchall()]
            print(f"Current employees columns: {employee_columns}")
            
            cursor.execute("PRAGMA table_info(employment)")
            employment_columns = [row[1] for row in cursor.fetchall()]
            print(f"Current employment columns: {employment_columns}")
            
            # Add remarks and paystub columns to employees table if they don't exist
            if 'remarks' not in employee_columns:
                print("Adding remarks column to employees table...")
                cursor.execute("ALTER TABLE employees ADD COLUMN remarks TEXT")
                print("✓ remarks column added to employees table")
            else:
                print("✓ remarks column already exists in employees table")
            
            if 'paystub' not in employee_columns:
                print("Adding paystub column to employees table...")
                cursor.execute("ALTER TABLE employees ADD COLUMN paystub BOOLEAN DEFAULT 0")
                print("✓ paystub column added to employees table")
            else:
                print("✓ paystub column already exists in employees table")
            
            # Check if employment table has the fields to migrate
            if 'remarks' in employment_columns and 'paystub' in employment_columns:
                print("Migrating data from employment to employees table...")
                
                # Get all employment records with remarks or paystub data
                cursor.execute("""
                    SELECT employee_id, remarks, paystub 
                    FROM employment 
                    WHERE remarks IS NOT NULL AND remarks != '' 
                       OR paystub = 1
                """)
                
                employment_data = cursor.fetchall()
                print(f"Found {len(employment_data)} employment records with remarks or paystub data")
                
                # Update employees table with the data
                for employee_id, remarks, paystub in employment_data:
                    # Get current employee data
                    cursor.execute("SELECT remarks, paystub FROM employees WHERE id = ?", (employee_id,))
                    current_data = cursor.fetchone()
                    
                    if current_data:
                        current_remarks, current_paystub = current_data
                        
                        # Merge remarks (append if both exist)
                        new_remarks = remarks
                        if current_remarks and current_remarks.strip():
                            new_remarks = f"{current_remarks.strip()}\n\n{remarks}" if remarks else current_remarks
                        
                        # Use paystub from employment if it's True, otherwise keep current
                        new_paystub = paystub if paystub else current_paystub
                        
                        cursor.execute("""
                            UPDATE employees 
                            SET remarks = ?, paystub = ? 
                            WHERE id = ?
                        """, (new_remarks, new_paystub, employee_id))
                        
                        print(f"  Updated employee {employee_id} with remarks and paystub data")
                
                print("✓ Data migration completed")
            else:
                print("✓ No remarks or paystub data found in employment table to migrate")
            
            # Remove remarks and paystub columns from employment table
            if 'remarks' in employment_columns:
                print("Removing remarks column from employment table...")
                # SQLite doesn't support DROP COLUMN directly, so we need to recreate the table
                cursor.execute("""
                    CREATE TABLE employment_new (
                        id INTEGER PRIMARY KEY AUTOINCREMENT,
                        employee_id VARCHAR NOT NULL,
                        company_id VARCHAR NOT NULL,
                        position VARCHAR,
                        company VARCHAR,
                        department VARCHAR,
                        start_date DATE,
                        end_date DATE,
                        pay_rate FLOAT,
                        pay_type VARCHAR,
                        notes TEXT,
                        FOREIGN KEY (employee_id) REFERENCES employees(id) ON DELETE CASCADE,
                        FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE RESTRICT
                    )
                """)
                
                cursor.execute("""
                    INSERT INTO employment_new 
                    SELECT id, employee_id, company_id, position, company, department, 
                           start_date, end_date, pay_rate, pay_type, notes
                    FROM employment
                """)
                
                cursor.execute("DROP TABLE employment")
                cursor.execute("ALTER TABLE employment_new RENAME TO employment")
                print("✓ remarks column removed from employment table")
            else:
                print("✓ remarks column not found in employment table")
            
            if 'paystub' in employment_columns:
                print("Removing paystub column from employment table...")
                # This was already handled in the remarks removal above
                print("✓ paystub column removed from employment table")
            else:
                print("✓ paystub column not found in employment table")
            
            # Verify the changes
            cursor.execute("PRAGMA table_info(employees)")
            new_employee_columns = [row[1] for row in cursor.fetchall()]
            print(f"Updated employees columns: {new_employee_columns}")
            
            cursor.execute("PRAGMA table_info(employment)")
            new_employment_columns = [row[1] for row in cursor.fetchall()]
            print(f"Updated employment columns: {new_employment_columns}")
            
            print("\n✅ Database migration completed successfully!")
            
    except Exception as e:
        print(f"❌ Migration failed: {e}")
        return False
    
    return True

if __name__ == "__main__":
    success = migrate_database()
    sys.exit(0 if success else 1)
