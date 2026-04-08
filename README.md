# HR Mini - Human Resources Management System

A comprehensive HR management system built with React, FastAPI, and MySQL, designed for small to medium-sized businesses operating in British Columbia, Canada.

## 🎯 Overview

HR Mini is a full-featured human resources management system that handles employee lifecycle management, leave tracking with BC ESA compliance, salary history, expense reimbursement, and comprehensive reporting. The system features role-based access control, anniversary-based vacation tracking, and an intuitive modern interface.

## ✨ Key Features

### 👥 Employee Management
- Complete employee lifecycle tracking
- Document management (work permits, employee documents)
- Employment history with multiple positions
- Company and department organization
- Status tracking (Active, On Leave, Terminated, Probation)

### 🏖️ Leave Management
- **Anniversary-based vacation tracking** compliant with BC Employment Standards Act
- Dual vacation cards showing both current and previous anniversary periods
- Sick leave with calendar year tracking
- Leave balance calculations with carry-over support
- Year-based filtering for historical leave data
- Unpaid leave tracking
- Real-time leave statistics

### 💰 Salary Management
- Comprehensive salary history tracking
- Multiple pay types support (Hourly, Monthly, Annual)
- Effective date tracking for salary changes
- Salary progression analysis and reporting
- Role-based access to sensitive salary information
- Automatic audit trail for all changes

### 📋 Employment Management
- Employment record tracking across multiple positions
- Company and department assignments
- Position and title management
- Employment period tracking with start/end dates
- Integration with salary history

### 💳 Expense Reimbursement
- Employee expense claim submission
- Entitlement management (Gas, Mobile, Boots)
- Automatic claim calculation based on entitlements
- Monthly expense reporting
- Claim status tracking (Pending, PP2, PP4, etc.)

### 🔐 User Management & Security
- Role-based access control (RBAC)
- Custom role creation with granular permissions
- JWT-based authentication
- Permission-based UI rendering
- Comprehensive audit logging

### 📊 Reporting System
- Employee directory reports
- Employment history reports
- Leave balance and usage reports
- Salary analysis reports
- Work permit status reports
- Comprehensive overview reports
- Advanced filtering, sorting, and grouping
- Export capabilities

### 🔍 Audit System
- Complete audit trail for all operations
- User action tracking
- Before/after value tracking
- Timestamp and user attribution
- Searchable audit logs

## 🏗️ Architecture

### Technology Stack

**Backend:**
- **FastAPI** - Modern Python web framework
- **SQLAlchemy** - ORM for database operations
- **Pydantic** - Data validation and serialization
- **PyMySQL** - MySQL database connector
- **JWT** - Secure authentication tokens
- **Python 3.8+**

**Frontend:**
- **React 18** - Modern UI library with hooks
- **TypeScript** - Type-safe JavaScript
- **Material-UI (MUI)** - Professional UI components
- **React Router** - Client-side routing
- **Axios** - HTTP client
- **React Hook Form** - Form management

**Database:**
- **MySQL 8.0+** - Production-ready relational database
- UTF8MB4 charset for full Unicode support
- Connection pooling and optimization

### Project Structure

```
hr-mini/
├── backend/                 # FastAPI application
│   ├── api/                # API route handlers
│   │   ├── auth.py        # Authentication endpoints
│   │   ├── employees.py   # Employee management
│   │   ├── employment.py  # Employment records
│   │   ├── leaves.py      # Leave management
│   │   ├── salary.py      # Salary history
│   │   ├── expenses.py    # Expense reimbursement
│   │   ├── users.py       # User management
│   │   ├── companies.py   # Company management
│   │   ├── reports.py     # Reporting system
│   │   └── audit.py       # Audit logs
│   ├── models/            # SQLAlchemy models
│   ├── repos/             # Data access layer
│   ├── services/          # Business logic layer
│   ├── schemas.py         # Pydantic schemas
│   ├── config/            # Configuration
│   └── main.py            # Application entry point
├── frontend/              # React application
│   ├── src/
│   │   ├── components/   # Reusable UI components
│   │   ├── pages/        # Page components
│   │   ├── api/          # API client
│   │   ├── contexts/     # React contexts
│   │   ├── utils/        # Utility functions
│   │   └── App.tsx       # Main application
│   └── package.json
├── scripts/               # Database and utility scripts
│   ├── bootstrap_db.py   # Database initialization
│   ├── backup_now.py     # Database backup
│   └── [migration scripts]
└── md_files/             # Documentation
```

## 🚀 Getting Started

### Prerequisites

- Python 3.8 or higher
- Node.js 16 or higher
- MySQL 8.0 or higher

### Database Setup

1. **Create MySQL Database:**
```sql
CREATE DATABASE hr_mini CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE USER 'hr_user'@'localhost' IDENTIFIED BY 'your_password';
GRANT ALL PRIVILEGES ON hr_mini.* TO 'hr_user'@'localhost';
FLUSH PRIVILEGES;
```

2. **Configure Environment Variables:**
Create a `.env` file or set environment variables:
```bash
MYSQL_HOST=localhost
MYSQL_PORT=3306
MYSQL_USER=hr_user
MYSQL_PASSWORD=your_password
MYSQL_DATABASE=hr_mini
MYSQL_CHARSET=utf8mb4
```

### Installation

1. **Backend Setup:**
```bash
cd backend
pip install -r requirements.txt
python scripts/bootstrap_db.py  # Initialize database
python scripts/create_admin.py  # Create admin user
```

2. **Frontend Setup:**
```bash
cd frontend
npm install
```

### Running the Application

**Option 1: Use Batch Files (Windows)**
```bash
start_backend.bat    # Terminal 1
start_frontend.bat   # Terminal 2
```

**Option 2: Manual Start**
```bash
# Terminal 1 - Backend
cd backend
uvicorn main:app --host 127.0.0.1 --port 8001 --reload

# Terminal 2 - Frontend
cd frontend
npm start
```

**Access the Application:**
- Frontend: http://localhost:3001
- Backend API: http://localhost:8001
- API Documentation: http://localhost:8001/docs

**Default Credentials:**
- Username: `admin`
- Password: `admin` (change after first login)

## 📚 Core Concepts

### Anniversary-Based Vacation Tracking

The system implements BC ESA-compliant vacation tracking based on employee anniversary dates:

- **Vacation earned at anniversary:** Employees earn vacation entitlement on their hire date anniversary
- **12-month vacation period:** Vacation can be used for 12 months after earning
- **Automatic calculations:** System calculates entitlements based on years of service
- **Dual vacation cards:** Display both current and previous anniversary periods
- **Year mapping:** Intelligent year selector shows the anniversary period covering most of the selected calendar year

**Example:**
- Anniversary: July 13
- Selecting "Year 2026" shows: July 13, 2025 - July 12, 2026 (the period covering most of 2026)

### Role-Based Access Control

The system features a flexible RBAC system with granular permissions:

**Permission Categories:**
- Employee (view, edit)
- Employment (view, manage)
- Salary History (view, manage)
- Leave (manage)
- Work Permit (manage)
- Company (manage)
- User (manage)
- Expense (manage)

**Built-in Roles:**
- **Administrator:** Full system access
- **Employment Manager:** Full employment and salary management
- **Employment Viewer:** Read-only access with salary visibility
- **Basic Viewer:** Read-only access without salary information
- **Custom Roles:** Create custom roles with specific permission combinations

### Leave Year Filtering

The system provides year-based filtering for leave management:

- **Vacation:** Filtered by anniversary period
- **Sick Leave:** Filtered by calendar year (Jan 1 - Dec 31)
- **Historical Data:** View and edit leave records from previous years
- **Accurate Statistics:** Year-specific calculations for entitlements and usage

## 🔧 Key Features in Detail

### Dual Vacation Cards

The system displays two vacation cards side-by-side:
- **Card 1:** Previous anniversary period (e.g., 2024-2025)
- **Card 2:** Current anniversary period (e.g., 2025-2026)
- **Clear date ranges:** Each card shows exact start and end dates
- **Transparent tracking:** Users see both historical and current vacation usage

### Salary History System

Complete salary tracking with:
- Multiple salary records per employment position
- Effective date and end date tracking
- Support for raises, bonuses, and adjustments
- Notes field for change context
- Salary progression reports
- Current salary indicators

### Expense Management

Comprehensive expense reimbursement:
- Monthly entitlements per expense type
- Automatic claim calculation with caps
- Receipt amount tracking
- Claim status workflow
- Monthly expense reports

### Advanced Reporting

Flexible reporting system with:
- 7 report types covering all aspects of HR data
- Advanced filtering (15+ filter types)
- Dynamic sorting (20+ sort fields)
- Multi-level grouping (15+ group fields)
- Field applicability validation
- Export capabilities

## 🔐 Security Features

- **JWT Authentication:** Secure token-based authentication
- **Password Hashing:** Bcrypt password encryption
- **Role-Based Access:** Granular permission system
- **Audit Logging:** Complete action tracking
- **SQL Injection Prevention:** Parameterized queries
- **Input Validation:** Pydantic schema validation
- **CORS Configuration:** Secure cross-origin requests

## 📖 Documentation

Comprehensive documentation is available in the `md_files/` directory:

- **PROJECT_SETUP_GUIDE.md** - Installation and setup
- **REACT_MIGRATION_README.md** - Architecture overview
- **SALARY_MANAGEMENT_README.md** - Salary system documentation
- **EXPENSE_REIMBURSEMENT_SYSTEM.md** - Expense management
- **LEAVE_YEAR_FILTERING_IMPLEMENTATION.md** - Leave filtering details
- **VACATION_ANNIVERSARY_FIX.md** - Anniversary-based calculations
- **EMPLOYMENT_ACCESS_CONTROL.md** - Permission system
- **TESTING_GUIDE.md** - Testing procedures
- **REPORTS_API_DOCUMENTATION.md** - Reporting API reference

## 🛠️ Development

### Database Migrations

The system includes migration scripts in the `scripts/` directory:
```bash
python scripts/migrate_*.py  # Run specific migrations
python scripts/bootstrap_db.py  # Initialize new database
python scripts/backup_now.py  # Backup current database
```

### API Development

The backend follows a layered architecture:
- **API Layer** (`api/`): Route handlers and request validation
- **Service Layer** (`services/`): Business logic
- **Repository Layer** (`repos/`): Data access
- **Model Layer** (`models/`): Database models

API documentation is auto-generated at `/docs` using FastAPI's built-in Swagger UI.

### Frontend Development

React components follow Material-UI design patterns:
- Responsive design with Material-UI Grid
- Form validation with React Hook Form
- TypeScript for type safety
- Context API for state management
- Axios for API communication

## 🧪 Testing

The system includes test scripts and validation tools:
```bash
python scripts/validate_migration.py  # Validate database state
python backend/test_*.py  # Run backend tests
```

## 📊 Database Schema

Key tables:
- **employees** - Employee records
- **employment** - Employment history
- **salary_history** - Salary tracking
- **leaves** - Leave requests and records
- **leave_types** - Leave type definitions
- **expense_entitlements** - Employee expense allowances
- **expense_claims** - Expense claim submissions
- **users** - System users
- **roles** - User roles
- **user_roles** - Role assignments
- **companies** - Company records
- **audit_log** - Audit trail

## 🌟 Key Achievements

- ✅ Complete migration from Streamlit to React + FastAPI
- ✅ MySQL database with production-ready configuration
- ✅ BC ESA-compliant anniversary-based vacation tracking
- ✅ Comprehensive role-based access control
- ✅ Modern, responsive UI with Material-UI
- ✅ Complete audit trail for compliance
- ✅ Advanced reporting with flexible filtering
- ✅ Salary history tracking with privacy controls
- ✅ Expense reimbursement system
- ✅ Year-based leave filtering for historical data

## 🚧 Future Enhancements

Potential improvements documented in the system:
- Email notifications for leave approvals and status changes
- Document upload and management
- Performance review integration
- Advanced analytics and dashboards
- Mobile-responsive interface improvements
- Payroll system integration
- Time tracking integration
- Employee self-service portal

## 📝 License

[Specify your license here]

## 👥 Support

For support, issues, or questions:
1. Check the documentation in `md_files/`
2. Review API documentation at `/docs`
3. Check application logs for error details
4. Refer to troubleshooting guides in documentation

## 🙏 Acknowledgments

This system implements BC Employment Standards Act requirements for vacation entitlements and leave management.

---

**Built with ❤️ for efficient HR management**
