@echo off
cd /d "%~dp0"
where node >nul 2>nul
if errorlevel 1 (
  echo Node.js 22 or newer is required for the local preview.
  pause
  exit /b 1
)
echo Open http://127.0.0.1:4173/speakforward-opic/ in your PC browser.
node scripts\serve.cjs
pause
