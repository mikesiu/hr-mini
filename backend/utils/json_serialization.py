"""
Utility functions for JSON serialization of complex objects.
"""
from __future__ import annotations
from datetime import date, datetime, time
from decimal import Decimal
from typing import Any, Dict, List


def serialize_for_json(obj: Any) -> Any:
    """
    Recursively serialize an object to be JSON-compatible.
    Handles datetime, date, time, Decimal, and nested dicts/lists.
    """
    import json
    
    if obj is None:
        return None
    
    # Handle datetime types first
    if isinstance(obj, time):
        return obj.isoformat()
    if isinstance(obj, datetime):
        return obj.isoformat()
    if isinstance(obj, date):
        return obj.isoformat()
    
    if isinstance(obj, Decimal):
        return float(obj)
    
    if isinstance(obj, dict):
        return {key: serialize_for_json(value) for key, value in obj.items()}
    
    if isinstance(obj, (list, tuple)):
        return [serialize_for_json(item) for item in obj]
    
    # For any other type, try to return as-is (should be JSON serializable)
    # If it's not JSON serializable, this will raise an error which is what we want
    try:
        json.dumps(obj)
        return obj
    except (TypeError, ValueError):
        # If it's not JSON serializable, convert to string
        return str(obj)

