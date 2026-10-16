from fastapi import APIRouter, Depends, HTTPException, Query
from typing import List, Optional
from schemas import BaseModel
from pydantic import Field
from api.dependencies import get_current_user, require_permission
from models.code_value import CODE_CATEGORIES
from repos.code_value_repo import (
    list_code_values,
    create_code_value,
    update_code_value,
    delete_code_value,
)

router = APIRouter()


class CodeValueCreate(BaseModel):
    category: str
    code: str = Field(..., min_length=1, max_length=100)
    description: Optional[str] = Field(None, max_length=255)
    sort_order: int = 0
    is_active: bool = True


class CodeValueUpdate(BaseModel):
    code: Optional[str] = Field(None, min_length=1, max_length=100)
    description: Optional[str] = Field(None, max_length=255)
    sort_order: Optional[int] = None
    is_active: Optional[bool] = None


class CodeValueResponse(BaseModel):
    id: int
    category: str
    code: str
    description: Optional[str] = None
    sort_order: int = 0
    is_active: bool = True

    class Config:
        from_attributes = True


class CodeCategoryResponse(BaseModel):
    key: str
    label: str


@router.get("/categories", response_model=List[CodeCategoryResponse])
async def list_categories(current_user: dict = Depends(get_current_user)):
    return [CodeCategoryResponse(key=k, label=v) for k, v in CODE_CATEGORIES.items()]


@router.get("", response_model=List[CodeValueResponse])
@router.get("/", response_model=List[CodeValueResponse])
async def list_codes(
    category: Optional[str] = Query(None, description="Code category"),
    active_only: bool = Query(False, description="Only active values"),
    current_user: dict = Depends(get_current_user),
):
    if category and category not in CODE_CATEGORIES:
        raise HTTPException(status_code=400, detail=f"Unknown category '{category}'")
    return list_code_values(category, active_only)


@router.post("", response_model=CodeValueResponse)
@router.post("/", response_model=CodeValueResponse)
async def create_code(
    data: CodeValueCreate,
    current_user: dict = Depends(require_permission("code:manage")),
):
    try:
        return create_code_value(
            data.category,
            data.code,
            description=data.description,
            sort_order=data.sort_order,
            is_active=data.is_active,
            performed_by=current_user.get("username"),
        )
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.put("/{code_id}", response_model=CodeValueResponse)
async def update_code(
    code_id: int,
    data: CodeValueUpdate,
    current_user: dict = Depends(require_permission("code:manage")),
):
    try:
        item = update_code_value(
            code_id,
            performed_by=current_user.get("username"),
            **data.dict(exclude_unset=True),
        )
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    if not item:
        raise HTTPException(status_code=404, detail="Code value not found")
    return item


@router.delete("/{code_id}")
async def delete_code(
    code_id: int,
    current_user: dict = Depends(require_permission("code:manage")),
):
    if not delete_code_value(code_id, performed_by=current_user.get("username")):
        raise HTTPException(status_code=404, detail="Code value not found")
    return {"message": "Code value deleted"}
