@echo off
echo ==========================================
echo Building and Running Docker Containers
echo ==========================================

echo.
echo [1/2] Building Docker images...
docker-compose build

echo.
echo [2/2] Starting containers...
docker-compose up -d

echo.
echo ==========================================
echo Done! Your app is running:
echo   Frontend: http://localhost:3000
echo   Backend:  http://localhost:5000
echo ==========================================
echo.
echo To view logs: docker-compose logs -f
echo To stop:     docker-compose down
echo.

pause