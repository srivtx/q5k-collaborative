@echo off
echo 🚀 Setting up CodeShare...

REM Check if Node.js is installed
node --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ❌ Node.js is not installed. Please install Node.js 16+ from https://nodejs.org/
    pause
    exit /b 1
)

echo ✅ Node.js found
node --version

REM Check if Docker is installed
docker --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ⚠️  Docker not found. The application will use fallback execution (less secure).
    echo    For full security features, install Docker from https://docker.com/
) else (
    echo ✅ Docker found - secure code execution will be available
    
    REM Check if Docker is running
    docker info >nul 2>&1
    if %errorlevel% neq 0 (
        echo ⚠️  Docker is installed but not running. Please start Docker for secure code execution.
    ) else (
        echo ✅ Docker is running
        
        REM Pull required Docker images
        echo 📦 Pulling Docker images for code execution...
        start /B docker pull node:18-alpine
        start /B docker pull python:3.11-alpine
        start /B docker pull openjdk:17-alpine
        start /B docker pull gcc:latest
        
        REM Wait a moment for pulls to start
        timeout /t 2 >nul
        echo ✅ Docker images are being pulled in the background
    )
)

REM Install dependencies
echo 📦 Installing dependencies...
npm install

if %errorlevel% neq 0 (
    echo ❌ Failed to install dependencies
    pause
    exit /b 1
)

echo ✅ Dependencies installed successfully

REM Create necessary directories
if not exist "temp" mkdir temp

echo ✅ Setup completed successfully!
echo.
echo 🎉 CodeShare is ready to run!
echo.
echo To start the application:
echo   npm start
echo.
echo Then open your browser to:
echo   http://localhost:3000
echo.
echo For development with auto-reload:
echo   npm run dev
echo.
echo Enjoy collaborative coding! 🎯
pause
