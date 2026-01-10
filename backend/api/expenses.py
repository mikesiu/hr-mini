from fastapi import APIRouter, Depends, HTTPException, Query
from typing import List, Optional
from datetime import date
from pydantic import BaseModel
from api.dependencies import get_current_user, require_permission
from services.expense_service import ExpenseService

router = APIRouter()

# Pydantic models for request/response
class ExpenseClaimCreate(BaseModel):
    employee_id: str
    paid_date: date
    expense_type: str
    receipts_amount: float
    notes: Optional[str] = None
    supporting_document_path: Optional[str] = None  # Legacy field
    document_path: Optional[str] = None
    document_filename: Optional[str] = None
    override_approval: Optional[bool] = False

class ExpenseClaimUpdate(BaseModel):
    paid_date: Optional[date] = None
    expense_type: Optional[str] = None
    receipts_amount: Optional[float] = None
    notes: Optional[str] = None
    supporting_document_path: Optional[str] = None  # Legacy field
    document_path: Optional[str] = None
    document_filename: Optional[str] = None

class ExpenseEntitlementCreate(BaseModel):
    employee_id: str
    expense_type: str
    entitlement_amount: Optional[float] = None
    unit: str = "monthly"
    start_date: Optional[date] = None
    end_date: Optional[date] = None
    rollover: str = "No"

class ExpenseEntitlementUpdate(BaseModel):
    expense_type: Optional[str] = None
    entitlement_amount: Optional[float] = None
    unit: Optional[str] = None
    start_date: Optional[date] = None
    end_date: Optional[date] = None
    rollover: Optional[str] = None

class ClaimValidationRequest(BaseModel):
    employee_id: str
    expense_type: str
    receipts_amount: float

@router.get("/claims")
async def list_expense_claims(
    employee_id: Optional[str] = Query(None, description="Filter by employee ID"),
    limit: Optional[int] = Query(None, description="Limit number of results"),
    current_user: dict = Depends(require_permission("expense:view"))
):
    """Get list of expense claims"""
    try:
        if employee_id:
            claims = ExpenseService.get_employee_claims(employee_id, limit)
        else:
            # Get all claims - would need to implement this in service
            claims = []
        return {"success": True, "data": claims}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/claims")
async def create_expense_claim(
    claim_data: ExpenseClaimCreate,
    current_user: dict = Depends(require_permission("expense:create"))
):
    """Create a new expense claim"""
    try:
        claim = ExpenseService.submit_expense_claim(
            employee_id=claim_data.employee_id,
            paid_date=claim_data.paid_date,
            expense_type=claim_data.expense_type,
            receipts_amount=claim_data.receipts_amount,
            notes=claim_data.notes,
            supporting_document_path=claim_data.supporting_document_path,
            document_path=claim_data.document_path,
            document_filename=claim_data.document_filename,
            override_approval=claim_data.override_approval or False,
            performed_by=current_user.get("username")
        )
        return {"success": True, "data": claim}
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.put("/claims/{claim_id}")
async def update_expense_claim(
    claim_id: str,
    claim_data: ExpenseClaimUpdate,
    current_user: dict = Depends(require_permission("expense:update"))
):
    """Update an expense claim"""
    try:
        from repos.expense_claim_repo import update_claim
        
        # Prepare update data
        update_data = {}
        if claim_data.paid_date is not None:
            update_data['paid_date'] = claim_data.paid_date
        if claim_data.expense_type is not None:
            update_data['expense_type'] = claim_data.expense_type
        if claim_data.receipts_amount is not None:
            update_data['receipts_amount'] = claim_data.receipts_amount
        if claim_data.notes is not None:
            update_data['notes'] = claim_data.notes
        if claim_data.supporting_document_path is not None:
            update_data['supporting_document_path'] = claim_data.supporting_document_path
        if claim_data.document_path is not None:
            update_data['document_path'] = claim_data.document_path
        if claim_data.document_filename is not None:
            update_data['document_filename'] = claim_data.document_filename
        
        # If receipts_amount or expense_type changed, recalculate claims_amount
        if 'receipts_amount' in update_data or 'expense_type' in update_data:
            # Get the existing claim to get employee_id
            from models.base import SessionLocal
            from models.expense_claim import ExpenseClaim
            with SessionLocal() as session:
                existing_claim = session.get(ExpenseClaim, claim_id)
                if existing_claim:
                    # Validate and calculate new claims amount
                    from services.expense_service import ExpenseService
                    validation = ExpenseService.validate_claim_against_entitlements(
                        existing_claim.employee_id,
                        update_data.get('expense_type', existing_claim.expense_type),
                        update_data.get('receipts_amount', existing_claim.receipts_amount)
                    )
                    if validation["valid"]:
                        update_data['claims_amount'] = validation["claimable_amount"]
                    else:
                        raise HTTPException(status_code=400, detail=validation["message"])
        
        updated_claim = update_claim(
            claim_id=claim_id,
            performed_by=current_user.get("username"),
            **update_data
        )
        
        if not updated_claim:
            raise HTTPException(status_code=404, detail="Claim not found")
        
        return {"success": True, "data": {
            "id": updated_claim.id,
            "employee_id": updated_claim.employee_id,
            "paid_date": updated_claim.paid_date,
            "expense_type": updated_claim.expense_type,
            "receipts_amount": updated_claim.receipts_amount,
            "claims_amount": updated_claim.claims_amount,
            "notes": updated_claim.notes,
            "supporting_document_path": updated_claim.supporting_document_path,
            "document_path": updated_claim.document_path,
            "document_filename": updated_claim.document_filename,
        }}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.delete("/claims/{claim_id}")
async def delete_expense_claim(
    claim_id: str,
    current_user: dict = Depends(require_permission("expense:delete"))
):
    """Delete an expense claim"""
    try:
        success = ExpenseService.delete_expense_claim(
            claim_id=claim_id,
            performed_by=current_user.get("username")
        )
        if not success:
            raise HTTPException(status_code=404, detail="Claim not found")
        return {"success": True, "message": "Claim deleted successfully"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/entitlements")
async def list_expense_entitlements(
    employee_id: Optional[str] = Query(None, description="Filter by employee ID"),
    current_user: dict = Depends(require_permission("expense:view"))
):
    """Get list of expense entitlements"""
    try:
        if employee_id:
            entitlements = ExpenseService.get_employee_entitlements(employee_id)
        else:
            from repos.expense_entitlement_repo import get_all_entitlements
            entitlements_data = get_all_entitlements()
            entitlements = [
                {
                    "id": ent.id,
                    "employee_id": ent.employee_id,
                    "expense_type": ent.expense_type,
                    "entitlement_amount": ent.entitlement_amount,
                    "unit": ent.unit,
                    "start_date": ent.start_date,
                    "end_date": ent.end_date,
                    "is_active": ent.is_active,
                    "rollover": ent.rollover,
                }
                for ent in entitlements_data
            ]
        return {"success": True, "data": entitlements}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/entitlements")
async def create_expense_entitlement(
    entitlement_data: ExpenseEntitlementCreate,
    current_user: dict = Depends(require_permission("expense:create"))
):
    """Create a new expense entitlement"""
    try:
        entitlement = ExpenseService.create_entitlement_for_employee(
            employee_id=entitlement_data.employee_id,
            expense_type=entitlement_data.expense_type,
            entitlement_amount=entitlement_data.entitlement_amount,
            unit=entitlement_data.unit,
            start_date=entitlement_data.start_date,
            end_date=entitlement_data.end_date,
            rollover=entitlement_data.rollover,
            performed_by=current_user.get("username")
        )
        return {"success": True, "data": entitlement}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.put("/entitlements/{entitlement_id}")
async def update_expense_entitlement(
    entitlement_id: str,
    entitlement_data: ExpenseEntitlementUpdate,
    current_user: dict = Depends(require_permission("expense:update"))
):
    """Update an expense entitlement"""
    try:
        entitlement = ExpenseService.update_entitlement_for_employee(
            entitlement_id=entitlement_id,
            expense_type=entitlement_data.expense_type,
            entitlement_amount=entitlement_data.entitlement_amount,
            unit=entitlement_data.unit,
            start_date=entitlement_data.start_date,
            end_date=entitlement_data.end_date,
            rollover=entitlement_data.rollover,
            performed_by=current_user.get("username")
        )
        
        if not entitlement:
            raise HTTPException(status_code=404, detail="Entitlement not found")
        
        return {"success": True, "data": entitlement}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.delete("/entitlements/{entitlement_id}")
async def delete_expense_entitlement(
    entitlement_id: str,
    current_user: dict = Depends(require_permission("expense:delete"))
):
    """Delete an expense entitlement"""
    try:
        success = ExpenseService.delete_expense_entitlement(
            entitlement_id=entitlement_id,
            performed_by=current_user.get("username")
        )
        if not success:
            raise HTTPException(status_code=404, detail="Entitlement not found")
        return {"success": True, "message": "Entitlement deleted successfully"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/validate-claim")
async def validate_claim(
    validation_data: ClaimValidationRequest,
    current_user: dict = Depends(require_permission("expense:view"))
):
    """Validate a claim against entitlements"""
    try:
        validation = ExpenseService.validate_claim_against_entitlements(
            employee_id=validation_data.employee_id,
            expense_type=validation_data.expense_type,
            receipts_amount=validation_data.receipts_amount
        )
        return {"success": True, "data": validation}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/summary/{employee_id}")
async def get_expense_summary(
    employee_id: str,
    start_date: Optional[date] = Query(None, description="Start date for summary"),
    end_date: Optional[date] = Query(None, description="End date for summary"),
    current_user: dict = Depends(require_permission("expense:view"))
):
    """Get expense summary for an employee"""
    try:
        summary = ExpenseService.get_expense_summary(employee_id, start_date, end_date)
        return {"success": True, "data": summary}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/reports/monthly")
async def get_monthly_expense_report(
    month: int = Query(..., description="Month (1-12)"),
    year: int = Query(..., description="Year"),
    current_user: dict = Depends(require_permission("expense:view"))
):
    """Get monthly expense report"""
    try:
        report = ExpenseService.get_monthly_expense_report(month, year)
        return {"success": True, "data": report}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/reports/yearly")
async def get_yearly_expense_report(
    year: int = Query(..., description="Year"),
    current_user: dict = Depends(require_permission("expense:view"))
):
    """Get yearly expense report"""
    try:
        report = ExpenseService.get_yearly_expense_report(year)
        return {"success": True, "data": report}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/expense-types")
async def get_expense_types(
    current_user: dict = Depends(require_permission("expense:view"))
):
    """Get all available expense types"""
    try:
        expense_types = ExpenseService.get_expense_types()
        return {"success": True, "data": expense_types}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/open-file")
async def open_file(
    file_data: dict,
    current_user: dict = Depends(require_permission("expense:view"))
):
    """Open a file using the system's default application"""
    try:
        import os
        from pathlib import Path
        
        file_path = file_data.get("file_path")
        if not file_path:
            raise HTTPException(status_code=400, detail="File path is required")
        
        # Check if file exists
        if not Path(file_path).exists():
            raise HTTPException(status_code=404, detail="File not found")
        
        # Use os.startfile on Windows to open with default application
        os.startfile(file_path)
        return {"success": True, "message": "File opened successfully"}
    except FileNotFoundError:
        raise HTTPException(status_code=404, detail="File not found")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error opening file: {str(e)}")
