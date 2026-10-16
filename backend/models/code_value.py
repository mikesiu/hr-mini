# app/models/code_value.py
from sqlalchemy import Column, Integer, String, Boolean, UniqueConstraint
from models.base import Base

CODE_CATEGORIES = {
    "employee_type": "Employee Type",
    "wage_classification": "Wage Classification",
    "department": "Department",
    "position": "Position",
}


class CodeValue(Base):
    __tablename__ = "code_values"
    __table_args__ = (
        UniqueConstraint("category", "code", name="uq_code_values_category_code"),
        {'extend_existing': True},
    )
    id = Column(Integer, primary_key=True, autoincrement=True)
    category = Column(String(50), nullable=False, index=True)
    code = Column(String(100), nullable=False)
    description = Column(String(255))
    sort_order = Column(Integer, default=0)
    is_active = Column(Boolean, default=True)
