#!/usr/bin/env python3
"""
Script to fix foreign key constraints and remove remaining status fields
"""

import sys
from pathlib import Path

# Add the parent directory to the path so we can import from app
sys.path.append(str(Path(__file__).parent.parent))

from app.models.base import engine
from sqlalchemy import text

def fix_constraints():
    """Remove foreign key constraints and remaining status fields"""
    print("Fixing foreign key constraints and removing remaining status fields...")
    
    try:
        with engine.connect() as conn:
            # First, drop the foreign key constraint
            print("Dropping foreign key constraint...")
            try:
                conn.execute(text("ALTER TABLE expense_claims DROP FOREIGN KEY expense_claims_ibfk_2"))
                print("[OK] Dropped foreign key constraint")
            except Exception as e:
                print(f"[WARNING] Could not drop foreign key constraint: {e}")
            
            # Now remove the remaining columns
            columns_to_remove = ['paid_status', 'approved_by']
            
            for column in columns_to_remove:
                try:
                    conn.execute(text(f"ALTER TABLE expense_claims DROP COLUMN {column}"))
                    print(f"[OK] Removed column: {column}")
                except Exception as e:
                    print(f"[WARNING] Could not remove column {column}: {e}")
            
            conn.commit()
            print("[SUCCESS] Successfully removed remaining status fields")
                
    except Exception as e:
        print(f"[ERROR] Error fixing constraints: {str(e)}")
        raise

def verify_final_schema():
    """Verify the final schema"""
    print("\nVerifying final schema...")
    
    try:
        with engine.connect() as conn:
            result = conn.execute(text("DESCRIBE expense_claims"))
            print("Final expense_claims schema:")
            for row in result:
                print(f"  {row[0]} - {row[1]}")
                
    except Exception as e:
        print(f"Error verifying schema: {e}")

if __name__ == "__main__":
    fix_constraints()
    verify_final_schema()
