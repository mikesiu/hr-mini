from fastapi import APIRouter, Depends, HTTPException, Query
from typing import List, Optional
from api.dependencies import get_current_user, require_permission
import sys
from pathlib import Path
sys.path.append(str(Path(__file__).parent.parent))
from repos.user_repo import list_users, list_roles, set_user_password, get_user_by_username
from services.auth_service import serialize_user
from utils.security import verify_password

router = APIRouter()

@router.get("/")
async def list_users_endpoint(
    current_user: dict = Depends(require_permission("user:view"))
):
    """Get list of users"""
    try:
        users = list_users(include_inactive=True)
        user_list = [serialize_user(user) for user in users]
        return {"success": True, "data": user_list}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error fetching users: {str(e)}")

@router.get("/roles")
async def list_roles_endpoint(
    current_user: dict = Depends(require_permission("user:view"))
):
    """Get list of roles"""
    try:
        roles = list_roles()
        role_list = [
            {
                "id": role.id,
                "code": role.code,
                "name": role.name,
                "permissions": role.permissions or []
            }
            for role in roles
        ]
        return {"success": True, "data": role_list}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error fetching roles: {str(e)}")

@router.post("/")
async def create_user_endpoint(
    user_data: dict,
    current_user: dict = Depends(require_permission("user:create"))
):
    """Create a new user"""
    try:
        from repos.user_repo import create_user
        new_user = create_user(
            username=user_data["username"],
            password=user_data["password"],
            display_name=user_data.get("display_name"),
            email=user_data.get("email"),
            is_active=user_data.get("is_active", True),
            role_codes=user_data.get("role_codes", [])
        )
        return {"success": True, "data": serialize_user(new_user)}
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error creating user: {str(e)}")

@router.put("/{user_id}")
async def update_user_endpoint(
    user_id: int,
    user_data: dict,
    current_user: dict = Depends(require_permission("user:edit"))
):
    """Update an existing user"""
    try:
        from repos.user_repo import get_user_by_username, assign_roles
        from models.base import SessionLocal
        from models.user import User
        from sqlalchemy.orm import selectinload
        
        with SessionLocal() as session:
            # Load user with roles to avoid lazy loading issues
            user = session.query(User).options(selectinload(User.roles)).filter(User.id == user_id).first()
            if not user:
                raise HTTPException(status_code=404, detail="User not found")
            
            # Update basic fields
            if "display_name" in user_data:
                user.display_name = user_data["display_name"]
            if "email" in user_data:
                user.email = user_data["email"]
            if "is_active" in user_data:
                user.is_active = user_data["is_active"]
            
            # Update roles if provided
            if "role_codes" in user_data:
                assign_roles(user_id, user_data["role_codes"])
            
            session.commit()
            session.refresh(user)
            
        return {"success": True, "data": serialize_user(user)}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error updating user: {str(e)}")

@router.delete("/{user_id}")
async def delete_user_endpoint(
    user_id: int,
    current_user: dict = Depends(require_permission("user:delete"))
):
    """Delete a user"""
    try:
        from models.base import SessionLocal
        from models.user import User
        
        with SessionLocal() as session:
            user = session.get(User, user_id)
            if not user:
                raise HTTPException(status_code=404, detail="User not found")
            
            # Prevent deleting the current user
            if user.username == current_user.get("username"):
                raise HTTPException(status_code=400, detail="Cannot delete your own account")
            
            session.delete(user)
            session.commit()
            
        return {"success": True, "message": "User deleted successfully"}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error deleting user: {str(e)}")

@router.put("/me/password")
async def change_my_password_endpoint(
    password_data: dict,
    current_user: dict = Depends(get_current_user)
):
    """Change current user's own password"""
    try:
        
        # Verify current password
        current_password = password_data.get("current_password")
        new_password = password_data.get("new_password")
        
        if not current_password or not new_password:
            raise HTTPException(status_code=400, detail="Current password and new password are required")
        
        # Get user by username to verify current password
        user = get_user_by_username(current_user["username"])
        if not user:
            raise HTTPException(status_code=404, detail="User not found")
        
        # Verify current password
        if not verify_password(current_password, user.password_hash):
            raise HTTPException(status_code=400, detail="Current password is incorrect")
        
        # Set new password
        set_user_password(user.id, new_password)
            
        return {"success": True, "message": "Password changed successfully"}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error changing password: {str(e)}")

@router.put("/{user_id}/password")
async def change_user_password_endpoint(
    user_id: int,
    password_data: dict,
    current_user: dict = Depends(require_permission("user:edit"))
):
    """Change user password (admin only)"""
    try:
        # Set new password directly using user_id
        set_user_password(user_id, password_data["new_password"])
            
        return {"success": True, "message": "Password changed successfully"}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error changing password: {str(e)}")

@router.post("/roles")
async def create_role_endpoint(
    role_data: dict,
    current_user: dict = Depends(require_permission("user:manage"))
):
    """Create a new role"""
    try:
        from repos.user_repo import ensure_role
        role = ensure_role(
            code=role_data["code"],
            name=role_data["name"],
            permissions=role_data.get("permissions", [])
        )
        return {
            "success": True, 
            "data": {
                "id": role.id,
                "code": role.code,
                "name": role.name,
                "permissions": role.permissions or []
            }
        }
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error creating role: {str(e)}")

@router.put("/roles/{role_id}")
async def update_role_endpoint(
    role_id: int,
    role_data: dict,
    current_user: dict = Depends(require_permission("user:manage"))
):
    """Update an existing role"""
    try:
        from models.base import SessionLocal
        from models.user import Role as UserRole
        
        with SessionLocal() as session:
            role = session.get(UserRole, role_id)
            if not role:
                raise HTTPException(status_code=404, detail="Role not found")
            
            # Update role fields
            if "name" in role_data:
                role.name = role_data["name"]
            if "permissions" in role_data:
                role.permissions = role_data["permissions"]
            
            session.commit()
            session.refresh(role)
            
        return {
            "success": True,
            "data": {
                "id": role.id,
                "code": role.code,
                "name": role.name,
                "permissions": role.permissions or []
            }
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error updating role: {str(e)}")

@router.delete("/roles/{role_id}")
async def delete_role_endpoint(
    role_id: int,
    current_user: dict = Depends(require_permission("user:manage"))
):
    """Delete a role"""
    try:
        from models.base import SessionLocal
        from models.user import Role as UserRole, UserRole as UserRoleMapping
        
        with SessionLocal() as session:
            role = session.get(UserRole, role_id)
            if not role:
                raise HTTPException(status_code=404, detail="Role not found")
            
            # Check if any users have this role
            user_count = session.query(UserRoleMapping).filter(UserRoleMapping.role_id == role_id).count()
            if user_count > 0:
                raise HTTPException(
                    status_code=400, 
                    detail=f"Cannot delete role. {user_count} user(s) are assigned to this role."
                )
            
            session.delete(role)
            session.commit()
            
        return {"success": True, "message": "Role deleted successfully"}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error deleting role: {str(e)}")
