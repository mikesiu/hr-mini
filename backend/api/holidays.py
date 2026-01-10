from fastapi import APIRouter, Depends, HTTPException, Query
from typing import List, Optional
from datetime import date
from schemas import BaseModel
from api.dependencies import require_permission
from repos.holiday_repo import (
    list_holidays as repo_list_holidays,
    get_holiday as repo_get_holiday,
    create_holiday as repo_create_holiday,
    update_holiday as repo_update_holiday,
    delete_holiday as repo_delete_holiday,
    copy_holidays as repo_copy_holidays,
)

router = APIRouter()

# Holiday schemas
class HolidayBase(BaseModel):
    company_id: str
    holiday_date: date
    name: str
    is_active: bool = True
    union_only: bool = False

class HolidayCreate(HolidayBase):
    pass

class HolidayUpdate(BaseModel):
    holiday_date: Optional[date] = None
    name: Optional[str] = None
    is_active: Optional[bool] = None
    union_only: Optional[bool] = None

class HolidayResponse(HolidayBase):
    id: int
    
    class Config:
        from_attributes = True

class CopyHolidaysRequest(BaseModel):
    source_company_id: str
    target_company_id: str
    year: int
    skip_duplicates: bool = True

class CopyHolidaysResponse(BaseModel):
    copied: int
    skipped: int
    failed: int
    total_source: int
    message: str

@router.get("/", response_model=List[HolidayResponse])
async def list_holidays(
    company_id: str = Query(..., description="Company ID"),
    year: Optional[int] = Query(None, description="Filter by year"),
    active_only: bool = Query(True, description="Show only active holidays"),
    current_user: dict = Depends(require_permission("holiday:view"))
):
    """Get list of holidays for a company"""
    try:
        holidays = repo_list_holidays(company_id, year, active_only)
        return [HolidayResponse(
            id=h.id,
            company_id=h.company_id,
            holiday_date=h.holiday_date,
            name=h.name,
            is_active=h.is_active,
            union_only=h.union_only
        ) for h in holidays]
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error fetching holidays: {str(e)}")

@router.get("/{holiday_id}", response_model=HolidayResponse)
async def get_holiday(
    holiday_id: int,
    current_user: dict = Depends(require_permission("holiday:view"))
):
    """Get a specific holiday by ID"""
    try:
        holiday = repo_get_holiday(holiday_id)
        if not holiday:
            raise HTTPException(status_code=404, detail="Holiday not found")
        return HolidayResponse(
            id=holiday.id,
            company_id=holiday.company_id,
            holiday_date=holiday.holiday_date,
            name=holiday.name,
            is_active=holiday.is_active,
            union_only=holiday.union_only
        )
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error fetching holiday: {str(e)}")

@router.post("/", response_model=HolidayResponse)
async def create_holiday(
    holiday_data: HolidayCreate,
    current_user: dict = Depends(require_permission("holiday:create"))
):
    """Create a new holiday"""
    try:
        holiday = repo_create_holiday(
            company_id=holiday_data.company_id,
            holiday_date=holiday_data.holiday_date,
            name=holiday_data.name,
            is_active=holiday_data.is_active,
            union_only=holiday_data.union_only,
            performed_by=current_user.get('username')
        )
        return HolidayResponse(
            id=holiday.id,
            company_id=holiday.company_id,
            holiday_date=holiday.holiday_date,
            name=holiday.name,
            is_active=holiday.is_active,
            union_only=holiday.union_only
        )
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error creating holiday: {str(e)}")

@router.put("/{holiday_id}", response_model=HolidayResponse)
async def update_holiday(
    holiday_id: int,
    holiday_data: HolidayUpdate,
    current_user: dict = Depends(require_permission("holiday:edit"))
):
    """Update a holiday"""
    try:
        holiday = repo_update_holiday(
            holiday_id=holiday_id,
            holiday_date=holiday_data.holiday_date,
            name=holiday_data.name,
            is_active=holiday_data.is_active,
            union_only=holiday_data.union_only,
            performed_by=current_user.get('username')
        )
        if not holiday:
            raise HTTPException(status_code=404, detail="Holiday not found")
        return HolidayResponse(
            id=holiday.id,
            company_id=holiday.company_id,
            holiday_date=holiday.holiday_date,
            name=holiday.name,
            is_active=holiday.is_active,
            union_only=holiday.union_only
        )
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error updating holiday: {str(e)}")

@router.delete("/{holiday_id}")
async def delete_holiday(
    holiday_id: int,
    current_user: dict = Depends(require_permission("holiday:delete"))
):
    """Delete a holiday"""
    try:
        success = repo_delete_holiday(holiday_id, performed_by=current_user.get('username'))
        if not success:
            raise HTTPException(status_code=404, detail="Holiday not found")
        return {"message": "Holiday deleted successfully"}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error deleting holiday: {str(e)}")

@router.post("/copy", response_model=CopyHolidaysResponse)
async def copy_holidays(
    request: CopyHolidaysRequest,
    current_user: dict = Depends(require_permission("holiday:create"))
):
    """Copy holidays from one company to another for a specific year"""
    try:
        result = repo_copy_holidays(
            source_company_id=request.source_company_id,
            target_company_id=request.target_company_id,
            year=request.year,
            skip_duplicates=request.skip_duplicates,
            performed_by=current_user.get('username')
        )
        
        message = (
            f"Copied {result['copied']} holiday(s) from source company. "
            f"{result['skipped']} duplicate(s) skipped. "
            f"{result['failed']} failed."
        )
        
        return CopyHolidaysResponse(
            copied=result['copied'],
            skipped=result['skipped'],
            failed=result['failed'],
            total_source=result['total_source'],
            message=message
        )
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error copying holidays: {str(e)}")

