"""Company vacation percent tiers by years of service (union vs non-union)."""

from sqlalchemy import (
    Boolean,
    Column,
    Integer,
    String,
    Numeric,
    ForeignKey,
    UniqueConstraint,
)
from sqlalchemy.orm import relationship
from models.base import Base


class VacationPercentTier(Base):
    __tablename__ = "vacation_percent_tiers"
    __table_args__ = (
        UniqueConstraint(
            "company_id",
            "union_member",
            "min_years",
            name="uq_vac_tier_company_union_min_years",
        ),
        {"extend_existing": True},
    )

    id = Column(Integer, primary_key=True, autoincrement=True)
    company_id = Column(
        String(50),
        ForeignKey("companies.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    # False = non-union schedule; True = union member schedule
    union_member = Column(Boolean, nullable=False, default=False, server_default="0")
    min_years = Column(Numeric(6, 2), nullable=False)  # inclusive
    max_years = Column(Numeric(6, 2), nullable=True)  # exclusive; NULL = open-ended
    percent = Column(Numeric(6, 3), nullable=False)  # e.g. 4.000 for 4%

    company = relationship(
        "models.company.Company",
        back_populates="vacation_percent_tiers",
        lazy="select",
    )

    def __repr__(self):
        return (
            f"<VacationPercentTier(company_id={self.company_id}, "
            f"union_member={self.union_member}, "
            f"min_years={self.min_years}, max_years={self.max_years}, percent={self.percent})>"
        )
