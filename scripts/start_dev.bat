@echo off
setlocal EnableExtensions
cd /d "%~dp0.."

REM Test the source code (backend + frontend) without rebuilding HRMini.exe.
REM Runs alongside the exe: dev backend on 8889, dev UI on http://localhost:3000
REM Both use the same MySQL database as the exe.

set "DEV_API_PORT=8889"

if exist ".venv\Scripts\activate.bat" call ".venv\Scripts\activate.bat"
if exist "backend\.venv\Scripts\activate.bat" call "backend\.venv\Scripts\activate.bat"

start "HR Mini DEV backend :%DEV_API_PORT%" cmd /k "cd /d backend && python -m uvicorn main:app --host 127.0.0.1 --port %DEV_API_PORT% --reload"
start "HR Mini DEV frontend :3000" cmd /k "cd /d frontend && set VITE_API_PORT=%DEV_API_PORT%&& npm run dev"

echo Dev servers starting in two new windows.
echo Open http://localhost:3000 once the frontend window says "ready".
endlocal
