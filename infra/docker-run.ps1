# ===== POWERSHELL DOCKER MANAGER FOR WINDOWS =====
# Использование: .\docker-run.ps1 <command>
# Команды: start, stop, restart, logs, clean, health

param(
    [Parameter(Position=0)]
    [ValidateSet('start', 'stop', 'restart', 'logs', 'clean', 'health', 'build', 'shell')]
    [string]$Command = 'start'
)

$ErrorActionPreference = "Stop"
$ComposeFile = "infra\docker-compose.yml"

function Write-ColorOutput($ForegroundColor) {
    $fc = $host.UI.RawUI.ForegroundColor
    $host.UI.RawUI.ForegroundColor = $ForegroundColor
    if ($args) {
        Write-Output $args
    }
    $host.UI.RawUI.ForegroundColor = $fc
}

function Test-Docker {
    try {
        docker --version | Out-Null
        return $true
    } catch {
        return $false
    }
}

function Test-DockerCompose {
    try {
        docker-compose --version | Out-Null
        return $true
    } catch {
        return $false
    }
}

function Start-Services {
    Write-ColorOutput Green "Starting Zaman Assistant..."
    
    # Проверка .env
    if (-not (Test-Path .env)) {
        Write-ColorOutput Yellow "WARNING: .env file not found!"
        if (Test-Path backend\.env.example) {
            Copy-Item backend\.env.example .env
            Write-ColorOutput Yellow "Created .env from template. Please edit it!"
            notepad .env
        }
    }
    
    # Сборка (если нужно)
    Write-ColorOutput Cyan "Building images..."
    docker-compose -f $ComposeFile build
    
    # Запуск
    Write-ColorOutput Cyan "Starting containers..."
    docker-compose -f $ComposeFile up -d
    
    # Ожидание
    Write-ColorOutput Cyan "Waiting for services to be healthy..."
    Start-Sleep -Seconds 15
    
    # Проверка
    try {
        $response = Invoke-WebRequest -Uri http://localhost:8000/health -UseBasicParsing -TimeoutSec 5
        Write-ColorOutput Green "SUCCESS! API is running on http://localhost:8000"
        Write-ColorOutput Green "Docs: http://localhost:8000/docs"
    } catch {
        Write-ColorOutput Yellow "WARNING: API not responding yet. Check logs with: .\docker-run.ps1 logs"
    }
}

function Stop-Services {
    Write-ColorOutput Yellow "Stopping Zaman Assistant..."
    docker-compose -f $ComposeFile down
    Write-ColorOutput Green "Services stopped"
}

function Restart-Services {
    Stop-Services
    Start-Sleep -Seconds 3
    Start-Services
}

function Show-Logs {
    Write-ColorOutput Cyan "Showing logs (Ctrl+C to exit)..."
    docker-compose -f $ComposeFile logs -f
}

function Clean-All {
    Write-ColorOutput Red "WARNING: This will DELETE all data (database, logs, etc)!"
    $confirmation = Read-Host "Type 'yes' to confirm"
    
    if ($confirmation -eq 'yes') {
        Write-ColorOutput Yellow "Cleaning up..."
        docker-compose -f $ComposeFile down -v
        docker system prune -f
        Write-ColorOutput Green "Cleanup complete"
    } else {
        Write-ColorOutput Yellow "Cleanup cancelled"
    }
}

function Show-Health {
    Write-ColorOutput Cyan "Checking health..."
    
    # Статус контейнеров
    docker-compose -f $ComposeFile ps
    
    # API health
    Write-ColorOutput Cyan "`nAPI Health Check:"
    try {
        $response = Invoke-RestMethod -Uri http://localhost:8000/health -TimeoutSec 5
        $response | ConvertTo-Json -Depth 3
    } catch {
        Write-ColorOutput Red "API not responding"
    }
}

function Build-Images {
    Write-ColorOutput Cyan "Building Docker images..."
    docker-compose -f $ComposeFile build --no-cache
    Write-ColorOutput Green "Build complete"
}

function Open-Shell {
    Write-ColorOutput Cyan "Opening shell in backend container..."
    docker-compose -f $ComposeFile exec backend /bin/bash
}

# ===== MAIN LOGIC =====
Write-ColorOutput Cyan "===== Zaman Assistant Docker Manager ====="

# Проверки
if (-not (Test-Docker)) {
    Write-ColorOutput Red "ERROR: Docker not found! Please install Docker Desktop."
    exit 1
}

if (-not (Test-DockerCompose)) {
    Write-ColorOutput Red "ERROR: Docker Compose not found!"
    exit 1
}

# Выполнение команды
switch ($Command) {
    'start' { Start-Services }
    'stop' { Stop-Services }
    'restart' { Restart-Services }
    'logs' { Show-Logs }
    'clean' { Clean-All }
    'health' { Show-Health }
    'build' { Build-Images }
    'shell' { Open-Shell }
}

Write-ColorOutput Green "`nDone!"