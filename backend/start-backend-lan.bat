@echo off
REM Bind API on 0.0.0.0 so other PCs on the LAN can reach http://<this-ip>:8888
REM (localhost-only binding will NOT work from another machine.)
setlocal
cd /d "%~dp0"
set "HR_MINI_HOST=0.0.0.0"
if "%HR_MINI_PORT%"=="" set "HR_MINI_PORT=8888"

if exist ".venv\Scripts\activate.bat" call ".venv\Scripts\activate.bat"
if exist "..\.venv\Scripts\activate.bat" call "..\.venv\Scripts\activate.bat"

echo HR Mini API (LAN): http://0.0.0.0:%HR_MINI_PORT%/api — use your PC IP from other devices
echo If the other PC cannot connect, run frontend\scripts\allow-lan-firewall.ps1 as Administrator
python -m uvicorn main:app --host 0.0.0.0 --port %HR_MINI_PORT% --reload

endlocal
