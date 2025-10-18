@echo off
REM ===== DOCKER DIAGNOSTICS FOR WINDOWS =====
setlocal enabledelayedexpansion

echo ========================================
echo   Docker Diagnostics for Zaman Assistant
echo ========================================
echo.

REM Создание лог файла
set LOG_FILE=docker-diagnostics-%date:~-4,4%%date:~-10,2%%date:~-7,2%_%time:~0,2%%time:~3,2%%time:~6,2%.txt
set LOG_FILE=%LOG_FILE: =0%

echo Saving diagnostics to: %LOG_FILE%
echo.

(
echo ===== DOCKER DIAGNOSTICS REPORT =====
echo Generated: %date% %time%
echo.

echo ===== 1. System Information =====
systeminfo | findstr /C:"OS Name" /C:"OS Version" /C:"System Type" /C:"Total Physical Memory"
echo.

echo ===== 2. Docker Version =====
docker --version
docker-compose --version
echo.

echo ===== 3. Docker Status =====
docker ps --all
echo.

echo ===== 4. Docker Images =====
docker images | findstr zaman
echo.

echo ===== 5. Docker Networks =====
docker network ls | findstr zaman
echo.

echo ===== 6. Docker Volumes =====
docker volume ls | findstr zaman
echo.

echo ===== 7. Container Logs - Backend =====
docker logs zaman-backend --tail=100
echo.

echo ===== 8. Container Logs - PostgreSQL =====
docker logs zaman-postgres --tail=50
echo.

echo ===== 9. Container Inspect - Backend =====
docker inspect zaman-backend
echo.

echo ===== 10. Health Check =====
curl -v http://localhost:8000/health
echo.

echo ===== 11. Port Bindings =====
netstat -ano | findstr :8000
netstat -ano | findstr :5432
echo.

echo ===== 12. Environment Variables =====
docker exec zaman-backend env
echo.

echo ===== 13. File Structure in Container =====
docker exec zaman-backend ls -la /app
docker exec zaman-backend ls -la /app/backend
echo.

echo ===== 14. Python Path =====
docker exec zaman-backend python -c "import sys; print('\n'.join(sys.path))"
echo.

echo ===== END OF REPORT =====
) > %LOG_FILE% 2>&1

echo.
echo [OK] Diagnostics saved to: %LOG_FILE%
echo.
echo Opening log file...
notepad %LOG_FILE%

pause