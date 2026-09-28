"""Imported per-employee payroll detail amounts (EmplDetl Excel)."""

from sqlalchemy import (
    Column, Integer, String, Numeric, Date, DateTime, ForeignKey, UniqueConstraint, Text
)
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from models.base import Base


class PayrollEmployeePeriod(Base):
    __tablename__ = "payroll_employee_periods"
    __table_args__ = (
        UniqueConstraint(
            "employee_id", "company_id", "pay_date", "cheque_no",
            name="uq_payroll_emp_co_date_cheque",
        ),
        {"extend_existing": True},
    )

    id = Column(Integer, primary_key=True, autoincrement=True)
    company_id = Column(String(50), ForeignKey("companies.id", ondelete="CASCADE"), nullable=False, index=True)
    employee_id = Column(String(50), ForeignKey("employees.id", ondelete="CASCADE"), nullable=False, index=True)
    pay_date = Column(Date, nullable=False, index=True)
    period_start = Column(Date, nullable=True)
    period_end = Column(Date, nullable=True)
    cheque_no = Column(String(50), nullable=False, default="")
    gross = Column(Numeric(12, 2), nullable=False, default=0)
    benefits = Column(Numeric(12, 2), nullable=False, default=0)
    vacation_paid = Column(Numeric(12, 2), nullable=False, default=0)
    vacation_earned = Column(Numeric(12, 2), nullable=False, default=0)
    source_filename = Column(String(255), nullable=True)
    notes = Column(Text, nullable=True)
    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, onupdate=func.now())

    employee = relationship("models.employee.Employee", lazy="select")
    company = relationship("models.company.Company", lazy="select")

    def __repr__(self):
        return (
            f"<PayrollEmployeePeriod(employee_id={self.employee_id}, company_id={self.company_id}, "
            f"pay_date={self.pay_date}, gross={self.gross})>"
        )
