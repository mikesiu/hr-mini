# app/models/work_permit.py
from sqlalchemy import Column, String, Date, Integer, ForeignKey
from models.base import Base

class WorkPermit(Base):
    __tablename__ = "work_permits"
    __table_args__ = {'extend_existing': True}
    id = Column(Integer, primary_key=True, autoincrement=True)
    employee_id = Column(String(50), ForeignKey("employees.id", ondelete="CASCADE"), nullable=False)
    permit_type = Column(String(100), nullable=False)  # e.g., "Open Work Permit", "Closed Work Permit", "Student Work Permit"
    expiry_date = Column(Date, nullable=False)
