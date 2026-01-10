"""
Audit service for logging all user actions and changes.
"""

from __future__ import annotations
from datetime import datetime
from typing import Any, Dict, Optional

from repos.audit_repo import record_action


def log_action(
    entity: str,
    entity_id: Any,
    action: str,
    *,
    changed_by: Optional[str] = None,
    before: Optional[Dict[str, Any]] = None,
    after: Optional[Dict[str, Any]] = None,
    details: Optional[Dict[str, Any]] = None,
) -> None:
    """
    Log an action with optional before/after state and additional details.
    
    Args:
        entity: Type of entity being modified (e.g., 'employee', 'leave', 'employment')
        entity_id: ID of the entity being modified
        action: Action performed (e.g., 'create', 'update', 'delete', 'view')
        changed_by: Username of the user performing the action
        before: State before the change (for updates/deletes)
        after: State after the change (for creates/updates)
        details: Additional context about the action
    """
    diff = {}
    
    if before is not None:
        diff["before"] = before
    if after is not None:
        diff["after"] = after
    if details is not None:
        diff["details"] = details
    
    # Add timestamp
    diff["timestamp"] = datetime.now().isoformat()
    
    record_action(
        entity=entity,
        entity_id=str(entity_id),
        action=action,
        changed_by=changed_by,
        diff=diff
    )


def log_create(entity: str, entity_id: Any, data: Dict[str, Any], *, changed_by: Optional[str] = None) -> None:
    """Log creation of a new entity."""
    log_action(
        entity=entity,
        entity_id=entity_id,
        action="create",
        changed_by=changed_by,
        after=data
    )


def log_update(entity: str, entity_id: Any, before: Dict[str, Any], after: Dict[str, Any], *, changed_by: Optional[str] = None) -> None:
    """Log update of an existing entity."""
    log_action(
        entity=entity,
        entity_id=entity_id,
        action="update",
        changed_by=changed_by,
        before=before,
        after=after
    )


def log_delete(entity: str, entity_id: Any, data: Dict[str, Any], *, changed_by: Optional[str] = None) -> None:
    """Log deletion of an entity."""
    log_action(
        entity=entity,
        entity_id=entity_id,
        action="delete",
        changed_by=changed_by,
        before=data
    )


def log_view(entity: str, entity_id: Any, *, changed_by: Optional[str] = None, details: Optional[Dict[str, Any]] = None) -> None:
    """Log viewing of an entity (for sensitive data)."""
    log_action(
        entity=entity,
        entity_id=entity_id,
        action="view",
        changed_by=changed_by,
        details=details
    )