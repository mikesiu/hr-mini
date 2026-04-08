@echo off
setlocal
cd /d "%~dp0"

REM Default: 127.0.0.1:8888 (matches frontend REACT_APP_API_PORT in .env)
if "%HR_MINI_HOST%"=="" set "HR_MINI_HOST=127.0.0.1"
if "%HR_MINI_PORT%"=="" set "HR_MINI_PORT=8888"

if exist ".venv\Scripts\activate.bat" call ".venv\Scripts\activate.bat"
if exist "..\.venv\Scripts\activate.bat" call "..\.venv\Scripts\activate.bat"

echo Starting HR Mini API at http://%HR_MINI_HOST%:%HR_MINI_PORT%/api
echo Override: set HR_MINI_HOST=0.0.0.0 and/or HR_MINI_PORT=8001
python -m uvicorn main:app --host %HR_MINI_HOST% --port %HR_MINI_PORT% --reload

endlocal
