"""Tests for leave day / chargeable-date calculation."""
import unittest
from datetime import date
from unittest.mock import patch

from utils.leave_calculation import iter_leave_chargeable_dates, calculate_working_days


class TestLeaveChargeableDates(unittest.TestCase):
    """Leave spanning a statutory holiday should not charge the holiday."""

    def test_excludes_truth_and_reconciliation_2026(self):
        # Sep 29 (Tue) – Oct 2 (Fri) 2026; Sep 30 is Truth and Reconciliation
        holidays = {date(2026, 9, 30)}
        dates = iter_leave_chargeable_dates(
            date(2026, 9, 29),
            date(2026, 10, 2),
            holiday_dates=holidays,
        )
        self.assertEqual(
            dates,
            [date(2026, 9, 29), date(2026, 10, 1), date(2026, 10, 2)],
        )
        self.assertEqual(len(dates), 3)

    def test_excludes_weekends(self):
        dates = iter_leave_chargeable_dates(
            date(2026, 10, 2),  # Friday
            date(2026, 10, 5),  # Monday
            holiday_dates=set(),
        )
        self.assertEqual(dates, [date(2026, 10, 2), date(2026, 10, 5)])

    def test_clips_to_pay_period(self):
        holidays = {date(2026, 9, 30)}
        dates = iter_leave_chargeable_dates(
            date(2026, 9, 29),
            date(2026, 10, 2),
            holiday_dates=holidays,
            range_start=date(2026, 9, 30),
            range_end=date(2026, 10, 1),
        )
        self.assertEqual(dates, [date(2026, 10, 1)])

    def test_working_days_matches_chargeable_count(self):
        holidays = {date(2026, 9, 30)}
        with patch(
            "utils.leave_calculation.get_holidays_in_range",
            return_value=list(holidays),
        ):
            days = calculate_working_days(
                date(2026, 9, 29),
                date(2026, 10, 2),
                company_id="TP",
            )
        chargeable = iter_leave_chargeable_dates(
            date(2026, 9, 29),
            date(2026, 10, 2),
            holiday_dates=holidays,
        )
        self.assertEqual(days, float(len(chargeable)))


if __name__ == "__main__":
    unittest.main()
