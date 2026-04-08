#!/usr/bin/env python3
"""
Migration script to add count_all_ot column to employment table.

This script:
1. Adds the count_all_ot boolean column to the employment table
2. Sets default value to False for existing records
3. Validates the migration was successful
"""

import sys
import os
from pathlib import Path
from sqlalchemy import text, inspect

# Add the backend directory to the Python path
backend_dir = Path(__file__).parent.parent / "backend"
sys.path.insert(0, str(backend_dir))

from models.base import SessionLocal, engine


def column_exists(table_name: str, column_name: str) -> bool:
    """Check if a column exists in a table."""
    inspector = inspect(engine)
    columns = [col['name'] for col in inspector.get_columns(table_name)]
    return column_name in columns


def migrate_database():
    """Add count_all_ot column to employment table."""
    print("=" * 60)
    print("Migration: Add count_all_ot to employment table")
    print("=" * 60)
    
    with SessionLocal() as session:
        try:
            # Check if column already exists
            if column_exists('employment', 'count_all_ot'):
                print("[SKIP] Column 'count_all_ot' already exists in employment table")
                return True
            
            print("\n[1/3] Adding count_all_ot column to employment table...")
            session.execute(text("""
                ALTER TABLE employment 
                ADD COLUMN count_all_ot BOOLEAN DEFAULT FALSE NOT NULL
            """))
            session.commit()
            print("[OK] Column added successfully")
            
            print("\n[2/3] Setting default value for existing records...")
            # All existing records will have False by default due to the DEFAULT clause
            # But let's explicitly set it to be safe
            session.execute(text("""
                UPDATE employment 
                SET count_all_ot = FALSE 
                WHERE count_all_ot IS NULL
            """))
            session.commit()
            print("[OK] Default values set")
            
            print("\n[3/3] Verifying migration...")
            if column_exists('employment', 'count_all_ot'):
                print("[OK] Migration verified successfully")
                return True
            else:
                print("[ERROR] Column was not created")
                return False
                
        except Exception as e:
            session.rollback()
            print(f"[ERROR] Migration failed: {e}")
            import traceback
            traceback.print_exc()
            return False


def verify_migration():
    """Verify the migration was successful."""
    print("\n" + "=" * 60)
    print("Verification")
    print("=" * 60)
    
    with SessionLocal() as session:
        try:
            # Check column exists
            if not column_exists('employment', 'count_all_ot'):
                print("[ERROR] Column 'count_all_ot' does not exist")
                return False
            
            # Check column type
            inspector = inspect(engine)
            columns = inspector.get_columns('employment')
            count_all_ot_col = next((col for col in columns if col['name'] == 'count_all_ot'), None)
            
            if count_all_ot_col:
                print(f"[OK] Column 'count_all_ot' exists")
                print(f"     Type: {count_all_ot_col['type']}")
                print(f"     Nullable: {count_all_ot_col['nullable']}")
                print(f"     Default: {count_all_ot_col['default']}")
            
            # Count records
            result = session.execute(text("SELECT COUNT(*) FROM employment"))
            count = result.scalar()
            print(f"[OK] Employment table has {count} records")
            
            # Check default values
            result = session.execute(text("SELECT COUNT(*) FROM employment WHERE count_all_ot = FALSE"))
            false_count = result.scalar()
            print(f"[OK] {false_count} records have count_all_ot = FALSE")
            
            return True
            
        except Exception as e:
            print(f"[ERROR] Verification failed: {e}")
            import traceback
            traceback.print_exc()
            return False


def main():
    """Main migration function."""
    print("\nStarting migration...")
    print(f"Database: {engine.url}")
    print("-" * 60)
    
    # Run migration
    success = migrate_database()
    
    if success:
        # Verify migration
        verify_success = verify_migration()
        
        if verify_success:
            print("\n" + "=" * 60)
            print("Migration completed successfully!")
            print("=" * 60)
            sys.exit(0)
        else:
            print("\n" + "=" * 60)
            print("Migration completed but verification failed!")
            print("Please check the errors above.")
            print("=" * 60)
            sys.exit(1)
    else:
        print("\n" + "=" * 60)
        print("Migration failed!")
        print("Please check the errors above and try again.")
        print("=" * 60)
        sys.exit(1)


if __name__ == "__main__":
    main()

