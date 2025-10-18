# ===== UNIVERSAL QUICK START SCRIPT (PowerShell) =====
# Работает из любой директории проекта

$ErrorActionPreference = "Stop"

function Write-Status($Message, $Type = "INFO") {
    $color = switch ($Type) {
        "OK" { "Green" }
        "ERROR" { "Red" }
        "WARNING" { "Yellow" }
        "INFO" { "Cyan" }
        default { "White" }
    }
    
    $prefix = switch ($Type) {
        "OK" { "[OK]" }
        "ERROR" { "[ERROR]" }
        "WARNING" { "[WARNING]" }
        "INFO" { "[INFO]" }
        default { "[?]" }
    }
    
    Write-Host "$prefix $Message" -ForegroundColor $color
}

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  Zaman Assistant - Quick Start v3.0" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# ===== Поиск корня проекта =====
Write-Status "Finding project root..." "INFO"

$currentDir = Get-Location
$projectRoot = $null

# Проверка текущей директории
if ((Test-Path "backend\main.py") -and (Test-Path "infra\docker-compose.yml")) {
    $projectRoot = $currentDir
}
# Проверка: мы в infra?
elseif ((Test-Path "docker-compose.yml") -and (Test-Path "..\backend\main.py")) {
    Set-Location ..
    $projectRoot = Get-Location
}
# Проверка: мы в backend?
elseif ((Test-Path "main.py") -and (Test-Path "..\infra\docker-compose.yml")) {
    Set-Location ..
    $projectRoot = Get-Location
}
# Поиск вверх по дереву
else {
    $searchPath = $currentDir
    for ($i = 0; $i -lt 3; $i++) {
        $searchPath = Split-Path $searchPath -Parent
        Set-Location $searchPath
        
        if ((Test-Path "backend\main.py") -and (Test-Path "infra\docker-compose.yml")) {
            $projectRoot = Get-Location
            break
        }
    }
}

if (-not $projectRoot) {
    Write-Status "Could not find project root!" "ERROR"
    Write-Host ""
    Write-Host "Current directory: $currentDir" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "Expected structure:" -ForegroundColor Yellow
    Write-Host "  zaman_assistant/"
    Write-Host "    ├── backend/"
    Write-Host "    │   └── main.py"
    Write-Host "    └── infra/"
    Write-Host "        └── docker-compose.yml"
    Write-Host ""
    pause
    exit 1
}

Write-Status "Project root: $projectRoot" "INFO"
Write-Host ""

# ===== 1. Проверка Docker =====
Write-Host "[1/7] Checking Docker..." -ForegroundColor Cyan

try {
    $dockerVersion = docker --version
    Write-Status "Docker installed: $dockerVersion" "OK"
} catch {
    Write-Status "Docker not found!" "ERROR"
    Write-Host ""
    Write-Host "Please install Docker Desktop:" -ForegroundColor Yellow
    Write-Host "https://www.docker.com/products/docker-desktop/" -ForegroundColor Yellow
    pause
    exit 1
}

# Проверка что Docker запущен
try {
    docker ps | Out-Null
    Write-Status "Docker is running" "OK"
} catch {
    Write-Status "Docker is not running!" "ERROR"
    Write-Host ""
    Write-Host "Please start Docker Desktop and try again." -ForegroundColor Yellow
    pause
    exit 1
}

# ===== 2. Проверка Docker Compose =====
Write-Host ""
Write-Host "[2/7] Checking Docker Compose..." -ForegroundColor Cyan

try {
    $composeVersion = docker-compose --version
    Write-Status "Docker Compose installed: $composeVersion" "OK"
} catch {
    Write-Status "Docker Compose not found!" "ERROR"
    pause
    exit 1
}

# ===== 3. Проверка структуры =====
Write-Host ""
Write-Host "[3/7] Checking project structure..." -ForegroundColor Cyan

$requiredFiles = @(
    "backend\main.py",
    "infra\Dockerfile",
    "infra\docker-compose.yml",
    "requirements.txt"
)

$allFilesExist = $true
foreach ($file in $requiredFiles) {
    if (-not (Test-Path $file)) {
        Write-Status "$file not found!" "ERROR"
        $allFilesExist = $false
    }
}

if (-not $allFilesExist) {
    pause
    exit 1
}

Write-Status "Project structure valid" "OK"

# # ===== 4. Проверка psycopg2 =====
# Write-Host ""
# Write-Host "[4/7] Checking requirements.txt..." -ForegroundColor Cyan

# $reqContent = Get-Content requirements.txt -Raw
# if ($reqContent -notmatch "psycopg2") {
#     Write-Status "psycopg2-binary not found in requirements.txt!" "ERROR"
#     Write-Host ""
#     Write-Host "This is CRITICAL for PostgreSQL connection." -ForegroundColor Yellow
#     Write-Host ""
#     Write-Host "Please add this line to requirements.txt:" -ForegroundColor Yellow
#     Write-Host "  psycopg2-binary==2.9.9" -ForegroundColor White
#     Write-Host ""
#     Write-Host "After adding, run this script again." -ForegroundColor Yellow
#     pause
#     exit 1
# }

# Write-Status "psycopg2-binary found" "OK"

# ===== 5. Проверка .env =====
Write-Host ""
Write-Host "[5/7] Checking configuration..." -ForegroundColor Cyan

if (-not (Test-Path ".env")) {
    Write-Status ".env file not found. Creating from template..." "WARNING"
    
    if (Test-Path "backend\.env") {
        Copy-Item "backend\.env" ".env"
    } elseif (Test-Path "backend\.env.example") {
        Copy-Item "backend\.env.example" ".env"
    } else {
        @"
# Zaman Assistant Configuration
OPENAI_HUB_KEY=your_key_here
OPENAI_HUB_URL=https://openai-hub.neuraldeep.tech
ADMIN_TOKEN=supersecret
MOCK_MODE=true
DEBUG=true
"@ | Out-File -FilePath ".env" -Encoding UTF8
    }
    
    Write-Host ""
    Write-Status "Please edit .env file with your API keys!" "WARNING"
    Write-Host ""
    Read-Host "Press Enter to open .env in Notepad"
    notepad .env
}

Write-Status "Configuration file exists" "OK"

# ===== 6. Остановка старых контейнеров =====
Write-Host ""
Write-Host "[6/7] Stopping old containers..." -ForegroundColor Cyan

docker-compose -f infra\docker-compose.yml down 2>&1 | Out-Null
Write-Status "Old containers stopped" "OK"

# ===== 7. Сборка и запуск =====
Write-Host ""
Write-Host "[7/7] Building and starting services..." -ForegroundColor Cyan
Write-Host ""
Write-Host "This will take 5-10 minutes on first run..." -ForegroundColor Yellow
Write-Host "Please be patient!" -ForegroundColor Yellow
Write-Host ""

# Сборка
Write-Host "Building images..." -ForegroundColor Cyan
docker-compose -f infra\docker-compose.yml build --no-cache

if ($LASTEXITCODE -ne 0) {
    Write-Status "Build failed!" "ERROR"
    Write-Host ""
    Write-Host "Common issues:" -ForegroundColor Yellow
    Write-Host "1. Missing psycopg2-binary in requirements.txt"
    Write-Host "2. Docker out of disk space"
    Write-Host "3. Network issues"
    pause
    exit 1
}

Write-Status "Images built successfully" "OK"
Write-Host ""

# Запуск
Write-Host "Starting containers..." -ForegroundColor Cyan
docker-compose -f infra\docker-compose.yml up -d

if ($LASTEXITCODE -ne 0) {
    Write-Status "Failed to start services!" "ERROR"
    Write-Host ""
    Write-Host "Showing logs:" -ForegroundColor Yellow
    docker-compose -f infra\docker-compose.yml logs --tail=50
    pause
    exit 1
}

Write-Status "Services started" "OK"

# ===== Ожидание готовности =====
Write-Host ""
Write-Host "[WAIT] Waiting for services to be ready..." -ForegroundColor Cyan
Write-Host "This may take 30-60 seconds..." -ForegroundColor Yellow
Write-Host ""

$maxAttempts = 12
$attempt = 0
$ready = $false

while ($attempt -lt $maxAttempts) {
    $attempt++
    
    Write-Host "[$attempt/$maxAttempts] Checking API..." -NoNewline
    
    try {
        $response = Invoke-WebRequest -Uri http://localhost:8000/health -UseBasicParsing -TimeoutSec 3 -ErrorAction Stop
        $ready = $true
        Write-Host " OK" -ForegroundColor Green
        break
    } catch {
        Write-Host " Not ready yet" -ForegroundColor Yellow
        Start-Sleep -Seconds 5
    }
}

Write-Host ""

if ($ready) {
    Write-Status "API is ready!" "OK"
    
    # ===== Финальная проверка =====
    Write-Host ""
    Write-Host "========================================" -ForegroundColor Green
    Write-Host "  SUCCESS! Zaman Assistant is running" -ForegroundColor Green
    Write-Host "========================================" -ForegroundColor Green
    Write-Host ""
    
    Write-Host "API Endpoints:" -ForegroundColor Cyan
    Write-Host "  - Health:  http://localhost:8000/health"
    Write-Host "  - Docs:    http://localhost:8000/docs"
    Write-Host "  - ReDoc:   http://localhost:8000/redoc"
    Write-Host ""
    
    Write-Host "Quick Test:" -ForegroundColor Cyan
    try {
        $health = Invoke-RestMethod http://localhost:8000/health
        $health | ConvertTo-Json -Depth 3
    } catch {
        Write-Host "Could not fetch health status" -ForegroundColor Yellow
    }
    
    Write-Host ""
    Write-Host "Container Status:" -ForegroundColor Cyan
    docker-compose -f infra\docker-compose.yml ps
    
    Write-Host ""
    Write-Host "Useful Commands:" -ForegroundColor Cyan
    Write-Host "  - View logs:    docker-compose -f infra\docker-compose.yml logs -f"
    Write-Host "  - Stop:         docker-compose -f infra\docker-compose.yml down"
    Write-Host "  - Restart:      docker-compose -f infra\docker-compose.yml restart"
    Write-Host "  - Status:       docker-compose -f infra\docker-compose.yml ps"
    Write-Host "  - Shell:        docker exec -it zaman-backend /bin/bash"
    Write-Host ""
    
} else {
    Write-Status "Services not responding after $maxAttempts attempts" "WARNING"
    Write-Host ""
    Write-Host "Showing recent logs:" -ForegroundColor Yellow
    docker-compose -f infra\docker-compose.yml logs --tail=50 backend
    Write-Host ""
    Write-Host "Common issues:" -ForegroundColor Yellow
    Write-Host "1. PostgreSQL not ready - wait 30 more seconds"
    Write-Host "2. Missing psycopg2-binary - check requirements.txt"
    Write-Host "3. Port 8000 busy - check: netstat -ano | findstr :8000"
    Write-Host ""
    Write-Host "You can view full logs with:" -ForegroundColor Yellow
    Write-Host "  docker-compose -f infra\docker-compose.yml logs -f"
    Write-Host ""
}

pause