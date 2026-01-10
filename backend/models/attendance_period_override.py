# app/models/attendance_period_override.py
from sqlalchemy import Column, String, Date, Float, Integer, ForeignKey, Text, DateTime, UniqueConstraint
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
from models.base import Base

class AttendancePeriodOverride(Base):
    __tablename__ = "attendance_period_overrides"
    __table_args__ = (
        UniqueConstraint('employee_id', 'company_id', 'pay_period_start', 'pay_period_end', name='uq_employee_period_override'),
        {'extend_existing': True}
    )
    
    id = Column(Integer, primary_key=True, autoincrement=True)
    employee_id = Column(String(50), ForeignKey("employees.id", ondelete="CASCADE"), nullable=False)
    company_id = Column(String(50), ForeignKey("companies.id", ondelete="CASCADE"), nullable=False)
    pay_period_start = Column(Date, nullable=False)
    pay_period_end = Column(Date, nullable=False)
    period_number = Column(Integer, nullable=True)  # For reference
    year = Column(Integer, nullable=True)  # For reference
    
    # Override values
    override_regular_hours = Column(Float, nullable=True)
    override_ot_hours = Column(Float, nullable=True)
    override_weekend_ot_hours = Column(Float, nullable=True)
    override_stat_holiday_hours = Column(Float, nullable=True)
    
    # Reason for override
    reason = Column(Text, nullable=True)
    
    # Metadata
    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())
    
    # Relationships
    employee = relationship("models.employee.Employee", lazy="select")
    company = relationship("models.company.Company", lazy="select")

