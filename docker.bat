@echo off
setlocal enabledelayedexpansion

echo ==========================================
echo Building and Running Docker Containers
echo ==========================================

echo.
echo Checking Docker installation...
docker --version >nul 2>&1
if errorlevel 1 (
    echo Error: Docker is not installed or not in PATH
    pause
    exit /b 1
)

echo Docker found! Proceeding...
echo.

echo [1/3] Cleaning up old containers...
docker-compose down --remove-orphans 2>nul

echo.
echo [2/3] Building Docker images...
docker-compose build --no-cache
if errorlevel 1 (
    echo Error: Failed to build Docker images
    pause
    exit /b 1
)

echo.
echo [3/3] Starting containers...
docker-compose up -d
if errorlevel 1 (
    echo Error: Failed to start containers
    pause
    exit /b 1
)

echo.
echo ==========================================
echo Success! Your app is running:
echo   Frontend: http://localhost:3000
echo   Backend:  http://localhost:5000
echo ==========================================
echo.
echo To view logs: docker-compose logs -f
echo To stop:     docker-compose down
echo.

pause