# app/models/leave_type.py
from sqlalchemy import Column, Integer, String
from models.base import Base

class LeaveType(Base):
    __tablename__ = "leave_types"
    __table_args__ = {'extend_existing': True}
    id = Column(Integer, primary_key=True, autoincrement=True)
    code = Column(String(20), unique=True, nullable=False)
    name = Column(String(100), nullable=False)
