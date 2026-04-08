# Run in PowerShell AS ADMINISTRATOR so other PCs on your LAN can reach the dev servers.
# Opens TCP ports used by frontend (.env PORT) and backend (8888 by default).
#
# Default -AllProfiles allows inbound even when Windows marks your Wi-Fi as "Public"
# (otherwise Private+Domain-only rules block the other PC).

param(
    [int] $FrontendPort = 3020,
    [int] $BackendPort = 8888,
    [switch] $PrivateOnly
)

if (-not ([Security.Principal.WindowsPrincipal][Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)) {
    Write-Error "Run this script as Administrator (right-click PowerShell -> Run as administrator)."
    exit 1
}

$rules = @(
    @{ Name = "HR Mini React dev ($FrontendPort)"; Port = $FrontendPort },
    @{ Name = "HR Mini API dev ($BackendPort)"; Port = $BackendPort }
)

$profileArg = if ($PrivateOnly) { @("Private", "Domain") } else { "Any" }

foreach ($r in $rules) {
    $existing = Get-NetFirewallRule -DisplayName $r.Name -ErrorAction SilentlyContinue
    if ($existing) {
        Write-Host "Rule already exists: $($r.Name)"
        continue
    }
    if ($PrivateOnly) {
        New-NetFirewallRule -DisplayName $r.Name -Direction Inbound -Action Allow -Protocol TCP -LocalPort $r.Port -Profile Private, Domain | Out-Null
        Write-Host "Created inbound allow rule: $($r.Name) (TCP $($r.Port), Private+Domain)"
    } else {
        New-NetFirewallRule -DisplayName $r.Name -Direction Inbound -Action Allow -Protocol TCP -LocalPort $r.Port -Profile Any | Out-Null
        Write-Host "Created inbound allow rule: $($r.Name) (TCP $($r.Port), all network profiles)"
    }
}

Write-Host ""
Write-Host "=== On THIS PC (dev machine) ==="
Write-Host "1) Frontend: npm start  (HOST=0.0.0.0 in .env)"
Write-Host "2) Backend MUST bind to all interfaces, not 127.0.0.1 only:"
Write-Host "   cd backend && .\start-backend-lan.bat"
Write-Host "   (or: .\start-backend.ps1 -ListenAll)"
Write-Host ""
Write-Host "=== On the OTHER PC (browser) ==="
Write-Host "Open: http://<this-PC-LAN-IP>:$FrontendPort"
Write-Host "(API calls go to http://<same-IP>:$BackendPort/api automatically)"
Write-Host ""
if ($PrivateOnly) {
    Write-Host "Tip: If it still fails, run again without -PrivateOnly so rules apply to Public profile too."
}
