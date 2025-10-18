# ===== ENVIRONMENT CHECKER FOR WINDOWS =====
# Проверка готовности системы к запуску Zaman Assistant

$ErrorActionPreference = "Continue"

function Write-Status($Message, $Status) {
    $color = switch ($Status) {
        "OK" { "Green" }
        "WARN" { "Yellow" }
        "FAIL" { "Red" }
        default { "White" }
    }
    
    $prefix = switch ($Status) {
        "OK" { "[✓]" }
        "WARN" { "[!]" }
        "FAIL" { "[✗]" }
        default { "[?]" }
    }
    
    Write-Host "$prefix $Message" -ForegroundColor $color
}

Write-Host "=====================================" -ForegroundColor Cyan
Write-Host "  Zaman Assistant - Environment Check" -ForegroundColor Cyan
Write-Host "=====================================" -ForegroundColor Cyan
Write-Host ""

$allOk = $true

# ===== 1. Windows Version =====
Write-Host "1. Checking Windows version..." -ForegroundColor Cyan
try {
    $os = Get-CimInstance Win32_OperatingSystem
    $version = $os.Version
    $caption = $os.Caption
    
    if ([System.Version]$version -ge [System.Version]"10.0.0") {
        Write-Status "Windows version: $caption ($version)" "OK"
    } else {
        Write-Status "Windows version: $caption - требуется Windows 10+" "FAIL"
        $allOk = $false
    }
} catch {
    Write-Status "Failed to check Windows version" "FAIL"
    $allOk = $false
}

# ===== 2. Docker Desktop =====
Write-Host "`n2. Checking Docker..." -ForegroundColor Cyan
try {
    $dockerVersion = docker --version 2>$null
    if ($dockerVersion) {
        Write-Status "Docker installed: $dockerVersion" "OK"
        
        # Проверка что Docker запущен
        try {
            docker ps >$null 2>&1
            Write-Status "Docker daemon is running" "OK"
        } catch {
            Write-Status "Docker daemon is NOT running - запустите Docker Desktop" "FAIL"
            $allOk = $false
        }
    } else {
        Write-Status "Docker NOT found - install Docker Desktop" "FAIL"
        Write-Host "  Download: https://www.docker.com/products/docker-desktop/" -ForegroundColor Yellow
        $allOk = $false
    }
} catch {
    Write-Status "Docker NOT found" "FAIL"
    $allOk = $false
}

# ===== 3. Docker Compose =====
Write-Host "`n3. Checking Docker Compose..." -ForegroundColor Cyan
try {
    $composeVersion = docker-compose --version 2>$null
    if ($composeVersion) {
        Write-Status "Docker Compose installed: $composeVersion" "OK"
    } else {
        Write-Status "Docker Compose NOT found" "FAIL"
        $allOk = $false
    }
} catch {
    Write-Status "Docker Compose NOT found" "FAIL"
    $allOk = $false
}

# ===== 4. WSL 2 =====
Write-Host "`n4. Checking WSL..." -ForegroundColor Cyan
try {
    $wslVersion = wsl --version 2>$null
    if ($wslVersion) {
        Write-Status "WSL installed" "OK"
        
        # Проверка версии WSL distro
        $wslList = wsl -l -v 2>$null
        if ($wslList -match "VERSION 2") {
            Write-Status "WSL 2 is active" "OK"
        } else {
            Write-Status "WSL 2 not active - рекомендуется для лучшей производительности" "WARN"
        }
    } else {
        Write-Status "WSL not installed - рекомендуется установить" "WARN"
        Write-Host "  Run: wsl --install" -ForegroundColor Yellow
    }
} catch {
    Write-Status "WSL check failed" "WARN"
}

# ===== 5. Git =====
Write-Host "`n5. Checking Git..." -ForegroundColor Cyan
try {
    $gitVersion = git --version 2>$null
    if ($gitVersion) {
        Write-Status "Git installed: $gitVersion" "OK"
    } else {
        Write-Status "Git NOT found - опционально, но рекомендуется" "WARN"
    }
} catch {
    Write-Status "Git NOT found" "WARN"
}

# ===== 6. Memory =====
Write-Host "`n6. Checking System Resources..." -ForegroundColor Cyan
try {
    $totalMemory = (Get-CimInstance Win32_ComputerSystem).TotalPhysicalMemory / 1GB
    
    if ($totalMemory -ge 8) {
        Write-Status "RAM: $([math]::Round($totalMemory, 1))GB - отлично" "OK"
    } elseif ($totalMemory -ge 4) {
        Write-Status "RAM: $([math]::Round($totalMemory, 1))GB - минимально" "WARN"
    } else {
        Write-Status "RAM: $([math]::Round($totalMemory, 1))GB - недостаточно (требуется 4GB+)" "FAIL"
        $allOk = $false
    }
} catch {
    Write-Status "Failed to check RAM" "WARN"
}

# ===== 7. Disk Space =====
try {
    $drive = Get-PSDrive C
    $freeGB = [math]::Round($drive.Free / 1GB, 1)
    
    if ($freeGB -ge 20) {
        Write-Status "Disk space: ${freeGB}GB free - достаточно" "OK"
    } elseif ($freeGB -ge 10) {
        Write-Status "Disk space: ${freeGB}GB free - минимально" "WARN"
    } else {
        Write-Status "Disk space: ${freeGB}GB free - недостаточно (требуется 10GB+)" "FAIL"
        $allOk = $false
    }
} catch {
    Write-Status "Failed to check disk space" "WARN"
}

# ===== 8. Ports =====
Write-Host "`n8. Checking required ports..." -ForegroundColor Cyan
$requiredPorts = @(8000, 5432)

foreach ($port in $requiredPorts) {
    try {
        $connection = Test-NetConnection -ComputerName localhost -Port $port -WarningAction SilentlyContinue -InformationLevel Quiet 2>$null
        
        if ($connection) {
            Write-Status "Port $port is BUSY - может быть конфликт" "WARN"
        } else {
            Write-Status "Port $port is available" "OK"
        }
    } catch {
        Write-Status "Port $port is available" "OK"
    }
}

# ===== 9. Project Files =====
Write-Host "`n9. Checking project files..." -ForegroundColor Cyan
$requiredFiles = @(
    "backend\main.py",
    "backend\database.py",
    "backend\config.py",
    "infra\Dockerfile",
    "infra\docker-compose.yml",
    "requirements.txt"
)

foreach ($file in $requiredFiles) {
    if (Test-Path $file) {
        Write-Status "$file exists" "OK"
    } else {
        Write-Status "$file NOT found" "FAIL"
        $allOk = $false
    }
}

# ===== 10. .env File =====
Write-Host "`n10. Checking configuration..." -ForegroundColor Cyan
if (Test-Path ".env") {
    Write-Status ".env file exists" "OK"
    
    # Проверка обязательных переменных
    $envContent = Get-Content .env -Raw
    
    if ($envContent -match "OPENAI_HUB_KEY=.+") {
        Write-Status "OPENAI_HUB_KEY is set" "OK"
    } else {
        Write-Status "OPENAI_HUB_KEY not set - укажите в .env или используйте MOCK_MODE=true" "WARN"
    }
    
    if ($envContent -match "ADMIN_TOKEN=.+") {
        Write-Status "ADMIN_TOKEN is set" "OK"
    } else {
        Write-Status "ADMIN_TOKEN not set - рекомендуется установить" "WARN"
    }
} else {
    Write-Status ".env file NOT found - создайте из .env.example" "WARN"
    if (Test-Path "backend\.env.example") {
        Write-Host "  Run: copy backend\.env.example .env" -ForegroundColor Yellow
    }
}

# ===== Summary =====
Write-Host "`n=====================================" -ForegroundColor Cyan
Write-Host "  Summary" -ForegroundColor Cyan
Write-Host "=====================================" -ForegroundColor Cyan

if ($allOk) {
    Write-Host "`n✓ All critical checks passed!" -ForegroundColor Green
    Write-Host "  You can start Zaman Assistant with:" -ForegroundColor Green
    Write-Host "    .\infra\quick-start.bat" -ForegroundColor White
    Write-Host "  or" -ForegroundColor Green
    Write-Host "    .\infra\docker-run.ps1 start" -ForegroundColor White
} else {
    Write-Host "`n✗ Some critical checks failed!" -ForegroundColor Red
    Write-Host "  Please fix the issues above before starting." -ForegroundColor Red
}

Write-Host ""