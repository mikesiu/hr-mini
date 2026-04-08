# Salary Management System

## Overview

The Salary Management System is a comprehensive module for tracking and managing employee salary history, current salaries, and salary progression analysis. It provides both backend API endpoints and a modern React frontend interface.

## Features

### Backend Features

1. **Salary History Tracking**
   - Create, read, update, and delete salary records
   - Support for different pay types (Hourly, Monthly, Annual)
   - Effective date and end date tracking
   - Notes and comments support
   - Audit trail for all changes

2. **Business Logic Validation**
   - Salary effective date validation against employment periods
   - Pay rate validation (must be positive)
   - Pay type validation (Hourly, Monthly, Annual)
   - Automatic end date handling for current salaries

3. **Advanced Queries**
   - Search salary records across all employees
   - Get salary history for specific employees
   - Get current salary for employees
   - Salary progression analysis
   - Company-based filtering

4. **API Endpoints**
   - `GET /api/salary/history` - List salary records with filtering
   - `GET /api/salary/history/{id}` - Get specific salary record
   - `POST /api/salary/history` - Create new salary record
   - `PUT /api/salary/history/{id}` - Update salary record
   - `DELETE /api/salary/history/{id}` - Delete salary record
   - `GET /api/salary/current/{employee_id}` - Get current salary
   - `GET /api/salary/progression/{employee_id}` - Get salary progression

### Frontend Features

1. **Salary History Management**
   - Tabbed interface for different views
   - Search and filter functionality
   - Pagination for large datasets
   - Real-time data updates

2. **Current Salaries View**
   - Card-based layout for active salaries
   - Visual indicators for pay types
   - Quick edit functionality

3. **Salary Progression Analysis**
   - Interactive progression charts
   - Statistics and metrics
   - Timeline visualization
   - Increase/decrease tracking

4. **Add/Edit Dialog**
   - Form validation
   - Date picker integration
   - Pay type selection
   - Notes support

## Database Schema

### Salary History Table

```sql
CREATE TABLE salary_history (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    employee_id VARCHAR(50) NOT NULL,
    pay_rate DECIMAL(10,2) NOT NULL,
    pay_type VARCHAR(20) NOT NULL,
    effective_date DATE NOT NULL,
    end_date DATE NULL,
    notes TEXT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NULL,
    FOREIGN KEY (employee_id) REFERENCES employees(id) ON DELETE CASCADE
);
```

## API Usage Examples

### Create a Salary Record

```bash
curl -X POST "http://localhost:8002/api/salary/history" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "employee_id": "EMP001",
    "pay_rate": 25.50,
    "pay_type": "Hourly",
    "effective_date": "2024-01-01",
    "notes": "Starting salary"
  }'
```

### Get Salary History for Employee

```bash
curl -X GET "http://localhost:8002/api/salary/history?employee_id=EMP001" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### Update Salary Record

```bash
curl -X PUT "http://localhost:8002/api/salary/history/1" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "pay_rate": 27.00,
    "notes": "Salary increase"
  }'
```

## Frontend Components

### SalaryPage Component

Main component with three tabs:
- **Salary History**: Table view with search and pagination
- **Current Salaries**: Card view of active salaries
- **Salary Progression**: Analysis and charts

### SalaryProgressionChart Component

Displays:
- Current salary information
- Total increase statistics
- Timeline of salary changes
- Visual progression indicators

## Business Rules

1. **Salary Validation**
   - Pay rate must be positive
   - Effective date cannot be in the future
   - End date must be after effective date
   - Effective date must be within employment period

2. **Current Salary Management**
   - Only one current salary per employee
   - New salary automatically ends previous salary
   - Current salary has NULL end_date

3. **Audit Trail**
   - All changes are logged with user and timestamp
   - Before/after values are tracked
   - Deletion is soft-deleted with audit record

## Security

- All endpoints require authentication
- Permission-based access control
- Input validation and sanitization
- SQL injection prevention

## Testing

Run the test script to verify functionality:

```bash
python test_salary_functionality.py
```

## Dependencies

### Backend
- FastAPI
- SQLAlchemy
- Pydantic
- Python 3.8+

### Frontend
- React 18+
- Material-UI
- TypeScript
- Axios
- Date picker components

## Installation

1. Ensure the salary API is registered in `backend/main.py`
2. Install frontend dependencies: `npm install`
3. Start the backend server: `python backend/main.py`
4. Start the frontend: `npm start`

## Future Enhancements

1. **Advanced Analytics**
   - Salary benchmarking
   - Market rate comparisons
   - Budget forecasting

2. **Reporting**
   - PDF salary reports
   - Excel export functionality
   - Custom report builder

3. **Integration**
   - Payroll system integration
   - Performance review linking
   - Compensation planning tools

4. **Notifications**
   - Salary review reminders
   - Promotion notifications
   - Budget alerts

## Troubleshooting

### Common Issues

1. **Salary validation errors**
   - Check effective date is within employment period
   - Verify pay rate is positive
   - Ensure employee exists and has active employment

2. **Frontend loading issues**
   - Check API endpoint availability
   - Verify authentication token
   - Check browser console for errors

3. **Database errors**
   - Ensure salary_history table exists
   - Check foreign key constraints
   - Verify database permissions

## Support

For issues or questions regarding the salary management system, please check the logs and error messages first, then contact the development team.
