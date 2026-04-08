# app/models/employee.py
from sqlalchemy import Column, String, Text, Date, DateTime, Boolean
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
from models.base import Base

class Employee(Base):
    __tablename__ = "employees"
    __table_args__ = {'extend_existing': True}
    # Primary key is now string-based, not integer
    id = Column(String(50), primary_key=True)   # e.g., "E12345", "HR001"
    full_name = Column(String(255), nullable=False)
    first_name = Column(String(100))
    last_name  = Column(String(100))
    other_name = Column(String(100))
    email = Column(String(255))
    phone = Column(String(20))
    street = Column(String(255))
    city = Column(String(100))
    province = Column(String(50))
    postal_code = Column(String(20))
    dob = Column(Date)          # nullable
    sin = Column(String(20))        # optional/masked in UI
    drivers_license = Column(String(50))  # Driver's license number
    hire_date = Column(Date)    # nullable - employee hire date
    probation_end_date = Column(Date)  # nullable - end of probation period
    seniority_start_date = Column(Date)  # nullable - seniority start date for benefits/calculations
    status = Column(String(50), default="Active")  # Active/On Leave/Terminated
    remarks = Column(Text)      # Additional notes/remarks about the employee
    paystub = Column(Boolean, default=False)  # Yes/No field for paystub availability
    union_member = Column(Boolean, default=False)  # Union member checkbox
    
    # Mailing address fields
    use_mailing_address = Column(Boolean, default=False)  # Whether to use separate mailing address
    mailing_street = Column(String(255))
    mailing_city = Column(String(100))
    mailing_province = Column(String(50))
    mailing_postal_code = Column(String(20))
    
    # Emergency contact fields
    emergency_contact_name = Column(String(255))
    emergency_contact_phone = Column(String(20))
    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, onupdate=func.now())
    
    # Relationships
    expense_entitlements = relationship("models.expense_entitlement.ExpenseEntitlement", back_populates="employee", lazy="select")
    expense_claims = relationship("models.expense_claim.ExpenseClaim", back_populates="employee", lazy="select")
    salary_history = relationship("models.salary_history.SalaryHistory", back_populates="employee", cascade="all, delete-orphan", lazy="select")
    termination = relationship("models.termination.Termination", back_populates="employee", uselist=False, lazy="select")
    documents = relationship("models.employee_document.EmployeeDocument", back_populates="employee", cascade="all, delete-orphan", lazy="select")
