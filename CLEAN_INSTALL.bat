@echo off
cd /d "%~dp0"
if exist node_modules rmdir /s /q node_modules
if exist .yarn\install-state.gz del /f /q .yarn\install-state.gz
echo [OK] Cleaned node_modules and install state. Now run: yarn install
