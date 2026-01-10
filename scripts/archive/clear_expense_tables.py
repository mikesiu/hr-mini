#!/usr/bin/env python3
"""
Clear expense tables to start fresh.
"""

import sys
from pathlib import Path

# Add the parent directory to the path so we can import from app
sys.path.append(str(Path(__file__).parent.parent))

from app.models.base import SessionLocal
from app.models.expense_entitlement import ExpenseEntitlement
from app.models.expense_claim import ExpenseClaim


def clear_tables():
    """Clear the expense tables"""
    print("Clearing expense tables...")
    
    try:
        with SessionLocal() as session:
            # Clear expense claims first (due to foreign key constraints)
            session.query(ExpenseClaim).delete()
            session.query(ExpenseEntitlement).delete()
            session.commit()
            
        print("SUCCESS: Expense tables cleared successfully!")
        
    except Exception as e:
        print(f"ERROR: Error clearing tables: {str(e)}")
        raise


if __name__ == "__main__":
    clear_tables()
