from fastapi import APIRouter, Depends, HTTPException, status
from datetime import timedelta
from schemas import LoginRequest, LoginResponse
from api.dependencies import create_access_token, ACCESS_TOKEN_EXPIRE_MINUTES, get_current_user
import sys
from pathlib import Path
sys.path.append(str(Path(__file__).parent.parent))
from services.auth_service import authenticate

router = APIRouter()

@router.post("/login")
async def login(login_data: LoginRequest):
    """Authenticate user and return JWT token"""
    print(f"Login attempt for username: {login_data.username}")
    
    try:
        print("Calling authenticate function...")
        user = authenticate(login_data.username, login_data.password)
        print(f"Authenticate result: {user}")
        
        if not user:
            print("Authentication failed - returning error response")
            from fastapi.responses import JSONResponse
            return JSONResponse(
                status_code=200,
                content={
                    "success": False,
                    "error": "Incorrect username or password",
                    "access_token": None,
                    "token_type": None,
                    "user": None
                }
            )
        
        print("Authentication successful - generating JWT token")
        
        # Create access token
        from datetime import timedelta
        from api.dependencies import create_access_token
        
        ACCESS_TOKEN_EXPIRE_MINUTES = 30
        access_token_expires = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
        access_token = create_access_token(
            data={"sub": user.username}, expires_delta=access_token_expires
        )
        
        # Serialize user data
        from services.auth_service import serialize_user
        user_data = serialize_user(user)
        
        print("Login successful - returning JWT token and user data")
        return {
            "access_token": access_token,
            "token_type": "bearer",
            "user": user_data
        }
        
    except Exception as e:
        print(f"Exception in login: {e}")
        import traceback
        traceback.print_exc()
        from fastapi.responses import JSONResponse
        return JSONResponse(
            status_code=200,
            content={
                "success": False,
                "error": f"Login error: {str(e)}",
                "access_token": None,
                "token_type": None,
                "user": None
            }
        )

@router.post("/extend-session")
async def extend_session(current_user: dict = Depends(get_current_user)):
    """Extend user session by creating a new JWT token"""
    try:
        # Create new access token with 30 minutes expiration
        access_token_expires = timedelta(minutes=30)
        access_token = create_access_token(
            data={"sub": current_user["username"]}, expires_delta=access_token_expires
        )
        
        return {
            "access_token": access_token,
            "token_type": "bearer",
            "expires_in": 1800  # 30 minutes in seconds
        }
        
    except Exception as e:
        print(f"Exception in extend_session: {e}")
        import traceback
        raise HTTPException(
            status_code=500,
            detail=f"Failed to extend session: {str(e)}"
        )

@router.post("/logout")
async def logout():
    """Logout endpoint (client-side token removal)"""
    return {"message": "Successfully logged out"}

@router.post("/test-error")
async def test_error():
    """Test endpoint to check error handling"""
    from fastapi import HTTPException
    raise HTTPException(
        status_code=401,
        detail="Test error message"
    )

@router.post("/test-success")
async def test_success():
    """Test endpoint that returns success with error message"""
    return {"success": False, "message": "Test error message", "status": 401}



