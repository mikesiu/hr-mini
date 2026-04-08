# app/models/employee_schedule.py
from sqlalchemy import Column, String, Date, Integer, ForeignKey, UniqueConstraint
from sqlalchemy.orm import relationship
from models.base import Base

class EmployeeSchedule(Base):
    __tablename__ = "employee_schedules"
    __table_args__ = (
        UniqueConstraint('employee_id', 'effective_date', name='uq_employee_schedule_date'),
        {'extend_existing': True}
    )
    
    id = Column(Integer, primary_key=True, autoincrement=True)
    employee_id = Column(String(50), ForeignKey("employees.id", ondelete="CASCADE"), nullable=False)
    schedule_id = Column(Integer, ForeignKey("work_schedules.id", ondelete="RESTRICT"), nullable=False)
    effective_date = Column(Date, nullable=False)  # When this schedule assignment starts
    end_date = Column(Date, nullable=True)  # When this schedule assignment ends (NULL = ongoing)
    
    # Relationships
    schedule = relationship("models.work_schedule.WorkSchedule", lazy="select")

