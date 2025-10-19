@echo off
echo Starting Redis for Zaman Assistant Goals Service...

REM Проверка наличия Docker
docker --version >nul 2>&1
if %errorlevel% neq 0 (
    echo Error: Docker is not installed or not in PATH
    pause
    exit /b 1
)

REM Запуск Redis через Docker Compose
echo Starting Redis container...
docker-compose up redis -d

if %errorlevel% equ 0 (
    echo.
    echo ✅ Redis started successfully!
    echo.
    echo Redis is available at:
    echo   - Host: localhost
    echo   - Port: 6379
    echo   - URL: redis://localhost:6379
    echo.
    echo To check Redis status:
    echo   docker-compose ps redis
    echo.
    echo To view Redis logs:
    echo   docker-compose logs redis
    echo.
    echo To stop Redis:
    echo   docker-compose stop redis
    echo.
    echo To test Redis connection:
    echo   redis-cli ping
    echo.
) else (
    echo.
    echo ❌ Failed to start Redis
    echo.
    echo Troubleshooting:
    echo 1. Check if Docker is running
    echo 2. Check if port 6379 is available
    echo 3. Check docker-compose.yml configuration
    echo.
)

pause
