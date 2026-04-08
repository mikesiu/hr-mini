from sqlalchemy import Column, String, Text, Date, DateTime, ForeignKey
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
from models.base import Base

class EmployeeDocument(Base):
    __tablename__ = "employee_documents"
    __table_args__ = {'extend_existing': True}
    
    id = Column(String(50), primary_key=True)  # e.g., "DOC001", "DOC002"
    employee_id = Column(String(50), ForeignKey("employees.id", ondelete="CASCADE"), nullable=False)
    document_type = Column(String(100), nullable=False)  # e.g., "Identification", "Employment Contract"
    file_path = Column(String(500), nullable=False)  # Full path to the document file
    description = Column(Text)  # Optional description/notes
    upload_date = Column(Date, nullable=False)  # Date when document was added
    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, onupdate=func.now())
    
    # Relationship
    employee = relationship("models.employee.Employee", back_populates="documents", lazy="select")
    
    # Predefined document types
    DOCUMENT_TYPES = [
        "Identification",
        "Employment Contract", 
        "Personal Data Form",
        "Work Permit",
        "Tax Forms",
        "Banking Information",
        "Benefits",
        "Training Certificates",
        "Performance Reviews",
        "Other"
    ]
    
    def __repr__(self):
        return f"<EmployeeDocument(id='{self.id}', type='{self.document_type}', employee='{self.employee_id}')>"
