# Centralized model imports to avoid SQLAlchemy metadata conflicts
# This file ensures models are imported only once across the application

import sys
from pathlib import Path
sys.path.append(str(Path(__file__).parent))

# Import all models from old_system
from models.base import Base, SessionLocal
from models.user import User
from models.employee import Employee
from models.company import Company
from models.employment import Employment
from models.leave import Leave
from models.leave_type import LeaveType
from models.salary_history import SalaryHistory
from models.work_permit import WorkPermit
from models.expense_claim import ExpenseClaim
from models.expense_entitlement import ExpenseEntitlement
from models.employee_document import EmployeeDocument
from models.termination import Termination
from models.audit import AuditLog

# Import repositories and services
from repos.user_repo import (
    list_users, list_roles, get_user_by_username, set_user_password
)
from repos.employee_repo import (
    search_employees, create_employee, get_employee, 
    update_employee, delete_employee, employee_exists
)
from services.auth_service import authenticate, serialize_user
from utils.security import verify_password

# Export commonly used items
__all__ = [
    'Base', 'SessionLocal',
    'User', 'Employee', 'Company', 'Employment', 'Leave', 'LeaveType',
    'SalaryHistory', 'WorkPermit', 'ExpenseClaim', 'ExpenseEntitlement',
    'EmployeeDocument', 'Termination', 'AuditLog',
    'list_users', 'list_roles', 'get_user_by_username', 'set_user_password',
    'search_employees', 'create_employee', 'get_employee', 
    'update_employee', 'delete_employee', 'employee_exists',
    'authenticate', 'serialize_user', 'verify_password'
]
