@echo off
title n8n Automation Service
color 0B

:: === Use Node 20 directly from nvm folder ===
set "NODE20=C:\Users\skinz\AppData\Local\nvm\v20.19.0"
set "PATH=%NODE20%;%PATH%"

:: Change to n8n directory
cd /d F:\n8n_restored

echo [1/3] Cleaning up ALL active Node processes...
:: Be more aggressive to ensure port is free
taskkill /F /IM node.exe /T >nul 2>&1
timeout /t 2 /nobreak >nul

echo [2/3] Chrome will open after 20 seconds...
:: Run chrome opener in background
start /b cmd /c "timeout /t 20 /nobreak >nul && start chrome http://localhost:5678"

echo [3/3] Launching n8n... (keep this window open)
echo.
echo ===================================================
echo    Running on Node:
node --version
echo    Dashboard: http://localhost:5678
echo ===================================================
echo.

"%NODE20%\npx.cmd" n8n
pause
