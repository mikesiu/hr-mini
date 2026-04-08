# app/models/audit.py
from sqlalchemy import Column, Integer, String, DateTime, JSON
from sqlalchemy.sql import func
from models.base import Base

class Audit(Base):
    __tablename__ = "audit_log"
    __table_args__ = {'extend_existing': True}
    id = Column(Integer, primary_key=True, autoincrement=True)
    entity = Column(String(100), nullable=False)
    entity_id = Column(String(50), nullable=False)   # matches employee_id type
    action = Column(String(100), nullable=False)
    changed_by = Column(String(100))
    changed_at = Column(DateTime, server_default=func.now())
    diff_json = Column(JSON)
