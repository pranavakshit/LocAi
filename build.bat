@echo off
echo Building LocAi executable using custom spec...

:: Check for virtual environment and activate it
if exist ".venv\Scripts\activate.bat" (
    call .venv\Scripts\activate.bat
) else (
    echo [Warning] Virtual environment not found. Building with system Python.
)

:: Run PyInstaller using the spec file
pyinstaller --clean --noconfirm LocAi.spec

if %ERRORLEVEL% EQU 0 (
    echo.
    echo ==============================================
    echo BUILD SUCCESSFUL!
    echo Your new LocAi.exe is waiting in the dist/ folder.
    echo ==============================================
) else (
    echo.
    echo [Error] Build failed. See logs above.
)
pause
