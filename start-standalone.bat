@echo off
REM Bar Trivia - Standalone / USB Mode (Windows)
REM
REM This script bundles the frontend and runs everything from a single Node.js server.
REM No internet connection is required after the first "npm install".
REM
REM Usage:
REM   Double-click start-standalone.bat  (or run from Command Prompt)
REM
REM Players connect from phones / TVs using the Network URL printed at startup.

title Bar Trivia - Standalone Mode
echo.
echo  ========================================
echo   Bar Trivia -- Standalone Mode
echo  ========================================
echo.

REM Check for Node.js
where node >nul 2>nul
if %ERRORLEVEL% NEQ 0 (
    echo  ERROR: Node.js is not installed.
    echo         Download it from https://nodejs.org ^(version 16 or newer^).
    pause
    exit /b 1
)

echo  [1/3] Installing backend dependencies...
cd backend
call npm install --prefer-offline --quiet
cd ..

echo  [2/3] Installing frontend dependencies...
cd frontend
call npm install --prefer-offline --quiet

echo  [3/3] Building frontend...
call npm run build
cd ..

echo.
echo  Starting server... ^(close this window to stop^)
echo.

cd backend
node server.js

pause
