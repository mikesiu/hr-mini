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
from api import auth, employees, employment, leaves, salary, work_permits, expenses, companies, users, audit, reports, dashboard, holidays, termination, work_schedules, attendance

# Create FastAPI app
app = FastAPI(
    title="HR Mini API",
    description="HR Management System API",
    version="1.0.0"
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

# CORS middleware for React frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Allow all origins for testing
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
    response = JSONResponse(
        status_code=422,
        content={"detail": "Validation error", "errors": exc.errors()}
    )
    # Ensure CORS headers are added
    response.headers["Access-Control-Allow-Origin"] = "*"
    response.headers["Access-Control-Allow-Methods"] = "*"
    response.headers["Access-Control-Allow-Headers"] = "*"
    return response

# Global exception handler for HTTP exceptions
@app.exception_handler(HTTPException)
async def http_exception_handler(request: Request, exc: HTTPException):
    print(f"HTTPException caught: {exc.status_code} - {exc.detail}")
    response = JSONResponse(
        status_code=exc.status_code,
        content={"detail": exc.detail}
    )
    # Ensure CORS headers are added
    response.headers["Access-Control-Allow-Origin"] = "*"
    response.headers["Access-Control-Allow-Methods"] = "*"
    response.headers["Access-Control-Allow-Headers"] = "*"
    return response

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
print("All routes registered successfully!")

# Development mode - just serve API
@app.get("/")
async def root():
    return {"message": "HR Mini API - Development mode"}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8001)
