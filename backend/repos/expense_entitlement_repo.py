from __future__ import annotations
from datetime import date
from typing import Optional, List

from sqlalchemy import select, func, and_
from sqlalchemy.exc import IntegrityError

from models.base import SessionLocal
from models.expense_entitlement import ExpenseEntitlement
from services.audit_service import log_action
from utils.serialization import model_to_dict


def get_entitlements_by_employee(employee_id: str) -> List[ExpenseEntitlement]:
    """Get all expense entitlements for a specific employee"""
    with SessionLocal() as session:
        stmt = select(ExpenseEntitlement).where(
            and_(
                ExpenseEntitlement.employee_id == employee_id,
                ExpenseEntitlement.is_active == "Yes"
            )
        ).order_by(ExpenseEntitlement.expense_type)
        return session.execute(stmt).scalars().all()


def get_entitlement_by_employee_and_type(employee_id: str, expense_type: str) -> Optional[ExpenseEntitlement]:
    """Get expense entitlement for a specific employee and expense type"""
    with SessionLocal() as session:
        stmt = select(ExpenseEntitlement).where(
            and_(
                ExpenseEntitlement.employee_id == employee_id,
                ExpenseEntitlement.expense_type == expense_type,
                ExpenseEntitlement.is_active == "Yes"
            )
        ).order_by(ExpenseEntitlement.created_at.desc()).limit(1)
        result = session.execute(stmt).scalars().first()
        return result


def create_entitlement(
    employee_id: str,
    expense_type: str,
    entitlement_amount: float = None,
    unit: str = None,
    start_date: date = None,
    end_date: date = None,
    rollover: str = "No",
    *,
    performed_by: str = None,
) -> ExpenseEntitlement:
    """Create a new expense entitlement"""
    with SessionLocal() as session:
        # Generate ID
        from sqlalchemy import desc
        max_id = session.query(ExpenseEntitlement.id).order_by(desc(ExpenseEntitlement.id)).first()
        if max_id:
            # Extract number from existing ID and increment
            import re
            match = re.search(r'ENT(\d+)', max_id[0])
            if match:
                next_num = int(match.group(1)) + 1
            else:
                next_num = 1
        else:
            next_num = 1
        entitlement_id = f"ENT{next_num:03d}"
        
        entitlement = ExpenseEntitlement(
            id=entitlement_id,
            employee_id=employee_id,
            expense_type=expense_type,
            entitlement_amount=entitlement_amount,
            unit=unit,
            start_date=start_date,
            end_date=end_date,
            rollover=rollover,
        )
        session.add(entitlement)
        try:
            session.commit()
        except IntegrityError as exc:
            session.rollback()
            message = str(exc)
            raise ValueError(f"Database error: {message}") from exc
        session.refresh(entitlement)

        log_action(
            entity="expense_entitlement",
            entity_id=entitlement.id,
            action="create",
            changed_by=performed_by,
            after=model_to_dict(entitlement),
        )
        return entitlement


def update_entitlement(entitlement_id: str, *, performed_by: str = None, **kwargs):
    """Update an expense entitlement"""
    with SessionLocal() as session:
        entitlement = session.get(ExpenseEntitlement, entitlement_id)
        if not entitlement:
            return None

        # Special handling for end_date - allow None to clear the field
        update_data = {}
        for k, v in kwargs.items():
            if k == 'end_date':
                # Always include end_date, even if None (to clear it)
                update_data[k] = v
            elif v is not None and v != "":
                update_data[k] = v
        
        if not update_data:
            return entitlement

        before = model_to_dict(entitlement)

        for key, value in update_data.items():
            setattr(entitlement, key, value)

        session.commit()
        session.refresh(entitlement)

        log_action(
            entity="expense_entitlement",
            entity_id=entitlement.id,
            action="update",
            changed_by=performed_by,
            before=before,
            after=model_to_dict(entitlement),
        )
        return entitlement


def deactivate_entitlement(entitlement_id: str, *, performed_by: str = None) -> bool:
    """Deactivate an expense entitlement"""
    with SessionLocal() as session:
        entitlement = session.get(ExpenseEntitlement, entitlement_id)
        if not entitlement:
            return False

        before = model_to_dict(entitlement)
        entitlement.is_active = "No"
        session.commit()

        log_action(
            entity="expense_entitlement",
            entity_id=entitlement.id,
            action="deactivate",
            changed_by=performed_by,
            before=before,
            after=model_to_dict(entitlement),
        )
        return True


def get_all_entitlements() -> List[ExpenseEntitlement]:
    """Get all active expense entitlements"""
    with SessionLocal() as session:
        stmt = select(ExpenseEntitlement).where(
            ExpenseEntitlement.is_active == "Yes"
        ).order_by(ExpenseEntitlement.employee_id, ExpenseEntitlement.expense_type)
        return session.execute(stmt).scalars().all()
