@echo off
echo Killing all processes using port 8001...
echo.

REM Find all processes using port 8001
for /f "tokens=5" %%a in ('netstat -ano ^| findstr :8001') do (
    echo Found process ID: %%a
    taskkill /F /PID %%a 2>nul
    if errorlevel 1 (
        echo Failed to kill process %%a (may not exist or may require admin rights)
    ) else (
        echo Successfully killed process %%a
    )
)

echo.
echo Checking for any remaining processes...
netstat -ano | findstr :8001
if errorlevel 1 (
    echo Port 8001 is now free!
) else (
    echo Warning: Some processes may still be using port 8001
    echo You may need to run this script as Administrator
)

pause

