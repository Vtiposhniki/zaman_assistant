@echo off
setlocal enabledelayedexpansion

echo.
echo 🧪 Zaman Assistant Test Suite
echo ==============================
echo.

:: Colors
for /f "tokens=1,2 delims==" %%a in (
  'echo RED=[31m ^& echo GREEN=[32m ^& echo YELLOW=[33m ^& echo BLUE=[34m ^& echo NC=[0m'
) do set %%a=%%b

:: Check pytest
where pytest >nul 2>nul
if %errorlevel% neq 0 (
    echo %RED%❌ pytest not found. Installing...%NC%
    python -m pip install pytest pytest-asyncio pytest-cov
)

:: Parse arguments
set "ARGS="
set "COVERAGE=false"
set "WATCH=false"

:parse_args
if "%~1"=="" goto after_args

if "%~1"=="--coverage" (
    set "COVERAGE=true"
    shift
    goto parse_args
)
if "%~1"=="--watch" (
    set "WATCH=true"
    shift
    goto parse_args
)
if "%~1"=="--unit" (
    set "ARGS=!ARGS! -m unit"
    shift
    goto parse_args
)
if "%~1"=="--integration" (
    set "ARGS=!ARGS! -m integration"
    shift
    goto parse_args
)
if "%~1"=="--fast" (
    set "ARGS=!ARGS! -m ""not slow"""
    shift
    goto parse_args
)
set "ARGS=!ARGS! %~1"
shift
goto parse_args

:after_args

:: Add coverage
if "%COVERAGE%"=="true" (
    set "ARGS=!ARGS! --cov=. --cov-report=html --cov-report=term-missing"
)

echo %BLUE%📝 Running tests...%NC%
echo.

:: Watch mode
if "%WATCH%"=="true" (
    where ptw >nul 2>nul
    if %errorlevel% neq 0 (
        echo %YELLOW%⚠️ pytest-watch not found. Installing...%NC%
        python -m pip install pytest-watch
    )
    ptw -- !ARGS!
    goto end
) else (
    pytest tests/ !ARGS!
    set "EXIT_CODE=%errorlevel%"
)

:: Coverage
if "%COVERAGE%"=="true" (
    if exist "htmlcov" (
        echo.
        echo %GREEN%✅ Coverage report generated%NC%
        echo %BLUE%📊 Open: htmlcov\index.html%NC%
    )
)

echo.
echo ==============================
if "%EXIT_CODE%"=="0" (
    echo %GREEN%✅ All tests passed!%NC%
) else (
    echo %RED%❌ Some tests failed%NC%
)
echo ==============================

:end
exit /b %EXIT_CODE%
