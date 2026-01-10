import sys
import pathlib

sys.path.append(str(pathlib.Path(__file__).resolve().parents[1]))

from sqlalchemy.orm import Session

from app.models.base import Base, engine
# Ensure all models are registered with metadata
from app.models import employee, employment, leave_type, leave, audit, company, user, holiday  # noqa: F401
from app.models.company import Company
from app.models.leave_type import LeaveType
from app.repos.user_repo import ensure_role, get_user_by_username, create_user


DEFAULT_ROLES = [
    (
        "admin",
        "Administrator",
        ["*"],
    ),
    (
        "employment_manager",
        "Employment Manager",
        [
            "employee:view",
            "employment:view",
            "employment:manage",
            "employment:view_pay_rate",
            "employment:manage_pay_rate",
            "salary_history:view",
            "salary_history:manage",
        ],
    ),
    (
        "employment_viewer",
        "Employment Viewer",
        [
            "employee:view",
            "employment:view",
            "employment:view_pay_rate",
            "salary_history:view",
        ],
    ),
    (
        "leave_manager",
        "Leave Manager",
        [
            "employee:view",
            "leave:view",
            "leave:manage",
        ],
    ),
    (
        "company_manager",
        "Company Manager",
        [
            "company:view",
            "company:manage",
        ],
    ),
    (
        "work_permit_manager",
        "Work Permit Manager",
        [
            "employee:view",
            "work_permit:view",
            "work_permit:manage",
        ],
    ),
    (
        "viewer",
        "Read Only",
        [
            "employee:view",
            "employment:view",
            "leave:view",
            "company:view",
            "work_permit:view",
        ],
    ),
]


def main() -> None:
    Base.metadata.create_all(bind=engine)
    with Session(engine) as session:
        seed_leave_types(session)
        seed_default_company(session)
        session.commit()

    seed_roles_and_admin()
    print("DB initialized, seed data ready including auth roles.")


def seed_leave_types(session: Session) -> None:
    if session.query(LeaveType).count() > 0:
        return
    session.add_all(
        [
            LeaveType(code="VAC", name="Vacation"),
            LeaveType(code="SICK", name="Sick Leave"),
            LeaveType(code="BL", name="Bereavement Leave"),
            LeaveType(code="CCL", name="Compassionate Care Leave"),
            LeaveType(code="CIIL", name="Critical Illness or Injury Leave"),
            LeaveType(code="FRL", name="Family Responsibility Leave"),
            LeaveType(code="JDL", name="Jury Duty Leave"),
            LeaveType(code="LDC", name="Leave respecting the disappearance of a child"),
            LeaveType(code="LDSV", name="Leave respecting domestic or sexual violence"),
            LeaveType(code="LDTC", name="Leave respecting the death of a child"),
            LeaveType(code="ML_PL", name="Maternity and Parental Leave"),
            LeaveType(code="UNPAID", name="Unpaid Leave"),
        ]
    )


def seed_default_company(session: Session) -> None:
    if session.query(Company).count() > 0:
        return
    session.add(
        Company(
            id="TOPCO",
            legal_name="Topco Pallet Recycling Ltd.",
            trade_name="TP",
            address_line1="8056 Alexander Road",
            city="Delta",
            province="BC",
            postal_code="V4G 1G7",
            country="Canada",
        )
    )


def seed_roles_and_admin() -> None:
    for code, name, permissions in DEFAULT_ROLES:
        ensure_role(code, name, permissions)

    admin = get_user_by_username("admin", include_inactive=True)
    if admin:
        return

    # Default password should be changed immediately after bootstrap.
    create_user(
        "admin",
        "ChangeMe123!",
        display_name="System Administrator",
        role_codes=["admin"],
    )
    print("Created default admin user (username 'admin', password 'ChangeMe123!').")


if __name__ == "__main__":
    main()
