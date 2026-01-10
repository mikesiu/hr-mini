from __future__ import annotations
from datetime import date
from typing import Optional, List

from sqlalchemy import select, func, and_, desc
from sqlalchemy.exc import IntegrityError

from models.base import SessionLocal
from models.expense_claim import ExpenseClaim
from services.audit_service import log_action
from utils.serialization import model_to_dict


def get_claims_by_employee(employee_id: str, limit: int = None) -> List[ExpenseClaim]:
    """Get expense claims for a specific employee, ordered by paid_date desc"""
    with SessionLocal() as session:
        stmt = select(ExpenseClaim).where(
            ExpenseClaim.employee_id == employee_id
        ).order_by(desc(ExpenseClaim.paid_date))
        
        if limit:
            stmt = stmt.limit(limit)
            
        return session.execute(stmt).scalars().all()


def get_claims_by_employee_and_type(employee_id: str, expense_type: str) -> List[ExpenseClaim]:
    """Get expense claims for a specific employee and expense type"""
    with SessionLocal() as session:
        stmt = select(ExpenseClaim).where(
            and_(
                ExpenseClaim.employee_id == employee_id,
                ExpenseClaim.expense_type == expense_type
            )
        ).order_by(desc(ExpenseClaim.paid_date))
        return session.execute(stmt).scalars().all()


def create_claim(
    employee_id: str,
    paid_date: date,
    expense_type: str,
    receipts_amount: float,
    claims_amount: float,
    notes: str = None,
    supporting_document_path: str = None,
    document_path: str = None,
    document_filename: str = None,
    *,
    performed_by: str = None,
) -> ExpenseClaim:
    """Create a new expense claim"""
    with SessionLocal() as session:
        # Generate ID
        from sqlalchemy import desc
        max_id = session.query(ExpenseClaim.id).order_by(desc(ExpenseClaim.id)).first()
        if max_id:
            # Extract number from existing ID and increment
            import re
            match = re.search(r'CLM(\d+)', max_id[0])
            if match:
                next_num = int(match.group(1)) + 1
            else:
                next_num = 1
        else:
            next_num = 1
        claim_id = f"CLM{next_num:03d}"
        
        claim = ExpenseClaim(
            id=claim_id,
            employee_id=employee_id,
            paid_date=paid_date,
            expense_type=expense_type,
            receipts_amount=receipts_amount,
            claims_amount=claims_amount,
            notes=notes,
            supporting_document_path=supporting_document_path,
            document_path=document_path,
            document_filename=document_filename,
        )
        session.add(claim)
        try:
            session.commit()
        except IntegrityError as exc:
            session.rollback()
            message = str(exc)
            raise ValueError(f"Database error: {message}") from exc
        session.refresh(claim)

        log_action(
            entity="expense_claim",
            entity_id=claim.id,
            action="create",
            changed_by=performed_by,
            after=model_to_dict(claim),
        )
        return claim


def update_claim(claim_id: str, *, performed_by: str = None, **kwargs):
    """Update an expense claim"""
    with SessionLocal() as session:
        claim = session.get(ExpenseClaim, claim_id)
        if not claim:
            return None

        update_data = {k: v for k, v in kwargs.items() if v is not None and v != ""}
        if not update_data:
            return claim

        before = model_to_dict(claim)

        for key, value in update_data.items():
            setattr(claim, key, value)

        session.commit()
        session.refresh(claim)

        log_action(
            entity="expense_claim",
            entity_id=claim.id,
            action="update",
            changed_by=performed_by,
            before=before,
            after=model_to_dict(claim),
        )
        return claim


def delete_claim(claim_id: str, *, performed_by: str = None) -> bool:
    """Delete an expense claim"""
    with SessionLocal() as session:
        claim = session.get(ExpenseClaim, claim_id)
        if not claim:
            return False

        before = model_to_dict(claim)
        
        session.delete(claim)
        session.commit()

        log_action(
            entity="expense_claim",
            entity_id=claim_id,
            action="delete",
            changed_by=performed_by,
            before=before,
        )
        return True


def get_claims_by_date_range(start_date: date, end_date: date) -> List[ExpenseClaim]:
    """Get expense claims within a date range"""
    with SessionLocal() as session:
        stmt = select(ExpenseClaim).where(
            and_(
                ExpenseClaim.paid_date >= start_date,
                ExpenseClaim.paid_date <= end_date
            )
        ).order_by(desc(ExpenseClaim.paid_date))
        return session.execute(stmt).scalars().all()


def get_claim_summary_by_employee(employee_id: str, start_date: date = None, end_date: date = None) -> dict:
    """Get expense claim summary for an employee"""
    with SessionLocal() as session:
        stmt = select(ExpenseClaim).where(ExpenseClaim.employee_id == employee_id)
        
        if start_date:
            stmt = stmt.where(ExpenseClaim.paid_date >= start_date)
        if end_date:
            stmt = stmt.where(ExpenseClaim.paid_date <= end_date)
            
        claims = session.execute(stmt).scalars().all()
        
        summary = {
            "total_claims": len(claims),
            "total_receipts_amount": sum(claim.receipts_amount for claim in claims),
            "total_claims_amount": sum(claim.claims_amount for claim in claims),
            "by_type": {}
        }
        
        for claim in claims:
            if claim.expense_type not in summary["by_type"]:
                summary["by_type"][claim.expense_type] = {
                    "count": 0,
                    "receipts_amount": 0,
                    "claims_amount": 0
                }
            summary["by_type"][claim.expense_type]["count"] += 1
            summary["by_type"][claim.expense_type]["receipts_amount"] += claim.receipts_amount
            summary["by_type"][claim.expense_type]["claims_amount"] += claim.claims_amount
            
        return summary
