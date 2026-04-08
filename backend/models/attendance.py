# app/models/attendance.py
from sqlalchemy import Column, String, Date, Time, Float, Boolean, Integer, ForeignKey, Text, DateTime, UniqueConstraint
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
from models.base import Base

class Attendance(Base):
    __tablename__ = "attendance"
    __table_args__ = (
        UniqueConstraint('employee_id', 'date', name='uq_employee_date'),
        {'extend_existing': True}
    )
    
    id = Column(Integer, primary_key=True, autoincrement=True)
    employee_id = Column(String(50), ForeignKey("employees.id", ondelete="CASCADE"), nullable=False)
    date = Column(Date, nullable=False)
    
    # Check-in and check-out times (from CSV or manual entry) - original times with seconds
    check_in = Column(Time, nullable=True)
    check_out = Column(Time, nullable=True)
    
    # Rounded check-in and check-out times (for calculation purposes)
    rounded_check_in = Column(Time, nullable=True)
    rounded_check_out = Column(Time, nullable=True)
    
    # Calculated hours
    regular_hours = Column(Float, default=0.0)
    ot_hours = Column(Float, default=0.0)
    weekend_ot_hours = Column(Float, default=0.0)
    stat_holiday_hours = Column(Float, default=0.0)
    
    # Manual override fields
    is_manual_override = Column(Boolean, default=False)
    override_check_in = Column(Time, nullable=True)
    override_check_out = Column(Time, nullable=True)
    override_regular_hours = Column(Float, nullable=True)
    override_ot_hours = Column(Float, nullable=True)
    override_weekend_ot_hours = Column(Float, nullable=True)
    override_stat_holiday_hours = Column(Float, nullable=True)
    
    # Edit reason fields
    time_edit_reason = Column(Text, nullable=True)
    hours_edit_reason = Column(Text, nullable=True)
    
    # Notes and metadata
    notes = Column(Text, nullable=True)
    remarks = Column(String(18), nullable=True)  # Short remarks for display (max 18 chars)
    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())
    
    # Relationships
    employee = relationship("models.employee.Employee", lazy="select")
    
    def get_effective_check_in(self):
        """Get the effective check-in time (override if exists, otherwise original)"""
        return self.override_check_in if self.is_manual_override and self.override_check_in else self.check_in
    
    def get_effective_check_out(self):
        """Get the effective check-out time (override if exists, otherwise original)"""
        return self.override_check_out if self.is_manual_override and self.override_check_out else self.check_out
    
    def get_effective_rounded_check_in(self):
        """Get the effective rounded check-in time (for calculations)"""
        if self.is_manual_override and self.override_check_in:
            from utils.time_rounding import round_time
            return round_time(self.override_check_in)
        return self.rounded_check_in
    
    def get_effective_rounded_check_out(self):
        """Get the effective rounded check-out time (for calculations)"""
        if self.is_manual_override and self.override_check_out:
            from utils.time_rounding import round_time
            return round_time(self.override_check_out)
        return self.rounded_check_out
    
    def get_effective_ot_hours(self):
        """Get the effective OT hours (override if exists, otherwise calculated)"""
        return self.override_ot_hours if self.is_manual_override and self.override_ot_hours is not None else self.ot_hours
    
    def get_effective_weekend_ot_hours(self):
        """Get the effective weekend OT hours (override if exists, otherwise calculated)"""
        return self.override_weekend_ot_hours if self.is_manual_override and self.override_weekend_ot_hours is not None else self.weekend_ot_hours
    
    def get_effective_regular_hours(self):
        """Get the effective regular hours (override if exists, otherwise calculated)"""
        return self.override_regular_hours if self.is_manual_override and self.override_regular_hours is not None else self.regular_hours
    
    def get_effective_stat_holiday_hours(self):
        """Get the effective stat holiday hours (override if exists, otherwise calculated)"""
        return self.override_stat_holiday_hours if self.is_manual_override and self.override_stat_holiday_hours is not None else self.stat_holiday_hours

