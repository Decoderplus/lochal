@echo off
cd /d "%~dp0"
echo LocHal-server starten...
start "LocHal server" /min cmd /c "node tools\serve.js"
timeout /t 2 /nobreak >nul
start "" http://localhost:8123/
echo.
echo LocHal draait op http://localhost:8123/
echo Laat het geminimaliseerde venster "LocHal server" open tijdens het spelen.
echo Klaar met spelen? Sluit dat venster (of dit venster).
echo.
pause
taskkill /FI "WINDOWTITLE eq LocHal server*" /F >nul 2>&1
