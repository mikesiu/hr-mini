# HR Reports API Documentation

## Overview

The Reports API provides comprehensive reporting functionality across all HR modules. It allows users to generate various types of reports with flexible filtering options and export capabilities.

## Base URL

```
http://localhost:8002/api/reports
```

## Authentication

All endpoints require authentication using JWT tokens. Include the token in the Authorization header:

```
Authorization: Bearer <your_jwt_token>
```

## Available Report Types

### 1. Employee Directory Report
**Endpoint:** `GET /employee-directory`

Generates a comprehensive employee directory with contact information and current position details.

**Query Parameters:**
- `company_id` (optional): Filter by company ID
- `department` (optional): Filter by department
- `employee_status` (optional): Filter by status (Active, Inactive, Terminated, All) - Default: Active
- `employee_id` (optional): Filter by specific employee ID
- `search_term` (optional): Search by employee name or ID
- `include_inactive` (boolean): Include inactive employees - Default: false
- `position` (optional): Filter by position
- `hire_date_from` (optional): Filter by hire date from
- `hire_date_to` (optional): Filter by hire date to

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "E001",
      "full_name": "John Doe",
      "first_name": "John",
      "last_name": "Doe",
      "email": "john.doe@company.com",
      "phone": "555-1234",
      "status": "Active",
      "hire_date": "2023-01-15",
      "position": "Manager",
      "department": "HR",
      "company_name": "TOPCO",
      "city": "Toronto",
      "province": "ON"
    }
  ],
  "summary": {
    "total_records": 1,
    "total_pages": 1,
    "current_page": 1,
    "generated_at": "2024-01-15T10:30:00",
    "filters_applied": {}
  }
}
```

### 2. Employment History Report
**Endpoint:** `GET /employment-history`

Shows historical employment records with job changes and promotions.

**Query Parameters:**
- `start_date` (optional): Filter by employment start date
- `end_date` (optional): Filter by employment end date
- `company_id` (optional): Filter by company ID
- `department` (optional): Filter by department
- `employee_status` (optional): Filter by employee status
- `employee_id` (optional): Filter by specific employee ID
- `search_term` (optional): Search by employee name or company

### 3. Leave Balance Report
**Endpoint:** `GET /leave-balance`

Shows current leave balances for all employees.

**Query Parameters:**
- `company_id` (optional): Filter by company ID
- `department` (optional): Filter by department
- `employee_status` (optional): Filter by employee status - Default: Active
- `employee_id` (optional): Filter by specific employee ID
- `search_term` (optional): Search by employee name

### 4. Salary Analysis Report
**Endpoint:** `GET /salary-analysis`

Shows salary history and current pay rates by position.

**Query Parameters:**
- `pay_type` (optional): Filter by pay type (Hourly, Monthly, Annual)
- `min_salary` (optional): Minimum salary filter
- `max_salary` (optional): Maximum salary filter
- `effective_date_from` (optional): Filter by effective date from
- `effective_date_to` (optional): Filter by effective date to
- Plus all common filters

### 5. Work Permit Status Report
**Endpoint:** `GET /work-permit-status`

Shows current work permits and expiry tracking.

**Query Parameters:**
- `permit_type` (optional): Filter by permit type
- `expiry_days_ahead` (optional): Days ahead to check for expiring permits - Default: 30
- `is_expired` (optional): Filter by expired status
- Plus all common filters

### 6. Comprehensive Overview Report
**Endpoint:** `GET /comprehensive-overview`

Complete employee profile with all related information.

**Query Parameters:**
- All common filters

## Utility Endpoints

### Get Available Report Types
**Endpoint:** `GET /types`

Returns a list of all available report types with descriptions.

### Get Filter Options
**Endpoint:** `GET /filters/{report_type}`

Returns available filter options for a specific report type.

**Example:** `GET /filters/employee_directory`

### Export Report
**Endpoint:** `GET /export/{report_type}`

Export report data in various formats.

**Query Parameters:**
- `format` (optional): Export format (json, csv) - Default: json
- All report-specific filters

**Example:** `GET /export/employee_directory?format=json&employee_status=Active`

## Permissions

The following permissions are required:

- `report:view` - Basic report access
- `report:export` - Export functionality

## Error Handling

All endpoints return appropriate HTTP status codes:

- `200` - Success
- `400` - Bad Request (invalid parameters)
- `401` - Unauthorized (missing or invalid token)
- `403` - Forbidden (insufficient permissions)
- `500` - Internal Server Error

Error responses include a `detail` field with error information:

```json
{
  "detail": "Error message describing what went wrong"
}
```

## Testing

Use the provided test script to verify API functionality:

```bash
python backend/test_reports_api.py
```

Make sure to:
1. Start the API server (`python backend/main.py`)
2. Have valid test user credentials
3. Have some sample data in the database

## Implementation Notes

- All reports are read-only and do not modify any data
- Reports use efficient database queries with proper joins
- Filtering is applied at the database level for performance
- The service layer handles data aggregation and formatting
- Export functionality is extensible for additional formats (PDF, Excel)

## Future Enhancements

- PDF and Excel export formats
- Scheduled report generation
- Report templates and customization
- Advanced analytics and charts
- Report caching for better performance
