@echo off
cd /d "%~dp0"
echo [Hermes Bridge] Starting Hermes Agent API server...
echo [Hermes Bridge] Using Hermes venv Python...
echo [Hermes Bridge] Server: http://localhost:8642
echo [Hermes Bridge] First load takes ~30-60s, then fast.
echo.
set "HERMES_PYTHON=%LOCALAPPDATA%\hermes\hermes-agent\venv\Scripts\python.exe"
if exist "%HERMES_PYTHON%" (
    "%HERMES_PYTHON%" hermes_bridge.py
) else (
    echo [Hermes Bridge] Hermes venv not found, trying system Python...
    python hermes_bridge.py
)
pause
