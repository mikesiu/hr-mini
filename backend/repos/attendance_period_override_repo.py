# app/repos/attendance_period_override_repo.py
from typing import Optional
from datetime import date
from sqlalchemy.orm import Session
from models.attendance_period_override import AttendancePeriodOverride
from models.base import SessionLocal

def get_override(
    employee_id: str,
    company_id: str,
    pay_period_start: date,
    pay_period_end: date,
    session: Optional[Session] = None
) -> Optional[AttendancePeriodOverride]:
    """Get attendance period override for a specific employee and pay period"""
    if session is None:
        session = SessionLocal()
        try:
            override = session.query(AttendancePeriodOverride).filter(
                AttendancePeriodOverride.employee_id == employee_id,
                AttendancePeriodOverride.company_id == company_id,
                AttendancePeriodOverride.pay_period_start == pay_period_start,
                AttendancePeriodOverride.pay_period_end == pay_period_end
            ).first()
            return override
        finally:
            session.close()
    else:
        return session.query(AttendancePeriodOverride).filter(
            AttendancePeriodOverride.employee_id == employee_id,
            AttendancePeriodOverride.company_id == company_id,
            AttendancePeriodOverride.pay_period_start == pay_period_start,
            AttendancePeriodOverride.pay_period_end == pay_period_end
        ).first()

def create_or_update_override(
    employee_id: str,
    company_id: str,
    pay_period_start: date,
    pay_period_end: date,
    period_number: Optional[int] = None,
    year: Optional[int] = None,
    override_regular_hours: Optional[float] = None,
    override_ot_hours: Optional[float] = None,
    override_weekend_ot_hours: Optional[float] = None,
    override_stat_holiday_hours: Optional[float] = None,
    reason: Optional[str] = None,
    performed_by: Optional[str] = None,
    session: Optional[Session] = None
) -> AttendancePeriodOverride:
    """Create or update attendance period override"""
    if session is None:
        session = SessionLocal()
        try:
            override = get_override(employee_id, company_id, pay_period_start, pay_period_end, session)
            
            if override:
                # Update existing override
                if override_regular_hours is not None:
                    override.override_regular_hours = override_regular_hours
                if override_ot_hours is not None:
                    override.override_ot_hours = override_ot_hours
                if override_weekend_ot_hours is not None:
                    override.override_weekend_ot_hours = override_weekend_ot_hours
                if override_stat_holiday_hours is not None:
                    override.override_stat_holiday_hours = override_stat_holiday_hours
                if reason is not None:
                    override.reason = reason
                if period_number is not None:
                    override.period_number = period_number
                if year is not None:
                    override.year = year
            else:
                # Create new override
                override = AttendancePeriodOverride(
                    employee_id=employee_id,
                    company_id=company_id,
                    pay_period_start=pay_period_start,
                    pay_period_end=pay_period_end,
                    period_number=period_number,
                    year=year,
                    override_regular_hours=override_regular_hours,
                    override_ot_hours=override_ot_hours,
                    override_weekend_ot_hours=override_weekend_ot_hours,
                    override_stat_holiday_hours=override_stat_holiday_hours,
                    reason=reason
                )
                session.add(override)
            
            session.commit()
            session.refresh(override)
            return override
        except Exception as e:
            session.rollback()
            raise
        finally:
            session.close()
    else:
        override = get_override(employee_id, company_id, pay_period_start, pay_period_end, session)
        
        if override:
            # Update existing override
            if override_regular_hours is not None:
                override.override_regular_hours = override_regular_hours
            if override_ot_hours is not None:
                override.override_ot_hours = override_ot_hours
            if override_weekend_ot_hours is not None:
                override.override_weekend_ot_hours = override_weekend_ot_hours
            if override_stat_holiday_hours is not None:
                override.override_stat_holiday_hours = override_stat_holiday_hours
            if reason is not None:
                override.reason = reason
            if period_number is not None:
                override.period_number = period_number
            if year is not None:
                override.year = year
        else:
            # Create new override
            override = AttendancePeriodOverride(
                employee_id=employee_id,
                company_id=company_id,
                pay_period_start=pay_period_start,
                pay_period_end=pay_period_end,
                period_number=period_number,
                year=year,
                override_regular_hours=override_regular_hours,
                override_ot_hours=override_ot_hours,
                override_weekend_ot_hours=override_weekend_ot_hours,
                override_stat_holiday_hours=override_stat_holiday_hours,
                reason=reason
            )
            session.add(override)
        
        return override

def delete_override(
    override_id: int,
    session: Optional[Session] = None
) -> bool:
    """Delete attendance period override by ID"""
    if session is None:
        session = SessionLocal()
        try:
            override = session.get(AttendancePeriodOverride, override_id)
            if override:
                session.delete(override)
                session.commit()
                return True
            return False
        except Exception as e:
            session.rollback()
            raise
        finally:
            session.close()
    else:
        override = session.get(AttendancePeriodOverride, override_id)
        if override:
            session.delete(override)
            return True
        return False

