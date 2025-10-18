@echo off
REM ===== QUICK START SCRIPT FOR WINDOWS =====
REM Автоматический запуск Zaman Assistant

echo ========================================
echo   Zaman Assistant - Quick Start
echo ========================================
echo.

REM Проверка Docker
echo [1/5] Checking Docker...
docker --version >nul 2>&1
if errorlevel 1 (
    echo [ERROR] Docker not found! Please install Docker Desktop.
    echo Download: https://www.docker.com/products/docker-desktop/
    pause
    exit /b 1
)
echo [OK] Docker installed

REM Проверка docker-compose
echo [2/5] Checking Docker Compose...
docker-compose --version >nul 2>&1
if errorlevel 1 (
    echo [ERROR] Docker Compose not found!
    pause
    exit /b 1
)
echo [OK] Docker Compose installed

REM Проверка .env файла
echo [3/5] Checking configuration...
if not exist .env (
    echo [WARNING] .env file not found. Creating from template...
    copy backend\.env.example .env
    echo.
    echo [ACTION REQUIRED] Please edit .env file with your API keys!
    echo Press any key to open .env in Notepad...
    pause >nul
    notepad .env
)
echo [OK] Configuration ready

REM Сборка образов
echo [4/5] Building Docker images...
docker-compose -f infra\docker-compose.yml build
if errorlevel 1 (
    echo [ERROR] Build failed!
    pause
    exit /b 1
)
echo [OK] Images built

REM Запуск сервисов
echo [5/5] Starting services...
docker-compose -f infra\docker-compose.yml up -d
if errorlevel 1 (
    echo [ERROR] Failed to start services!
    pause
    exit /b 1
)

REM Ожидание запуска
echo.
echo [WAIT] Waiting for services to be ready...
timeout /t 20 /nobreak >nul

REM Проверка health
echo.
echo [CHECK] Testing API...
curl -s http://localhost:8000/health >nul 2>&1
if errorlevel 1 (
    echo [WARNING] API not responding yet. Check logs: docker-compose -f infra\docker-compose.yml logs
) else (
    echo [OK] API is running!
)

echo.
echo ========================================
echo   SUCCESS! Zaman Assistant is running
echo ========================================
echo.
echo API: http://localhost:8000
echo Docs: http://localhost:8000/docs
echo.
echo Useful commands:
echo   - View logs: docker-compose -f infra\docker-compose.yml logs -f
echo   - Stop: docker-compose -f infra\docker-compose.yml down
echo   - Restart: docker-compose -f infra\docker-compose.yml restart
echo.

pause