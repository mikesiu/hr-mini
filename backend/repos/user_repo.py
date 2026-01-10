from __future__ import annotations
from typing import Iterable, List, Optional

from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import selectinload

from models.base import SessionLocal
from models.user import User, Role as UserRole
from utils.security import get_password_hash, verify_password


def get_user_by_username(username: str, *, include_inactive: bool = False) -> Optional[User]:
    username = username.strip().lower()
    with SessionLocal() as session:
        stmt = (
            select(User)
            .where(User.username == username)
            .options(selectinload(User.roles))
        )
        if not include_inactive:
            stmt = stmt.where(User.is_active.is_(True))
        return session.execute(stmt).scalars().first()


def create_user(
    username: str,
    password: str,
    *,
    display_name: str | None = None,
    email: str | None = None,
    is_active: bool = True,
    role_codes: Iterable[str] | None = None,
) -> User:
    username = username.strip().lower()
    password_hash = get_password_hash(password)

    with SessionLocal() as session:
        user = User(
            username=username,
            display_name=display_name,
            email=email,
            password_hash=password_hash,
            is_active=is_active,
        )
        session.add(user)
        try:
            session.flush()
        except IntegrityError as exc:
            session.rollback()
            raise ValueError(f"Username '{username}' already exists.") from exc

        if role_codes:
            roles = _get_roles_by_codes(session, role_codes)
            for role in roles:
                user.roles.append(role)

        session.commit()
        
        # Re-fetch user with roles eagerly loaded to avoid detached session issues
        stmt = (
            select(User)
            .where(User.id == user.id)
            .options(selectinload(User.roles))
        )
        user = session.execute(stmt).scalars().first()
        return user


def set_user_password(user_id: int, new_password: str) -> None:
    password_hash = get_password_hash(new_password)
    with SessionLocal() as session:
        user = session.get(User, user_id)
        if not user:
            raise ValueError("User not found")
        user.password_hash = password_hash
        session.commit()


def list_users(*, include_inactive: bool = False) -> List[User]:
    """List all users, optionally including inactive ones."""
    with SessionLocal() as session:
        stmt = select(User).options(selectinload(User.roles))
        if not include_inactive:
            stmt = stmt.where(User.is_active.is_(True))
        stmt = stmt.order_by(User.username)
        return session.execute(stmt).scalars().all()


def list_roles() -> List[UserRole]:
    with SessionLocal() as session:
        stmt = select(UserRole).order_by(UserRole.code)
        return session.execute(stmt).scalars().all()


def ensure_role(code: str, name: str, permissions: list[str]) -> UserRole:
    code = code.strip().lower()
    with SessionLocal() as session:
        role = session.execute(
            select(UserRole).where(UserRole.code == code)
        ).scalar_one_or_none()
        if role:
            if role.name != name or role.permissions != permissions:
                role.name = name
                role.permissions = permissions
                session.commit()
            return role

        role = UserRole(code=code, name=name, permissions=permissions)
        session.add(role)
        session.commit()
        session.refresh(role)
        return role


def assign_roles(user_id: int, role_codes: Iterable[str]) -> None:
    with SessionLocal() as session:
        user = session.get(User, user_id)
        if not user:
            raise ValueError("User not found")
        roles = _get_roles_by_codes(session, role_codes)
        user.roles = list(roles)
        session.commit()


def verify_user_credentials(username: str, password: str) -> Optional[User]:
    user = get_user_by_username(username, include_inactive=True)
    if not user or not user.is_active:
        return None
    if not verify_password(password, user.password_hash):
        return None
    return user


def _get_roles_by_codes(session, role_codes: Iterable[str]) -> List[UserRole]:
    codes = {code.strip().lower() for code in role_codes}
    if not codes:
        return []
    stmt = select(UserRole).where(UserRole.code.in_(codes))
    roles = session.execute(stmt).scalars().all()
    missing = codes - {role.code for role in roles}
    if missing:
        raise ValueError(f"Unknown role code(s): {', '.join(sorted(missing))}")
    return roles
