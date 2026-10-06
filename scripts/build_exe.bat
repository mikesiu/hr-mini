@echo off
setlocal EnableExtensions
cd /d "%~dp0.."

echo ============================================
echo  Build HR Mini desktop app (HRMini.exe)
echo ============================================
echo.

where node >nul 2>&1
if errorlevel 1 (
  echo ERROR: Node.js is required to build the frontend.
  pause
  exit /b 1
)

where python >nul 2>&1
if errorlevel 1 (
  echo ERROR: Python is required to package the app.
  pause
  exit /b 1
)

if exist ".venv\Scripts\activate.bat" call ".venv\Scripts\activate.bat"
if exist "backend\.venv\Scripts\activate.bat" call "backend\.venv\Scripts\activate.bat"

echo [1/4] Installing Python packaging dependencies...
python -m pip install --upgrade pip >nul
python -m pip install -r backend\requirements.txt pyinstaller
if errorlevel 1 (
  echo ERROR: Failed to install Python dependencies.
  pause
  exit /b 1
)

echo [2/4] Installing frontend dependencies...
pushd frontend
call npm install
if errorlevel 1 (
  popd
  echo ERROR: npm install failed.
  pause
  exit /b 1
)

echo [3/4] Building React production bundle (same-origin /api)...
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

if not exist "frontend\build\index.html" (
  echo ERROR: frontend\build\index.html was not created.
  pause
  exit /b 1
)

echo [4/4] Packaging with PyInstaller...
if exist "build\hr_mini" rmdir /s /q "build\hr_mini"
if exist "dist\HRMini" rmdir /s /q "dist\HRMini"
python -m PyInstaller --noconfirm --clean hr_mini.spec
if errorlevel 1 (
  echo ERROR: PyInstaller failed.
  pause
  exit /b 1
)

echo.
echo ============================================
echo  Done.
echo  Launch: dist\HRMini\HRMini.exe
echo  MySQL must be running (same settings as today).
echo ============================================
echo.
explorer "dist\HRMini"
pause
endlocal
