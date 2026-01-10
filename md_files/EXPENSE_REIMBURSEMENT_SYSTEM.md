# Expense Reimbursement System

## Overview

The Expense Reimbursement System has been successfully integrated into the HR Mini application. This system allows employees to submit expense claims and managers to approve them, with automatic calculation of claimable amounts based on employee entitlements.

## Features

### 1. Employee Expense Management
- **Entitlements Management**: Set up monthly allowances, caps, and expense types for each employee
- **Expense Claims**: Submit expense claims with automatic calculation of claimable amounts
- **Expense Summary**: View comprehensive expense history and summaries


### 2. Reporting
- **Monthly Reports**: Generate expense reports for specific months
- **Summary Statistics**: View total receipts, claims, and breakdowns by expense type

## Database Schema

### Expense Entitlements Table (`expense_entitlements`)
- `id`: Primary key (e.g., "ENT001")
- `employee_id`: Foreign key to employees table
- `expense_type`: Type of expense (e.g., "Gas", "Mobile", "Meals")
- `entitlement_amount`: Monthly allowance amount
- `unit`: Entitlement unit ("monthly", "No Cap", "Actual")
- `start_date`: Entitlement start date
- `end_date`: Entitlement end date
- `is_active`: Whether entitlement is active ("Yes"/"No")

### Expense Claims Table (`expense_claims`)
- `id`: Primary key (e.g., "CLM001")
- `employee_id`: Foreign key to employees table
- `paid_date`: Date when expense was paid
- `expense_type`: Type of expense
- `receipts_amount`: Actual amount from receipts
- `claims_amount`: Amount claimed (may be capped)
- `paid_status`: Status ("Pending", "PP2", "PP4", etc.)
- `notes`: Additional notes

## File Structure

### Models
- `app/models/expense_entitlement.py` - Expense entitlement model
- `app/models/expense_claim.py` - Expense claim model
- `app/models/employee.py` - Updated with expense relationships

### Repositories
- `app/repos/expense_entitlement_repo.py` - Data access for entitlements
- `app/repos/expense_claim_repo.py` - Data access for claims

### Services
- `app/services/expense_service.py` - Business logic for expense management

### UI
- `app/ui/pages/expense_reimbursement.py` - Main expense management interface

### Scripts
- `scripts/migrate_add_expense_tables.py` - Database migration script
- `scripts/import_expense_data.py` - Import data from Excel file

## Installation & Setup

### 1. Create Database Tables
```bash
python scripts/migrate_add_expense_tables.py
```

### 2. Import Existing Data (Optional)
```bash
python scripts/import_expense_data.py
```

### 3. Update User Permissions
Add the `expense:manage` permission to appropriate user roles to access the expense reimbursement page.

## Usage Guide

### For Employees

1. **View Entitlements**: Check your expense entitlements and monthly allowances
2. **Submit Claims**: Submit expense claims with receipts
3. **Track Status**: Monitor claim approval status
4. **View History**: Review past claims and summaries

### For Managers

1. **Set Entitlements**: Configure employee expense entitlements
2. **Generate Reports**: Create monthly expense reports
3. **Monitor Activity**: Track expense patterns and compliance

## Expense Types

The system supports three specific expense types:
- **Gas**: Transportation fuel expenses
- **Mobile**: Mobile phone and communication expenses
- **Boots**: Safety boots and work footwear expenses

## Entitlement Units

- **monthly**: Fixed monthly allowance (e.g., $200/month)
- **No Cap**: No limit on claimable amount
- **Actual**: Claim actual amount spent (no cap)

## Business Logic

### Claim Calculation
The system automatically calculates claimable amounts based on:
1. Employee's entitlement for the expense type
2. Entitlement unit (monthly cap, no cap, actual)
3. Receipt amount provided

### Claim Workflow
1. Employee submits claim
2. Claim status is set to "Pending"
3. System automatically calculates claimable amount based on entitlements

## Integration with Existing System

The expense reimbursement system integrates seamlessly with:
- **Employee Management**: Uses existing employee records
- **Company Filtering**: Respects global company filter
- **User Authentication**: Uses existing user system
- **Audit Logging**: All actions are logged for audit purposes
- **Permission System**: Uses existing permission framework

## Security Features

- **Permission-based Access**: Only users with `expense:manage` permission can access
- **Company Filtering**: Respects company-based data isolation
- **Audit Trail**: All actions are logged with user information
- **Data Validation**: Input validation and error handling

## Future Enhancements

Potential future improvements could include:
- Email notifications for claim status changes
- Receipt image upload functionality
- Advanced reporting and analytics
- Integration with accounting systems
- Mobile-responsive interface
- Bulk claim submission
- Recurring expense templates

## Troubleshooting

### Common Issues

1. **Permission Denied**: Ensure user has `expense:manage` permission
2. **Employee Not Found**: Verify employee exists in the system
3. **Import Errors**: Check Excel file format and data integrity
4. **Database Errors**: Ensure tables are created properly

### Support

For technical support or questions about the expense reimbursement system, refer to the application logs and audit trail for detailed error information.
