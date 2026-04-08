from __future__ import annotations
from typing import Any, Dict

from models.base import SessionLocal
from models.audit import Audit
from utils.json_serialization import serialize_for_json


def record_action(
    entity: str,
    entity_id: str,
    action: str,
    *,
    changed_by: str | None,
    diff: Dict[str, Any] | None = None,
) -> Audit:
    with SessionLocal() as session:
        # Serialize the diff to ensure all time/datetime objects are JSON-compatible
        if diff:
            serialized_diff = serialize_for_json(diff)
            # Double-check: ensure no time objects remain
            import json
            try:
                json.dumps(serialized_diff)  # Test if it's JSON serializable
            except (TypeError, ValueError) as e:
                # If still not serializable, log and try to fix
                print(f"Warning: diff still contains non-serializable objects: {e}")
                # Force serialize again more aggressively
                serialized_diff = serialize_for_json(serialized_diff)
        else:
            serialized_diff = {}
        
        audit = Audit(
            entity=entity,
            entity_id=str(entity_id),
            action=action,
            changed_by=changed_by,
            diff_json=serialized_diff,
        )
        session.add(audit)
        session.commit()
        session.refresh(audit)
        return audit
