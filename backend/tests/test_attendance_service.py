"""Tests for attendance hour and overtime calculations."""
import unittest
from datetime import date, time

from services.attendance_service import calculate_hours_worked


class TestDriverEarlyStartOT(unittest.TestCase):
    """Driver weekday OT includes time before schedule start and after schedule end."""

    def setUp(self):
        self.work_date = date(2026, 6, 16)  # Tuesday
        self.schedule_start = time(8, 0)
        self.schedule_end = time(16, 0)
        self.check_in = time(7, 0)
        self.check_out = time(19, 0)

    def test_driver_early_and_late_ot(self):
        regular, ot, weekend_ot = calculate_hours_worked(
            self.check_in,
            self.check_out,
            self.schedule_start,
            self.schedule_end,
            self.work_date,
            is_driver=True,
        )
        self.assertEqual((regular, ot, weekend_ot), (8.0, 4.0, 0.0))

    def test_non_driver_late_ot_only(self):
        regular, ot, weekend_ot = calculate_hours_worked(
            self.check_in,
            self.check_out,
            self.schedule_start,
            self.schedule_end,
            self.work_date,
            is_driver=False,
        )
        self.assertEqual((regular, ot, weekend_ot), (8.0, 3.0, 0.0))

    def test_driver_early_ot_only(self):
        regular, ot, weekend_ot = calculate_hours_worked(
            time(7, 0),
            time(16, 0),
            self.schedule_start,
            self.schedule_end,
            self.work_date,
            is_driver=True,
        )
        self.assertEqual((regular, ot, weekend_ot), (8.0, 1.0, 0.0))

    def test_driver_late_ot_only(self):
        regular, ot, weekend_ot = calculate_hours_worked(
            time(8, 0),
            time(19, 0),
            self.schedule_start,
            self.schedule_end,
            self.work_date,
            is_driver=True,
        )
        self.assertEqual((regular, ot, weekend_ot), (8.0, 3.0, 0.0))

    def test_driver_ot_below_threshold(self):
        regular, ot, weekend_ot = calculate_hours_worked(
            time(7, 45),
            time(16, 0),
            self.schedule_start,
            self.schedule_end,
            self.work_date,
            is_driver=True,
        )
        self.assertEqual((regular, ot, weekend_ot), (8.0, 0.0, 0.0))

    def test_driver_count_all_ot_below_threshold(self):
        regular, ot, weekend_ot = calculate_hours_worked(
            time(7, 45),
            time(16, 0),
            self.schedule_start,
            self.schedule_end,
            self.work_date,
            is_driver=True,
            count_all_ot=True,
        )
        self.assertEqual((regular, ot, weekend_ot), (8.0, 0.25, 0.0))


if __name__ == "__main__":
    unittest.main()
