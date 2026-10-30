"""Leave taken report categories: Vacation, Sick, No Pay, Others."""
from services.report_service import ReportService
from schemas_reports import GroupByField
from utils.leave_categories import classify_leave_category


def test_classify_leave_category():
    assert classify_leave_category("VAC", "Vacation") == "Vacation"
    assert classify_leave_category("SICK", "Sick Leave") == "Sick"
    assert classify_leave_category("UNPAID", "Unpaid Leave") == "No Pay"
    assert classify_leave_category("UNPAIDSICK", "Unpaid Sick Leave") == "No Pay"
    assert classify_leave_category("BEREAVEMENT", "Bereavement Leave") == "Others"
    # Unpaid wins over a sick or vacation name.
    assert classify_leave_category("UNPAIDSICK", "Sick Leave") == "No Pay"


def test_leave_category_groups_and_day_subtotals():
    rows = [
        {"employee_name": "Ada", "leave_category": "No Pay", "days_taken": 1, "leave_type_code": "UNPAID"},
        {"employee_name": "Ada", "leave_category": "Sick", "days_taken": 2, "leave_type_code": "SICK"},
        {"employee_name": "Ada", "leave_category": "No Pay", "days_taken": 1, "leave_type_code": "UNPAIDSICK"},
        {"employee_name": "Bea", "leave_category": "Vacation", "days_taken": 4, "leave_type_code": "VAC"},
        {"employee_name": "Bea", "leave_category": "Others", "days_taken": 1, "leave_type_code": "JURY"},
    ]
    service = ReportService()
    grouped = service._group_data(rows, GroupByField.EMPLOYEE, GroupByField.LEAVE_CATEGORY)

    by_employee = {g.group_value: g for g in grouped}
    assert list(by_employee) == ["Ada", "Bea"]
    assert by_employee["Ada"].group_summary["total_days"] == 4
    assert [s.group_value for s in by_employee["Ada"].subgroups] == ["Sick", "No Pay"]
    no_pay = by_employee["Ada"].subgroups[1]
    assert no_pay.group_count == 2
    assert no_pay.group_summary["total_days"] == 2
    assert by_employee["Ada"].records == []

    categories = service._group_data(rows, GroupByField.LEAVE_CATEGORY)
    assert [g.group_value for g in categories] == ["Vacation", "Sick", "No Pay", "Others"]
    assert categories[0].group_summary["total_days"] == 4
    assert categories[2].group_summary["total_days"] == 2
