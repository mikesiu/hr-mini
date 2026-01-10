# app/models/employment.py
from sqlalchemy import Column, String, Date, ForeignKey, Text, Integer, Boolean
from sqlalchemy.orm import relationship
from models.base import Base

class Employment(Base):
    __tablename__ = "employment"
    __table_args__ = {'extend_existing': True}
    id = Column(Integer, primary_key=True, autoincrement=True)
    employee_id = Column(String(50), ForeignKey("employees.id", ondelete="CASCADE"), nullable=False)
    company_id = Column(String(50), ForeignKey("companies.id", ondelete="RESTRICT"), nullable=False)
    position = Column(String(100))
    department = Column(String(100))
    start_date = Column(Date)
    end_date = Column(Date)
    notes = Column(Text)
    wage_classification = Column(String(100))  # Wage Classification field
    is_driver = Column(Boolean, default=False)  # Driver flag for overtime calculation
    count_all_ot = Column(Boolean, default=False)  # Flag to count OT even if less than 30 minutes
    
    # Relationships - removed salary_history as it's now employee-based
