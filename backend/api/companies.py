from fastapi import APIRouter, Depends, HTTPException, Query
from typing import List, Optional
from schemas import CompanyCreate, CompanyUpdate, CompanyResponse, CompanyListResponse, PayPeriodListResponse
from api.dependencies import get_current_user, require_permission
from repos.company_repo import (
    get_all_companies, 
    get_company_by_id, 
    create_company, 
    update_company, 
    delete_company,
    search_companies
)
from services.payroll_period_service import calculate_pay_periods

router = APIRouter()

@router.get("", response_model=CompanyListResponse)
@router.get("/", response_model=CompanyListResponse)
async def list_companies(
    search: Optional[str] = Query(None, description="Search term for company name or ID"),
    current_user: dict = Depends(get_current_user)
):
    """Get list of companies - accessible to all authenticated users"""
    try:
        # Log user info for debugging
        print(f"list_companies: User={current_user.get('username')}, Permissions={current_user.get('permissions', [])}")
        
        if search:
            companies = search_companies(search)
        else:
            companies = get_all_companies()
        
        print(f"list_companies: Found {len(companies)} companies")
        
        company_list = [
            CompanyResponse(
                id=company.id,
                legal_name=company.legal_name,
                trade_name=company.trade_name,
                address_line1=company.address_line1,
                address_line2=company.address_line2,
                city=company.city,
                province=company.province,
                postal_code=company.postal_code,
                country=company.country,
                notes=company.notes,
                payroll_due_start_date=company.payroll_due_start_date,
                pay_period_start_date=company.pay_period_start_date,
                payroll_frequency=company.payroll_frequency,
                cra_due_dates=company.cra_due_dates,
                union_due_date=company.union_due_date,
                created_at=getattr(company, 'created_at', None),
                updated_at=getattr(company, 'updated_at', None)
            )
            for company in companies
        ]
        
        return {"success": True, "data": company_list}
    except HTTPException:
        raise
    except Exception as e:
        import traceback
        print(f"Error in list_companies: {traceback.format_exc()}")
        raise HTTPException(status_code=500, detail=f"Error fetching companies: {str(e)}")

@router.get("/{company_id}", response_model=CompanyResponse)
async def get_company(
    company_id: str,
    current_user: dict = Depends(get_current_user)
):
    """Get a specific company by ID"""
    try:
        company = get_company_by_id(company_id)
        if not company:
            raise HTTPException(status_code=404, detail="Company not found")
        
        return CompanyResponse(
            id=company.id,
            legal_name=company.legal_name,
            trade_name=company.trade_name,
            address_line1=company.address_line1,
            address_line2=company.address_line2,
            city=company.city,
            province=company.province,
            postal_code=company.postal_code,
            country=company.country,
            notes=company.notes,
            payroll_due_start_date=company.payroll_due_start_date,
            pay_period_start_date=company.pay_period_start_date,
            payroll_frequency=company.payroll_frequency,
            cra_due_dates=company.cra_due_dates,
            union_due_date=company.union_due_date,
            created_at=getattr(company, 'created_at', None),
            updated_at=getattr(company, 'updated_at', None)
        )
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error fetching company: {str(e)}")

@router.post("/", response_model=CompanyResponse)
async def create_company_endpoint(
    company_data: CompanyCreate,
    current_user: dict = Depends(require_permission("company:create"))
):
    """Create a new company"""
    try:
        company = create_company(
            company_id=company_data.id,
            legal_name=company_data.legal_name,
            trade_name=company_data.trade_name,
            address_line1=company_data.address_line1,
            address_line2=company_data.address_line2,
            city=company_data.city,
            province=company_data.province,
            postal_code=company_data.postal_code,
            country=company_data.country,
            notes=company_data.notes,
            payroll_due_start_date=company_data.payroll_due_start_date,
            pay_period_start_date=company_data.pay_period_start_date,
            payroll_frequency=company_data.payroll_frequency,
            cra_due_dates=company_data.cra_due_dates,
            union_due_date=company_data.union_due_date,
            performed_by=current_user.get('username')
        )
        
        return CompanyResponse(
            id=company.id,
            legal_name=company.legal_name,
            trade_name=company.trade_name,
            address_line1=company.address_line1,
            address_line2=company.address_line2,
            city=company.city,
            province=company.province,
            postal_code=company.postal_code,
            country=company.country,
            notes=company.notes,
            payroll_due_start_date=company.payroll_due_start_date,
            pay_period_start_date=company.pay_period_start_date,
            payroll_frequency=company.payroll_frequency,
            cra_due_dates=company.cra_due_dates,
            union_due_date=company.union_due_date,
            created_at=getattr(company, 'created_at', None),
            updated_at=getattr(company, 'updated_at', None)
        )
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error creating company: {str(e)}")

@router.put("/{company_id}", response_model=CompanyResponse)
async def update_company_endpoint(
    company_id: str,
    company_data: CompanyUpdate,
    current_user: dict = Depends(require_permission("company:update"))
):
    """Update an existing company"""
    try:
        # Prepare update data, excluding None values
        update_data = {}
        for field, value in company_data.dict().items():
            if value is not None:
                update_data[field] = value
        
        if not update_data:
            # No fields to update, return current company
            company = get_company_by_id(company_id)
            if not company:
                raise HTTPException(status_code=404, detail="Company not found")
        else:
            company = update_company(
                company_id=company_id,
                performed_by=current_user.get('username'),
                **update_data
            )
        
        if not company:
            raise HTTPException(status_code=404, detail="Company not found")
        
        return CompanyResponse(
            id=company.id,
            legal_name=company.legal_name,
            trade_name=company.trade_name,
            address_line1=company.address_line1,
            address_line2=company.address_line2,
            city=company.city,
            province=company.province,
            postal_code=company.postal_code,
            country=company.country,
            notes=company.notes,
            payroll_due_start_date=company.payroll_due_start_date,
            pay_period_start_date=company.pay_period_start_date,
            payroll_frequency=company.payroll_frequency,
            cra_due_dates=company.cra_due_dates,
            union_due_date=company.union_due_date,
            created_at=getattr(company, 'created_at', None),
            updated_at=getattr(company, 'updated_at', None)
        )
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error updating company: {str(e)}")

@router.delete("/{company_id}")
async def delete_company_endpoint(
    company_id: str,
    current_user: dict = Depends(require_permission("company:delete"))
):
    """Delete a company"""
    try:
        success = delete_company(
            company_id=company_id,
            performed_by=current_user.get('username')
        )
        
        if not success:
            raise HTTPException(status_code=404, detail="Company not found")
        
        return {"message": "Company deleted successfully"}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error deleting company: {str(e)}")

@router.get("/{company_id}/pay-periods", response_model=PayPeriodListResponse)
async def get_pay_periods(
    company_id: str,
    year: int = Query(..., description="Year to get pay periods for"),
    current_user: dict = Depends(get_current_user)
):
    """Get pay periods for a company for a given year"""
    try:
        # Verify company exists
        company = get_company_by_id(company_id)
        if not company:
            raise HTTPException(status_code=404, detail="Company not found")
        
        # Calculate pay periods
        periods = calculate_pay_periods(company_id, year)
        
        # Convert to response format
        period_data = [period.to_dict() for period in periods]
        
        return PayPeriodListResponse(
            success=True,
            data=period_data,
            company_id=company.id,
            company_name=company.legal_name
        )
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error calculating pay periods: {str(e)}")
