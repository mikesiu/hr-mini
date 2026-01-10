# Salary History Permissions - System Roles Update

## Overview

I've added the new salary history permissions to the system roles. The salary history system now has its own dedicated permissions that work alongside the existing employment permissions.

## New Permissions Added

### Salary History Permissions

- **`salary_history:view`** - Permission to view salary history records
- **`salary_history:manage`** - Permission to create, edit, and delete salary history records

### Updated Role Permissions

#### 1. Employment Manager (`employment_manager`)
**Full employment and salary history management**

Permissions:
- `employee:view`
- `employment:view`
- `employment:manage`
- `employment:view_pay_rate`
- `employment:manage_pay_rate`
- `salary_history:view` ✨ **NEW**
- `salary_history:manage` ✨ **NEW**

**Capabilities:**
- View and manage employment records
- View and manage salary history
- Full access to all employment and salary functions

#### 2. Employment Viewer (`employment_viewer`)
**View employment records and salary history (read-only)**

Permissions:
- `employee:view`
- `employment:view`
- `employment:view_pay_rate`
- `salary_history:view` ✨ **NEW**

**Capabilities:**
- View employment records and pay rates
- View salary history records
- Cannot create, edit, or delete records

#### 3. Administrator (`admin`)
**Full system access**

Permissions:
- `*` (all permissions including new salary history permissions)

**Capabilities:**
- All system functions
- All employment and salary management functions

## Permission Logic

### Backward Compatibility
The system maintains backward compatibility by checking both old and new permissions:

```python
# For viewing salary information
can_view_pay_rate = user_has_permission("employment:view_pay_rate") or user_has_permission("salary_history:view")

# For managing salary information  
can_manage_pay_rate = user_has_permission("employment:manage_pay_rate") or user_has_permission("salary_history:manage")
```

This means:
- Users with old permissions continue to work
- Users with new permissions get the same access
- Gradual migration is possible

### Permission Hierarchy

**Viewing Salary Information:**
1. `salary_history:view` (new, preferred)
2. `employment:view_pay_rate` (legacy, still works)

**Managing Salary Information:**
1. `salary_history:manage` (new, preferred)
2. `employment:manage_pay_rate` (legacy, still works)

## Updated User Management Interface

The User Management page now includes the new salary history permissions:

### Available Permissions List:
- Employee View
- Employee Edit
- Employment View
- Employment Manage
- Employment View Pay Rate
- Employment Manage Pay Rate
- **Salary History View** ✨ **NEW**
- **Salary History Manage** ✨ **NEW**
- Leave Manage
- Work Permit Manage
- Company Manage
- User Manage

## Role Assignment Examples

### Creating a Salary Manager Role
```
Role Name: Salary Manager
Role Code: salary_manager
Permissions:
  ✅ Employee View
  ✅ Employment View
  ✅ Salary History View
  ✅ Salary History Manage
  ❌ Employment Manage (cannot change employment records)
  ❌ Employment View Pay Rate (legacy permission)
```

### Creating a Salary Viewer Role
```
Role Name: Salary Viewer
Role Code: salary_viewer
Permissions:
  ✅ Employee View
  ✅ Employment View
  ✅ Salary History View
  ❌ Salary History Manage (read-only)
```

### Creating a Basic Employment Manager
```
Role Name: Employment Manager (No Salary Access)
Role Code: employment_manager_basic
Permissions:
  ✅ Employee View
  ✅ Employment View
  ✅ Employment Manage
  ❌ Salary History View (cannot see salary information)
  ❌ Salary History Manage
```

## Migration Status

### ✅ Completed Updates:
- Updated `scripts/bootstrap_db.py` with new permissions
- Updated `app/ui/pages/user_management.py` to show new permissions
- Updated `app/ui/pages/employment_management.py` to use new permissions
- Created `scripts/update_salary_history_permissions.py` migration script
- Updated existing roles in database

### 🔄 Backward Compatibility:
- Old permissions still work
- Gradual migration possible
- No breaking changes

## Usage in Code

### Checking Permissions
```python
from app.ui.auth.login import user_has_permission

# Check if user can view salary information
if user_has_permission("salary_history:view"):
    # Show salary history interface
    pass

# Check if user can manage salary information
if user_has_permission("salary_history:manage"):
    # Show salary management functions
    pass
```

### Permission Checks in UI
```python
# In employment management page
can_view_pay_rate = user_has_permission("employment:view_pay_rate") or user_has_permission("salary_history:view")
can_manage_pay_rate = user_has_permission("employment:manage_pay_rate") or user_has_permission("salary_history:manage")
```

## Benefits of New Permissions

### 1. Granular Control
- Separate permissions for salary history vs employment management
- More flexible role assignments
- Better security model

### 2. Clear Separation
- Salary history permissions are distinct from employment permissions
- Easier to understand and manage
- Better organization

### 3. Future-Proof
- Dedicated permissions for salary history features
- Easy to add new salary-related permissions
- Scalable permission system

### 4. Backward Compatibility
- Existing roles continue to work
- No disruption to current users
- Gradual migration possible

## Next Steps

1. **Test the new permissions** by creating users with different role combinations
2. **Update any custom roles** to include salary history permissions as needed
3. **Consider migrating** from legacy permissions to new permissions over time
4. **Document role assignments** for your organization's specific needs

The salary history permissions are now fully integrated into the system and ready for use!
