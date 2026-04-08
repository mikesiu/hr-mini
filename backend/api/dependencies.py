from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from jose import JWTError, jwt
from datetime import datetime, timedelta
from typing import Optional
import os

# Import existing auth service
import sys
from pathlib import Path
sys.path.append(str(Path(__file__).parent.parent))
from services.auth_service import authenticate, serialize_user
from repos.user_repo import get_user_by_username

# JWT Configuration
SECRET_KEY = "your-secret-key-change-in-production"  # Fixed secret key for debugging
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 30

security = HTTPBearer()

def create_access_token(data: dict, expires_delta: Optional[timedelta] = None):
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt

def verify_token(token: str) -> Optional[dict]:
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        username: str = payload.get("sub")
        if username is None:
            return None
        return payload
    except JWTError:
        return None

async def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)):
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Not authenticated",
        headers={"WWW-Authenticate": "Bearer"},
    )
    
    try:
        token = credentials.credentials
        payload = verify_token(token)
        if payload is None:
            print("get_current_user: Token verification failed - invalid token")
            raise credentials_exception
        
        username: str = payload.get("sub")
        if username is None:
            print("get_current_user: Token verification failed - no username in payload")
            raise credentials_exception
        
        user = get_user_by_username(username)
        if user is None:
            print(f"get_current_user: User not found - username={username}")
            raise credentials_exception
        
        user_data = serialize_user(user)
        print(f"get_current_user: Successfully authenticated user={username}, permissions={user_data.get('permissions', [])}")
        return user_data
    except HTTPException:
        raise
    except Exception as e:
        print(f"get_current_user: Unexpected error: {type(e).__name__}: {str(e)}")
        import traceback
        traceback.print_exc()
        raise credentials_exception

def require_permission(permission: str):
    def permission_checker(current_user: dict = Depends(get_current_user)):
        user_permissions = set(current_user.get("permissions", []))
        if "*" not in user_permissions and permission not in user_permissions:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Permission '{permission}' required"
            )
        return current_user
    return permission_checker
