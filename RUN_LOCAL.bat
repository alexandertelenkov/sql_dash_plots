@echo off
setlocal enabledelayedexpansion
cd /d "%~dp0"

echo [INFO] Running local dev bootstrap for DashboardTest...
echo [INFO] Working dir: %CD%

REM Clean up partially-created workspace links that can trigger EEXIST on Windows.
if exist node_modules (
  echo [INFO] Removing node_modules (cleanup)...
  rmdir /s /q node_modules
)

REM Yarn install state can also confuse retries
if exist .yarn\install-state.gz (
  del /f /q .yarn\install-state.gz
)

REM Enable corepack if available
where corepack >nul 2>nul
if %errorlevel%==0 (
  corepack enable >nul 2>nul
) else (
  echo [WARN] corepack not found. If Yarn fails, ensure Node 20+ is installed and in PATH.
)

echo [INFO] Installing dependencies...
yarn install
if %errorlevel% neq 0 (
  echo [ERROR] yarn install failed. Try running this script again or unzip into a fresh folder outside OneDrive.
  exit /b 1
)

echo [INFO] Starting dev server...
yarn dev
