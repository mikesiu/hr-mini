# app/models/expense_claim.py
from sqlalchemy import Column, String, Float, Date, DateTime, ForeignKey
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
from models.base import Base

class ExpenseClaim(Base):
    __tablename__ = "expense_claims"
    __table_args__ = {'extend_existing': True}
    
    id = Column(String(50), primary_key=True)  # e.g., "CLM001"
    employee_id = Column(String(50), ForeignKey("employees.id"), nullable=False)
    paid_date = Column(Date, nullable=False)
    expense_type = Column(String(100), nullable=False)  # e.g., "Gas", "Mobile", "Meals"
    receipts_amount = Column(Float, nullable=False)  # Actual amount from receipts
    claims_amount = Column(Float, nullable=False)  # Amount claimed (may be capped)
    notes = Column(String(500))  # Additional notes
    supporting_document_path = Column(String(500))  # Path to supporting PDF document (legacy)
    document_path = Column(String(500))  # Directory path for document
    document_filename = Column(String(255))  # Filename of document
    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, onupdate=func.now())
    
    # Relationships
    employee = relationship("models.employee.Employee", back_populates="expense_claims", lazy="select")
