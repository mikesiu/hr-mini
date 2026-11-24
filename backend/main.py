from fastapi import FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse, JSONResponse
from fastapi.exceptions import RequestValidationError
import os
import sys
from pathlib import Path
import time

# Add the current directory to Python path for local imports
sys.path.append(str(Path(__file__).parent))

# Import API routes
from api import auth, employees, employment, leaves, salary, work_permits, expenses, companies, users, audit, reports, dashboard, holidays, termination, work_schedules, attendance, vacation_payroll, codes

# Create FastAPI app
app = FastAPI(
    title="HR Mini API",
    description="HR Management System API",
    version="2.2.1"
)

# Request logging middleware
@app.middleware("http")
async def log_requests(request: Request, call_next):
    start_time = time.time()
    print(f"REQUEST: {request.method} {request.url}")
    print(f"Headers: {dict(request.headers)}")
    
    response = await call_next(request)
    
    process_time = time.time() - start_time
    print(f"RESPONSE: {response.status_code} - {process_time:.4f}s")
    
    return response

# CORS middleware for React frontend.
# Vite production builds load JS with crossorigin; browsers reject the invalid
# combination Access-Control-Allow-Origin: * + Allow-Credentials: true, which
# shows up as a blank page. Reflect the request Origin instead.
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "http://localhost:8888",
        "http://127.0.0.1:8888",
    ],
    allow_origin_regex=r"https?://(localhost|127\.0\.0\.1|(\d{1,3}\.){3}\d{1,3})(:\d+)?",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Global exception handler for validation errors
@app.exception_handler(RequestValidationError)
async def validation_exception_handler(request: Request, exc: RequestValidationError):
    print(f"VALIDATION ERROR: {exc.errors()}")
    print(f"Request URL: {request.url}")
    print(f"Request method: {request.method}")
    print(f"Request headers: {dict(request.headers)}")
    return JSONResponse(
        status_code=422,
        content={"detail": "Validation error", "errors": exc.errors()}
    )

# Global exception handler for HTTP exceptions
@app.exception_handler(HTTPException)
async def http_exception_handler(request: Request, exc: HTTPException):
    print(f"HTTPException caught: {exc.status_code} - {exc.detail}")
    return JSONResponse(
        status_code=exc.status_code,
        content={"detail": exc.detail}
    )

# Health check endpoint
@app.get("/api/health")
async def health_check():
    return {"status": "healthy", "message": "HR Mini API is running"}

# Include API routes
print("Registering API routes...")
app.include_router(auth.router, prefix="/api/auth", tags=["Authentication"])
app.include_router(employees.router, prefix="/api/employees", tags=["Employees"])
print("Employees router registered with routes:", [route.path for route in employees.router.routes])
app.include_router(employment.router, prefix="/api/employment", tags=["Employment"])
app.include_router(leaves.router, prefix="/api/leaves", tags=["Leaves"])
print("Leaves router registered with routes:", [route.path for route in leaves.router.routes])
app.include_router(vacation_payroll.router, prefix="/api/leave-payroll", tags=["Leave Payroll"])
app.include_router(salary.router, prefix="/api/salary", tags=["Salary"])
app.include_router(work_permits.router, prefix="/api/work-permits", tags=["Work Permits"])
app.include_router(expenses.router, prefix="/api/expenses", tags=["Expenses"])
app.include_router(companies.router, prefix="/api/companies", tags=["Companies"])
app.include_router(users.router, prefix="/api/users", tags=["Users"])
app.include_router(audit.router, prefix="/api/audit", tags=["Audit"])
app.include_router(reports.router, prefix="/api/reports", tags=["Reports"])
app.include_router(dashboard.router, prefix="/api/dashboard", tags=["Dashboard"])
app.include_router(holidays.router, prefix="/api/holidays", tags=["Holidays"])
app.include_router(termination.router, prefix="/api/terminations", tags=["Terminations"])
app.include_router(work_schedules.router, prefix="/api/work-schedules", tags=["Work Schedules"])
app.include_router(attendance.router, prefix="/api/attendance", tags=["Attendance"])
app.include_router(codes.router, prefix="/api/codes", tags=["Code Values"])
print("All routes registered successfully!")

try:
    from repos.work_permit_repo import ensure_work_permit_schema
    ensure_work_permit_schema()
except Exception as e:
    print(f"Work permit schema check failed: {e}")

# Serve the React production build when present (single-server / desktop mode).
from app_paths import frontend_build_dir

_FRONTEND_BUILD = frontend_build_dir()
_INDEX_HTML = _FRONTEND_BUILD / "index.html"
_HAS_FRONTEND = _INDEX_HTML.is_file()

if _HAS_FRONTEND:
    # CRA used /static; Vite uses /assets. Mount whichever exists.
    _static_dir = _FRONTEND_BUILD / "static"
    if _static_dir.is_dir():
        app.mount("/static", StaticFiles(directory=str(_static_dir)), name="frontend-static")
    _assets_dir = _FRONTEND_BUILD / "assets"
    if _assets_dir.is_dir():
        app.mount("/assets", StaticFiles(directory=str(_assets_dir)), name="frontend-assets")
    print(f"Serving frontend from: {_FRONTEND_BUILD}")

    # index.html must not be cached, or browsers keep loading the previous build's JS after a rebuild
    _NO_CACHE = {"Cache-Control": "no-cache, no-store, must-revalidate"}

    @app.get("/")
    async def root():
        return FileResponse(_INDEX_HTML, headers=_NO_CACHE)

    @app.get("/{full_path:path}")
    async def serve_spa(full_path: str):
        # API routes are registered above; this only catches non-API paths.
        if full_path.startswith("api/") or full_path == "api":
            raise HTTPException(status_code=404, detail="Not found")
        # Never SPA-fallback missing hashed assets — that returns HTML as JS and blanks the UI.
        if full_path.startswith(("assets/", "static/")):
            raise HTTPException(status_code=404, detail="Not found")
        candidate = (_FRONTEND_BUILD / full_path).resolve()
        try:
            candidate.relative_to(_FRONTEND_BUILD.resolve())
        except ValueError:
            raise HTTPException(status_code=404, detail="Not found")
        if candidate.is_file():
            return FileResponse(candidate)
        return FileResponse(_INDEX_HTML, headers=_NO_CACHE)
else:
    @app.get("/")
    async def root():
        return {
            "message": "HR Mini API - Development mode",
            "hint": "Build the frontend (npm run build) or run scripts/build_exe.bat to serve the UI from this server.",
        }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="127.0.0.1", port=8888)
