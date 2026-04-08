# Port Management Guide for Windows

This guide teaches you how to kill processes and close ports on Windows systems, specifically for development work with web servers and APIs.

## 🎯 Quick Reference

### Most Common Commands
```powershell
# Find what's using a port
netstat -ano | findstr :8001

# Kill specific process
taskkill /PID <PID_NUMBER> /F

# Verify port is free
netstat -ano | findstr :8001
```

## 📋 Method 1: Find Process by Port, Then Kill (Recommended)

This is the most precise method - you find exactly what's using the port and kill only that process.

### Step-by-Step Process

1. **Find what's using the port:**
   ```powershell
   netstat -ano | findstr :8001
   ```
   
   Example output:
   ```
   TCP    127.0.0.1:8001         0.0.0.0:0              LISTENING       19956
   TCP    127.0.0.1:8001         0.0.0.0:0              LISTENING       3096
   ```

2. **Kill the specific process(es):**
   ```powershell
   taskkill /PID 19956 /F
   taskkill /PID 3096 /F
   ```

3. **Verify the port is free:**
   ```powershell
   netstat -ano | findstr :8001
   ```
   (Should return nothing if successful)

## 🔧 Method 2: Kill All Python Processes (Quick but Broad)

Use this when you know the processes are Python-based (like uvicorn, FastAPI, etc.).

```powershell
# Find all Python processes
tasklist | findstr python

# Kill all Python processes
taskkill /F /IM python.exe
```

**⚠️ Warning:** This kills ALL Python processes on your system, including other Python applications you might have running.

## 🎯 Method 3: Kill by Process Name

If you know the specific process name:

```powershell
# Kill all uvicorn processes
taskkill /F /IM uvicorn.exe

# Kill all node processes
taskkill /F /IM node.exe

# Kill all java processes
taskkill /F /IM java.exe
```

## ⚡ Method 4: One-Liner Script (Advanced)

Kill all processes using a specific port in one command:

```powershell
# For port 8001
for /f "tokens=5" %a in ('netstat -aon ^| findstr :8001') do taskkill /F /PID %a

# For port 3000
for /f "tokens=5" %a in ('netstat -aon ^| findstr :3000') do taskkill /F /PID %a
```

## 💪 Method 5: Using PowerShell (Most Powerful)

For advanced users, PowerShell offers more control:

```powershell
# Find and kill process using port 8001
Get-NetTCPConnection -LocalPort 8001 | ForEach-Object { Stop-Process -Id $_.OwningProcess -Force }

# Find and kill process using port 3000
Get-NetTCPConnection -LocalPort 3000 | ForEach-Object { Stop-Process -Id $_.OwningProcess -Force }
```

## 📊 Command Reference Table

| Command | Purpose | Example |
|---------|---------|---------|
| `netstat -ano \| findstr :PORT` | Find process using port | `netstat -ano \| findstr :8001` |
| `taskkill /PID XXXX /F` | Kill specific process | `taskkill /PID 19956 /F` |
| `taskkill /F /IM process.exe` | Kill all processes by name | `taskkill /F /IM python.exe` |
| `tasklist \| findstr process` | List processes | `tasklist \| findstr python` |
| `tasklist` | List all processes | `tasklist` |

## 🚀 Common Development Workflows

### Starting Fresh Backend Server
```powershell
# 1. Kill any existing processes on port 8001
netstat -ano | findstr :8001
taskkill /PID <PID_FROM_ABOVE> /F

# 2. Start fresh backend
cd backend
python -m uvicorn main:app --reload --port 8001
```

### Starting Fresh Frontend Server
```powershell
# 1. Kill any existing processes on port 3000
netstat -ano | findstr :3000
taskkill /PID <PID_FROM_ABOVE> /F

# 2. Start fresh frontend
cd frontend
npm start
```

### Complete System Reset
```powershell
# Kill all development processes
taskkill /F /IM python.exe
taskkill /F /IM node.exe

# Start backend
cd backend
python -m uvicorn main:app --reload --port 8001

# Start frontend (in new terminal)
cd frontend
npm start
```

## ⚠️ Important Notes

1. **`/F` flag** = Force kill (required for stubborn processes)
2. **Always verify** the port is free after killing
3. **Be careful** with broad commands like `taskkill /F /IM python.exe`
4. **PID** = Process ID (unique number for each running process)
5. **Some system processes** (PID 4, 0) cannot be killed - this is normal

## 🔍 Troubleshooting

### "Access is denied" Error
- Run Command Prompt as Administrator
- Some processes require elevated privileges to kill

### Process Won't Die
- Use `/F` flag for force kill: `taskkill /PID XXXX /F`
- Try killing parent process first
- Restart computer if all else fails

### Port Still Shows as Used
- Wait a few seconds - ports take time to release
- Check if another process started using it
- Try a different port number

## 🎯 Quick Commands for Common Ports

```powershell
# Kill processes on common development ports
netstat -ano | findstr :3000 && taskkill /PID <PID> /F  # React/Node
netstat -ano | findstr :8000 && taskkill /PID <PID> /F  # Alternative backend
netstat -ano | findstr :8001 && taskkill /PID <PID> /F  # Your backend
netstat -ano | findstr :5000 && taskkill /PID <PID> /F  # Flask
netstat -ano | findstr :8080 && taskkill /PID <PID> /F  # Tomcat/Java
```

## 📝 Best Practices

1. **Always check first** - Use `netstat` before killing
2. **Be specific** - Kill only the processes you need to
3. **Verify results** - Check that the port is actually free
4. **Document your ports** - Keep track of which ports your services use
5. **Use consistent ports** - Stick to the same ports for the same services

---

**Remember:** When in doubt, start with Method 1 (find by port, then kill specific PID) as it's the safest and most precise approach.
