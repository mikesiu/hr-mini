"""Buckets for the leave taken report.

Vacation and paid sick stay in their own groups. Unpaid leave and unpaid sick
both roll into No Pay. Anything else is Others.
"""

from typing import Optional

LEAVE_CATEGORY_ORDER = ("Vacation", "Sick", "No Pay", "Others")

_UNPAID_CODES = {"UNPAID", "UNPAIDSICK", "NOPAY", "LWOP", "UNPAIDLEAVE"}
_VACATION_CODES = {"VAC", "VACATION", "VACATIONLEAVE"}
_SICK_CODES = {"SICK", "SICKLEAVE"}


def _compact(value: Optional[str]) -> str:
    return (value or "").upper().replace(" ", "").replace("_", "").replace("-", "")


def classify_leave_category(code: Optional[str], name: Optional[str] = None) -> str:
    """Map a leave type code and name onto Vacation, Sick, No Pay, or Others."""
    code_u = _compact(code)
    name_u = (name or "").upper()
    name_compact = _compact(name)

    if (
        code_u in _UNPAID_CODES
        or code_u.startswith("UNPAID")
        or "UNPAID" in name_u
        or "NO PAY" in name_u
        or "NON-PAY" in name_u
        or name_compact.startswith("NOPAY")
    ):
        return "No Pay"

    if code_u in _VACATION_CODES or name_u.startswith("VACATION") or name_compact.startswith("VAC"):
        return "Vacation"

    if code_u in _SICK_CODES or name_u.startswith("SICK"):
        return "Sick"

    return "Others"
