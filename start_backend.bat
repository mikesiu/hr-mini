@echo off
echo Starting HR Mini Backend...
cd /d D:\hr-mini\backend
echo Current directory: %CD%
echo Starting FastAPI server on port 8001...
python -m uvicorn main:app --host 127.0.0.1 --port 8001
pause
