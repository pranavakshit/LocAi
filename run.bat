@echo off
echo Starting LocAi from source...

:: Check for virtual environment and activate it
if exist ".venv\Scripts\activate.bat" (
    call .venv\Scripts\activate.bat
) else (
    echo [Warning] Virtual environment not found at .venv\Scripts\activate.bat
    echo Falling back to system Python. Make sure dependencies are installed!
)

:: Run the application
python launcher.py

:: Pause if the application crashed so the user can read the error
if %ERRORLEVEL% NEQ 0 (
    echo.
    echo [Error] LocAi exited unexpectedly (Code: %ERRORLEVEL%).
    pause
)
