"""
Script to delete attendance records from the database.
Can delete all records or records for a specific date range.
"""
import sys
import os
import pathlib

# Add backend directory to path to import models
backend_path = pathlib.Path(__file__).resolve().parents[1] / 'backend'
sys.path.insert(0, str(backend_path))

from models.base import SessionLocal
from models.attendance import Attendance
from sqlalchemy import delete
from datetime import date
from typing import Optional

def delete_all_attendance_records():
    """Delete all attendance records from the database"""
    with SessionLocal() as session:
        try:
            # Delete all records
            deleted_count = session.query(Attendance).delete()
            session.commit()
            print(f"✓ Deleted {deleted_count} attendance record(s)")
            return deleted_count
        except Exception as e:
            session.rollback()
            print(f"✗ Error deleting records: {str(e)}")
            raise

def delete_attendance_by_date_range(start_date: date, end_date: date):
    """Delete attendance records within a date range"""
    with SessionLocal() as session:
        try:
            # Delete records in date range
            deleted_count = session.query(Attendance).filter(
                Attendance.date >= start_date,
                Attendance.date <= end_date
            ).delete()
            session.commit()
            print(f"✓ Deleted {deleted_count} attendance record(s) from {start_date} to {end_date}")
            return deleted_count
        except Exception as e:
            session.rollback()
            print(f"✗ Error deleting records: {str(e)}")
            raise

def delete_attendance_by_employee(employee_id: str):
    """Delete all attendance records for a specific employee"""
    with SessionLocal() as session:
        try:
            deleted_count = session.query(Attendance).filter(
                Attendance.employee_id == employee_id
            ).delete()
            session.commit()
            print(f"✓ Deleted {deleted_count} attendance record(s) for employee {employee_id}")
            return deleted_count
        except Exception as e:
            session.rollback()
            print(f"✗ Error deleting records: {str(e)}")
            raise

def list_attendance_count():
    """List the current count of attendance records"""
    with SessionLocal() as session:
        count = session.query(Attendance).count()
        print(f"Current attendance records in database: {count}")
        return count

if __name__ == "__main__":
    import argparse
    
    parser = argparse.ArgumentParser(description="Delete attendance records from the database")
    parser.add_argument("--all", action="store_true", help="Delete all attendance records")
    parser.add_argument("--start-date", type=str, help="Start date (YYYY-MM-DD) for date range deletion")
    parser.add_argument("--end-date", type=str, help="End date (YYYY-MM-DD) for date range deletion")
    parser.add_argument("--employee-id", type=str, help="Employee ID to delete records for")
    parser.add_argument("--list", action="store_true", help="List current count of attendance records")
    parser.add_argument("--confirm", action="store_true", help="Confirm deletion (required for safety)")
    
    args = parser.parse_args()
    
    # List count if requested
    if args.list:
        list_attendance_count()
        sys.exit(0)
    
    # Check if deletion is requested
    if not args.all and not args.start_date and not args.employee_id:
        print("Error: Please specify what to delete:")
        print("  --all                    Delete all records")
        print("  --start-date and --end-date  Delete records in date range")
        print("  --employee-id            Delete records for specific employee")
        print("\nUse --list to see current record count")
        print("Use --confirm to confirm deletion")
        sys.exit(1)
    
    # Safety check: require confirmation
    if not args.confirm:
        print("⚠️  WARNING: This will permanently delete attendance records!")
        print("⚠️  Use --confirm flag to proceed")
        sys.exit(1)
    
    try:
        if args.all:
            print("Deleting all attendance records...")
            delete_all_attendance_records()
        elif args.start_date and args.end_date:
            start = date.fromisoformat(args.start_date)
            end = date.fromisoformat(args.end_date)
            print(f"Deleting attendance records from {start} to {end}...")
            delete_attendance_by_date_range(start, end)
        elif args.employee_id:
            print(f"Deleting attendance records for employee {args.employee_id}...")
            delete_attendance_by_employee(args.employee_id)
        
        # Show final count
        print("\nFinal count:")
        list_attendance_count()
        
    except Exception as e:
        print(f"✗ Error: {str(e)}")
        sys.exit(1)

