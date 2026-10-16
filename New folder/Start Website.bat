@echo off
rem  Opens this website through a small local web server.
rem
rem  Why: a page opened straight from a file (double-clicking an .html)
rem  runs on "file://", and browsers block its calls to the weather API
rem  because such pages have no origin. Served over http://localhost the
rem  same page works normally.
rem
rem  Double-click this file instead of the .html files, then close the
rem  small "website-server" window when you are done.

cd /d "%~dp0"

set "PY="
where python >nul 2>&1
if not errorlevel 1 set "PY=python"
if not defined PY where py >nul 2>&1
if not defined PY if not errorlevel 1 set "PY=py"
if not defined PY goto nopython

echo  Starting local server at http://localhost:8080
start "website-server" /min %PY% -m http.server 8080
timeout /t 2 /nobreak >nul
start "" "http://localhost:8080/projects.html"
exit /b 0

:nopython
echo.
echo  Python was not found on this computer, so the local server could not start.
echo.
echo  Either install Python from https://www.python.org/downloads/
echo  ^(tick "Add python.exe to PATH" during setup^),
echo  or open this folder in your editor and use its "Live Server" extension.
echo.
pause
exit /b 1
