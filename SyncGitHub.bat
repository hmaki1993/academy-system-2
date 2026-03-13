@echo off
setlocal enabledelayedexpansion
echo =======================================
echo    Healy Academy - GitHub Sync Pro
echo =======================================
echo.

:: Change to the directory where the script is located
cd /d "%~dp0"

:: Try to find git.exe
set "GIT_CMD=git"
where git >nul 2>&1
if %errorlevel% neq 0 (
    echo [!] 'git' not in PATH, searching GitHub Desktop...
    for /d %%i in ("%LocalAppData%\GitHubDesktop\app-*") do (
        if exist "%%i\resources\app\git\cmd\git.exe" (
            set "GIT_CMD=%%i\resources\app\git\cmd\git.exe"
        )
    )
)

:: Final check for git
"!GIT_CMD!" --version >nul 2>&1
if %errorlevel% neq 0 (
    echo [ERROR] Git not found! Please install Git or GitHub Desktop.
    echo Searched in PATH and LocalAppData.
    pause
    exit /b 1
)

echo [DEBUG] Using: "!GIT_CMD!"

echo [1/3] Adding all changes...
"!GIT_CMD!" add .

echo [2/3] Committing with timestamp...
:: Get date/time in a cross-locale way
for /f "tokens=1-4 delims=/ " %%a in ('date /t') do (
    set "mydate=%%d-%%b-%%c"
)
for /f "tokens=1-2 delims=: " %%a in ('time /t') do (
    set "mytime=%%a:%%b"
)
"!GIT_CMD!" commit -m "Auto-sync from Antigravity: %date% %time%"

echo [3/3] Pushing to GitHub (origin main)...
"!GIT_CMD!" push origin main

echo.
echo =======================================
echo    Done! Deployment started on Vercel.
echo =======================================
echo.
pause
