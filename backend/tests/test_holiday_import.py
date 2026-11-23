"""Holiday Excel import parsing."""
from datetime import date, datetime

import pandas as pd

from services.holiday_import import parse_holiday_sheet


class Company:
    def __init__(self, id, legal_name, trade_name=None):
        self.id = id
        self.legal_name = legal_name
        self.trade_name = trade_name


COMPANIES = [Company("TOPCO", "Topco Pallet Recycling Ltd.", "Topco")]


def test_parse_uses_selected_company_and_skips_blank_and_duplicate_rows():
    df = pd.DataFrame([
        {"Date": datetime(2026, 1, 1), "Name": "New Year's Day", "Active": "Yes", "Union Only": "No"},
        {"Date": None, "Name": None, "Active": None, "Union Only": None},
        {"Date": "2026-01-01", "Name": "New Year duplicate", "Active": "Yes", "Union Only": "No"},
        {"Date": "2026-12-25", "Name": "Christmas Day", "Active": "no", "Union Only": "yes"},
        {"Date": "not-a-date", "Name": "Bad", "Active": "Yes", "Union Only": "No"},
    ])
    created, skipped, failed = parse_holiday_sheet(df, COMPANIES, "TOPCO")
    assert [(h.holiday_date, h.name, h.is_active, h.union_only) for h in created] == [
        (date(2026, 1, 1), "New Year's Day", True, False),
        (date(2026, 12, 25), "Christmas Day", False, True),
    ]
    assert skipped[0].message.startswith("Same company and date")
    assert "Date is required" in failed[0].message


def test_company_column_matches_name_and_requires_a_company():
    df = pd.DataFrame([
        {"Holiday Date": "2026-02-16", "Holiday Name": "Family Day", "Company": "Topco"},
        {"Holiday Date": "2026-07-01", "Holiday Name": "Canada Day", "Company": ""},
    ])
    created, skipped, failed = parse_holiday_sheet(df, COMPANIES, None)
    assert len(created) == 1
    assert created[0].company_id == "TOPCO"
    assert created[0].name == "Family Day"
    assert not skipped
    assert "Company is required" in failed[0].message
