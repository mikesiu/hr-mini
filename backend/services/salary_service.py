"""
Salary Service - Business logic layer for salary management
"""

from typing import List, Optional, Dict, Any
from datetime import date, datetime
from decimal import Decimal

from repos.salary_history_repo import (
    create_salary_record,
    get_salary_history_by_employee,
    get_current_salary,
    get_salary_history_with_details,
    update_salary_record,
    delete_salary_record,
    get_salary_progression_report,
    search_salary_records,
    validate_salary_date_against_employment
)
from repos.employee_repo import get_employee
from repos.employment_repo import get_current_employment
from models.salary_history import SalaryHistory


class SalaryService:
    """Service class for salary management business logic"""
    
    @staticmethod
    def create_salary_history(
        employee_id: str,
        pay_rate: float,
        pay_type: str,
        effective_date: date,
        end_date: Optional[date] = None,
        notes: Optional[str] = None,
        performed_by: Optional[str] = None
    ) -> SalaryHistory:
        """
        Create a new salary history record with business logic validation
        """
        # Validate pay type
        valid_pay_types = ['Hourly', 'Monthly', 'Annual']
        if pay_type not in valid_pay_types:
            raise ValueError(f"Invalid pay type. Must be one of: {', '.join(valid_pay_types)}")
        
        # Validate pay rate
        if pay_rate <= 0:
            raise ValueError("Pay rate must be greater than 0")
        
        # Validate effective date
        if effective_date > date.today():
            raise ValueError("Effective date cannot be in the future")
        
        # Validate end date if provided
        if end_date and end_date <= effective_date:
            raise ValueError("End date must be after effective date")
        
        # Check if employee exists
        employee = get_employee(employee_id)
        if not employee:
            raise ValueError("Employee not found")
        
        # Check if employee has current employment
        current_employment = get_current_employment(employee_id)
        if not current_employment:
            raise ValueError("Employee must have an active employment record to set salary")
        
        return create_salary_record(
            employee_id=employee_id,
            pay_rate=pay_rate,
            pay_type=pay_type,
            effective_date=effective_date,
            end_date=end_date,
            notes=notes,
            performed_by=performed_by
        )
    
    @staticmethod
    def get_employee_salary_history(employee_id: str) -> List[Dict[str, Any]]:
        """
        Get salary history for an employee with additional business logic
        """
        # Verify employee exists
        employee = get_employee(employee_id)
        if not employee:
            raise ValueError("Employee not found")
        
        salary_records = get_salary_history_by_employee(employee_id)
        
        # Convert to dictionary format with additional calculated fields
        result = []
        for record in salary_records:
            record_dict = {
                'id': record.id,
                'employee_id': record.employee_id,
                'pay_rate': float(record.pay_rate),
                'pay_type': record.pay_type,
                'effective_date': record.effective_date,
                'end_date': record.end_date,
                'notes': record.notes,
                'created_at': record.created_at,
                'updated_at': record.updated_at,
                'is_current': record.end_date is None,
                'duration_days': None
            }
            
            # Calculate duration if end_date exists
            if record.end_date:
                duration = record.end_date - record.effective_date
                record_dict['duration_days'] = duration.days
            
            result.append(record_dict)
        
        return result
    
    @staticmethod
    def get_current_employee_salary(employee_id: str) -> Optional[Dict[str, Any]]:
        """
        Get current salary for an employee
        """
        salary_record = get_current_salary(employee_id)
        if not salary_record:
            return None
        
        return {
            'id': salary_record.id,
            'employee_id': salary_record.employee_id,
            'pay_rate': float(salary_record.pay_rate),
            'pay_type': salary_record.pay_type,
            'effective_date': salary_record.effective_date,
            'end_date': salary_record.end_date,
            'notes': salary_record.notes,
            'created_at': salary_record.created_at,
            'updated_at': salary_record.updated_at
        }
    
    @staticmethod
    def update_salary_history(
        salary_id: int,
        pay_rate: Optional[float] = None,
        pay_type: Optional[str] = None,
        effective_date: Optional[date] = None,
        end_date: Optional[date] = None,
        notes: Optional[str] = None,
        performed_by: Optional[str] = None
    ) -> Optional[SalaryHistory]:
        """
        Update salary history record with business logic validation
        """
        # Validate pay type if provided
        if pay_type:
            valid_pay_types = ['Hourly', 'Monthly', 'Annual']
            if pay_type not in valid_pay_types:
                raise ValueError(f"Invalid pay type. Must be one of: {', '.join(valid_pay_types)}")
        
        # Validate pay rate if provided
        if pay_rate is not None and pay_rate <= 0:
            raise ValueError("Pay rate must be greater than 0")
        
        # Validate effective date if provided
        if effective_date and effective_date > date.today():
            raise ValueError("Effective date cannot be in the future")
        
        # Validate end date if provided
        if end_date and effective_date and end_date <= effective_date:
            raise ValueError("End date must be after effective date")
        
        return update_salary_record(
            salary_id=salary_id,
            pay_rate=pay_rate,
            pay_type=pay_type,
            effective_date=effective_date,
            end_date=end_date,
            notes=notes,
            performed_by=performed_by
        )
    
    @staticmethod
    def delete_salary_history(salary_id: int, performed_by: Optional[str] = None) -> bool:
        """
        Delete salary history record
        """
        return delete_salary_record(salary_id=salary_id, performed_by=performed_by)
    
    @staticmethod
    def get_salary_progression_analysis(employee_id: str) -> Dict[str, Any]:
        """
        Get comprehensive salary progression analysis for an employee
        """
        progression = get_salary_progression_report(employee_id)
        
        if not progression:
            return {
                'employee_id': employee_id,
                'total_records': 0,
                'current_salary': None,
                'salary_changes': [],
                'total_increase': 0,
                'average_increase_per_change': 0,
                'longest_period': None,
                'shortest_period': None
            }
        
        # Calculate analysis
        current_salary = None
        salary_changes = []
        total_increase = 0
        periods = []
        
        for i, record in enumerate(progression):
            if record['end_date'] is None:
                current_salary = record
            
            if i > 0:
                prev_record = progression[i-1]
                change_amount = record['pay_rate'] - prev_record['pay_rate']
                change_percentage = (change_amount / prev_record['pay_rate']) * 100
                
                salary_changes.append({
                    'from_rate': prev_record['pay_rate'],
                    'to_rate': record['pay_rate'],
                    'change_amount': change_amount,
                    'change_percentage': change_percentage,
                    'effective_date': record['effective_date'],
                    'from_date': prev_record['effective_date']
                })
                
                total_increase += change_amount
            
            # Calculate period duration
            if record['end_date']:
                period_days = (record['end_date'] - record['effective_date']).days
            else:
                period_days = (date.today() - record['effective_date']).days
            
            periods.append(period_days)
        
        # Calculate averages
        average_increase = total_increase / len(salary_changes) if salary_changes else 0
        
        return {
            'employee_id': employee_id,
            'total_records': len(progression),
            'current_salary': current_salary,
            'salary_changes': salary_changes,
            'total_increase': total_increase,
            'average_increase_per_change': average_increase,
            'longest_period': max(periods) if periods else None,
            'shortest_period': min(periods) if periods else None,
            'progression': progression
        }
    
    @staticmethod
    def search_salary_records_with_analysis(
        search_term: str = "",
        company_id: Optional[str] = None
    ) -> List[Dict[str, Any]]:
        """
        Search salary records with additional analysis data
        """
        results = search_salary_records(search_term)
        
        # Filter by company if specified
        if company_id:
            filtered_results = []
            for result in results:
                current_employment = get_current_employment(result['salary'].employee_id)
                if current_employment and current_employment.company_id == company_id:
                    filtered_results.append(result)
            results = filtered_results
        
        # Add analysis data to each result
        enhanced_results = []
        for result in results:
            salary = result['salary']
            employee = result['employee']
            
            # Get current salary for comparison
            current_salary = get_current_salary(salary.employee_id)
            is_current = current_salary and current_salary.id == salary.id
            
            enhanced_result = {
                'salary': {
                    'id': salary.id,
                    'employee_id': salary.employee_id,
                    'pay_rate': float(salary.pay_rate),
                    'pay_type': salary.pay_type,
                    'effective_date': salary.effective_date,
                    'end_date': salary.end_date,
                    'notes': salary.notes,
                    'created_at': salary.created_at,
                    'updated_at': salary.updated_at,
                    'is_current': is_current
                },
                'employee': employee
            }
            
            enhanced_results.append(enhanced_result)
        
        return enhanced_results
    
    @staticmethod
    def validate_salary_change(
        employee_id: str,
        new_pay_rate: float,
        effective_date: date
    ) -> Dict[str, Any]:
        """
        Validate a proposed salary change
        """
        validation_result = {
            'is_valid': True,
            'warnings': [],
            'errors': []
        }
        
        # Check if employee exists
        employee = get_employee(employee_id)
        if not employee:
            validation_result['is_valid'] = False
            validation_result['errors'].append("Employee not found")
            return validation_result
        
        # Check if employee has current employment
        current_employment = get_current_employment(employee_id)
        if not current_employment:
            validation_result['is_valid'] = False
            validation_result['errors'].append("Employee must have an active employment record")
            return validation_result
        
        # Validate effective date against employment
        if not validate_salary_date_against_employment(employee_id, effective_date):
            validation_result['is_valid'] = False
            validation_result['errors'].append("Effective date cannot be before employee's hire/seniority date")
            return validation_result
        
        # Check for future effective date
        if effective_date > date.today():
            validation_result['warnings'].append("Effective date is in the future")
        
        # Get current salary for comparison
        current_salary = get_current_salary(employee_id)
        if current_salary:
            current_rate = float(current_salary.pay_rate)
            change_amount = new_pay_rate - current_rate
            change_percentage = (change_amount / current_rate) * 100
            
            validation_result['current_salary'] = {
                'pay_rate': current_rate,
                'pay_type': current_salary.pay_type,
                'effective_date': current_salary.effective_date
            }
            validation_result['proposed_change'] = {
                'new_pay_rate': new_pay_rate,
                'change_amount': change_amount,
                'change_percentage': change_percentage
            }
            
            # Add warnings for significant changes
            if abs(change_percentage) > 20:
                validation_result['warnings'].append(f"Large salary change: {change_percentage:.1f}%")
            
            if change_amount < 0:
                validation_result['warnings'].append("This is a salary decrease")
        
        return validation_result
