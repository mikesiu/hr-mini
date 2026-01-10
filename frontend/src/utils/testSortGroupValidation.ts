/**
 * Test script for sort and group validation functionality
 * Demonstrates how the enhanced validation works
 */

import {
  validateSortGroupFields,
  getAvailableSortFields,
  getAvailableGroupFields,
  isSortFieldApplicable,
  isGroupFieldApplicable,
  getFieldDisplayName
} from './sortGroupValidation';

export function testSortGroupValidation() {
  console.log('Testing Sort & Group Validation System');
  console.log('='.repeat(50));
  
  // Test 1: Valid sort/group for employee directory
  console.log('\n1. Testing valid sort/group for Employee Directory:');
  const validEmployeeDir = validateSortGroupFields('employee_name', 'department', 'position', 'employee_directory');
  console.log(`   Valid: ${validEmployeeDir.isValid}`);
  console.log(`   Errors: ${validEmployeeDir.errors}`);
  console.log(`   Warnings: ${validEmployeeDir.warnings}`);
  console.log(`   Available sort fields: ${validEmployeeDir.availableSortFields.length}`);
  console.log(`   Available group fields: ${validEmployeeDir.availableGroupFields.length}`);
  
  // Test 2: Invalid sort/group for salary analysis
  console.log('\n2. Testing invalid sort/group for Salary Analysis:');
  const invalidSalary = validateSortGroupFields('leave_type', 'permit_type', 'expiry_status', 'salary_analysis');
  console.log(`   Valid: ${invalidSalary.isValid}`);
  console.log(`   Errors: ${invalidSalary.errors}`);
  console.log(`   Warnings: ${invalidSalary.warnings}`);
  
  // Test 3: Check field applicability
  console.log('\n3. Testing field applicability:');
  const testFields = ['employee_name', 'pay_rate', 'leave_type', 'permit_type'];
  const testReports = ['employee_directory', 'salary_analysis', 'leave_taken', 'work_permit_status'];
  
  testReports.forEach(report => {
    console.log(`   ${report}:`);
    testFields.forEach(field => {
      const sortApplicable = isSortFieldApplicable(field, report);
      const groupApplicable = isGroupFieldApplicable(field, report);
      console.log(`     ${field}: sort=${sortApplicable}, group=${groupApplicable}`);
    });
  });
  
  // Test 4: Available fields for different reports
  console.log('\n4. Testing available fields for different reports:');
  const reports = ['employee_directory', 'salary_analysis', 'leave_taken', 'work_permit_status'];
  reports.forEach(report => {
    const sortFields = getAvailableSortFields(report);
    const groupFields = getAvailableGroupFields(report);
    console.log(`   ${report}:`);
    console.log(`     Sort fields: ${sortFields.slice(0, 5).join(', ')}${sortFields.length > 5 ? '...' : ''} (${sortFields.length} total)`);
    console.log(`     Group fields: ${groupFields.slice(0, 5).join(', ')}${groupFields.length > 5 ? '...' : ''} (${groupFields.length} total)`);
  });
  
  // Test 5: Field display names
  console.log('\n5. Testing field display names:');
  const testFieldNames = ['employee_name', 'pay_rate', 'leave_type', 'permit_type', 'days_taken'];
  testFieldNames.forEach(field => {
    console.log(`   ${field} -> ${getFieldDisplayName(field)}`);
  });
  
  // Test 6: Logical validation
  console.log('\n6. Testing logical validation:');
  const logicalTest = validateSortGroupFields('employee_name', 'employee', 'employee', 'employee_directory');
  console.log(`   Same primary and secondary group: Valid=${logicalTest.isValid}`);
  console.log(`   Warnings: ${logicalTest.warnings}`);
  
  console.log('\nSort & Group validation tests completed!');
}

// Example usage scenarios
export function demonstrateReportSpecificValidation() {
  console.log('\nDemonstrating Report-Specific Validation:');
  console.log('='.repeat(50));
  
  const scenarios = [
    {
      name: 'Employee Directory Report',
      reportType: 'employee_directory',
      sortBy: 'employee_name',
      groupBy: 'department',
      groupBySecondary: 'position'
    },
    {
      name: 'Salary Analysis Report',
      reportType: 'salary_analysis',
      sortBy: 'pay_rate',
      groupBy: 'pay_type',
      groupBySecondary: 'company'
    },
    {
      name: 'Leave Taken Report',
      reportType: 'leave_taken',
      sortBy: 'days_taken',
      groupBy: 'leave_type',
      groupBySecondary: 'employee'
    },
    {
      name: 'Work Permit Report',
      reportType: 'work_permit_status',
      sortBy: 'expiry_date',
      groupBy: 'permit_type',
      groupBySecondary: 'company'
    },
    {
      name: 'Invalid: Salary Report with Leave Fields',
      reportType: 'salary_analysis',
      sortBy: 'leave_type',
      groupBy: 'leave_status',
      groupBySecondary: 'permit_type'
    }
  ];
  
  scenarios.forEach(scenario => {
    console.log(`\n${scenario.name}:`);
    const result = validateSortGroupFields(
      scenario.sortBy,
      scenario.groupBy,
      scenario.groupBySecondary,
      scenario.reportType
    );
    console.log(`  Valid: ${result.isValid}`);
    if (result.errors.length > 0) {
      console.log(`  Errors: ${result.errors.join(', ')}`);
    }
    if (result.warnings.length > 0) {
      console.log(`  Warnings: ${result.warnings.join(', ')}`);
    }
  });
}
