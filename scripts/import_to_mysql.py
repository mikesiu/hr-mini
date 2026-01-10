#!/usr/bin/env python3
"""
Import data from JSON export files into MySQL database.
This script reads the JSON files created by export_sqlite_data.py and imports
them into a MySQL database.
"""

import sys
import json
import pathlib
from datetime import datetime, date
from decimal import Decimal

# Add parent directory to path
sys.path.append(str(pathlib.Path(__file__).resolve().parents[1]))

from app.config.settings import (
    MYSQL_HOST, MYSQL_PORT, MYSQL_USER, MYSQL_PASSWORD, 
    MYSQL_DATABASE, MYSQL_CHARSET
)
from app.models.base import Base, engine
from sqlalchemy.orm import Session
from sqlalchemy import text, create_engine

# Import all models
from app.models.employee import Employee
from app.models.company import Company
from app.models.employment import Employment
from app.models.leave_type import LeaveType
from app.models.leave import Leave
from app.models.work_permit import WorkPermit
from app.models.audit import Audit

def parse_datetime_fields(data, model_class):
    """Parse datetime and date fields from JSON data"""
    for record in data:
        for column in model_class.__table__.columns:
            if column.name in record and record[column.name] is not None:
                if column.type.python_type == datetime:
                    if isinstance(record[column.name], str):
                        record[column.name] = datetime.fromisoformat(record[column.name].replace('Z', '+00:00'))
                elif column.type.python_type == date:
                    if isinstance(record[column.name], str):
                        record[column.name] = datetime.fromisoformat(record[column.name]).date()

def import_table_data(session, model_class, table_name, data, skip_existing=False):
    """Import data into a specific table"""
    print(f"Importing {table_name}...")
    
    if not data:
        print(f"  No data to import for {table_name}")
        return 0
    
    # Parse datetime fields
    parse_datetime_fields(data, model_class)
    
    imported_count = 0
    skipped_count = 0
    
    for record_data in data:
        try:
            # Check if record already exists (for primary key)
            primary_key = model_class.__table__.primary_key.columns.keys()[0]
            existing = session.query(model_class).filter(
                getattr(model_class, primary_key) == record_data[primary_key]
            ).first()
            
            if existing and skip_existing:
                skipped_count += 1
                continue
            
            # Create new record
            record = model_class()
            for column_name, value in record_data.items():
                if hasattr(record, column_name):
                    setattr(record, column_name, value)
            
            if existing and not skip_existing:
                # Update existing record
                for column_name, value in record_data.items():
                    if hasattr(existing, column_name):
                        setattr(existing, column_name, value)
                imported_count += 1
            else:
                # Add new record
                session.add(record)
                imported_count += 1
                
        except Exception as e:
            print(f"  Error importing record in {table_name}: {e}")
            print(f"  Record data: {record_data}")
            continue
    
    session.commit()
    print(f"  Imported: {imported_count}, Skipped: {skipped_count}")
    return imported_count

def create_database_if_not_exists():
    """Create MySQL database if it doesn't exist"""
    print("Checking/creating MySQL database...")
    
    # Connect without specifying database
    temp_url = f"mysql+pymysql://{MYSQL_USER}:{MYSQL_PASSWORD}@{MYSQL_HOST}:{MYSQL_PORT}?charset={MYSQL_CHARSET}"
    temp_engine = create_engine(temp_url, future=True)
    
    with temp_engine.connect() as conn:
        # Create database if it doesn't exist
        conn.execute(text(f"CREATE DATABASE IF NOT EXISTS `{MYSQL_DATABASE}` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci"))
        conn.commit()
    
    print(f"  Database '{MYSQL_DATABASE}' is ready")

def load_export_data(export_file):
    """Load data from export file"""
    print(f"Loading export data from: {export_file}")
    
    with open(export_file, 'r', encoding='utf-8') as f:
        export_data = json.load(f)
    
    metadata = export_data.get("metadata", {})
    data = export_data.get("data", {})
    
    print(f"  Export timestamp: {metadata.get('export_timestamp', 'Unknown')}")
    print(f"  Source database: {metadata.get('source_database', 'Unknown')}")
    print(f"  Tables: {list(data.keys())}")
    
    return metadata, data

def main():
    """Main import function"""
    print("Starting MySQL data import...")
    print(f"MySQL Host: {MYSQL_HOST}:{MYSQL_PORT}")
    print(f"Database: {MYSQL_DATABASE}")
    print(f"User: {MYSQL_USER}")
    print(f"Import timestamp: {datetime.now().isoformat()}")
    print("-" * 50)
    
    # Check for export file
    export_dir = pathlib.Path("backups/mysql_export")
    if not export_dir.exists():
        print(f"Error: Export directory {export_dir} not found!")
        print("Please run export_sqlite_data.py first.")
        return
    
    # Find the most recent complete export
    export_files = list(export_dir.glob("complete_export_*.json"))
    if not export_files:
        print(f"Error: No complete export files found in {export_dir}")
        return
    
    latest_export = max(export_files, key=lambda x: x.stat().st_mtime)
    print(f"Using export file: {latest_export}")
    
    # Create database if needed
    try:
        create_database_if_not_exists()
    except Exception as e:
        print(f"Error creating database: {e}")
        return
    
    # Load export data
    try:
        metadata, data = load_export_data(latest_export)
    except Exception as e:
        print(f"Error loading export data: {e}")
        return
    
    # Create tables
    print("\nCreating MySQL tables...")
    try:
        Base.metadata.create_all(bind=engine)
        print("  Tables created successfully")
    except Exception as e:
        print(f"  Error creating tables: {e}")
        return
    
    # Import data in dependency order
    with Session(engine) as session:
        print("\nImporting data...")
        
        # Define import order (respecting foreign key constraints)
        import_order = [
            (Company, "companies"),
            (LeaveType, "leave_types"),
            (Employee, "employees"),
            (Employment, "employment"),
            (Leave, "leave"),
            (WorkPermit, "work_permits"),
            (Audit, "audit_log")
        ]
        
        total_imported = 0
        for model_class, table_name in import_order:
            if table_name in data:
                try:
                    imported = import_table_data(session, model_class, table_name, data[table_name])
                    total_imported += imported
                except Exception as e:
                    print(f"  Error importing {table_name}: {e}")
            else:
                print(f"  No data found for {table_name}")
        
        print(f"\nImport completed!")
        print(f"Total records imported: {total_imported}")
        
        # Verify import
        print("\nVerifying import...")
        for model_class, table_name in import_order:
            count = session.query(model_class).count()
            print(f"  {table_name:20}: {count:6} records")

if __name__ == "__main__":
    main()
