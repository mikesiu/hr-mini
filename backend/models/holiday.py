# app/models/holiday.py
from sqlalchemy import Column, Integer, String, Date, ForeignKey, Boolean
from models.base import Base

class Holiday(Base):
    __tablename__ = "holidays"
    __table_args__ = {'extend_existing': True}
    id = Column(Integer, primary_key=True, autoincrement=True)
    company_id = Column(String(50), ForeignKey("companies.id", ondelete="CASCADE"), nullable=False)
    holiday_date = Column(Date, nullable=False)
    name = Column(String(255), nullable=False)  # e.g., "New Year's Day", "Christmas Day"
    is_active = Column(Boolean, default=True)  # Allow disabling holidays without deleting
    union_only = Column(Boolean, default=False)  # If True, holiday only applies to union members
    
