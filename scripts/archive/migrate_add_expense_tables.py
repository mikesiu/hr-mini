#!/usr/bin/env python3
"""
Migration script to add expense tables to the database.
This script creates the expense_entitlements and expense_claims tables.
"""

import sys
from pathlib import Path

# Add the parent directory to the path so we can import from app
sys.path.append(str(Path(__file__).parent.parent))

from app.models.base import engine
from app.models.expense_entitlement import ExpenseEntitlement
from app.models.expense_claim import ExpenseClaim


def migrate():
    """Create the expense tables"""
    print("Creating expense tables...")
    
    try:
        # Create the tables
        ExpenseEntitlement.__table__.create(engine, checkfirst=True)
        ExpenseClaim.__table__.create(engine, checkfirst=True)
        
        print("SUCCESS: Expense tables created successfully!")
        print("Tables created:")
        print("- expense_entitlements")
        print("- expense_claims")
        
    except Exception as e:
        print(f"ERROR: Error creating tables: {str(e)}")
        raise


if __name__ == "__main__":
    migrate()
