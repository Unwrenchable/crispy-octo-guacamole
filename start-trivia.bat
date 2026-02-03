@echo off
REM Bar Trivia - Start Script (Windows)
REM This script starts both backend and frontend servers

echo.
echo 🎮 Starting Bar Trivia Platform...
echo.

REM Check if Node.js is installed
where node >nul 2>nul
if %ERRORLEVEL% NEQ 0 (
    echo ❌ Node.js is not installed. Please install Node.js 16+ first.
    pause
    exit /b 1
)

echo 📦 Installing dependencies...
echo.

REM Install backend dependencies
echo Installing backend dependencies...
cd backend
if not exist node_modules (
    call npm install
)
cd ..

REM Install frontend dependencies
echo Installing frontend dependencies...
cd frontend
if not exist node_modules (
    call npm install
)
cd ..

echo.
echo ✅ Dependencies installed!
echo.
echo 🚀 Starting servers...
echo.
echo Backend will run on: http://localhost:3001
echo Frontend will run on: http://localhost:5173
echo.
echo Press Ctrl+C to stop both servers
echo.

REM Start backend
cd backend
start "Bar Trivia Backend" cmd /k npm start
cd ..

REM Wait a moment
timeout /t 2 /nobreak >nul

REM Start frontend
cd frontend
start "Bar Trivia Frontend" cmd /k npm run dev
cd ..

echo.
echo ✅ Servers started in separate windows!
echo.
pause
