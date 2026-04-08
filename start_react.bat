@echo off
echo Starting HR Mini React + FastAPI Application...
echo.

REM Check if Python is available
python --version >nul 2>&1
if errorlevel 1 (
    echo Error: Python is not installed or not in PATH
    echo Please install Python and try again
    pause
    exit /b 1
)

REM Check if Node.js is available
node --version >nul 2>&1
if errorlevel 1 (
    echo Error: Node.js is not installed or not in PATH
    echo Please install Node.js and try again
    pause
    exit /b 1
)

echo Building React frontend...
cd frontend
call npm install
if errorlevel 1 (
    echo Error: Failed to install npm dependencies
    pause
    exit /b 1
)

call npm run build
if errorlevel 1 (
    echo Error: Failed to build React frontend
    pause
    exit /b 1
)

cd ..

echo Installing Python dependencies...
pip install -r backend/requirements.txt
if errorlevel 1 (
    echo Error: Failed to install Python dependencies
    pause
    exit /b 1
)

echo Starting FastAPI server...
echo.
echo The application will be available at: http://localhost:8002
echo Press Ctrl+C to stop the server
echo.

cd backend
uvicorn main:app --host 0.0.0.0 --port 8002
