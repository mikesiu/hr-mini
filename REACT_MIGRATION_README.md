# HR Mini - React + FastAPI Migration

This document describes the migration from Streamlit to React + FastAPI architecture.

## Architecture Overview

### New Structure
```
hr-mini/
├── backend/              # FastAPI application
│   ├── api/             # API routes
│   ├── main.py          # FastAPI entry point
│   ├── schemas.py       # Pydantic models
│   └── requirements.txt
├── frontend/            # React application
│   ├── src/
│   │   ├── components/  # Reusable UI components
│   │   ├── pages/       # Page components (9 modules)
│   │   ├── api/         # API client
│   │   ├── contexts/    # Auth context
│   │   └── App.tsx      # Main app
│   └── package.json
├── old_system/          # Legacy Streamlit system (archived)
│   ├── app/            # Streamlit UI components
│   ├── app.py          # Main Streamlit entry point
│   └── requirements.txt # Streamlit dependencies
└── start_react.bat      # New startup script
```

## Features Implemented

### ✅ Completed
- **Backend API**: Complete FastAPI setup with JWT authentication
- **Employee API**: Full CRUD operations for employees
- **Authentication**: Login/logout with JWT tokens
- **React Frontend**: Material-UI based interface
- **Navigation**: Sidebar with permission-based menu
- **Employee Module**: List, search, filter, and basic operations
- **Deployment**: Single-server setup with FastAPI serving React

### 🚧 In Progress
- **Employment Management**: API endpoints created, frontend placeholder
- **Leave Dashboard**: API endpoints created, frontend placeholder
- **Salary Management**: API endpoints created, frontend placeholder
- **Work Permit Management**: API endpoints created, frontend placeholder
- **Expense Reimbursement**: API endpoints created, frontend placeholder
- **Company Management**: API endpoints created, frontend placeholder
- **User Management**: API endpoints created, frontend placeholder
- **Audit Report**: API endpoints created, frontend placeholder

## Getting Started

### Prerequisites
- Python 3.8+
- Node.js 16+
- MySQL database (existing)

### Installation & Running

1. **Start the application**:
   ```bash
   start_react.bat
   ```

2. **Access the application**:
   - Open browser to `http://localhost:8001`
   - Login with existing credentials

### Development Mode

1. **Backend only** (for API development):
   ```bash
   cd backend
   pip install -r requirements.txt
   uvicorn main:app --host 0.0.0.0 --port 8001
   ```

2. **Frontend only** (for UI development):
   ```bash
   cd frontend
   npm install
   npm start
   ```

## Key Features

### Authentication
- JWT-based authentication
- Role-based access control (RBAC)
- Automatic token refresh
- Secure logout

### Employee Management
- Search and filter employees
- Create, read, update, delete operations
- Status filtering (Active, On Leave, Terminated, Probation)
- Material-UI DataGrid for professional table display

### Navigation
- Responsive sidebar navigation
- Permission-based menu items
- Company filter dropdown
- User profile menu

### API Design
- RESTful API endpoints
- Pydantic schemas for validation
- Reuses existing business logic (repos/services)
- Comprehensive error handling

## Migration Benefits

1. **Modern Architecture**: Separation of concerns with React frontend and FastAPI backend
2. **Better Performance**: Client-side rendering with Material-UI components
3. **Professional UI**: Modern, responsive interface with Material Design
4. **Scalability**: Easy to add new features and modules
5. **Maintainability**: Clean code structure and TypeScript support
6. **Reusability**: Existing business logic preserved and reused

## Next Steps

1. **Complete remaining modules**: Implement frontend for all 8 remaining modules
2. **Employee forms**: Add create/edit dialogs with full form validation
3. **Document management**: Implement file upload and management
4. **Advanced features**: Add real-time updates, advanced filtering, etc.
5. **Testing**: Add unit and integration tests
6. **Production deployment**: Configure for production environment

## API Endpoints

### Authentication
- `POST /api/auth/login` - User login
- `POST /api/auth/logout` - User logout

### Employees
- `GET /api/employees` - List employees (with search/filter)
- `GET /api/employees/{id}` - Get employee details
- `POST /api/employees` - Create employee
- `PUT /api/employees/{id}` - Update employee
- `DELETE /api/employees/{id}` - Delete employee

### Other Modules
- Employment: `/api/employment/*`
- Leaves: `/api/leaves/*`
- Salary: `/api/salary/*`
- Work Permits: `/api/work-permits/*`
- Expenses: `/api/expenses/*`
- Companies: `/api/companies/*`
- Users: `/api/users/*`
- Audit: `/api/audit/*`

## Technology Stack

### Backend
- **FastAPI**: Modern Python web framework
- **SQLAlchemy**: ORM for database operations
- **Pydantic**: Data validation and serialization
- **JWT**: Authentication tokens
- **Existing repos/services**: Reused business logic

### Frontend
- **React 18**: Modern React with hooks
- **TypeScript**: Type safety
- **Material-UI**: Professional UI components
- **React Router**: Client-side routing
- **Axios**: HTTP client
- **React Hook Form**: Form management

## Database
- **MySQL**: Existing database (no changes required)
- **Existing models**: All SQLAlchemy models reused
- **Data migration**: Not required (same database)

This migration provides a solid foundation for modernizing the HR system while preserving all existing functionality and data.
