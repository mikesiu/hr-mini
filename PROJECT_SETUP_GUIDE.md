# HR Mini Project Setup Guide

## Project Structure
```
C:\hr-mini\
├── backend\                 # FastAPI Backend
│   ├── main.py             # Main application file
│   ├── api\                # API endpoints
│   ├── services\           # Business logic
│   └── requirements.txt    # Python dependencies
├── frontend\               # React Frontend
│   ├── package.json        # Node.js dependencies
│   ├── src\               # React source code
│   └── public\            # Static assets
└── old_system\            # Legacy system models
    └── app\models\        # SQLAlchemy models
```

## Backend Setup
**Location**: `C:\hr-mini\backend`
**Command**: `python -m uvicorn main:app --host 127.0.0.1 --port 8004`
**API URL**: `http://localhost:8004/api`
**Database**: MySQL

## Frontend Setup
**Location**: `C:\hr-mini\frontend`
**Command**: `npm start`
**URL**: `http://localhost:3000`
**API Target**: `http://localhost:8004/api`

## Startup Sequence
1. **Start Backend First**:
   ```bash
   cd C:\hr-mini\backend
   python -m uvicorn main:app --host 127.0.0.1 --port 8004
   ```

2. **Start Frontend Second**:
   ```bash
   cd C:\hr-mini\frontend
   npm start
   ```

## Common Issues & Solutions
- **Port Conflicts**: Use port 8004 for backend (8002, 8003 often occupied)
- **Directory Issues**: Always start from correct directory (backend/ or frontend/)
- **Proxy Errors**: Frontend proxy in package.json must point to correct backend port (8004)
- **Login Issues**: Admin user exists with credentials `admin`/`admin`

## Proxy Configuration
The frontend uses a proxy configuration in `package.json`:
```json
"proxy": "http://localhost:8004"
```
This must match the backend port (8004).

## Debug Information
- Backend logs show startup and API requests
- Frontend console shows role update debug logs
- Check browser console (F12) for detailed error information

## Key Files
- `frontend/src/api/client.ts` - API configuration
- `frontend/src/pages/UserPage.tsx` - Role management with debug logging
- `backend/api/users.py` - User and role API endpoints
- `backend/api/auth.py` - Authentication endpoints
