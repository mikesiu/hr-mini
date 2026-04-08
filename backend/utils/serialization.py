from __future__ import annotations
from datetime import date, datetime, time
from decimal import Decimal
from typing import Any, Dict, Iterable

from sqlalchemy.inspection import inspect


def model_to_dict(instance: Any, *, exclude: Iterable[str] | None = None) -> Dict[str, Any]:
    if instance is None:
        return {}
    exclusion = set(exclude or [])
    mapper = inspect(instance)
    data: Dict[str, Any] = {}
    for column in mapper.mapper.column_attrs:
        key = column.key
        if key in exclusion:
            continue
        value = getattr(instance, key)
        # Check for time objects first (before datetime/date)
        if isinstance(value, time):
            data[key] = value.isoformat()
        elif isinstance(value, datetime):
            data[key] = value.isoformat()
        elif isinstance(value, date):
            data[key] = value.isoformat()
        elif isinstance(value, Decimal):
            data[key] = float(value)
        else:
            data[key] = value
    return data
