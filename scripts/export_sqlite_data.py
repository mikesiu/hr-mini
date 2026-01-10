#!/usr/bin/env python3
"""
Export data from MySQL database to JSON format for backup/migration.
This script exports all data from the current MySQL database into JSON files
that can be imported into another MySQL database.
"""

import sys
import json
import pathlib
from datetime import datetime, date
from decimal import Decimal

# Add parent directory to path
sys.path.append(str(pathlib.Path(__file__).resolve().parents[1]))

from app.config.settings import MYSQL_DATABASE
from app.models.base import Base, engine
from sqlalchemy.orm import Session
from sqlalchemy import text

# Import all models
from app.models.employee import Employee
from app.models.company import Company
from app.models.employment import Employment
from app.models.leave_type import LeaveType
from app.models.leave import Leave
from app.models.work_permit import WorkPermit
from app.models.audit import Audit

class DateTimeEncoder(json.JSONEncoder):
    """Custom JSON encoder to handle datetime and date objects"""
    def default(self, obj):
        if isinstance(obj, datetime):
            return obj.isoformat()
        elif isinstance(obj, date):
            return obj.isoformat()
        elif isinstance(obj, Decimal):
            return float(obj)
        return super().default(obj)

def export_table_data(session, model_class, table_name):
    """Export data from a specific table"""
    print(f"Exporting {table_name}...")
    
    # Get all records
    records = session.query(model_class).all()
    
    # Convert to dictionaries
    data = []
    for record in records:
        record_dict = {}
        for column in model_class.__table__.columns:
            value = getattr(record, column.name)
            record_dict[column.name] = value
        data.append(record_dict)
    
    print(f"  Found {len(data)} records")
    return data

def export_foreign_key_constraints():
    """Export foreign key constraints information"""
    print("Exporting foreign key constraints...")
    
    with engine.connect() as conn:
        # Get foreign key information from MySQL
        result = conn.execute(text("""
            SELECT 
                TABLE_NAME as table_name,
                COLUMN_NAME as column_name,
                REFERENCED_TABLE_NAME as references_table,
                REFERENCED_COLUMN_NAME as references_column
            FROM information_schema.KEY_COLUMN_USAGE
            WHERE REFERENCED_TABLE_SCHEMA = DATABASE()
            AND REFERENCED_TABLE_NAME IS NOT NULL
            ORDER BY TABLE_NAME, COLUMN_NAME
        """))
        
        constraints = []
        for row in result:
            constraints.append({
                'table': row[0],
                'column': row[1],
                'references_table': row[2],
                'references_column': row[3]
            })
    
    print(f"  Found {len(constraints)} foreign key constraints")
    return constraints

def main():
    """Main export function"""
    print("Starting MySQL data export...")
    print(f"Database: {MYSQL_DATABASE}")
    print(f"Export timestamp: {datetime.now().isoformat()}")
    print("-" * 50)
    
    # Create export directory
    export_dir = pathlib.Path("backups/mysql_export")
    export_dir.mkdir(parents=True, exist_ok=True)
    
    with Session(engine) as session:
        # Export data from each table
        tables_data = {}
        
        # Define tables in dependency order (to maintain referential integrity)
        table_configs = [
            (Company, "companies"),
            (LeaveType, "leave_types"),
            (Employee, "employees"),
            (Employment, "employment"),
            (Leave, "leave"),
            (WorkPermit, "work_permits"),
            (Audit, "audit_log")
        ]
        
        for model_class, table_name in table_configs:
            try:
                data = export_table_data(session, model_class, table_name)
                tables_data[table_name] = data
            except Exception as e:
                print(f"  Error exporting {table_name}: {e}")
                tables_data[table_name] = []
        
        # Export foreign key constraints
        try:
            constraints = export_foreign_key_constraints()
            tables_data["_foreign_keys"] = constraints
        except Exception as e:
            print(f"  Error exporting foreign keys: {e}")
            tables_data["_foreign_keys"] = []
        
        # Export metadata
        metadata = {
            "export_timestamp": datetime.now().isoformat(),
            "source_database": MYSQL_DATABASE,
            "database_type": "mysql",
            "tables": list(tables_data.keys()),
            "record_counts": {table: len(data) for table, data in tables_data.items() if table != "_foreign_keys"}
        }
        
        # Save all data to JSON files
        print("\nSaving export files...")
        
        # Save complete export
        complete_file = export_dir / f"complete_export_{datetime.now().strftime('%Y%m%d_%H%M%S')}.json"
        with open(complete_file, 'w', encoding='utf-8') as f:
            json.dump({
                "metadata": metadata,
                "data": tables_data
            }, f, indent=2, cls=DateTimeEncoder, ensure_ascii=False)
        
        # Save individual table files
        for table_name, data in tables_data.items():
            if table_name == "_foreign_keys":
                continue
                
            table_file = export_dir / f"{table_name}.json"
            with open(table_file, 'w', encoding='utf-8') as f:
                json.dump(data, f, indent=2, cls=DateTimeEncoder, ensure_ascii=False)
        
        # Save metadata file
        metadata_file = export_dir / "metadata.json"
        with open(metadata_file, 'w', encoding='utf-8') as f:
            json.dump(metadata, f, indent=2, cls=DateTimeEncoder, ensure_ascii=False)
        
        print(f"\nExport completed successfully!")
        print(f"Complete export: {complete_file}")
        print(f"Metadata: {metadata_file}")
        print(f"Individual table files: {export_dir}")
        
        # Print summary
        print("\nExport Summary:")
        print("-" * 30)
        for table, count in metadata["record_counts"].items():
            print(f"{table:20}: {count:6} records")

if __name__ == "__main__":
    main()
