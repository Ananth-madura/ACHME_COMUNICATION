@echo off
setlocal enabledelayedexpansion

echo Checking and installing dependencies...

echo Checking Backend dependencies...
cd /d "%~dp0backend"
if not exist node_modules (
    echo Installing backend dependencies...
    npm install
) else (
    echo Backend dependencies already installed.
)

echo Checking Puppeteer Chrome browser...
if not exist "C:\Users\thana\.cache\puppeteer\chrome\win64-146.0.7680.153\chrome-win64\chrome.exe" (
    echo Installing Chrome for Puppeteer PDF generation...
    npx puppeteer browsers install chrome
) else (
    echo Puppeteer Chrome already installed.
)

echo Checking Frontend dependencies...
cd /d "%~dp0frontend"
if not exist node_modules (
    echo Installing frontend dependencies...
    npm install
) else (
    echo Frontend dependencies already installed.
)

echo Starting Backend Server on 0.0.0.0:5000...
cd /d "%~dp0backend"
start "Backend" cmd /k "npm run dev"

echo Starting Frontend Server on 0.0.0.0:3000...
cd /d "%~dp0frontend"
start "Frontend" cmd /k "npx cross-env HOST=0.0.0.0 react-scripts start"

echo.
echo ========================================
echo Servers starting...
echo Backend: http://localhost:5000
echo Frontend: http://localhost:3000
echo.
echo To access from other devices on your network:
for /f "tokens=2 delims=:" %%a in ('ipconfig ^| findstr /i "IPv4"') do (
    set IP=%%a
    set IP=!IP: =!
    if not "!IP!"=="" (
        echo Frontend: http://!IP!:3000
        echo Backend:  http://!IP!:5000
    )
)
echo ========================================
echo.
echo Press any key to exit...
pause > nul