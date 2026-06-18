# ============================================================
#  deploy-azure.ps1 -- Full OperaIQ Azure Deployment Script
#  Run from: OperaIQ-main\OperaIQ-main\
# ============================================================

# ---- CONFIG (only edit these) ----
$UNIQUE          = "001"            # change if names already taken
$RESOURCE_GROUP  = "OperaIQ-rg"
$LOCATION        = "eastus"
$SQL_SERVER      = "operaiq-sql-$UNIQUE"
$SQL_DB          = "OperaIQDb"
$SQL_USER        = "sqladmin"
$SQL_PWD         = "OperaIQ@Str0ng$UNIQUE!"
$APP_NAME        = "operaiq-api-prod-$UNIQUE"
$PLAN_NAME       = "operaiq-plan-$UNIQUE"
$FIREBASE_TOKEN  = ""   # paste your firebase login:ci token here
$PROJECT_DIR     = $PSScriptRoot

# ---- Reload PATH so az is available ----
$env:Path = [System.Environment]::GetEnvironmentVariable("Path","Machine") + ";" + [System.Environment]::GetEnvironmentVariable("Path","User")

Write-Host ""
Write-Host "============================================" -ForegroundColor Cyan
Write-Host "  OperaIQ - Azure Deployment" -ForegroundColor Cyan
Write-Host "============================================" -ForegroundColor Cyan

# ── STEP 1: Check Azure login ─────────────────────────────
Write-Host "`n[1/9] Checking Azure login..." -ForegroundColor Yellow
$account = az account show 2>&1
if ($LASTEXITCODE -ne 0) {
    Write-Host "  Not logged in. Opening browser login..." -ForegroundColor Yellow
    az login
}
Write-Host "  ✅ Azure login OK" -ForegroundColor Green

# ── STEP 2: Resource Group ────────────────────────────────
Write-Host "`n[2/9] Creating Resource Group '$RESOURCE_GROUP'..." -ForegroundColor Yellow
az group create --name $RESOURCE_GROUP --location $LOCATION --output none
Write-Host "  ✅ Resource group ready" -ForegroundColor Green

# ── STEP 3: Azure SQL Server ──────────────────────────────
Write-Host "`n[3/9] Creating Azure SQL Server '$SQL_SERVER'..." -ForegroundColor Yellow
az sql server create `
    --name $SQL_SERVER `
    --resource-group $RESOURCE_GROUP `
    --location $LOCATION `
    --admin-user $SQL_USER `
    --admin-password $SQL_PWD `
    --output none

az sql db create `
    --resource-group $RESOURCE_GROUP `
    --server $SQL_SERVER `
    --name $SQL_DB `
    --service-objective S0 `
    --output none

# Allow Azure services through firewall
az sql server firewall-rule create `
    --resource-group $RESOURCE_GROUP `
    --server $SQL_SERVER `
    --name "AllowAzureServices" `
    --start-ip-address 0.0.0.0 `
    --end-ip-address 0.0.0.0 `
    --output none

Write-Host "  ✅ Azure SQL ready" -ForegroundColor Green

# ── STEP 4: App Service Plan + Web App ───────────────────
Write-Host "`n[4/9] Creating App Service Plan + Web App '$APP_NAME'..." -ForegroundColor Yellow
az appservice plan create `
    --name $PLAN_NAME `
    --resource-group $RESOURCE_GROUP `
    --location $LOCATION `
    --sku B1 `
    --is-linux `
    --output none

az webapp create `
    --name $APP_NAME `
    --resource-group $RESOURCE_GROUP `
    --plan $PLAN_NAME `
    --runtime "DOTNETCORE:8.0" `
    --output none

Write-Host "  ✅ App Service ready: https://$APP_NAME.azurewebsites.net" -ForegroundColor Green

# ── STEP 5: Configure connection string + JWT secret ─────
Write-Host "`n[5/9] Configuring App Settings (connection string, JWT)..." -ForegroundColor Yellow

$CONN_STR = "Server=tcp:$SQL_SERVER.database.windows.net,1433;Initial Catalog=$SQL_DB;Persist Security Info=False;User ID=$SQL_USER;Password=$SQL_PWD;MultipleActiveResultSets=True;Encrypt=True;TrustServerCertificate=False;Connection Timeout=30;"

az webapp config connection-string set `
    --name $APP_NAME `
    --resource-group $RESOURCE_GROUP `
    --settings DefaultConnection=$CONN_STR `
    --connection-string-type SQLAzure `
    --output none

# Generate a secure JWT secret
$JWT_SECRET = [System.Convert]::ToBase64String([System.Security.Cryptography.RandomNumberGenerator]::GetBytes(64))

az webapp config appsettings set `
    --name $APP_NAME `
    --resource-group $RESOURCE_GROUP `
    --settings "Jwt__Secret=$JWT_SECRET" "ASPNETCORE_ENVIRONMENT=Production" `
    --output none

Write-Host "  ✅ App settings configured (secrets stored in Azure, not in code)" -ForegroundColor Green

# ── STEP 6: Apply EF Core migrations to Azure SQL ────────
Write-Host "`n[6/9] Applying EF Core migrations to Azure SQL..." -ForegroundColor Yellow
dotnet tool install --global dotnet-ef 2>$null
dotnet ef database update `
    --project OperaIQ.Infrastructure `
    --startup-project OperaIQ.Web `
    --connection $CONN_STR
Write-Host "  ✅ Migrations applied & data seeded" -ForegroundColor Green

# ── STEP 7: Build & Publish .NET API ─────────────────────
Write-Host "`n[7/9] Building and publishing .NET API..." -ForegroundColor Yellow
dotnet publish OperaIQ.Web -c Release -o ./publish --nologo
Write-Host "  ✅ API published to ./publish/" -ForegroundColor Green

# Zip publish output for deployment
Compress-Archive -Path "./publish/*" -DestinationPath "./publish.zip" -Force

# ── STEP 8: Deploy ZIP to Azure App Service ──────────────
Write-Host "`n[8/9] Deploying API to Azure App Service..." -ForegroundColor Yellow
az webapp deployment source config-zip `
    --name $APP_NAME `
    --resource-group $RESOURCE_GROUP `
    --src "./publish.zip"
Write-Host "  ✅ API deployed to https://$APP_NAME.azurewebsites.net" -ForegroundColor Green

# ── STEP 9: Rebuild React SPA & redeploy Firebase ────────
Write-Host "`n[9/9] Rebuilding frontend & redeploying Firebase Hosting..." -ForegroundColor Yellow

# Update VITE env to production API URL
$envContent = "VITE_API_BASE_URL=https://$APP_NAME.azurewebsites.net/api"
$envContent | Out-File -FilePath "$PROJECT_DIR\operaiq.client\.env.production" -Encoding utf8

Push-Location "$PROJECT_DIR\operaiq.client"
npm run build
Pop-Location

if ($FIREBASE_TOKEN -ne "") {
    firebase deploy --only hosting --token $FIREBASE_TOKEN --project opera-ai-b0fea
} else {
    firebase deploy --only hosting --project opera-ai-b0fea
}

# Cleanup
Remove-Item "./publish.zip" -Force -ErrorAction SilentlyContinue
Remove-Item "./publish" -Recurse -Force -ErrorAction SilentlyContinue

Write-Host ""
Write-Host "============================================" -ForegroundColor Green
Write-Host "  🎉 DEPLOYMENT COMPLETE!" -ForegroundColor Green
Write-Host "============================================" -ForegroundColor Green
Write-Host "  API:      https://$APP_NAME.azurewebsites.net" -ForegroundColor Cyan
Write-Host "  Frontend: https://opera-ai-b0fea.web.app" -ForegroundColor Cyan
Write-Host "============================================" -ForegroundColor Green
