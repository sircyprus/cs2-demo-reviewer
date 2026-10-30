@echo off
rem Parses everything in .\demos, then starts the React site and opens it in your browser.
cd /d "%~dp0"
node review.js %*
if errorlevel 1 pause & exit /b 1
cd site
if not exist node_modules call npm install
start "" http://localhost:5173
echo.
echo Site running at http://localhost:5173  (close this window to stop it)
call npm run dev
