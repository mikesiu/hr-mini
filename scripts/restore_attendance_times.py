"""
Script to restore deleted check-in and check-out times for attendance records.
"""
import sys
import os
from datetime import date, time

# Add backend directory to path
script_dir = os.path.dirname(os.path.abspath(__file__))
backend_dir = os.path.join(script_dir, '..', 'backend')
sys.path.insert(0, backend_dir)

from models.base import SessionLocal
from models.attendance import Attendance
from utils.time_rounding import round_check_in, round_check_out
from repos.employee_schedule_repo import get_schedule_for_date
from repos.employment_repo import get_current_employment
from services.attendance_service import calculate_hours_worked

def restore_attendance_times():
    """Restore check-in and check-out times for specific dates"""
    with SessionLocal() as session:
        employee_id = "PR14"
        
        # Dates and times to restore
        records_to_restore = [
            {
                "date": date(2025, 10, 16),
                "check_in": time(7, 3, 28),  # 07:03:28
                "check_out": time(14, 57, 21),  # 14:57:21
            },
            {
                "date": date(2025, 10, 23),
                "check_in": time(7, 4, 18),  # 07:04:18
                "check_out": time(14, 58, 3),  # 14:58:03
            },
        ]
        
        for record_data in records_to_restore:
            # Find the attendance record
            attendance = session.query(Attendance).filter(
                Attendance.employee_id == employee_id,
                Attendance.date == record_data["date"]
            ).first()
            
            if attendance:
                print(f"Found record for {employee_id} on {record_data['date']}")
                print(f"  Current check_in: {attendance.check_in}, check_out: {attendance.check_out}")
                
                # Restore original times
                attendance.check_in = record_data["check_in"]
                attendance.check_out = record_data["check_out"]
                
                # Calculate rounded times
                attendance.rounded_check_in = round_check_in(record_data["check_in"])
                attendance.rounded_check_out = round_check_out(record_data["check_out"])
                
                # Recalculate hours based on rounded times
                employee_schedule = get_schedule_for_date(employee_id, record_data["date"])
                employment = get_current_employment(employee_id, record_data["date"])
                is_driver = employment.is_driver if employment else False
                
                schedule_start = None
                schedule_end = None
                weekday_schedule_start = None
                if employee_schedule and employee_schedule.schedule:
                    try:
                        from models.work_schedule import WorkSchedule
                        work_schedule = employee_schedule.schedule
                        if isinstance(work_schedule, WorkSchedule) and hasattr(work_schedule, 'get_day_times'):
                            day_of_week = record_data["date"].weekday()
                            is_weekend = day_of_week >= 5
                            schedule_start, schedule_end = work_schedule.get_day_times(day_of_week)
                            # For weekends, get weekday schedule start time (try Monday-Friday) for weekend OT calculation
                            if is_weekend:
                                # Try Monday through Friday to find a weekday schedule start time
                                for weekday in range(5):  # 0=Monday to 4=Friday
                                    weekday_start, _ = work_schedule.get_day_times(weekday)
                                    if weekday_start:
                                        weekday_schedule_start = weekday_start
                                        break
                    except (AttributeError, TypeError):
                        pass
                
                regular_hours, ot_hours, weekend_ot_hours = calculate_hours_worked(
                    attendance.rounded_check_in,
                    attendance.rounded_check_out,
                    schedule_start,
                    schedule_end,
                    record_data["date"],
                    is_driver,
                    weekday_schedule_start
                )
                
                attendance.regular_hours = regular_hours
                attendance.ot_hours = ot_hours
                attendance.weekend_ot_hours = weekend_ot_hours
                
                print(f"  Updated check_in: {attendance.check_in}, check_out: {attendance.check_out}")
                print(f"  Rounded check_in: {attendance.rounded_check_in}, rounded_check_out: {attendance.rounded_check_out}")
                print(f"  Calculated hours: regular={regular_hours}, ot={ot_hours}, weekend_ot={weekend_ot_hours}")
            else:
                print(f"WARNING: No attendance record found for {employee_id} on {record_data['date']}")
                # Create a new record if it doesn't exist
                rounded_check_in = round_check_in(record_data["check_in"])
                rounded_check_out = round_check_out(record_data["check_out"])
                
                # Calculate hours
                employee_schedule = get_schedule_for_date(employee_id, record_data["date"])
                employment = get_current_employment(employee_id, record_data["date"])
                is_driver = employment.is_driver if employment else False
                
                schedule_start = None
                schedule_end = None
                weekday_schedule_start = None
                if employee_schedule and employee_schedule.schedule:
                    try:
                        from models.work_schedule import WorkSchedule
                        work_schedule = employee_schedule.schedule
                        if isinstance(work_schedule, WorkSchedule) and hasattr(work_schedule, 'get_day_times'):
                            day_of_week = record_data["date"].weekday()
                            is_weekend = day_of_week >= 5
                            schedule_start, schedule_end = work_schedule.get_day_times(day_of_week)
                            # For weekends, get weekday schedule start time (try Monday-Friday) for weekend OT calculation
                            if is_weekend:
                                # Try Monday through Friday to find a weekday schedule start time
                                for weekday in range(5):  # 0=Monday to 4=Friday
                                    weekday_start, _ = work_schedule.get_day_times(weekday)
                                    if weekday_start:
                                        weekday_schedule_start = weekday_start
                                        break
                    except (AttributeError, TypeError):
                        pass
                
                regular_hours, ot_hours, weekend_ot_hours = calculate_hours_worked(
                    rounded_check_in,
                    rounded_check_out,
                    schedule_start,
                    schedule_end,
                    record_data["date"],
                    is_driver,
                    weekday_schedule_start
                )
                
                attendance = Attendance(
                    employee_id=employee_id,
                    date=record_data["date"],
                    check_in=record_data["check_in"],
                    check_out=record_data["check_out"],
                    rounded_check_in=rounded_check_in,
                    rounded_check_out=rounded_check_out,
                    regular_hours=regular_hours,
                    ot_hours=ot_hours,
                    weekend_ot_hours=weekend_ot_hours,
                    stat_holiday_hours=0.0,
                )
                session.add(attendance)
                print(f"  Created new record for {employee_id} on {record_data['date']}")
                print(f"  Calculated hours: regular={regular_hours}, ot={ot_hours}, weekend_ot={weekend_ot_hours}")
        
        session.commit()
        print("\nSuccessfully restored attendance times!")

if __name__ == "__main__":
    restore_attendance_times()

