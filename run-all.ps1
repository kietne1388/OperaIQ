# ============================================================
#  run-all.ps1  --  Start OperaIQ (API + Web) in parallel
# ============================================================
#  Usage:  .\run-all.ps1
#  Stop:   Close each PowerShell window, or Ctrl+C inside them
# ============================================================

$Root   = $PSScriptRoot
$ApiDir = Join-Path $Root "OperaIQ.Web"
$WebDir = Join-Path $Root "operaiq.client"

Write-Host ""
Write-Host "======================================================" -ForegroundColor Cyan
Write-Host "  OperaIQ -- Starting all services" -ForegroundColor Cyan
Write-Host "======================================================" -ForegroundColor Cyan
Write-Host ""

# Check directories exist
if (-not (Test-Path $ApiDir)) {
    Write-Host "[ERROR] API directory not found: $ApiDir" -ForegroundColor Red
    exit 1
}
if (-not (Test-Path $WebDir)) {
    Write-Host "[ERROR] Web directory not found: $WebDir" -ForegroundColor Red
    exit 1
}

# --- Auto npm install if node_modules missing ---
$NodeModules = Join-Path $WebDir "node_modules"
if (-not (Test-Path $NodeModules)) {
    Write-Host "[SETUP] node_modules not found. Running npm install first..." -ForegroundColor Yellow
    Push-Location $WebDir
    npm install
    Pop-Location
    Write-Host "[SETUP] npm install done." -ForegroundColor Green
} else {
    Write-Host "[OK] node_modules already installed." -ForegroundColor DarkGray
}

Write-Host ""

# --- Window 1: Backend .NET API ---
Write-Host "[1/2] Opening Backend API window (dotnet run)..." -ForegroundColor Yellow
$ApiScript = "Set-Location '$ApiDir'; Write-Host '===========================================' -ForegroundColor Green; Write-Host '  OperaIQ Backend API  -  http://localhost:5074' -ForegroundColor Green; Write-Host '===========================================' -ForegroundColor Green; dotnet run"
Start-Process powershell -ArgumentList "-NoExit", "-Command", $ApiScript

# Wait 2 seconds before opening frontend
Write-Host "[...] Waiting 2 seconds before starting Frontend..." -ForegroundColor DarkGray
Start-Sleep -Seconds 2

# --- Window 2: Frontend Vite ---
Write-Host "[2/2] Opening Frontend Web window (npm run dev)..." -ForegroundColor Yellow
$WebScript = "Set-Location '$WebDir'; Write-Host '===========================================' -ForegroundColor Magenta; Write-Host '  OperaIQ Frontend Web  -  http://localhost:5173' -ForegroundColor Magenta; Write-Host '===========================================' -ForegroundColor Magenta; npm run dev"
Start-Process powershell -ArgumentList "-NoExit", "-Command", $WebScript

# Done
Write-Host ""
Write-Host "OK  Both windows opened in parallel:" -ForegroundColor Green
Write-Host "    * Backend  API  ->  http://localhost:5074" -ForegroundColor Cyan
Write-Host "    * Frontend Web  ->  http://localhost:5173" -ForegroundColor Magenta
Write-Host ""
Write-Host "Press Enter to close this launcher window..." -ForegroundColor DarkGray
$null = Read-Host
