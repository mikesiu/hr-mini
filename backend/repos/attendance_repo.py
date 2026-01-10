"""
Attendance Repository
Handles CRUD operations for attendance records.
"""
from __future__ import annotations
from datetime import date, time
from typing import List, Optional
from sqlalchemy import select, and_, or_
from sqlalchemy.exc import IntegrityError
from models.base import SessionLocal
from models.attendance import Attendance
from services.audit_service import log_action
from utils.serialization import model_to_dict

# Sentinel value to distinguish "not provided" from "explicitly set to None"
_UNSET = object()


def create_attendance(
    employee_id: str,
    attendance_date: date,
    *,
    check_in: Optional[time] = None,
    check_out: Optional[time] = None,
    rounded_check_in: Optional[time] = None,
    rounded_check_out: Optional[time] = None,
    regular_hours: float = 0.0,
    ot_hours: float = 0.0,
    weekend_ot_hours: float = 0.0,
    stat_holiday_hours: float = 0.0,
    notes: Optional[str] = None,
    remarks: Optional[str] = None,
    override_check_in: Optional[time] = None,
    override_check_out: Optional[time] = None,
    override_regular_hours: Optional[float] = None,
    override_ot_hours: Optional[float] = None,
    override_weekend_ot_hours: Optional[float] = None,
    override_stat_holiday_hours: Optional[float] = None,
    time_edit_reason: Optional[str] = None,
    hours_edit_reason: Optional[str] = None,
    is_manual_override: bool = False,
    performed_by: str | None = None,
) -> Attendance:
    """Create a new attendance record"""
    with SessionLocal() as session:
        attendance = Attendance(
            employee_id=employee_id,
            date=attendance_date,
            check_in=check_in,
            check_out=check_out,
            rounded_check_in=rounded_check_in,
            rounded_check_out=rounded_check_out,
            regular_hours=regular_hours,
            ot_hours=ot_hours,
            weekend_ot_hours=weekend_ot_hours,
            stat_holiday_hours=stat_holiday_hours,
            notes=notes,
            remarks=remarks,
            override_check_in=override_check_in,
            override_check_out=override_check_out,
            override_regular_hours=override_regular_hours,
            override_ot_hours=override_ot_hours,
            override_weekend_ot_hours=override_weekend_ot_hours,
            override_stat_holiday_hours=override_stat_holiday_hours,
            time_edit_reason=time_edit_reason,
            hours_edit_reason=hours_edit_reason,
            is_manual_override=is_manual_override,
        )
        session.add(attendance)
        try:
            session.commit()
        except IntegrityError as exc:
            session.rollback()
            if "UNIQUE" in str(exc) or "duplicate" in str(exc).lower():
                raise ValueError(f"Attendance record already exists for employee {employee_id} on {attendance_date}") from exc
            raise ValueError(f"Database error: {exc}") from exc
        session.refresh(attendance)
        
        log_action(
            entity="attendance",
            entity_id=attendance.id,
            action="create",
            changed_by=performed_by,
            after=model_to_dict(attendance),
        )
        return attendance


def get_attendance(attendance_id: int) -> Optional[Attendance]:
    """Get an attendance record by ID"""
    with SessionLocal() as session:
        return session.get(Attendance, attendance_id)


def get_attendance_for_date(employee_id: str, attendance_date: date) -> Optional[Attendance]:
    """Get attendance record for a specific employee and date"""
    with SessionLocal() as session:
        return session.execute(
            select(Attendance).where(
                and_(
                    Attendance.employee_id == employee_id,
                    Attendance.date == attendance_date
                )
            )
        ).scalar_one_or_none()


def update_attendance(
    attendance_id: int,
    *,
    check_in: Optional[time] = _UNSET,
    check_out: Optional[time] = _UNSET,
    rounded_check_in: Optional[time] = _UNSET,
    rounded_check_out: Optional[time] = _UNSET,
    regular_hours: Optional[float] = _UNSET,
    ot_hours: Optional[float] = _UNSET,
    weekend_ot_hours: Optional[float] = _UNSET,
    stat_holiday_hours: Optional[float] = _UNSET,
    is_manual_override: Optional[bool] = _UNSET,
    override_check_in: Optional[time] = _UNSET,
    override_check_out: Optional[time] = _UNSET,
    override_regular_hours: Optional[float] = _UNSET,
    override_ot_hours: Optional[float] = _UNSET,
    override_weekend_ot_hours: Optional[float] = _UNSET,
    override_stat_holiday_hours: Optional[float] = _UNSET,
    time_edit_reason: Optional[str] = _UNSET,
    hours_edit_reason: Optional[str] = _UNSET,
    notes: Optional[str] = _UNSET,
    remarks: Optional[str] = _UNSET,
    performed_by: str | None = None,
) -> Optional[Attendance]:
    """Update an attendance record"""
    with SessionLocal() as session:
        attendance = session.get(Attendance, attendance_id)
        if not attendance:
            return None
        
        before = model_to_dict(attendance)
        
        # Update fields only if they were explicitly provided (not _UNSET)
        # This allows us to set fields to None to clear them
        if check_in is not _UNSET:
            attendance.check_in = check_in
        if check_out is not _UNSET:
            attendance.check_out = check_out
        if rounded_check_in is not _UNSET:
            attendance.rounded_check_in = rounded_check_in
        if rounded_check_out is not _UNSET:
            attendance.rounded_check_out = rounded_check_out
        if regular_hours is not _UNSET:
            attendance.regular_hours = regular_hours
        if ot_hours is not _UNSET:
            attendance.ot_hours = ot_hours
        if weekend_ot_hours is not _UNSET:
            attendance.weekend_ot_hours = weekend_ot_hours
        if stat_holiday_hours is not _UNSET:
            attendance.stat_holiday_hours = stat_holiday_hours
        if is_manual_override is not _UNSET:
            attendance.is_manual_override = is_manual_override
        if override_check_in is not _UNSET:
            attendance.override_check_in = override_check_in
        if override_check_out is not _UNSET:
            attendance.override_check_out = override_check_out
        if override_regular_hours is not _UNSET:
            attendance.override_regular_hours = override_regular_hours
        if override_ot_hours is not _UNSET:
            attendance.override_ot_hours = override_ot_hours
        if override_weekend_ot_hours is not _UNSET:
            attendance.override_weekend_ot_hours = override_weekend_ot_hours
        if override_stat_holiday_hours is not _UNSET:
            attendance.override_stat_holiday_hours = override_stat_holiday_hours
        if time_edit_reason is not _UNSET:
            attendance.time_edit_reason = time_edit_reason
        if hours_edit_reason is not _UNSET:
            attendance.hours_edit_reason = hours_edit_reason
        if notes is not _UNSET:
            attendance.notes = notes
        if remarks is not _UNSET:
            attendance.remarks = remarks
        
        try:
            session.commit()
        except IntegrityError as exc:
            session.rollback()
            raise ValueError(f"Database error: {exc}") from exc
        session.refresh(attendance)
        
        log_action(
            entity="attendance",
            entity_id=attendance.id,
            action="update",
            changed_by=performed_by,
            before=before,
            after=model_to_dict(attendance),
        )
        return attendance


def list_attendance(
    employee_id: Optional[str] = None,
    start_date: Optional[date] = None,
    end_date: Optional[date] = None,
    company_id: Optional[str] = None,
) -> List[Attendance]:
    """List attendance records with filters"""
    with SessionLocal() as session:
        stmt = select(Attendance)
        
        if employee_id:
            stmt = stmt.where(Attendance.employee_id == employee_id)
        
        if start_date:
            stmt = stmt.where(Attendance.date >= start_date)
        
        if end_date:
            stmt = stmt.where(Attendance.date <= end_date)
        
        if company_id:
            # Join with employees and employment to filter by company
            # Only match employment records that were active on the attendance date
            from models.employee import Employee
            from models.employment import Employment
            from sqlalchemy import or_
            stmt = stmt.join(Employee, Attendance.employee_id == Employee.id)
            stmt = stmt.join(
                Employment,
                and_(
                    Employee.id == Employment.employee_id,
                    Employment.company_id == company_id,
                    Employment.start_date <= Attendance.date,
                    or_(
                        Employment.end_date.is_(None),
                        Employment.end_date >= Attendance.date
                    )
                )
            )
            # Use distinct to avoid duplicates from multiple employment records
            stmt = stmt.distinct()
        
        # Sort by employee first, then by date (oldest first)
        stmt = stmt.order_by(Attendance.employee_id, Attendance.date.asc())
        results = list(session.execute(stmt).scalars().all())
        
        # Deduplicate by attendance id to handle cases where joins create duplicates
        # This is a safeguard in case distinct() doesn't work as expected with ORM objects
        seen_ids = set()
        unique_results = []
        for record in results:
            if record.id not in seen_ids:
                seen_ids.add(record.id)
                unique_results.append(record)
        
        return unique_results


def get_attendance_for_period(
    employee_id: str,
    start_date: date,
    end_date: date
) -> List[Attendance]:
    """Get all attendance records for an employee in a date range"""
    return list_attendance(employee_id=employee_id, start_date=start_date, end_date=end_date)


def delete_attendance(attendance_id: int, *, performed_by: str | None = None) -> bool:
    """Delete an attendance record"""
    with SessionLocal() as session:
        attendance = session.get(Attendance, attendance_id)
        if not attendance:
            return False
        
        before = model_to_dict(attendance)
        session.delete(attendance)
        
        try:
            session.commit()
        except IntegrityError as exc:
            session.rollback()
            raise ValueError(f"Database error: {exc}") from exc
        
        log_action(
            entity="attendance",
            entity_id=attendance_id,
            action="delete",
            changed_by=performed_by,
            before=before,
        )
        return True


def delete_attendance_by_date_range(
    start_date: date,
    end_date: date,
    *,
    employee_id: Optional[str] = None,
    company_id: Optional[str] = None,
    performed_by: str | None = None,
) -> int:
    """
    Delete attendance records within a date range.
    
    Args:
        start_date: Start date (inclusive)
        end_date: End date (inclusive)
        employee_id: Optional employee ID filter
        company_id: Optional company ID filter
        performed_by: Username performing the action
        
    Returns:
        Number of records deleted
    """
    with SessionLocal() as session:
        # Build query to find records to delete (for audit logging)
        stmt = select(Attendance).where(
            and_(
                Attendance.date >= start_date,
                Attendance.date <= end_date
            )
        )
        
        if employee_id:
            stmt = stmt.where(Attendance.employee_id == employee_id)
        
        if company_id:
            # Join with employees and employment to filter by company
            from models.employee import Employee
            from models.employment import Employment
            stmt = stmt.join(Employee, Attendance.employee_id == Employee.id)
            stmt = stmt.join(Employment, Employee.id == Employment.employee_id)
            stmt = stmt.where(Employment.company_id == company_id)
        
        # Get records to delete (for audit logging)
        records_to_delete = list(session.execute(stmt).scalars().all())
        
        if not records_to_delete:
            return 0
        
        # Log each deletion
        for record in records_to_delete:
            before = model_to_dict(record)
            log_action(
                entity="attendance",
                entity_id=record.id,
                action="delete",
                changed_by=performed_by,
                before=before,
            )
        
        # Build delete query
        from sqlalchemy import delete as sql_delete
        delete_stmt = sql_delete(Attendance).where(
            and_(
                Attendance.date >= start_date,
                Attendance.date <= end_date
            )
        )
        
        if employee_id:
            delete_stmt = delete_stmt.where(Attendance.employee_id == employee_id)
        
        if company_id:
            # For delete, we need to use subquery or filter by IDs
            record_ids = [r.id for r in records_to_delete]
            delete_stmt = delete_stmt.where(Attendance.id.in_(record_ids))
        
        # Execute delete
        result = session.execute(delete_stmt)
        deleted_count = result.rowcount
        
        try:
            session.commit()
        except IntegrityError as exc:
            session.rollback()
            raise ValueError(f"Database error: {exc}") from exc
        
        return deleted_count


def bulk_create_attendance(
    attendance_records: List[dict],
    *,
    performed_by: str | None = None,
) -> tuple[int, int, List[str]]:
    """
    Bulk create attendance records.
    
    Args:
        attendance_records: List of dicts with attendance data
        
    Returns:
        Tuple of (success_count, error_count, error_messages)
    """
    success_count = 0
    error_count = 0
    error_messages = []
    
    with SessionLocal() as session:
        for record in attendance_records:
            try:
                attendance = Attendance(**record)
                session.add(attendance)
                session.commit()
                session.refresh(attendance)
                success_count += 1
            except IntegrityError as exc:
                session.rollback()
                error_count += 1
                error_messages.append(f"Error creating attendance: {exc}")
            except Exception as exc:
                session.rollback()
                error_count += 1
                error_messages.append(f"Error creating attendance: {exc}")
    
    return (success_count, error_count, error_messages)

