"""
Salary History Model - Tracks salary changes over time
"""

from sqlalchemy import Column, Integer, String, Numeric, Date, DateTime, ForeignKey, Text
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from models.base import Base


class SalaryHistory(Base):
    __tablename__ = "salary_history"
    __table_args__ = {'extend_existing': True}

    id = Column(Integer, primary_key=True, autoincrement=True)
    employee_id = Column(String(50), ForeignKey("employees.id", ondelete="CASCADE"), nullable=False)
    pay_rate = Column(Numeric(10, 2), nullable=False)
    pay_type = Column(String(20), nullable=False)  # Hourly, Monthly, Annual
    effective_date = Column(Date, nullable=False)
    end_date = Column(Date, nullable=True)  # NULL for current salary
    notes = Column(Text, nullable=True)
    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, onupdate=func.now())

    # Relationships
    employee = relationship("models.employee.Employee", back_populates="salary_history", lazy="select")

    def __repr__(self):
        return f"<SalaryHistory(id={self.id}, employee_id={self.employee_id}, pay_rate={self.pay_rate}, pay_type={self.pay_type}, effective_date={self.effective_date})>"
