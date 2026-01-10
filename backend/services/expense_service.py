from __future__ import annotations
from datetime import date, datetime
from typing import List, Dict, Optional, Tuple
from decimal import Decimal

from repos.expense_entitlement_repo import (
    get_entitlements_by_employee,
    get_entitlement_by_employee_and_type,
    create_entitlement,
    update_entitlement,
    deactivate_entitlement,
    get_all_entitlements
)
from repos.expense_claim_repo import (
    get_claims_by_employee,
    get_claims_by_employee_and_type,
    create_claim,
    update_claim,
    delete_claim,
    get_claims_by_date_range,
    get_claim_summary_by_employee
)
from repos.employee_repo import get_employee


class ExpenseService:
    """Service class for expense management business logic"""
    
    @staticmethod
    def get_employee_entitlements(employee_id: str) -> List[Dict]:
        """Get all entitlements for an employee with formatted data"""
        entitlements = get_entitlements_by_employee(employee_id)
        return [
            {
                "id": ent.id,
                "expense_type": ent.expense_type,
                "entitlement_amount": ent.entitlement_amount,
                "unit": ent.unit,
                "start_date": ent.start_date,
                "end_date": ent.end_date,
                "is_active": ent.is_active,
                "rollover": ent.rollover,
            }
            for ent in entitlements
        ]
    
    @staticmethod
    def get_employee_claims(employee_id: str, limit: int = None) -> List[Dict]:
        """Get claims for an employee with formatted data"""
        claims = get_claims_by_employee(employee_id, limit)
        return [
            {
                "id": claim.id,
                "paid_date": claim.paid_date,
                "expense_type": claim.expense_type,
                "receipts_amount": claim.receipts_amount,
                "claims_amount": claim.claims_amount,
                "notes": claim.notes,
                "supporting_document_path": claim.supporting_document_path,
                "document_path": claim.document_path,
                "document_filename": claim.document_filename,
            }
            for claim in claims
        ]
    
    @staticmethod
    def calculate_claimable_amount(employee_id: str, expense_type: str, receipts_amount: float) -> Tuple[float, str]:
        """Calculate the claimable amount based on entitlements and return message"""
        entitlement = get_entitlement_by_employee_and_type(employee_id, expense_type)
        
        if not entitlement:
            return 0.0, "No entitlement found for this expense type"
        
        if entitlement.unit == "No Cap":
            return receipts_amount, "Claim recorded for full amount (No Cap)"
        elif entitlement.unit == "Actual":
            return receipts_amount, "Claim recorded for actual amount"
        elif entitlement.unit == "monthly" and entitlement.entitlement_amount:
            # For monthly, check if we can make another claim this year (max 12 claims)
            from datetime import date
            today = date.today()
            existing_claims = ExpenseService._get_existing_claims_for_period(
                employee_id, expense_type, "yearly", today
            )
            
            # Check if we've already made 12 claims this year
            if len(existing_claims) >= 12:
                return 0.0, f"Maximum of 12 monthly claims per year reached. You have already made {len(existing_claims)} claims this year."
            
            # Cap each individual claim at the monthly entitlement amount
            if receipts_amount <= entitlement.entitlement_amount:
                return receipts_amount, f"Claim recorded for full amount (Claim {len(existing_claims) + 1}/12)"
            else:
                return entitlement.entitlement_amount, f"Claim amount ({receipts_amount:.2f}) exceeds monthly entitlement. Only {entitlement.entitlement_amount:.2f} will be claimed (Claim {len(existing_claims) + 1}/12)."
        elif entitlement.unit == "yearly" and entitlement.entitlement_amount:
            # For yearly, check against existing claims in the current year with rollover support
            from datetime import date
            today = date.today()
            existing_claims = ExpenseService._get_existing_claims_for_period(
                employee_id, expense_type, "yearly", today
            )
            total_already_claimed = sum(claim.claims_amount for claim in existing_claims)
            
            # Calculate available entitlement (including rollover if applicable)
            available_entitlement = ExpenseService._calculate_available_yearly_entitlement(
                employee_id, expense_type, entitlement, today
            )
            
            if receipts_amount <= available_entitlement:
                return receipts_amount, "Claim recorded for full amount"
            else:
                return available_entitlement, f"Claim amount ({receipts_amount:.2f}) exceeds yearly entitlement. Only {available_entitlement:.2f} will be claimed."
        else:
            return 0.0, "No valid entitlement configuration found"
    
    @staticmethod
    def validate_claim_against_entitlements(employee_id: str, expense_type: str, receipts_amount: float) -> Dict:
        """Validate a claim against entitlements and return validation result"""
        entitlement = get_entitlement_by_employee_and_type(employee_id, expense_type)
        
        if not entitlement:
            return {
                "valid": False,
                "message": f"No entitlement found for expense type '{expense_type}'. Please contact HR to set up entitlements.",
                "claimable_amount": 0.0
            }
        
        if not entitlement.is_active:
            return {
                "valid": False,
                "message": f"Entitlement for '{expense_type}' is not active. Please contact HR.",
                "claimable_amount": 0.0
            }
        
        # Check if entitlement is within date range
        from datetime import date
        today = date.today()
        if entitlement.start_date and entitlement.start_date > today:
            return {
                "valid": False,
                "message": f"Entitlement for '{expense_type}' starts on {entitlement.start_date}. Cannot claim before this date.",
                "claimable_amount": 0.0
            }
        
        if entitlement.end_date and entitlement.end_date < today:
            return {
                "valid": False,
                "message": f"Entitlement for '{expense_type}' expired on {entitlement.end_date}. Cannot claim after this date.",
                "claimable_amount": 0.0
            }
        
        # Calculate claimable amount and message
        claimable_amount, message = ExpenseService.calculate_claimable_amount(employee_id, expense_type, receipts_amount)
        
        # Additional validation for monthly entitlements - check claim count
        if entitlement.unit == "monthly" and entitlement.entitlement_amount:
            from datetime import date
            today = date.today()
            existing_claims = ExpenseService._get_existing_claims_for_period(
                employee_id, expense_type, "yearly", today
            )
            
            if len(existing_claims) >= 12:
                return {
                    "valid": False,
                    "message": f"Maximum of 12 monthly claims per year reached. You have already made {len(existing_claims)} claims this year.",
                    "claimable_amount": 0.0
                }
        
        return {
            "valid": True,
            "message": message,
            "claimable_amount": claimable_amount
        }
    
    @staticmethod
    def _calculate_available_yearly_entitlement(employee_id: str, expense_type: str, entitlement, as_of_date: date) -> float:
        """Calculate available yearly entitlement including rollover from previous year"""
        if entitlement.unit != "yearly" or not entitlement.entitlement_amount:
            return 0.0
        
        # Get current year's claims
        current_year_claims = ExpenseService._get_existing_claims_for_period(
            employee_id, expense_type, "yearly", as_of_date
        )
        current_year_claimed = sum(claim.claims_amount for claim in current_year_claims)
        
        # Base entitlement for current year
        available_entitlement = entitlement.entitlement_amount - current_year_claimed
        
        # Add rollover from previous year if enabled
        if entitlement.rollover == "Yes":
            previous_year_rollover = ExpenseService._calculate_previous_year_rollover(
                employee_id, expense_type, entitlement, as_of_date
            )
            available_entitlement += previous_year_rollover
        
        return max(0, available_entitlement)
    
    @staticmethod
    def _calculate_previous_year_rollover(employee_id: str, expense_type: str, entitlement, as_of_date: date) -> float:
        """Calculate rollover amount from previous year"""
        if entitlement.rollover != "Yes":
            return 0.0
        
        # Only calculate rollover if we're in a year after the entitlement was created
        if entitlement.start_date and as_of_date.year <= entitlement.start_date.year:
            return 0.0
        
        # Calculate previous year's period
        prev_year = as_of_date.year - 1
        prev_year_start = date(prev_year, 1, 1)
        prev_year_end = date(prev_year, 12, 31)
        
        # Get previous year's claims
        from repos.expense_claim_repo import get_claims_by_date_range
        prev_year_claims = get_claims_by_date_range(prev_year_start, prev_year_end)
        
        # Filter claims for this employee and expense type
        prev_year_employee_claims = [
            claim for claim in prev_year_claims 
            if claim.employee_id == employee_id and claim.expense_type == expense_type
        ]
        
        prev_year_claimed = sum(claim.claims_amount for claim in prev_year_employee_claims)
        rollover_amount = max(0, entitlement.entitlement_amount - prev_year_claimed)
        
        return rollover_amount

    @staticmethod
    def submit_expense_claim(
        employee_id: str,
        paid_date: date,
        expense_type: str,
        receipts_amount: float,
        notes: str = None,
        supporting_document_path: str = None,
        document_path: str = None,
        document_filename: str = None,
        override_approval: bool = False,
        performed_by: str = None
    ) -> Dict:
        """Submit a new expense claim with validation"""
        # Validate against entitlements first
        validation = ExpenseService.validate_claim_against_entitlements(
            employee_id, expense_type, receipts_amount
        )
        
        # Block submission for any validation errors (entitlement must exist and be active)
        if not validation["valid"]:
            raise ValueError(validation["message"])
        
        # Determine the claims amount
        if override_approval:
            # Use full receipts amount when override is approved
            claims_amount = receipts_amount
            message = f"Claim approved for full amount: ${receipts_amount:.2f} (override approval used)"
        else:
            # Use the validated claimable amount
            claims_amount = validation["claimable_amount"]
            message = validation["message"]
        
        # Create the claim with receipts_amount as the original amount and claims_amount as the claimable amount
        claim = create_claim(
            employee_id=employee_id,
            paid_date=paid_date,
            expense_type=expense_type,
            receipts_amount=receipts_amount,  # Original amount from receipts
            claims_amount=claims_amount,      # Amount actually claimed (may be less than receipts)
            notes=notes,
            supporting_document_path=supporting_document_path,
            document_path=document_path,
            document_filename=document_filename,
            performed_by=performed_by
        )
        
        return {
            "id": claim.id,
            "paid_date": claim.paid_date,
            "expense_type": claim.expense_type,
            "receipts_amount": claim.receipts_amount,
            "claims_amount": claim.claims_amount,
            "notes": claim.notes,
            "supporting_document_path": claim.supporting_document_path,
            "document_path": claim.document_path,
            "document_filename": claim.document_filename,
            "message": message
        }
    
    
    @staticmethod
    def get_expense_summary(employee_id: str, start_date: date = None, end_date: date = None) -> Dict:
        """Get comprehensive expense summary for an employee"""
        employee = get_employee(employee_id)
        if not employee:
            return {"error": "Employee not found"}
        
        # Get entitlements
        entitlements = ExpenseService.get_employee_entitlements(employee_id)
        
        # Get claim summary
        claim_summary = get_claim_summary_by_employee(employee_id, start_date, end_date)
        
        # Get recent claims
        recent_claims = ExpenseService.get_employee_claims(employee_id, limit=10)
        
        return {
            "employee": {
                "id": employee.id,
                "name": employee.full_name,
            },
            "entitlements": entitlements,
            "claim_summary": claim_summary,
            "recent_claims": recent_claims,
        }
    
    @staticmethod
    def get_expense_types() -> List[str]:
        """Get all unique expense types from entitlements"""
        entitlements = get_all_entitlements()
        return sorted(list(set(ent.expense_type for ent in entitlements)))
    
    @staticmethod
    def create_entitlement_for_employee(
        employee_id: str,
        expense_type: str,
        entitlement_amount: float = None,
        unit: str = "monthly",
        start_date: date = None,
        end_date: date = None,
        rollover: str = "No",
        performed_by: str = None
    ) -> Dict:
        """Create an entitlement for an employee"""
        entitlement = create_entitlement(
            employee_id=employee_id,
            expense_type=expense_type,
            entitlement_amount=entitlement_amount,
            unit=unit,
            start_date=start_date,
            end_date=end_date,
            rollover=rollover,
            performed_by=performed_by
        )
        
        return {
            "id": entitlement.id,
            "employee_id": entitlement.employee_id,
            "expense_type": entitlement.expense_type,
            "entitlement_amount": entitlement.entitlement_amount,
            "unit": entitlement.unit,
            "start_date": entitlement.start_date,
            "end_date": entitlement.end_date,
            "rollover": entitlement.rollover,
        }
    
    @staticmethod
    def get_monthly_expense_report(month: int, year: int) -> List[Dict]:
        """Get expense report for a specific month"""
        start_date = date(year, month, 1)
        if month == 12:
            end_date = date(year + 1, 1, 1)
        else:
            end_date = date(year, month + 1, 1)
        
        claims = get_claims_by_date_range(start_date, end_date)
        result = []
        
        for claim in claims:
            employee = get_employee(claim.employee_id)
            result.append({
                "id": claim.id,
                "employee_id": claim.employee_id,
                "employee_name": employee.full_name if employee else "Unknown",
                "paid_date": claim.paid_date,
                "expense_type": claim.expense_type,
                "receipts_amount": claim.receipts_amount,
                "claims_amount": claim.claims_amount,
            })
        
        return result
    
    @staticmethod
    def get_yearly_expense_report(year: int) -> Dict:
        """Get comprehensive yearly expense report"""
        start_date = date(year, 1, 1)
        end_date = date(year, 12, 31)
        
        # Get all claims for the year
        claims = get_claims_by_date_range(start_date, end_date)
        
        if not claims:
            return None
        
        # Prepare detailed claims data
        detailed_claims = []
        employee_totals = {}
        expense_type_totals = {}
        monthly_totals = {i: {'total_receipts': 0, 'total_claimed': 0, 'total_claims': 0} for i in range(1, 13)}
        
        for claim in claims:
            employee = get_employee(claim.employee_id)
            employee_name = employee.full_name if employee else "Unknown"
            
            # Detailed claims
            claim_data = {
                "id": claim.id,
                "employee_id": claim.employee_id,
                "employee_name": employee_name,
                "paid_date": claim.paid_date,
                "expense_type": claim.expense_type,
                "receipts_amount": claim.receipts_amount,
                "claims_amount": claim.claims_amount,
            }
            detailed_claims.append(claim_data)
            
            # Employee totals
            if claim.employee_id not in employee_totals:
                employee_totals[claim.employee_id] = {
                    'employee_name': employee_name,
                    'total_receipts': 0,
                    'total_claimed': 0,
                    'total_claims': 0
                }
            
            employee_totals[claim.employee_id]['total_receipts'] += claim.receipts_amount
            employee_totals[claim.employee_id]['total_claimed'] += claim.claims_amount
            employee_totals[claim.employee_id]['total_claims'] += 1
            
            # Expense type totals
            if claim.expense_type not in expense_type_totals:
                expense_type_totals[claim.expense_type] = {
                    'total_receipts': 0,
                    'total_claimed': 0,
                    'total_claims': 0
                }
            
            expense_type_totals[claim.expense_type]['total_receipts'] += claim.receipts_amount
            expense_type_totals[claim.expense_type]['total_claimed'] += claim.claims_amount
            expense_type_totals[claim.expense_type]['total_claims'] += 1
            
            # Monthly totals
            month = claim.paid_date.month
            monthly_totals[month]['total_receipts'] += claim.receipts_amount
            monthly_totals[month]['total_claimed'] += claim.claims_amount
            monthly_totals[month]['total_claims'] += 1
        
        # Calculate summary
        total_claims = len(claims)
        total_receipts = sum(claim.receipts_amount for claim in claims)
        total_claimed = sum(claim.claims_amount for claim in claims)
        total_employees = len(employee_totals)
        
        # Calculate averages for expense types
        for exp_type, data in expense_type_totals.items():
            data['average_per_claim'] = data['total_claimed'] / data['total_claims'] if data['total_claims'] > 0 else 0
        
        # Sort employees by total claims
        top_employees = []
        for employee_id, data in employee_totals.items():
            data['employee_id'] = employee_id
            top_employees.append(data)
        
        top_employees = sorted(
            top_employees,
            key=lambda x: x['total_claims'],
            reverse=True
        )[:10]  # Top 10 employees
        
        # Prepare monthly breakdown data
        monthly_breakdown = []
        for month in range(1, 13):
            monthly_breakdown.append({
                'month': month,
                'total_receipts': monthly_totals[month]['total_receipts'],
                'total_claimed': monthly_totals[month]['total_claimed'],
                'total_claims': monthly_totals[month]['total_claims']
            })
        
        return {
            'summary': {
                'total_claims': total_claims,
                'total_receipts': total_receipts,
                'total_claimed': total_claimed,
                'total_employees': total_employees
            },
            'monthly_breakdown': monthly_breakdown,
            'expense_type_breakdown': expense_type_totals,
            'top_employees': top_employees,
            'detailed_claims': detailed_claims
        }
    
    @staticmethod
    def delete_expense_claim(claim_id: str, performed_by: str = None) -> bool:
        """Delete an expense claim"""
        return delete_claim(claim_id, performed_by=performed_by)
    
    @staticmethod
    def update_entitlement_for_employee(
        entitlement_id: str,
        expense_type: str = None,
        entitlement_amount: float = None,
        unit: str = None,
        start_date: date = None,
        end_date: date = None,
        rollover: str = None,
        performed_by: str = None
    ) -> Dict:
        """Update an entitlement for an employee"""
        from repos.expense_entitlement_repo import update_entitlement
        
        # Prepare update data
        update_data = {}
        if expense_type is not None:
            update_data['expense_type'] = expense_type
        if entitlement_amount is not None:
            update_data['entitlement_amount'] = entitlement_amount
        if unit is not None:
            update_data['unit'] = unit
        if start_date is not None:
            update_data['start_date'] = start_date
        # Always include end_date, even if None (to clear it)
        update_data['end_date'] = end_date
        if rollover is not None:
            update_data['rollover'] = rollover
        
        entitlement = update_entitlement(
            entitlement_id=entitlement_id,
            performed_by=performed_by,
            **update_data
        )
        
        if not entitlement:
            return None
        
        return {
            "id": entitlement.id,
            "employee_id": entitlement.employee_id,
            "expense_type": entitlement.expense_type,
            "entitlement_amount": entitlement.entitlement_amount,
            "unit": entitlement.unit,
            "start_date": entitlement.start_date,
            "end_date": entitlement.end_date,
            "rollover": entitlement.rollover,
        }
    
    @staticmethod
    def delete_expense_entitlement(entitlement_id: str, performed_by: str = None) -> bool:
        """Delete an expense entitlement"""
        from repos.expense_entitlement_repo import deactivate_entitlement
        return deactivate_entitlement(entitlement_id, performed_by=performed_by)
    
    @staticmethod
    def _get_existing_claims_for_period(employee_id: str, expense_type: str, unit: str, as_of_date: date) -> List:
        """Get existing claims for a specific period (monthly or yearly)"""
        from repos.expense_claim_repo import get_claims_by_employee_and_type
        
        # Get all claims for this employee and expense type
        all_claims = get_claims_by_employee_and_type(employee_id, expense_type)
        
        if unit == "monthly":
            # Filter claims for the current month
            start_of_month = as_of_date.replace(day=1)
            if as_of_date.month == 12:
                end_of_month = as_of_date.replace(year=as_of_date.year + 1, month=1, day=1)
            else:
                end_of_month = as_of_date.replace(month=as_of_date.month + 1, day=1)
            
            return [
                claim for claim in all_claims
                if start_of_month <= claim.paid_date < end_of_month
            ]
        
        elif unit == "yearly":
            # Filter claims for the current year
            start_of_year = as_of_date.replace(month=1, day=1)
            end_of_year = as_of_date.replace(month=12, day=31)
            
            return [
                claim for claim in all_claims
                if start_of_year <= claim.paid_date <= end_of_year
            ]
        
        return []
