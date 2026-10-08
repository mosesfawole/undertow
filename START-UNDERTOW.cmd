@echo off
cd /d "%~dp0"
where node >nul 2>nul
if errorlevel 1 (
  echo Node.js 22.9 or newer is required. Install it from https://nodejs.org
  pause
  exit /b 1
)
echo.
echo Undertow - Follow the evidence
echo Open http://127.0.0.1:4173 after the server starts.
echo Keep this window open while using the app. Press Ctrl+C to stop.
echo.
node --env-file-if-exists=.env server.mjs
pause

