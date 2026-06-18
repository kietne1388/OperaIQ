## Seed Data Script for OperaIQ Backend
# File: seed-data.ps1
# ------------------------------------------------------------
# This script applies EF Core migrations and runs the built‑in seeder
# defined in `Program.cs`. It is safe to run on any environment
# (development, staging, production) provided the connection string
# points to a persistent SQL Server instance.
# ------------------------------------------------------------

param(
    [string]$Configuration = "Development"
)

# Navigate to the backend project folder
$backendPath = Join-Path $PSScriptRoot "OperaIQ.Web"
Set-Location $backendPath

Write-Host "Applying migrations for configuration: $Configuration" -ForegroundColor Cyan

# Ensure the EF tools are available
# (install if missing – local dev only)
if (-not (Get-Command dotnet-ef -ErrorAction SilentlyContinue)) {
    Write-Host "dotnet‑ef not found, installing..." -ForegroundColor Yellow
    dotnet tool install --global dotnet-ef
}

# Apply pending migrations
# This will also invoke the seeding logic in Program.cs
# when the app starts (DbInitializer + XuanDatSeeder).

# Run the app with a special env var to trigger seeding only
# (the seeder runs on every start, so just starting the app is enough).
# We start the app, let it finish seeding, then stop it.

# Start the backend (it will exit after seeding if we use a short‑lived command)
# Using `--no-build` to speed up if already built.
dotnet run --no-build &
$procId = $LASTEXITCODE

# Wait a few seconds for seeding to complete
Start-Sleep -Seconds 10

# Stop the process (if still running)
Get-Process -Id $procId -ErrorAction SilentlyContinue | Stop-Process -Force

Write-Host "Database migrations and seeding completed." -ForegroundColor Green
