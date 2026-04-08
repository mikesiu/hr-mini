# Employment Management Access Control

This document describes the role-based access control system implemented for the Employment Management module in the HR Mini system.

## Overview

The employment management system now supports different levels of access based on user roles:

1. **Full Management Access**: Can view, create, edit, and delete employment records including pay rates
2. **View-Only with Pay Rate Access**: Can view employment records and pay rates but cannot modify them
3. **Basic View-Only Access**: Can view employment records but not pay rates

## Permissions

### New Permissions Added

- `employment:view_pay_rate` - Permission to view pay rate information in employment records
- `employment:manage_pay_rate` - Permission to edit pay rate information in existing employment records

### Existing Permissions

- `employment:view` - Permission to view employment records
- `employment:manage` - Permission to create, edit, and delete employment records

### Permission Logic

**Pay Rate Field Behavior:**
- **Creating New Records**: Users with `employment:manage` can enter pay rates when creating new employment records (even without `employment:manage_pay_rate`)
- **Editing Existing Records**: Users need `employment:manage_pay_rate` to edit pay rates in existing employment records
- **Viewing Records**: Users need `employment:view_pay_rate` to see pay rate information

This design allows users to create complete employment records while maintaining fine-grained control over who can modify existing salary information.

## Roles

### 1. Employment Manager (`employment_manager`)
**Full management access including pay rates**

Permissions:
- `employee:view`
- `employment:view`
- `employment:manage`
- `employment:view_pay_rate`
- `employment:manage_pay_rate`

**Capabilities:**
- View all employment records and pay rates
- Create new employment records
- Edit existing employment records
- Delete employment records
- Manage pay rate information
- View salary history

### 2. Employment Viewer (`employment_viewer`)
**View-only access with pay rate visibility**

Permissions:
- `employee:view`
- `employment:view`
- `employment:view_pay_rate`

**Capabilities:**
- View employment records
- View pay rate information
- View salary history
- Cannot create, edit, or delete records

### 3. Administrator (`admin`)
**Full system access**

Permissions:
- `*` (all permissions)

**Capabilities:**
- All system functions
- All employment management functions
- User and role management

### 4. Basic Viewer (`viewer`)
**Basic view-only access without pay rates**

Permissions:
- `employee:view`
- `employment:view`
- `leave:view`
- `company:view`
- `work_permit:view`

**Capabilities:**
- View employment records (without pay rates)
- View basic employment information
- Cannot see salary information

## Implementation Details

### Access Control Logic

The system checks permissions at multiple levels:

1. **Page Access**: Users need `employment:view` permission to access the Employment Management page
2. **Pay Rate Visibility**: Users need `employment:view_pay_rate` permission to see salary information
3. **Management Functions**: Users need `employment:manage` permission to create/edit/delete records
4. **Pay Rate Management**: Users need `employment:manage_pay_rate` permission to modify salary information

### UI Behavior

#### For Employment Managers:
- Full access to all employment management functions
- Can see and edit all fields including pay rates
- Access to create, edit, and delete buttons
- Full form functionality

#### For Employment Viewers:
- Can view employment records and pay rates
- Cannot access management functions (create/edit/delete)
- Form fields are disabled or hidden
- Read-only access to salary information

#### For Basic Viewers:
- Can view employment records without pay rates
- Pay rate fields are hidden
- No management capabilities

## Salary History Tracking

The system maintains complete salary history through the employment records:

### How It Works

1. **Employment Records**: Each employment record contains pay rate and pay type information
2. **Historical Data**: When an employee changes positions or companies, a new employment record is created
3. **Salary Progression**: The system tracks salary changes over time through the sequence of employment records
4. **Audit Trail**: All changes are logged through the existing audit system

### Viewing Salary History

Users with appropriate permissions can view salary history through:

1. **Employment Management Page**: View all employment records for an employee
2. **Salary History Script**: Use `scripts/view_salary_history.py` for comprehensive reports
3. **Audit Reports**: Track changes through the audit system

## Setup and Configuration

### 1. Update Existing Database

Run the permission update script to add new roles and permissions:

```bash
python scripts/update_employment_permissions.py
```

### 2. Bootstrap New Database

For new installations, the updated roles are automatically created:

```bash
python scripts/bootstrap_db.py
```

### 3. Assign Roles to Users

Use the User Management page or directly in the database to assign appropriate roles to users.

## Usage Examples

### Creating an Employment Viewer User

```python
from app.repos.user_repo import create_user

# Create a user with employment viewer role
create_user(
    username="hr_viewer",
    password="secure_password",
    display_name="HR Viewer",
    role_codes=["employment_viewer"]
)
```

### Checking Permissions in Code

```python
from app.ui.auth.login import user_has_permission

# Check if user can view pay rates
if user_has_permission("employment:view_pay_rate"):
    # Show pay rate information
    pass

# Check if user can manage employment
if user_has_permission("employment:manage"):
    # Show management buttons
    pass
```

## Security Considerations

1. **Permission Validation**: All permission checks are performed server-side
2. **UI Hiding**: Sensitive information is hidden from users without appropriate permissions
3. **Form Validation**: Management functions are disabled for users without permissions
4. **Audit Logging**: All employment changes are logged for security and compliance

## Migration Notes

### For Existing Installations

1. Run the permission update script to add new roles
2. Existing users will retain their current permissions
3. New roles are available for assignment to new users
4. No data loss occurs during the migration

### For New Installations

1. The updated roles are automatically created during bootstrap
2. Default admin user has full access
3. New roles are ready for immediate use

## Troubleshooting

### Common Issues

1. **User cannot see pay rates**: Check if user has `employment:view_pay_rate` permission
2. **User cannot edit records**: Check if user has `employment:manage` permission
3. **Page access denied**: Check if user has `employment:view` permission

### Debugging Permissions

Use the User Management page to verify user roles and permissions, or check the database directly:

```sql
SELECT u.username, r.code, r.permissions 
FROM users u 
JOIN user_roles ur ON u.id = ur.user_id 
JOIN roles r ON ur.role_id = r.id 
WHERE u.username = 'your_username';
```

## Future Enhancements

Potential future improvements:

1. **Department-based Access**: Restrict access based on employee departments
2. **Salary Range Permissions**: Different access levels for different salary ranges
3. **Time-based Access**: Temporary access permissions
4. **Advanced Reporting**: More sophisticated salary analysis tools
5. **Export Permissions**: Control over data export capabilities
