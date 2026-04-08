-- =========================================================
-- Script to update Employee ID from PR90 to PR91
-- Employee: Bikramjit Singh
-- Date: 2026-01-06
-- =========================================================

-- Start transaction to ensure atomicity
START TRANSACTION;

-- Step 1: Verify that PR90 exists
SELECT @count_pr90 := COUNT(*) FROM employees WHERE id = 'PR90';

-- Step 2: Verify that PR91 doesn't already exist
SELECT @count_pr91 := COUNT(*) FROM employees WHERE id = 'PR91';

-- Step 3: Display verification info
SELECT 
    @count_pr90 as 'PR90_exists',
    @count_pr91 as 'PR91_exists',
    CASE 
        WHEN @count_pr90 = 0 THEN 'ERROR: PR90 not found in employees table'
        WHEN @count_pr91 > 0 THEN 'ERROR: PR91 already exists in employees table'
        ELSE 'OK: Ready to proceed with update'
    END as 'validation_status';

-- Only proceed if validation passes
-- If PR90 doesn't exist or PR91 already exists, the updates below won't find records to update

-- Step 4: Update all child tables (foreign key references)
-- Order doesn't strictly matter since we're updating FKs to a new value that doesn't exist yet,
-- but we do it systematically

-- Update attendance records
UPDATE attendance 
SET employee_id = 'PR91' 
WHERE employee_id = 'PR90';

SELECT ROW_COUNT() as 'attendance_records_updated';

-- Update employment records
UPDATE employment 
SET employee_id = 'PR91' 
WHERE employee_id = 'PR90';

SELECT ROW_COUNT() as 'employment_records_updated';

-- Update termination records
UPDATE terminations 
SET employee_id = 'PR91' 
WHERE employee_id = 'PR90';

SELECT ROW_COUNT() as 'termination_records_updated';

-- Update work permit records
UPDATE work_permits 
SET employee_id = 'PR91' 
WHERE employee_id = 'PR90';

SELECT ROW_COUNT() as 'work_permit_records_updated';

-- Update employee documents
UPDATE employee_documents 
SET employee_id = 'PR91' 
WHERE employee_id = 'PR90';

SELECT ROW_COUNT() as 'employee_document_records_updated';

-- Update expense claims
UPDATE expense_claims 
SET employee_id = 'PR91' 
WHERE employee_id = 'PR90';

SELECT ROW_COUNT() as 'expense_claim_records_updated';

-- Update expense entitlements
UPDATE expense_entitlements 
SET employee_id = 'PR91' 
WHERE employee_id = 'PR90';

SELECT ROW_COUNT() as 'expense_entitlement_records_updated';

-- Update salary history
UPDATE salary_history 
SET employee_id = 'PR91' 
WHERE employee_id = 'PR90';

SELECT ROW_COUNT() as 'salary_history_records_updated';

-- Update leave records
UPDATE `leave` 
SET employee_id = 'PR91' 
WHERE employee_id = 'PR90';

SELECT ROW_COUNT() as 'leave_records_updated';

-- Update employee schedules
UPDATE employee_schedules 
SET employee_id = 'PR91' 
WHERE employee_id = 'PR90';

SELECT ROW_COUNT() as 'employee_schedule_records_updated';

-- Step 5: Finally, update the primary key in the employees table
UPDATE employees 
SET id = 'PR91' 
WHERE id = 'PR90';

SELECT ROW_COUNT() as 'employee_record_updated';

-- Step 6: Verify the update
SELECT 
    id,
    full_name,
    first_name,
    last_name,
    email,
    status
FROM employees 
WHERE id = 'PR91';

-- Step 7: Verify PR90 no longer exists
SELECT COUNT(*) as 'PR90_should_be_zero' FROM employees WHERE id = 'PR90';

-- If everything looks good, commit the transaction
-- If there were any errors, you can ROLLBACK instead
COMMIT;

SELECT 'Employee ID successfully updated from PR90 to PR91' as 'Status';
