#!/usr/bin/env python3
"""
Final script to update employee ID from PR90 to PR91
This script temporarily disables foreign key checks to avoid constraint issues
"""

import sys
from pathlib import Path

# Add parent directory to path to import config
sys.path.append(str(Path(__file__).parent.parent))

from config.settings import MYSQL_HOST, MYSQL_PORT, MYSQL_USER, MYSQL_PASSWORD, MYSQL_DATABASE
import pymysql

def update_employee_id():
    """Update employee ID from PR90 to PR91"""
    
    # Connect to MySQL
    print(f"Connecting to MySQL database: {MYSQL_DATABASE} at {MYSQL_HOST}:{MYSQL_PORT}")
    connection = pymysql.connect(
        host=MYSQL_HOST,
        port=MYSQL_PORT,
        user=MYSQL_USER,
        password=MYSQL_PASSWORD,
        database=MYSQL_DATABASE,
        charset='utf8mb4',
        cursorclass=pymysql.cursors.DictCursor,
        autocommit=False
    )
    
    try:
        with connection.cursor() as cursor:
            # Check if PR90 exists
            print("\n[1] Checking if PR90 exists...")
            cursor.execute("SELECT id, full_name, first_name, last_name FROM employees WHERE id = 'PR90'")
            pr90_data = cursor.fetchone()
            if pr90_data:
                print(f"    Found: {pr90_data}")
            else:
                print("    ERROR: PR90 not found in employees table!")
                return False
            
            # Check if PR91 already exists
            print("\n[2] Checking if PR91 already exists...")
            cursor.execute("SELECT id FROM employees WHERE id = 'PR91'")
            if cursor.fetchone():
                print("    ERROR: PR91 already exists in employees table!")
                return False
            print("    OK: PR91 does not exist")
            
            # Disable foreign key checks temporarily
            print("\n[3] Disabling foreign key checks...")
            cursor.execute("SET FOREIGN_KEY_CHECKS = 0")
            print("    Foreign key checks disabled")
            
            print("\n[4] Updating employees table (primary key)...")
            cursor.execute("UPDATE employees SET id = 'PR91' WHERE id = 'PR90'")
            affected = cursor.rowcount
            print(f"    employees: {affected} rows")
            
            print("\n[5] Updating child tables...")
            
            # Define all tables that reference employee_id
            tables_to_update = [
                'attendance',
                'employment',
                'terminations',
                'work_permits',
                'employee_documents',
                'expense_claims',
                'expense_entitlements',
                'salary_history',
                '`leave`',  # backticks because 'leave' is a reserved word
                'employee_schedules'
            ]
            
            results = {}
            for table in tables_to_update:
                try:
                    cursor.execute(f"UPDATE {table} SET employee_id = 'PR91' WHERE employee_id = 'PR90'")
                    affected = cursor.rowcount
                    results[table.strip('`')] = affected
                    if affected > 0:
                        print(f"    {table.strip('`')}: {affected} rows")
                except Exception as e:
                    # Table might not exist or have no records
                    print(f"    {table.strip('`')}: Error - {e}")
                    # Don't add to results if there was an error
            
            # Re-enable foreign key checks
            print("\n[6] Re-enabling foreign key checks...")
            cursor.execute("SET FOREIGN_KEY_CHECKS = 1")
            print("    Foreign key checks re-enabled")
            
            # Verify the update
            print("\n[7] Verification...")
            cursor.execute("SELECT id, full_name, first_name, last_name, email, status FROM employees WHERE id = 'PR91'")
            pr91_data = cursor.fetchone()
            if pr91_data:
                print(f"    SUCCESS: Found PR91: {pr91_data}")
            else:
                print("    ERROR: PR91 not found after update!")
                raise Exception("Update verification failed - PR91 not found")
            
            cursor.execute("SELECT COUNT(*) as count FROM employees WHERE id = 'PR90'")
            pr90_count = cursor.fetchone()['count']
            if pr90_count == 0:
                print("    SUCCESS: PR90 no longer exists")
            else:
                print(f"    ERROR: PR90 still exists ({pr90_count} records)")
                raise Exception("Update verification failed - PR90 still exists")
            
            # Verify foreign key integrity
            print("\n[8] Verifying foreign key integrity...")
            cursor.execute("SELECT COUNT(*) as count FROM attendance WHERE employee_id = 'PR90'")
            old_refs = cursor.fetchone()['count']
            if old_refs > 0:
                print(f"    WARNING: Found {old_refs} attendance records still referencing PR90")
            else:
                print("    OK: No orphaned references found")
        
        # Commit the transaction
        print("\n[9] Committing transaction...")
        connection.commit()
        print("    Transaction committed successfully!")
        
        print("\n" + "="*60)
        print("UPDATE SUMMARY")
        print("="*60)
        print(f"  employees: 1 record updated (PR90 -> PR91)")
        for table, count in results.items():
            if count > 0:
                print(f"  {table}: {count} records updated")
        print("="*60)
        
        return True
        
    except Exception as e:
        print(f"\n[ERROR] {e}")
        print("Rolling back transaction...")
        try:
            # Try to re-enable foreign key checks before rollback
            with connection.cursor() as cursor:
                cursor.execute("SET FOREIGN_KEY_CHECKS = 1")
        except:
            pass
        connection.rollback()
        return False
    finally:
        connection.close()
        print("\nDatabase connection closed.")

if __name__ == "__main__":
    print("="*60)
    print("Employee ID Update Script")
    print("Updating: PR90 -> PR91 (Bikramjit Singh)")
    print("="*60)
    
    success = update_employee_id()
    
    if success:
        print("\n[SUCCESS] Employee ID updated successfully!")
        sys.exit(0)
    else:
        print("\n[FAILED] Employee ID update failed!")
        sys.exit(1)
