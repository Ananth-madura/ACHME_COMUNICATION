@echo off
echo Checking and installing dependencies...

echo Checking Backend dependencies...
cd /d "%~dp0backend"
if not exist node_modules (
    echo Installing backend dependencies...
    npm install
) else (
    echo Backend dependencies already installed.
)

echo Checking Frontend dependencies...
cd /d "%~dp0frontend"
if not exist node_modules (
    echo Installing frontend dependencies...
    npm install
) else (
    echo Frontend dependencies already installed.
)

echo Starting Backend Server...
cd /d "%~dp0backend"
start "Backend" cmd /k "npm run dev"

echo Starting Frontend Server...
cd /d "%~dp0frontend"
start "Frontend" cmd /k "npm start"

echo Servers starting...
echo Backend: http://localhost:5000
echo Frontend: http://localhost:3000
echo.
echo Press any key to exit...
pause > nul