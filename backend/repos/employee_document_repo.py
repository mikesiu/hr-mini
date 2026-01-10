from __future__ import annotations
from datetime import date
from typing import Optional, List
from pathlib import Path
import os

from sqlalchemy import select, func
from sqlalchemy.exc import IntegrityError

from models.base import SessionLocal
from models.employee_document import EmployeeDocument
from services.audit_service import log_action
from utils.serialization import model_to_dict


def get_documents_by_employee(emp_id: str) -> List[EmployeeDocument]:
    """Get all documents for a specific employee."""
    with SessionLocal() as session:
        stmt = select(EmployeeDocument).where(EmployeeDocument.employee_id == emp_id).order_by(EmployeeDocument.upload_date.desc())
        return session.execute(stmt).scalars().all()


def get_document(doc_id: str) -> Optional[EmployeeDocument]:
    """Get a single document by its ID."""
    with SessionLocal() as session:
        return session.get(EmployeeDocument, doc_id)


def add_document(
    emp_id: str,
    document_type: str,
    file_path: str,
    description: str = None,
    upload_date: date = None,
    performed_by: str = None,
) -> EmployeeDocument:
    """Add a new document record for an employee."""
    if not emp_id or not document_type or not file_path:
        raise ValueError("Employee ID, document type, and file path are required")
    
    # Validate file path exists
    if not Path(file_path).exists():
        raise ValueError(f"File not found: {file_path}")
    
    # Generate document ID
    with SessionLocal() as session:
        # Get the next available document ID
        result = session.execute(
            select(func.max(EmployeeDocument.id))
            .where(EmployeeDocument.id.like("DOC%"))
        ).scalar_one_or_none()
        
        if result:
            # Extract number and increment
            try:
                next_num = int(result[3:]) + 1
            except (ValueError, IndexError):
                next_num = 1
        else:
            next_num = 1
        
        doc_id = f"DOC{next_num:03d}"
    
    if upload_date is None:
        upload_date = date.today()
    
    with SessionLocal() as session:
        document = EmployeeDocument(
            id=doc_id,
            employee_id=emp_id,
            document_type=document_type,
            file_path=file_path,
            description=description,
            upload_date=upload_date,
        )
        session.add(document)
        try:
            session.commit()
        except IntegrityError as exc:
            session.rollback()
            message = str(exc)
            if "UNIQUE" in message or "duplicate" in message.lower():
                raise ValueError(f"Document ID '{doc_id}' already exists.") from exc
            raise ValueError(f"Database error: {message}") from exc
        session.refresh(document)

        log_action(
            entity="employee_document",
            entity_id=document.id,
            action="create",
            changed_by=performed_by,
            after=model_to_dict(document),
        )
        return document


def update_document(
    doc_id: str,
    document_type: str = None,
    file_path: str = None,
    description: str = None,
    upload_date: date = None,
    performed_by: str = None,
) -> Optional[EmployeeDocument]:
    """Update an existing document record."""
    with SessionLocal() as session:
        document = session.get(EmployeeDocument, doc_id)
        if not document:
            return None

        # Validate file path if provided
        if file_path and not Path(file_path).exists():
            raise ValueError(f"File not found: {file_path}")

        before = model_to_dict(document)

        # Update fields if provided
        if document_type is not None:
            document.document_type = document_type
        if file_path is not None:
            document.file_path = file_path
        if description is not None:
            document.description = description
        if upload_date is not None:
            document.upload_date = upload_date

        session.commit()
        session.refresh(document)

        log_action(
            entity="employee_document",
            entity_id=document.id,
            action="update",
            changed_by=performed_by,
            before=before,
            after=model_to_dict(document),
        )
        return document


def delete_document(doc_id: str, performed_by: str = None) -> bool:
    """Delete a document record."""
    with SessionLocal() as session:
        document = session.get(EmployeeDocument, doc_id)
        if not document:
            return False

        before = model_to_dict(document)
        session.delete(document)
        session.commit()

        log_action(
            entity="employee_document",
            entity_id=doc_id,
            action="delete",
            changed_by=performed_by,
            before=before,
        )
        return True


def open_document(file_path: str) -> bool:
    """Open a document using the system's default application."""
    try:
        if not Path(file_path).exists():
            return False
        
        # Use os.startfile on Windows to open with default application
        os.startfile(file_path)
        return True
    except Exception:
        return False


def validate_file_path(file_path: str) -> tuple[bool, str]:
    """Validate if a file path exists and is accessible."""
    try:
        path = Path(file_path)
        if not path.exists():
            return False, "File does not exist"
        if not path.is_file():
            return False, "Path is not a file"
        if not os.access(file_path, os.R_OK):
            return False, "File is not readable"
        return True, "File is valid"
    except Exception as e:
        return False, f"Error validating file: {str(e)}"
