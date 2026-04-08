#!/usr/bin/env python3
"""
Simple migration script to migrate pay data from employment table to salary_history table.
This script works directly with the database to avoid model conflicts.
"""

import sys
import pathlib

sys.path.append(str(pathlib.Path(__file__).resolve().parents[1]))

from sqlalchemy import text
from app.models.base import engine
from datetime import date

def migrate_pay_data():
    """Migrate pay data directly from database."""
    print("Migrating pay data from employment to salary_history...")
    
    try:
        with engine.connect() as conn:
            # Check if salary_history table exists
            result = conn.execute(text("""
                SELECT COUNT(*) as count 
                FROM information_schema.tables 
                WHERE table_name = 'salary_history'
            """))
            
            if result.fetchone()[0] == 0:
                print("[ERROR] salary_history table does not exist. Run migrate_salary_history.py first.")
                return 0
            
            # Get employment records with pay data
            result = conn.execute(text("""
                SELECT id, pay_rate, pay_type, start_date, end_date
                FROM employment 
                WHERE pay_rate IS NOT NULL
            """))
            
            employment_records = result.fetchall()
            migrated_count = 0
            
            for emp_id, pay_rate, pay_type, start_date, end_date in employment_records:
                # Insert into salary_history
                conn.execute(text("""
                    INSERT INTO salary_history (employment_id, pay_rate, pay_type, effective_date, end_date, notes)
                    VALUES (:employment_id, :pay_rate, :pay_type, :effective_date, :end_date, :notes)
                """), {
                    'employment_id': emp_id,
                    'pay_rate': pay_rate,
                    'pay_type': pay_type or 'Hourly',
                    'effective_date': start_date or date.today(),
                    'end_date': end_date,
                    'notes': 'Migrated from employment record'
                })
                migrated_count += 1
            
            conn.commit()
            print(f"[OK] Migrated {migrated_count} salary records")
            return migrated_count
            
    except Exception as e:
        print(f"[ERROR] Error migrating pay data: {str(e)}")
        return 0

def verify_migration():
    """Verify the migration was successful."""
    print("\nVerifying migration...")
    
    try:
        with engine.connect() as conn:
            # Check salary_history records
            result = conn.execute(text("SELECT COUNT(*) FROM salary_history"))
            salary_count = result.fetchone()[0]
            print(f"[OK] salary_history table contains {salary_count} records")
            
            # Show sample records
            if salary_count > 0:
                result = conn.execute(text("""
                    SELECT sh.id, sh.pay_rate, sh.pay_type, sh.effective_date, e.position, c.legal_name
                    FROM salary_history sh
                    JOIN employment e ON sh.employment_id = e.id
                    JOIN companies c ON e.company_id = c.id
                    ORDER BY sh.effective_date DESC
                    LIMIT 5
                """))
                
                print("\nSample salary records:")
                for record in result.fetchall():
                    print(f"  - ${record[1]:,.2f} {record[2]} at {record[5]} ({record[3]})")
                    
    except Exception as e:
        print(f"[ERROR] Error verifying migration: {str(e)}")

def main():
    """Main migration function."""
    print("Salary Data Migration")
    print("=" * 50)
    
    migrated_count = migrate_pay_data()
    
    if migrated_count > 0:
        verify_migration()
    
    print("\n" + "=" * 50)
    print("Migration completed!")
    print(f"Migrated {migrated_count} salary records to salary_history table.")

if __name__ == "__main__":
    main()
