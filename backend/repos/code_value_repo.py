from __future__ import annotations
from typing import List, Optional

from sqlalchemy import select
from sqlalchemy.exc import IntegrityError

from models.base import SessionLocal
from models.code_value import CodeValue, CODE_CATEGORIES
from utils.serialization import model_to_dict
from services.audit_service import log_action


def _validate_category(category: str) -> None:
    if category not in CODE_CATEGORIES:
        raise ValueError(f"Unknown category '{category}'. Valid: {', '.join(CODE_CATEGORIES)}")


def list_code_values(category: str | None = None, active_only: bool = False) -> List[CodeValue]:
    with SessionLocal() as session:
        stmt = select(CodeValue)
        if category:
            stmt = stmt.where(CodeValue.category == category)
        if active_only:
            stmt = stmt.where(CodeValue.is_active == True)  # noqa: E712
        stmt = stmt.order_by(CodeValue.category, CodeValue.sort_order, CodeValue.code)
        return list(session.execute(stmt).scalars().all())


def create_code_value(
    category: str,
    code: str,
    *,
    description: str | None = None,
    sort_order: int = 0,
    is_active: bool = True,
    performed_by: str | None = None,
) -> CodeValue:
    _validate_category(category)
    code = code.strip()
    if not code:
        raise ValueError("Code is required")
    with SessionLocal() as session:
        item = CodeValue(
            category=category,
            code=code,
            description=description,
            sort_order=sort_order,
            is_active=is_active,
        )
        session.add(item)
        try:
            session.commit()
        except IntegrityError as exc:
            session.rollback()
            raise ValueError(f"'{code}' already exists in {CODE_CATEGORIES[category]}") from exc
        session.refresh(item)
        log_action(
            entity="code_value",
            entity_id=item.id,
            action="create",
            changed_by=performed_by,
            after=model_to_dict(item),
        )
        return item


def update_code_value(code_id: int, *, performed_by: str | None = None, **kwargs) -> Optional[CodeValue]:
    with SessionLocal() as session:
        item = session.get(CodeValue, code_id)
        if not item:
            return None
        before = model_to_dict(item)
        for key in ("code", "description", "sort_order", "is_active"):
            if key in kwargs and kwargs[key] is not None:
                value = kwargs[key].strip() if key == "code" else kwargs[key]
                if key == "code" and not value:
                    raise ValueError("Code is required")
                setattr(item, key, value)
        try:
            session.commit()
        except IntegrityError as exc:
            session.rollback()
            raise ValueError(f"'{kwargs.get('code')}' already exists in {CODE_CATEGORIES[item.category]}") from exc
        session.refresh(item)
        log_action(
            entity="code_value",
            entity_id=item.id,
            action="update",
            changed_by=performed_by,
            before=before,
            after=model_to_dict(item),
        )
        return item


def delete_code_value(code_id: int, *, performed_by: str | None = None) -> bool:
    with SessionLocal() as session:
        item = session.get(CodeValue, code_id)
        if not item:
            return False
        before = model_to_dict(item)
        session.delete(item)
        session.commit()
        log_action(
            entity="code_value",
            entity_id=code_id,
            action="delete",
            changed_by=performed_by,
            before=before,
        )
        return True
