@echo off
title NovaCut Studio Launcher
cd /d "%~dp0"

echo ===================================================
echo           STARTING NOVACUT STUDIO
echo ===================================================
echo.

where node >nul 2>&1
if %ERRORLEVEL% NEQ 0 (
    echo [ERROR] Node.js is not found in your PATH.
    echo Please install Node.js (v18+) from https://nodejs.org/
    pause
    exit /b 1
)

echo [1/3] Starting Backend Server (Port 3001)...
start "NovaCut Backend" cmd /k "cd /d ""%~dp0backend"" && npm run dev"

echo [2/3] Starting Frontend UI Server (Port 5173)...
start "NovaCut Frontend" cmd /k "cd /d ""%~dp0frontend"" && npm run dev"

echo [3/3] Waiting for servers to initialize...
timeout /t 4 /nobreak >nul

echo.
echo ===================================================
echo  NovaCut Studio is running!
echo  Backend:   http://localhost:3001
echo  Frontend:  http://localhost:5173
echo ===================================================
echo.
echo Opening browser at http://localhost:5173 ...
start http://localhost:5173

echo.
echo You can minimize this window.
echo To shut down both servers at any time, run stop.bat
echo.
pause

