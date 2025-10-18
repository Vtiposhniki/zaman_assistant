@echo off
echo Starting Zaman Assistant Frontend...
echo.

REM Check if node_modules exists
if not exist "node_modules" (
    echo Installing dependencies...
    npm install
    echo.
)

REM Start development server
echo Starting development server...
npm run dev

pause
