"""Per-employee calendar-year opening vacation dollar balance."""

from sqlalchemy import Column, Integer, String, Numeric, DateTime, ForeignKey, UniqueConstraint
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from models.base import Base


class VacationDollarOpening(Base):
    __tablename__ = "vacation_dollar_openings"
    __table_args__ = (
        UniqueConstraint("employee_id", "company_id", "year", name="uq_vac_opening_emp_co_year"),
        {"extend_existing": True},
    )

    id = Column(Integer, primary_key=True, autoincrement=True)
    employee_id = Column(String(50), ForeignKey("employees.id", ondelete="CASCADE"), nullable=False, index=True)
    company_id = Column(String(50), ForeignKey("companies.id", ondelete="CASCADE"), nullable=False, index=True)
    year = Column(Integer, nullable=False)
    opening_amount = Column(Numeric(12, 2), nullable=False, default=0)
    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, onupdate=func.now())

    employee = relationship("models.employee.Employee", lazy="select")
    company = relationship("models.company.Company", lazy="select")

    def __repr__(self):
        return (
            f"<VacationDollarOpening(employee_id={self.employee_id}, company_id={self.company_id}, "
            f"year={self.year}, opening_amount={self.opening_amount})>"
        )
