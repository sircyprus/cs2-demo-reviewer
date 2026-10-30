@echo off
rem Parses everything in .\demos for LOCAL use and builds the site into site\dist.
rem The parsed data (site\public\data) is git-ignored and is never published; the public site only contains the app.
cd /d "%~dp0"
node review.js %*
if errorlevel 1 pause & exit /b 1
cd site
if not exist node_modules call npm install
call npm run build
echo.
echo Built into site\dist for local preview. Publishing happens by pushing to GitHub (demo data is never committed).
pause
