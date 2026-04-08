#!/usr/bin/env python3
"""
Migration script to remove paid_status, is_approved, approval_date, and approved_by fields
from the expense_claims table.
"""

import sys
from pathlib import Path

# Add the parent directory to the path so we can import from app
sys.path.append(str(Path(__file__).parent.parent))

from app.models.base import engine
from sqlalchemy import text

def remove_status_fields():
    """Remove status-related fields from expense_claims table"""
    print("Removing status fields from expense_claims table...")
    
    try:
        with engine.connect() as conn:
            # Check if columns exist before dropping
            result = conn.execute(text("""
                SELECT COUNT(*) as count 
                FROM information_schema.columns 
                WHERE table_name = 'expense_claims' 
                AND column_name IN ('paid_status', 'is_approved', 'approval_date', 'approved_by')
            """))
            
            column_count = result.fetchone()[0]
            print(f"Found {column_count} status-related columns to remove")
            
            if column_count > 0:
                # Remove the columns
                columns_to_remove = ['paid_status', 'is_approved', 'approval_date', 'approved_by']
                
                for column in columns_to_remove:
                    try:
                        conn.execute(text(f"ALTER TABLE expense_claims DROP COLUMN {column}"))
                        print(f"[OK] Removed column: {column}")
                    except Exception as e:
                        print(f"[WARNING] Could not remove column {column}: {e}")
                
                conn.commit()
                print("[SUCCESS] Successfully removed status fields from expense_claims table")
            else:
                print("[OK] Status fields already removed from expense_claims table")
                
    except Exception as e:
        print(f"[ERROR] Error removing status fields: {str(e)}")
        raise

def verify_removal():
    """Verify the fields were removed successfully"""
    print("\nVerifying removal...")
    
    try:
        with engine.connect() as conn:
            result = conn.execute(text("DESCRIBE expense_claims"))
            print("Current expense_claims schema:")
            for row in result:
                print(f"  {row[0]} - {row[1]}")
                
    except Exception as e:
        print(f"Error verifying removal: {e}")

if __name__ == "__main__":
    remove_status_fields()
    verify_removal()
