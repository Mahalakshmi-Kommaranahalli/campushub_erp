@echo off
setlocal
cd /d "%~dp0"
echo ============================================
echo          CampusHub Node.js Launcher
echo ============================================
echo.
if not exist package.json (
  echo ERROR: package.json was not found in this folder.
  echo Make sure you extracted this ZIP and opened the folder containing server.js.
  pause
  exit /b 1
)
where node >nul 2>nul
if errorlevel 1 (
  echo ERROR: Node.js is not installed or is not in PATH.
  echo Install Node.js LTS, then reopen VS Code.
  pause
  exit /b 1
)
if not exist node_modules (
  echo Installing dependencies for the first run...
  call npm install
  if errorlevel 1 (
    echo.
    echo npm install failed. Check the terminal output above.
    pause
    exit /b 1
  )
)
echo.
echo Starting CampusHub server and launching browser...
call npm start
pause
