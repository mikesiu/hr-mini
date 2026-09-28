from sqlalchemy import Column, String, Text, Date, Integer, Boolean
from sqlalchemy.orm import relationship
from models.base import Base

class Company(Base):
    __tablename__ = "companies"
    __table_args__ = {'extend_existing': True}
    # Use a string PK so you can use codes like "TOPCO", "RPP", etc.
    id = Column(String(50), primary_key=True)             # e.g., "TOPCO"
    legal_name = Column(String(255), nullable=False)       # e.g., "Topco Pallet Recycling Ltd."
    trade_name = Column(String(255))                       # optional
    address_line1 = Column(String(255))
    address_line2 = Column(String(255))
    city = Column(String(100))
    province = Column(String(50))                         # e.g., "BC"
    postal_code = Column(String(20))
    country = Column(String(100), default="Canada")
    notes = Column(Text)
    
    # Payroll-related fields
    payroll_due_start_date = Column(Date)                  # Reference date to calculate pay due dates
    pay_period_start_date = Column(Date)                   # Start date for calculating pay periods
    payroll_frequency = Column(String(20))                 # Options: "bi-weekly", "bi-monthly", "monthly"
    cra_due_dates = Column(String(50))                     # Comma-separated list of day numbers (e.g., "15,30")
    union_due_date = Column(Integer)                       # Single day of month (1-31)
    # True = vacation paid on each cheque with payroll; False = deferred (staff choose payout period)
    vacation_pay_with_payroll = Column(Boolean, default=True, nullable=False)

    vacation_percent_tiers = relationship(
        "models.vacation_percent_tier.VacationPercentTier",
        back_populates="company",
        cascade="all, delete-orphan",
        lazy="select",
    )