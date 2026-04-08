#!/usr/bin/env python3
"""
Script to verify the employee ID update from PR90 to PR91
"""

import sys
from pathlib import Path

# Add parent directory to path to import config
sys.path.append(str(Path(__file__).parent.parent))

from config.settings import MYSQL_HOST, MYSQL_PORT, MYSQL_USER, MYSQL_PASSWORD, MYSQL_DATABASE
import pymysql

def verify_update():
    """Verify that the employee ID has been updated correctly"""
    
    # Connect to MySQL
    print(f"Connecting to MySQL database: {MYSQL_DATABASE} at {MYSQL_HOST}:{MYSQL_PORT}\n")
    connection = pymysql.connect(
        host=MYSQL_HOST,
        port=MYSQL_PORT,
        user=MYSQL_USER,
        password=MYSQL_PASSWORD,
        database=MYSQL_DATABASE,
        charset='utf8mb4',
        cursorclass=pymysql.cursors.DictCursor
    )
    
    try:
        with connection.cursor() as cursor:
            print("="*60)
            print("VERIFICATION REPORT")
            print("="*60)
            
            # Check employee table
            print("\n[1] Employee Record (PR91)")
            print("-" * 60)
            cursor.execute("""
                SELECT id, full_name, first_name, last_name, email, status, hire_date
                FROM employees WHERE id = 'PR91'
            """)
            employee = cursor.fetchone()
            if employee:
                for key, value in employee.items():
                    print(f"    {key}: {value}")
                print("    Status: FOUND")
            else:
                print("    Status: NOT FOUND - ERROR!")
                return False
            
            # Check that PR90 doesn't exist
            print("\n[2] Old Employee ID (PR90)")
            print("-" * 60)
            cursor.execute("SELECT COUNT(*) as count FROM employees WHERE id = 'PR90'")
            count = cursor.fetchone()['count']
            if count == 0:
                print("    Status: CORRECTLY REMOVED")
            else:
                print(f"    Status: STILL EXISTS ({count} records) - ERROR!")
                return False
            
            # Check all related tables
            print("\n[3] Related Tables")
            print("-" * 60)
            
            tables_to_check = [
                ('attendance', 'employee_id'),
                ('employment', 'employee_id'),
                ('terminations', 'employee_id'),
                ('work_permits', 'employee_id'),
                ('employee_documents', 'employee_id'),
                ('expense_claims', 'employee_id'),
                ('expense_entitlements', 'employee_id'),
                ('salary_history', 'employee_id'),
                ('`leave`', 'employee_id'),
                ('employee_schedules', 'employee_id')
            ]
            
            all_good = True
            for table, column in tables_to_check:
                # Check PR91 references
                cursor.execute(f"SELECT COUNT(*) as count FROM {table} WHERE {column} = 'PR91'")
                pr91_count = cursor.fetchone()['count']
                
                # Check PR90 references (should be 0)
                cursor.execute(f"SELECT COUNT(*) as count FROM {table} WHERE {column} = 'PR90'")
                pr90_count = cursor.fetchone()['count']
                
                table_name = table.strip('`')
                if pr90_count > 0:
                    print(f"    {table_name}: ERROR - {pr90_count} records still reference PR90!")
                    all_good = False
                elif pr91_count > 0:
                    print(f"    {table_name}: OK - {pr91_count} records reference PR91")
                else:
                    print(f"    {table_name}: OK - No records (expected)")
            
            if not all_good:
                return False
            
            print("\n" + "="*60)
            print("VERIFICATION COMPLETE")
            print("="*60)
            print("All checks passed successfully!")
            print("Employee ID has been updated from PR90 to PR91")
            print("="*60)
            
            return True
            
    except Exception as e:
        print(f"\nError during verification: {e}")
        return False
    finally:
        connection.close()

if __name__ == "__main__":
    print("="*60)
    print("Employee ID Update Verification")
    print("Verifying: PR90 -> PR91 (Bikramjit Singh)")
    print("="*60)
    print()
    
    success = verify_update()
    
    if success:
        print("\n[SUCCESS] Verification passed!")
        sys.exit(0)
    else:
        print("\n[FAILED] Verification failed!")
        sys.exit(1)
