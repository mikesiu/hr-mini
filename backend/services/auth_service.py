from __future__ import annotations
from functools import lru_cache
from typing import Iterable, Set

from models.user import User
from repos.user_repo import verify_user_credentials


def authenticate(username: str, password: str) -> User | None:
    return verify_user_credentials(username, password)


def get_permissions(user: User) -> Set[str]:
    if not user:
        return set()
    role_permissions: Set[str] = set()
    for role in user.roles:
        if not role.permissions:
            continue
        if "*" in role.permissions:
            return {"*"}
        role_permissions.update(role.permissions)
    return role_permissions


def has_permission(user: User | None, permission: str) -> bool:
    if not user:
        return False
    perms = get_permissions(user)
    return "*" in perms or permission in perms


def any_permission(user: User | None, permissions: Iterable[str]) -> bool:
    return any(has_permission(user, perm) for perm in permissions)

def serialize_user(user: User) -> dict:
    permissions = list(get_permissions(user))
    return {
        "id": user.id,
        "username": user.username,
        "display_name": user.display_name,
        "email": user.email,
        "is_active": user.is_active,
        "roles": [
            {
                "code": role.code,
                "name": role.name,
                "permissions": role.permissions or [],
            }
            for role in user.roles
        ],
        "permissions": permissions,
    }
