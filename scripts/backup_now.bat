@echo off
REM HR Mini MySQL backup (5 working-day retention)
REM Scheduled: Mon-Fri 4:00 PM via Task Scheduler "HR Mini MySQL Backup"
REM Local:  C:\hr-mini\backups
REM Drive:  G:\Shared drives\4.HR & Payroll\Backups  (auto-copied when available)

setlocal
cd /d "C:\hr-mini"

if not exist "C:\hr-mini\backups" mkdir "C:\hr-mini\backups"

set "LOG=C:\hr-mini\backups\backup_run.log"
echo ===== %DATE% %TIME% =====>> "%LOG%"

python "C:\hr-mini\scripts\backup_now.py" %* >> "%LOG%" 2>&1
set "RC=%ERRORLEVEL%"

echo Exit code: %RC%>> "%LOG%"
echo.>> "%LOG%"
exit /b %RC%
