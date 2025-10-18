@echo off
REM ===== CHECK REQUIREMENTS SCRIPT =====
echo ========================================
echo   Checking requirements.txt
echo ========================================
echo.

if not exist "requirements.txt" (
    echo [ERROR] requirements.txt not found!
    pause
    exit /b 1
)

echo Checking critical packages...
echo.

REM Проверка psycopg2-binary
findstr /C:"psycopg2-binary" requirements.txt >nul
if errorlevel 1 (
    echo [MISSING] psycopg2-binary
    echo This is CRITICAL for PostgreSQL connection!
    echo.
    set MISSING=1
) else (
    echo [OK] psycopg2-binary found
)

REM Проверка fastapi
findstr /C:"fastapi" requirements.txt >nul
if errorlevel 1 (
    echo [MISSING] fastapi
    set MISSING=1
) else (
    echo [OK] fastapi found
)

REM Проверка uvicorn
findstr /C:"uvicorn" requirements.txt >nul
if errorlevel 1 (
    echo [MISSING] uvicorn
    set MISSING=1
) else (
    echo [OK] uvicorn found
)

REM Проверка SQLAlchemy
findstr /C:"SQLAlchemy" requirements.txt >nul
if errorlevel 1 (
    echo [MISSING] SQLAlchemy
    set MISSING=1
) else (
    echo [OK] SQLAlchemy found
)

REM Проверка httpx
findstr /C:"httpx" requirements.txt >nul
if errorlevel 1 (
    echo [MISSING] httpx
    set MISSING=1
) else (
    echo [OK] httpx found
)

echo.
if defined MISSING (
    echo ========================================
    echo   CRITICAL PACKAGES MISSING!
    echo ========================================
    echo.
    echo Please add missing packages to requirements.txt
    echo.
    echo To fix psycopg2-binary issue, add this line:
    echo psycopg2-binary==2.9.9
    echo.
    pause
    exit /b 1
) else (
    echo ========================================
    echo   All critical packages found!
    echo ========================================
    echo.
    echo You can now build Docker images safely.
    echo Run: fix-and-rebuild.bat
)

echo.
pause