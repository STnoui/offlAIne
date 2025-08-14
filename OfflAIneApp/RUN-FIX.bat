@echo off
echo 🔧 OfflAIne Environment Fix
echo ========================
echo.
echo This will completely fix your Android development environment
echo AFTER you've renamed Android Studio1 to Android Studio.
echo.
echo Press any key to start the fix...
pause >nul

powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0env-fix.ps1"