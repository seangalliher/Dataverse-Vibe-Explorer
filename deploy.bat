@echo off
cd /d "C:\DEV\Dataverse Vibe Explorer"
echo.
echo ========================================
echo  Dataverse Vibe Explorer - Deploy
echo ========================================
echo.
echo Step 1: Building production bundle...
echo.
call npm run build
echo.
if %ERRORLEVEL% NEQ 0 (
    echo ERROR: Build failed.
    pause
    exit /b 1
)
echo.
echo ========================================
echo  Step 2: Pushing to Power Platform...
echo ========================================
echo.
echo A browser may open for sign-in.
echo.
call npx power-apps push
echo.
echo ========================================
echo  Exit code: %ERRORLEVEL%
echo ========================================
echo.
if %ERRORLEVEL% EQU 0 (
    echo SUCCESS! App deployed.
    echo Look for "Dataverse Vibe Explorer" in
    echo your Power Apps environment.
) else (
    echo Deploy finished - check output above.
)
echo.
echo Press any key to close...
pause >nul
