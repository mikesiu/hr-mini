@echo off
setlocal EnableExtensions
cd /d "%~dp0.."

REM One-click start without rebuilding the .exe.
REM Serves backend + built React UI on http://127.0.0.1:8888

if exist ".venv\Scripts\activate.bat" call ".venv\Scripts\activate.bat"
if exist "backend\.venv\Scripts\activate.bat" call "backend\.venv\Scripts\activate.bat"

if not exist "frontend\build\index.html" (
  echo Frontend build not found. Building once...
  pushd frontend
  call npm install
  if errorlevel 1 (
    popd
    echo ERROR: npm install failed.
    pause
    exit /b 1
  )
  set "REACT_APP_API_URL=/api"
  set "NODE_OPTIONS=--no-deprecation"
  call npm run build
  if errorlevel 1 (
    popd
    echo ERROR: frontend build failed.
    pause
    exit /b 1
  )
  popd
)

if "%HR_MINI_HOST%"=="" set "HR_MINI_HOST=127.0.0.1"
if "%HR_MINI_PORT%"=="" set "HR_MINI_PORT=8888"

echo Starting HR Mini at http://%HR_MINI_HOST%:%HR_MINI_PORT%/
python backend\run_desktop.py
if errorlevel 1 (
  echo.
  echo HR Mini exited with an error. Check MySQL and Python dependencies.
  pause
)
endlocal
