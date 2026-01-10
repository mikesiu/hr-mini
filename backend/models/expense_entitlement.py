# app/models/expense_entitlement.py
from sqlalchemy import Column, String, Float, Date, DateTime, ForeignKey
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
from models.base import Base

class ExpenseEntitlement(Base):
    __tablename__ = "expense_entitlements"
    __table_args__ = {'extend_existing': True}
    
    id = Column(String(50), primary_key=True)  # e.g., "ENT001"
    employee_id = Column(String(50), ForeignKey("employees.id"), nullable=False)
    expense_type = Column(String(100), nullable=False)  # e.g., "Gas", "Mobile", "Meals"
    entitlement_amount = Column(Float)  # Monthly entitlement amount
    unit = Column(String(50))  # "monthly", "No Cap", "Actual"
    start_date = Column(Date)
    end_date = Column(Date)
    is_active = Column(String(10), default="Yes")  # "Yes" or "No"
    rollover = Column(String(10), default="No")  # "Yes" or "No" - for yearly entitlements only
    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, onupdate=func.now())
    
    # Relationship
    employee = relationship("models.employee.Employee", back_populates="expense_entitlements", lazy="select")
