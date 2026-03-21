@echo off
cd /d "C:\DEV\Dataverse Vibe Explorer"
echo.
echo Listing code apps in environment...
echo.
call npx power-apps list-codeapps
echo.
echo ========================================
echo Press any key to close...
pause >nul
