"""API for vacation dollar openings and payroll detail Excel import."""

from fastapi import APIRouter, Depends, HTTPException, Query, UploadFile, File, Form
from typing import Optional

from api.dependencies import get_current_user, require_permission
from schemas import (
    VacationDollarOpeningCreate,
    VacationDollarOpeningResponse,
    VacationDollarOpeningListResponse,
    PayrollImportPreviewResponse,
    PayrollImportCommitResponse,
)
from repos.vacation_payroll_repo import upsert_opening, list_openings, get_opening
from repos.company_repo import get_company_by_id
from models.base import SessionLocal
from models.employee import Employee
from services.payroll_detail_import_service import preview_payroll_import, commit_payroll_import

router = APIRouter()


@router.get("/vacation-openings", response_model=VacationDollarOpeningListResponse)
async def get_vacation_openings(
    company_id: Optional[str] = Query(None),
    employee_id: Optional[str] = Query(None),
    year: Optional[int] = Query(None),
    current_user: dict = Depends(require_permission("leave:view")),
):
    rows = list_openings(company_id=company_id, employee_id=employee_id, year=year)
    data = []
    with SessionLocal() as session:
        for r in rows:
            emp = session.get(Employee, r.employee_id)
            data.append(
                VacationDollarOpeningResponse(
                    id=r.id,
                    employee_id=r.employee_id,
                    company_id=r.company_id,
                    year=r.year,
                    opening_amount=float(r.opening_amount or 0),
                    employee_name=emp.full_name if emp else None,
                    created_at=r.created_at,
                    updated_at=r.updated_at,
                )
            )
    return {"success": True, "data": data}


@router.put("/vacation-openings", response_model=VacationDollarOpeningResponse)
async def put_vacation_opening(
    body: VacationDollarOpeningCreate,
    current_user: dict = Depends(require_permission("leave:edit")),
):
    if not get_company_by_id(body.company_id):
        raise HTTPException(status_code=404, detail="Company not found")
    with SessionLocal() as session:
        emp = session.get(Employee, body.employee_id)
        if not emp:
            raise HTTPException(status_code=404, detail="Employee not found")
        emp_name = emp.full_name

    row = upsert_opening(body.employee_id, body.company_id, body.year, body.opening_amount)
    return VacationDollarOpeningResponse(
        id=row.id,
        employee_id=row.employee_id,
        company_id=row.company_id,
        year=row.year,
        opening_amount=float(row.opening_amount or 0),
        employee_name=emp_name,
        created_at=row.created_at,
        updated_at=row.updated_at,
    )


@router.post("/payroll-details/upload/preview", response_model=PayrollImportPreviewResponse)
async def preview_payroll_details_upload(
    company_id: str = Form(...),
    file: UploadFile = File(...),
    current_user: dict = Depends(require_permission("leave:create")),
):
    company = get_company_by_id(company_id)
    if not company:
        raise HTTPException(status_code=404, detail="Company not found")
    if getattr(company, "vacation_pay_with_payroll", True):
        raise HTTPException(
            status_code=400,
            detail="Payroll detail import is only for companies with deferred vacation pay "
            "(vacation_pay_with_payroll=false)",
        )
    if not file.filename or not file.filename.endswith((".xlsx", ".xls")):
        raise HTTPException(status_code=400, detail="File must be an Excel file (.xlsx or .xls)")
    contents = await file.read()
    try:
        data = preview_payroll_import(contents, company_id)
        return {"success": True, "data": data}
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Failed to parse file: {e}")


@router.post("/payroll-details/upload", response_model=PayrollImportCommitResponse)
async def upload_payroll_details(
    company_id: str = Form(...),
    file: UploadFile = File(...),
    current_user: dict = Depends(require_permission("leave:create")),
):
    company = get_company_by_id(company_id)
    if not company:
        raise HTTPException(status_code=404, detail="Company not found")
    if getattr(company, "vacation_pay_with_payroll", True):
        raise HTTPException(
            status_code=400,
            detail="Payroll detail import is only for companies with deferred vacation pay "
            "(vacation_pay_with_payroll=false)",
        )
    if not file.filename or not file.filename.endswith((".xlsx", ".xls")):
        raise HTTPException(status_code=400, detail="File must be an Excel file (.xlsx or .xls)")
    contents = await file.read()
    try:
        result = commit_payroll_import(contents, company_id, source_filename=file.filename)
        return {"success": True, "data": result}
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Import failed: {e}")
