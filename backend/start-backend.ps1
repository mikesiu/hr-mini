<#
.SYNOPSIS
    Start the HR Mini FastAPI server (uvicorn).

.DESCRIPTION
    Defaults to http://127.0.0.1:8888 to match frontend .env REACT_APP_API_PORT.
    Binding 0.0.0.0 on some Windows setups triggers WinError 10013; use -ListenAll only if you need LAN access.

.PARAMETER HostAddr
    Bind address. Default 127.0.0.1. Override with env HR_MINI_HOST.

.PARAMETER Port
    TCP port. Default 8888. Override with env HR_MINI_PORT.

.PARAMETER ListenAll
    Bind 0.0.0.0 instead of 127.0.0.1 (may require admin or hit permission errors on some PCs).

.EXAMPLE
    .\start-backend.ps1
.EXAMPLE
    .\start-backend.ps1 -Port 8001
    # If 8888 is blocked, set frontend REACT_APP_API_PORT=8001 to match.
.EXAMPLE
    .\start-backend.ps1 -ListenAll
#>
param(
    [Alias("Host")]
    [string] $HostAddr = $env:HR_MINI_HOST,
    [int] $Port = 0,
    [switch] $ListenAll
)

$ErrorActionPreference = "Stop"
$BackendRoot = $PSScriptRoot
Set-Location $BackendRoot

if ($ListenAll) {
    $HostAddr = "0.0.0.0"
}
if (-not $HostAddr) {
    $HostAddr = "127.0.0.1"
}
if ($Port -le 0) {
    if ($env:HR_MINI_PORT -match '^\d+$') {
        $Port = [int]$env:HR_MINI_PORT
    } else {
        $Port = 8888
    }
}

# Optional venv: backend\.venv or repo-root\.venv
$venvActivate = Join-Path $BackendRoot ".venv\Scripts\Activate.ps1"
if (-not (Test-Path $venvActivate)) {
    $parentVenv = Join-Path (Split-Path $BackendRoot -Parent) ".venv\Scripts\Activate.ps1"
    if (Test-Path $parentVenv) {
        $venvActivate = $parentVenv
    }
}
if (Test-Path $venvActivate) {
    . $venvActivate
}

Write-Host "Starting HR Mini API at http://${HostAddr}:$Port/api (Ctrl+C to stop)" -ForegroundColor Cyan
Write-Host "If you see WinError 10013: try -Port 8001 or run without -ListenAll (127.0.0.1 only)." -ForegroundColor DarkGray

python -m uvicorn main:app --host $HostAddr --port $Port --reload
