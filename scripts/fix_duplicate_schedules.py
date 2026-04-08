#!/usr/bin/env python3
"""
Script to find and rename duplicate work schedule names within the same company.
This will help resolve existing duplicates by appending numbers to make them unique.
"""

import sys
import pathlib

# Add the backend directory to the path
sys.path.append(str(pathlib.Path(__file__).resolve().parents[1] / 'backend'))

from sqlalchemy import select, func, and_
from models.base import SessionLocal
from models.work_schedule import WorkSchedule
from repos.work_schedule_repo import update_work_schedule

def find_duplicate_schedules():
    """Find all duplicate schedule names within the same company"""
    with SessionLocal() as session:
        # Find duplicates by grouping by company_id and name
        duplicates = session.execute(
            select(
                WorkSchedule.company_id,
                WorkSchedule.name,
                func.count(WorkSchedule.id).label('count')
            )
            .group_by(WorkSchedule.company_id, WorkSchedule.name)
            .having(func.count(WorkSchedule.id) > 1)
        ).all()
        
        return duplicates

def get_duplicate_schedules_for_company_and_name(company_id: str, name: str):
    """Get all schedules with the same company_id and name"""
    with SessionLocal() as session:
        schedules = session.execute(
            select(WorkSchedule)
            .where(
                and_(
                    WorkSchedule.company_id == company_id,
                    WorkSchedule.name == name
                )
            )
            .order_by(WorkSchedule.id)
        ).scalars().all()
        
        return list(schedules)

def rename_duplicates():
    """Rename duplicate schedules by appending numbers"""
    print("=" * 60)
    print("Finding and Renaming Duplicate Work Schedules")
    print("=" * 60)
    
    duplicates = find_duplicate_schedules()
    
    if not duplicates:
        print("\n✓ No duplicate schedule names found!")
        return 0
    
    print(f"\nFound {len(duplicates)} duplicate schedule name(s):\n")
    
    total_renamed = 0
    
    for company_id, name, count in duplicates:
        print(f"Company: {company_id}, Name: '{name}' ({count} duplicates)")
        schedules = get_duplicate_schedules_for_company_and_name(company_id, name)
        
        # Keep the first one as-is, rename the rest
        for idx, schedule in enumerate(schedules[1:], start=2):
            new_name = f"{name} ({idx})"
            
            # Check if the new name already exists
            existing = get_duplicate_schedules_for_company_and_name(company_id, new_name)
            if existing:
                # If name already exists, try a different suffix
                counter = idx
                while True:
                    new_name = f"{name} ({counter})"
                    existing = get_duplicate_schedules_for_company_and_name(company_id, new_name)
                    if not existing:
                        break
                    counter += 1
            
            try:
                update_work_schedule(
                    schedule.id,
                    name=new_name,
                    performed_by="system_script"
                )
                print(f"  → Renamed schedule ID {schedule.id} to '{new_name}'")
                total_renamed += 1
            except Exception as e:
                print(f"  ✗ Error renaming schedule ID {schedule.id}: {e}")
    
    print(f"\n{'=' * 60}")
    print(f"✓ Renamed {total_renamed} duplicate schedule(s)")
    print(f"{'=' * 60}")
    
    return total_renamed

def main():
    """Main function"""
    try:
        renamed_count = rename_duplicates()
        return 0 if renamed_count >= 0 else 1
    except Exception as e:
        print(f"\n✗ Error: {e}")
        import traceback
        traceback.print_exc()
        return 1

if __name__ == "__main__":
    sys.exit(main())

