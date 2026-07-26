@echo off
echo Building React UI...
cd ui
call npm install
call npm run build
cd ..

echo Installing PyInstaller...
call .venv\Scripts\pip install pyinstaller pystray Pillow

echo Compiling Python Executable...
REM Compile launcher.py as a single directory bundle for the installer
call .venv\Scripts\pyinstaller --name "LocAi" --onedir --windowed --add-data "ui/dist;ui/dist" launcher.py

echo Checking for Inno Setup...
where iscc >nul 2>nul
if %ERRORLEVEL% equ 0 (
    echo Building Installer...
    iscc LocAi.iss
    echo Done! Installer is in the Output folder.
) else (
    echo Inno Setup (iscc) not found in PATH. Skipping installer build.
    echo The portable build is located in the dist/ folder.
)
