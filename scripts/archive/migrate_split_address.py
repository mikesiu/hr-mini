#!/usr/bin/env python3
"""
Database migration script to split the address field into 4 separate fields:
street, city, province, and postal_code.
This script safely migrates existing address data and updates the database schema.
"""

import sqlite3
import sys
import re
from pathlib import Path

# Add the parent directory to the path so we can import app modules
sys.path.append(str(Path(__file__).parent.parent))

from app.config.settings import DB_PATH

def parse_address(address_text):
    """
    Attempt to parse address text into street, city, province, and postal code.
    This is a basic parser - more sophisticated parsing could be added if needed.
    """
    if not address_text or not address_text.strip():
        return None, None, None, None
    
    address = address_text.strip()
    
    # Try to extract postal code (Canadian format: A1A 1A1 or A1A1A1)
    postal_code_pattern = r'\b[A-Za-z]\d[A-Za-z]\s?\d[A-Za-z]\d\b'
    postal_match = re.search(postal_code_pattern, address)
    postal_code = postal_match.group(0).replace(' ', '') if postal_match else None
    
    # Remove postal code from address for further parsing
    if postal_code:
        address = re.sub(postal_code_pattern, '', address).strip()
    
    # Split by common delimiters
    parts = re.split(r'[,;]', address)
    parts = [part.strip() for part in parts if part.strip()]
    
    if len(parts) >= 3:
        # Assume format: street, city, province
        street = parts[0]
        city = parts[1]
        province = parts[2]
    elif len(parts) == 2:
        # Assume format: street, city (province unknown)
        street = parts[0]
        city = parts[1]
        province = None
    elif len(parts) == 1:
        # Single part - could be street or city
        street = parts[0]
        city = None
        province = None
    else:
        street = None
        city = None
        province = None
    
    return street, city, province, postal_code

def migrate_database():
    """Split address field into 4 separate fields."""
    print(f"Migrating database: {DB_PATH}")
    
    try:
        with sqlite3.connect(str(DB_PATH)) as conn:
            cursor = conn.cursor()
            
            # Check current table structure
            cursor.execute("PRAGMA table_info(employees)")
            columns = [row[1] for row in cursor.fetchall()]
            print(f"Current columns: {columns}")
            
            # Add new address columns if they don't exist
            new_columns = ['street', 'city', 'province', 'postal_code']
            for col in new_columns:
                if col not in columns:
                    print(f"Adding {col} column...")
                    cursor.execute(f"ALTER TABLE employees ADD COLUMN {col} VARCHAR")
                    print(f"✓ {col} column added")
                else:
                    print(f"✓ {col} column already exists")
            
            # Check if address column exists and migrate data
            if 'address' in columns:
                print("Migrating existing address data...")
                
                # Get all employees with address data
                cursor.execute("SELECT id, address FROM employees WHERE address IS NOT NULL AND address != ''")
                employees_with_address = cursor.fetchall()
                
                print(f"Found {len(employees_with_address)} employees with address data")
                
                migrated_count = 0
                for employee_id, address in employees_with_address:
                    street, city, province, postal_code = parse_address(address)
                    
                    if street or city or province or postal_code:
                        cursor.execute("""
                            UPDATE employees 
                            SET street = ?, city = ?, province = ?, postal_code = ?
                            WHERE id = ?
                        """, (street, city, province, postal_code, employee_id))
                        migrated_count += 1
                        print(f"  Migrated address for employee {employee_id}: {address[:50]}...")
                
                print(f"✓ Migrated {migrated_count} addresses")
                
                # Remove the old address column
                print("Removing old address column...")
                # SQLite doesn't support DROP COLUMN directly, so we need to recreate the table
                cursor.execute("""
                    CREATE TABLE employees_new (
                        id VARCHAR PRIMARY KEY,
                        full_name VARCHAR NOT NULL,
                        first_name VARCHAR,
                        last_name VARCHAR,
                        other_name VARCHAR,
                        email VARCHAR,
                        phone VARCHAR,
                        street VARCHAR,
                        city VARCHAR,
                        province VARCHAR,
                        postal_code VARCHAR,
                        dob DATE,
                        sin VARCHAR,
                        hire_date DATE,
                        probation_end_date DATE,
                        status VARCHAR DEFAULT 'Active',
                        remarks TEXT,
                        paystub BOOLEAN DEFAULT 0,
                        created_at DATETIME,
                        updated_at DATETIME
                    )
                """)
                
                # Copy data from old table to new table (excluding address column)
                cursor.execute("""
                    INSERT INTO employees_new 
                    SELECT id, full_name, first_name, last_name, other_name, email, phone,
                           street, city, province, postal_code, dob, sin, hire_date, 
                           probation_end_date, status, remarks, paystub, created_at, updated_at
                    FROM employees
                """)
                
                # Replace old table with new table
                cursor.execute("DROP TABLE employees")
                cursor.execute("ALTER TABLE employees_new RENAME TO employees")
                print("✓ Old address column removed")
            else:
                print("✓ No address column found to migrate")
            
            # Verify the changes
            cursor.execute("PRAGMA table_info(employees)")
            new_columns = [row[1] for row in cursor.fetchall()]
            print(f"Updated columns: {new_columns}")
            
            # Show sample of migrated data
            cursor.execute("""
                SELECT id, full_name, street, city, province, postal_code 
                FROM employees 
                WHERE street IS NOT NULL OR city IS NOT NULL OR province IS NOT NULL OR postal_code IS NOT NULL
                LIMIT 5
            """)
            sample_data = cursor.fetchall()
            
            if sample_data:
                print("\nSample of migrated address data:")
                for row in sample_data:
                    print(f"  {row[0]} ({row[1]}): {row[2]}, {row[3]}, {row[4]} {row[5]}")
            
            print("\n✅ Database migration completed successfully!")
            
    except Exception as e:
        print(f"❌ Migration failed: {e}")
        return False
    
    return True

if __name__ == "__main__":
    success = migrate_database()
    sys.exit(0 if success else 1)
