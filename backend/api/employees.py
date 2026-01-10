from fastapi import APIRouter, Depends, HTTPException, Query, Header, UploadFile, File
from typing import List, Optional, Tuple
from schemas import (
    EmployeeCreate, EmployeeUpdate, EmployeeResponse, EmployeeListResponse,
    EmployeeUploadError, EmployeeUploadResponse, EmployeeUploadPreviewRow, 
    EmployeeUploadPreviewResponse
)
from api.dependencies import get_current_user, require_permission
from fastapi.security import HTTPBearer
import sys
from pathlib import Path
import pandas as pd
import io
from datetime import datetime, date
import openpyxl
from openpyxl.utils.dataframe import dataframe_to_rows
sys.path.append(str(Path(__file__).parent.parent))
from repos.employee_repo import (
    search_employees, create_employee, get_employee, 
    update_employee, delete_employee, employee_exists
)
from repos.employment_repo import get_current_employment, create_employment
from repos.company_repo import get_company_by_id
# from old_system.app.ui.components.global_company_filter import get_filtered_employees_by_global_company

router = APIRouter()


@router.get("/list", response_model=EmployeeListResponse)
async def list_employees(
    q: Optional[str] = Query(None, description="Search term for employee name or ID"),
    company_id: Optional[str] = Query(None, description="Filter by company ID"),
    current_user: dict = Depends(require_permission("employee:view"))
):
    """Get list of employees with optional search and company filtering"""
    employees = search_employees(q or "")
    
    # Filter by company if specified
    if company_id:
        filtered_employees = []
        for emp in employees:
            current_employment = get_current_employment(emp.id)
            if current_employment and current_employment.company_id == company_id:
                filtered_employees.append(emp)
        employees = filtered_employees
    
    # Convert SQLAlchemy models to Pydantic models
    employee_list = []
    for emp in employees:
        # Get current employment information
        current_employment = get_current_employment(emp.id)
        company_id = None
        company_short_form = None
        
        if current_employment:
            company_id = current_employment.company_id
            # Get company short form (company ID)
            company = get_company_by_id(current_employment.company_id)
            if company:
                company_short_form = company.id
        
        employee_list.append(EmployeeResponse(
            id=emp.id,
            first_name=emp.first_name,
            last_name=emp.last_name,
            other_name=emp.other_name,
            full_name=emp.full_name,
            email=emp.email,
            phone=emp.phone,
            street=emp.street,
            city=emp.city,
            province=emp.province,
            postal_code=emp.postal_code,
            dob=emp.dob.isoformat() if emp.dob else None,
            sin=emp.sin,
            drivers_license=emp.drivers_license,
            hire_date=emp.hire_date.isoformat() if emp.hire_date else None,
            probation_end_date=emp.probation_end_date.isoformat() if emp.probation_end_date else None,
            seniority_start_date=emp.seniority_start_date.isoformat() if emp.seniority_start_date else None,
            status=emp.status,
            remarks=emp.remarks,
            paystub=emp.paystub,
            union_member=emp.union_member,
            use_mailing_address=emp.use_mailing_address,
            mailing_street=emp.mailing_street,
            mailing_city=emp.mailing_city,
            mailing_province=emp.mailing_province,
            mailing_postal_code=emp.mailing_postal_code,
            emergency_contact_name=emp.emergency_contact_name,
            emergency_contact_phone=emp.emergency_contact_phone,
            company_id=company_id,
            company_short_form=company_short_form,
            created_at=emp.created_at.isoformat() if emp.created_at else None,
            updated_at=emp.updated_at.isoformat() if emp.updated_at else None
        ))
    
    return {"success": True, "data": employee_list}

@router.get("/{employee_id}", response_model=EmployeeResponse)
async def get_employee_by_id(
    employee_id: str,
    current_user: dict = Depends(require_permission("employee:view"))
):
    """Get a specific employee by ID"""
    employee = get_employee(employee_id)
    if not employee:
        raise HTTPException(status_code=404, detail="Employee not found")
    
    # Get current employment information
    current_employment = get_current_employment(employee.id)
    company_id = None
    company_short_form = None
    
    if current_employment:
        company_id = current_employment.company_id
        # Get company short form (company ID)
        company = get_company_by_id(current_employment.company_id)
        if company:
            company_short_form = company.id
    
    # Convert SQLAlchemy model to Pydantic model
    return EmployeeResponse(
        id=employee.id,
        first_name=employee.first_name,
        last_name=employee.last_name,
        other_name=employee.other_name,
        full_name=employee.full_name,
        email=employee.email,
        phone=employee.phone,
        street=employee.street,
        city=employee.city,
        province=employee.province,
        postal_code=employee.postal_code,
        dob=employee.dob.isoformat() if employee.dob else None,
        sin=employee.sin,
        drivers_license=employee.drivers_license,
        hire_date=employee.hire_date.isoformat() if employee.hire_date else None,
        probation_end_date=employee.probation_end_date.isoformat() if employee.probation_end_date else None,
        seniority_start_date=employee.seniority_start_date.isoformat() if employee.seniority_start_date else None,
            status=employee.status,
            remarks=employee.remarks,
            paystub=employee.paystub,
            union_member=employee.union_member,
            use_mailing_address=employee.use_mailing_address,
        mailing_street=employee.mailing_street,
        mailing_city=employee.mailing_city,
        mailing_province=employee.mailing_province,
        mailing_postal_code=employee.mailing_postal_code,
        emergency_contact_name=employee.emergency_contact_name,
        emergency_contact_phone=employee.emergency_contact_phone,
        company_id=company_id,
        company_short_form=company_short_form,
        created_at=employee.created_at.isoformat() if employee.created_at else None,
        updated_at=employee.updated_at.isoformat() if employee.updated_at else None
    )

@router.post("/", response_model=EmployeeResponse)
async def create_new_employee(
    employee_data: EmployeeCreate,
    current_user: dict = Depends(require_permission("employee:create"))
):
    """Create a new employee"""
    if employee_exists(employee_data.id):
        raise HTTPException(status_code=400, detail="Employee ID already exists")
    
    try:
        employee = create_employee(
            emp_id=employee_data.id,
            first_name=employee_data.first_name,
            last_name=employee_data.last_name,
            email=employee_data.email,
            hire_date=employee_data.hire_date,
            probation_end_date=employee_data.probation_end_date,
            seniority_start_date=employee_data.seniority_start_date,
            performed_by=current_user.get("username")
        )
        
        # Update with additional fields
        update_data = {}
        if employee_data.other_name:
            update_data['other_name'] = employee_data.other_name
        if employee_data.phone:
            update_data['phone'] = employee_data.phone
        if employee_data.street:
            update_data['street'] = employee_data.street
        if employee_data.city:
            update_data['city'] = employee_data.city
        if employee_data.province:
            update_data['province'] = employee_data.province
        if employee_data.postal_code:
            update_data['postal_code'] = employee_data.postal_code
        if employee_data.dob:
            update_data['dob'] = employee_data.dob
        if employee_data.sin:
            update_data['sin'] = employee_data.sin
        if employee_data.drivers_license:
            update_data['drivers_license'] = employee_data.drivers_license
        if employee_data.status != 'Active':
            update_data['status'] = employee_data.status
        if employee_data.remarks:
            update_data['remarks'] = employee_data.remarks
        if employee_data.paystub:
            update_data['paystub'] = employee_data.paystub
        if employee_data.union_member is not None:
            update_data['union_member'] = employee_data.union_member
        update_data['use_mailing_address'] = employee_data.use_mailing_address
        update_data['mailing_street'] = employee_data.mailing_street or ''
        update_data['mailing_city'] = employee_data.mailing_city or ''
        update_data['mailing_province'] = employee_data.mailing_province or ''
        update_data['mailing_postal_code'] = employee_data.mailing_postal_code or ''
        update_data['emergency_contact_name'] = employee_data.emergency_contact_name or ''
        update_data['emergency_contact_phone'] = employee_data.emergency_contact_phone or ''
        
        if update_data:
            employee = update_employee(employee_data.id, **update_data)
        
        return employee
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.put("/{employee_id}", response_model=EmployeeResponse)
async def update_employee_by_id(
    employee_id: str,
    employee_data: EmployeeUpdate,
    current_user: dict = Depends(require_permission("employee:update"))
):
    """Update an existing employee"""
    if not employee_exists(employee_id):
        raise HTTPException(status_code=404, detail="Employee not found")
    
    try:
        # Convert Pydantic model to dict, including None values to allow clearing fields
        update_data = {k: v for k, v in employee_data.dict().items()}
        
        updated_employee = update_employee(employee_id, **update_data)
        if not updated_employee:
            raise HTTPException(status_code=400, detail="Failed to update employee")
        
        # Convert SQLAlchemy model to Pydantic model
        return EmployeeResponse(
            id=updated_employee.id,
            first_name=updated_employee.first_name,
            last_name=updated_employee.last_name,
            other_name=updated_employee.other_name,
            full_name=updated_employee.full_name,
            email=updated_employee.email,
            phone=updated_employee.phone,
            street=updated_employee.street,
            city=updated_employee.city,
            province=updated_employee.province,
            postal_code=updated_employee.postal_code,
            dob=updated_employee.dob.isoformat() if updated_employee.dob else None,
            sin=updated_employee.sin,
            drivers_license=updated_employee.drivers_license,
            hire_date=updated_employee.hire_date.isoformat() if updated_employee.hire_date else None,
            probation_end_date=updated_employee.probation_end_date.isoformat() if updated_employee.probation_end_date else None,
            seniority_start_date=updated_employee.seniority_start_date.isoformat() if updated_employee.seniority_start_date else None,
            status=updated_employee.status,
            remarks=updated_employee.remarks,
            paystub=updated_employee.paystub,
            union_member=updated_employee.union_member,
            use_mailing_address=updated_employee.use_mailing_address,
            mailing_street=updated_employee.mailing_street,
            mailing_city=updated_employee.mailing_city,
            mailing_province=updated_employee.mailing_province,
            mailing_postal_code=updated_employee.mailing_postal_code,
            emergency_contact_name=updated_employee.emergency_contact_name,
            emergency_contact_phone=updated_employee.emergency_contact_phone,
            created_at=updated_employee.created_at.isoformat() if updated_employee.created_at else None,
            updated_at=updated_employee.updated_at.isoformat() if updated_employee.updated_at else None
        )
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        print(f"Error updating employee: {e}")
        raise HTTPException(status_code=500, detail="Internal server error")

@router.delete("/{employee_id}")
async def delete_employee_by_id(
    employee_id: str,
    current_user: dict = Depends(require_permission("employee:delete"))
):
    """Delete an employee"""
    if not employee_exists(employee_id):
        raise HTTPException(status_code=404, detail="Employee not found")
    
    success = delete_employee(employee_id)
    if not success:
        raise HTTPException(status_code=400, detail="Failed to delete employee")
    
    return {"message": "Employee deleted successfully"}


# Helper functions for employee upload
def parse_employee_name(full_name: str) -> Tuple[str, str]:
    """Parse full name into first_name and last_name."""
    if not full_name or not full_name.strip():
        return "", ""
    
    name_parts = full_name.strip().split()
    if len(name_parts) == 1:
        return name_parts[0], ""
    elif len(name_parts) == 2:
        return name_parts[0], name_parts[1]
    else:
        # More than 2 parts - first word is first name, rest is last name
        return name_parts[0], " ".join(name_parts[1:])


def validate_employee_upload_row(row_data: dict, row_number: int) -> Tuple[bool, str]:
    """Validate a single employee upload row."""
    try:
        # Check required fields
        employee_id = str(row_data.get('Emp No', '')).strip()
        if not employee_id:
            return False, "Employee ID (Emp No) is required"
        
        full_name = str(row_data.get('Name', '')).strip()
        if not full_name:
            return False, "Name is required"
        
        # Check if employee already exists (reject per requirement 3b)
        if employee_exists(employee_id):
            return False, "Employee ID already exists"
        
        # Check company ID exists
        company_id = str(row_data.get('CompanyID', '')).strip()
        if company_id:
            company = get_company_by_id(company_id)
            if not company:
                return False, f"Company ID '{company_id}' does not exist"
        
        # Validate hire date format if provided
        hire_date = row_data.get('Hire Date')
        if hire_date and pd.notna(hire_date):
            try:
                pd.to_datetime(hire_date).date()
            except:
                return False, "Invalid hire date format"
        
        return True, ""
        
    except Exception as e:
        return False, f"Validation error: {str(e)}"


@router.get("/upload/template")
async def download_employee_template(
    current_user: dict = Depends(require_permission("employee:create"))
):
    """Download Excel template for employee import"""
    try:
        # Create template data
        template_data = {
            'CompanyID': ['QW', 'QW', 'QW'],
            'Emp No': ['EMP001', 'EMP002', 'EMP003'],
            'Name': ['John Doe', 'Jane Smith', 'Bob Johnson'],
            'Street 1': ['123 Main St', '456 Oak Ave', '789 Pine Rd'],
            'City': ['Vancouver', 'Toronto', 'Montreal'],
            'Province': ['British Columbia', 'Ontario', 'Quebec'],
            'Postal Code': ['V6B 1A1', 'M5V 3A8', 'H3Z 2Y7'],
            'Phone 1': ['(604) 123-4567', '(416) 234-5678', '(514) 345-6789'],
            'Hire Date': ['2023-01-15', '2023-02-20', '2023-03-10']
        }
        
        # Create DataFrame
        df = pd.DataFrame(template_data)
        
        # Create Excel file in memory
        output = io.BytesIO()
        with pd.ExcelWriter(output, engine='openpyxl') as writer:
            df.to_excel(writer, sheet_name='Employees', index=False)
            
            # Get the workbook and worksheet
            workbook = writer.book
            worksheet = writer.sheets['Employees']
            
            # Style the header row
            from openpyxl.styles import Font, PatternFill, Alignment
            
            header_font = Font(bold=True, color="FFFFFF")
            header_fill = PatternFill(start_color="366092", end_color="366092", fill_type="solid")
            header_alignment = Alignment(horizontal="center", vertical="center")
            
            for cell in worksheet[1]:
                cell.font = header_font
                cell.fill = header_fill
                cell.alignment = header_alignment
            
            # Auto-adjust column widths
            for column in worksheet.columns:
                max_length = 0
                column_letter = column[0].column_letter
                for cell in column:
                    try:
                        if len(str(cell.value)) > max_length:
                            max_length = len(str(cell.value))
                    except:
                        pass
                adjusted_width = min(max_length + 2, 50)
                worksheet.column_dimensions[column_letter].width = adjusted_width
        
        output.seek(0)
        
        # Return file response
        from fastapi.responses import StreamingResponse
        return StreamingResponse(
            io.BytesIO(output.read()),
            media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            headers={"Content-Disposition": "attachment; filename=employee_import_template.xlsx"}
        )
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error generating template: {str(e)}")


@router.post("/upload/preview", response_model=EmployeeUploadPreviewResponse)
async def preview_employee_upload(
    file: UploadFile = File(),
    current_user: dict = Depends(require_permission("employee:create"))
):
    """Preview employee data from Excel file without importing"""
    try:
        # Debug: Log file information
        print(f"Received file: {file.filename}, size: {file.size}, content_type: {file.content_type}")
        
        # Validate file type
        if not file.filename or not file.filename.endswith(('.xlsx', '.xls')):
            raise HTTPException(status_code=400, detail="File must be an Excel file (.xlsx or .xls)")
        
        # Read Excel file
        contents = await file.read()
        print(f"File contents size: {len(contents)} bytes")
        
        if len(contents) == 0:
            raise HTTPException(status_code=400, detail="File is empty")
        
        df = pd.read_excel(io.BytesIO(contents))
        
        if df.empty:
            raise HTTPException(status_code=400, detail="Excel file is empty")
        
        # Validate each row
        preview_rows = []
        valid_count = 0
        invalid_count = 0
        
        for index, row in df.iterrows():
            row_number = index + 2  # Excel row numbers start from 2 (header is row 1)
            row_data = row.to_dict()
            
            # Validate the row
            is_valid, error_message = validate_employee_upload_row(row_data, row_number)
            
            # Parse data for preview
            try:
                employee_id = str(row_data.get('Emp No', '')).strip()
                company_id = str(row_data.get('CompanyID', '')).strip()
                full_name = str(row_data.get('Name', '')).strip()
                first_name, last_name = parse_employee_name(full_name)
                street = str(row_data.get('Street 1', '')).strip()
                city = str(row_data.get('City', '')).strip()
                province = str(row_data.get('Province', '')).strip()
                postal_code = str(row_data.get('Postal Code', '')).strip()
                phone = str(row_data.get('Phone 1', '')).strip()
                hire_date = pd.to_datetime(row_data.get('Hire Date')).date() if pd.notna(row_data.get('Hire Date')) else None
            except:
                # If we can't parse the data, use defaults
                employee_id = str(row_data.get('Emp No', ''))
                company_id = str(row_data.get('CompanyID', ''))
                full_name = str(row_data.get('Name', ''))
                first_name, last_name = "", ""
                street = str(row_data.get('Street 1', ''))
                city = str(row_data.get('City', ''))
                province = str(row_data.get('Province', ''))
                postal_code = str(row_data.get('Postal Code', ''))
                phone = str(row_data.get('Phone 1', ''))
                hire_date = None
            
            preview_row = EmployeeUploadPreviewRow(
                row_number=row_number,
                employee_id=employee_id,
                company_id=company_id,
                first_name=first_name,
                last_name=last_name,
                full_name=full_name,
                street=street,
                city=city,
                province=province,
                postal_code=postal_code,
                phone=phone,
                hire_date=hire_date,
                will_import=is_valid,
                error_message=error_message
            )
            
            preview_rows.append(preview_row)
            
            if is_valid:
                valid_count += 1
            else:
                invalid_count += 1
        
        return EmployeeUploadPreviewResponse(
            total_rows=len(df),
            valid_rows=valid_count,
            invalid_rows=invalid_count,
            rows=preview_rows
        )
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error processing file: {str(e)}")


@router.post("/upload", response_model=EmployeeUploadResponse)
async def upload_employees(
    file: UploadFile = File(),
    current_user: dict = Depends(require_permission("employee:create"))
):
    """Upload and import employee data from Excel file"""
    try:
        # Debug: Log file information
        print(f"Received file: {file.filename}, size: {file.size}, content_type: {file.content_type}")
        
        # Validate file type
        if not file.filename or not file.filename.endswith(('.xlsx', '.xls')):
            raise HTTPException(status_code=400, detail="File must be an Excel file (.xlsx or .xls)")
        
        # Read Excel file
        contents = await file.read()
        print(f"File contents size: {len(contents)} bytes")
        
        if len(contents) == 0:
            raise HTTPException(status_code=400, detail="File is empty")
        
        df = pd.read_excel(io.BytesIO(contents))
        
        if df.empty:
            raise HTTPException(status_code=400, detail="Excel file is empty")
        
        # Process each row
        success_count = 0
        error_count = 0
        errors = []
        
        for index, row in df.iterrows():
            row_number = index + 2  # Excel row numbers start from 2
            row_data = row.to_dict()
            
            # Validate the row
            is_valid, error_message = validate_employee_upload_row(row_data, row_number)
            
            if not is_valid:
                error_count += 1
                errors.append(EmployeeUploadError(
                    row_number=row_number,
                    error_message=error_message
                ))
                continue
            
            # Try to create the employee record
            try:
                employee_id = str(row_data['Emp No']).strip()
                full_name = str(row_data['Name']).strip()
                first_name, last_name = parse_employee_name(full_name)
                
                # Prepare employee data
                employee_data = {
                    'emp_id': employee_id,
                    'first_name': first_name,
                    'last_name': last_name,
                    'email': None,  # Not provided in Excel
                    'hire_date': pd.to_datetime(row_data['Hire Date']).date() if pd.notna(row_data.get('Hire Date')) else None,
                    'probation_end_date': None,  # Not provided in Excel
                    'seniority_start_date': None,  # Not provided in Excel
                    'performed_by': current_user.get('username', 'Excel Import')
                }
                
                # Create the employee
                employee = create_employee(**employee_data)
                
                if employee:
                    # Update with additional fields
                    update_data = {}
                    
                    # Map Excel columns to employee fields
                    if pd.notna(row_data.get('Street 1')):
                        update_data['street'] = str(row_data['Street 1']).strip()
                    if pd.notna(row_data.get('City')):
                        update_data['city'] = str(row_data['City']).strip()
                    if pd.notna(row_data.get('Province')):
                        update_data['province'] = str(row_data['Province']).strip()
                    if pd.notna(row_data.get('Postal Code')):
                        update_data['postal_code'] = str(row_data['Postal Code']).strip()
                    if pd.notna(row_data.get('Phone 1')):
                        update_data['phone'] = str(row_data['Phone 1']).strip()
                    
                    # Set default values
                    update_data['status'] = 'Active'
                    update_data['paystub'] = False
                    update_data['use_mailing_address'] = False
                    
                    if update_data:
                        update_employee(employee_id, **update_data)
                    
                    # Create employment record to link employee to company
                    try:
                        company_id = str(row_data['CompanyID']).strip()
                        employment = create_employment(
                            employee_id=employee_id,
                            company_id=company_id,
                            start_date=pd.to_datetime(row_data['Hire Date']).date() if pd.notna(row_data.get('Hire Date')) else None,
                            performed_by=current_user.get('username', 'Excel Import')
                        )
                        print(f"Successfully created employment record for employee: {employee_id} with company: {company_id}")
                    except Exception as emp_error:
                        print(f"Warning: Failed to create employment record for employee {employee_id}: {str(emp_error)}")
                        # Don't fail the entire import, just log the warning
                    
                    success_count += 1
                    print(f"Successfully imported employee: {employee_id} - {full_name}")
                else:
                    error_count += 1
                    errors.append(EmployeeUploadError(
                        row_number=row_number,
                        error_message="Failed to create employee record"
                    ))
                
            except Exception as e:
                error_count += 1
                errors.append(EmployeeUploadError(
                    row_number=row_number,
                    error_message=f"Failed to create employee record: {str(e)}"
                ))
        
        return EmployeeUploadResponse(
            success_count=success_count,
            error_count=error_count,
            errors=errors
        )
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error processing file: {str(e)}")
