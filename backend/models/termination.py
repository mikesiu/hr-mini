# app/models/termination.py
from datetime import datetime
from sqlalchemy import Column, String, Date, ForeignKey, Text, Integer, DateTime
from sqlalchemy.orm import relationship
from models.base import Base

class Termination(Base):
    __tablename__ = "terminations"
    __table_args__ = {'extend_existing': True}
    
    id = Column(Integer, primary_key=True, autoincrement=True)
    employee_id = Column(String(50), ForeignKey("employees.id", ondelete="CASCADE"), nullable=False)
    last_working_date = Column(Date, nullable=False)
    termination_effective_date = Column(Date, nullable=False)
    roe_reason_code = Column(String(1), nullable=False)  # A, B, C, D, E, F, G, M, N, K
    other_reason = Column(Text)  # For reason code K - Other
    internal_reason = Column(Text)  # Reason for internal use
    remarks = Column(Text)  # Additional remarks
    created_at = Column(DateTime, nullable=False, default=lambda: datetime.now())
    created_by = Column(String(50))  # User who created the termination record
    
    # Relationships
    employee = relationship("models.employee.Employee", back_populates="termination", lazy="select")
    
    # ROE Block 16 reason codes
    ROE_REASON_CODES = {
        'A': 'Shortage of work',
        'B': 'Strike or lockout', 
        'C': 'Return to school',
        'D': 'Illness or injury',
        'E': 'Quit',
        'F': 'Maternity leave',
        'G': 'Retirement',
        'M': 'Dismissal or termination',
        'N': 'Leave of absence',
        'K': 'Other'
    }
    
    @property
    def roe_reason_description(self):
        """Get the human-readable description of the ROE reason code"""
        return self.ROE_REASON_CODES.get(self.roe_reason_code, 'Unknown')
