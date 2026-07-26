@echo off
echo Building React UI...
cd ui
call npm install
call npm run build
cd ..

echo Installing PyInstaller...
call .venv\Scripts\pip install pyinstaller pystray Pillow

echo Compiling Python Executables...
REM Compile both the installer bundle and the portable executable using the spec file
call .venv\Scripts\pyinstaller --clean --noconfirm LocAi.spec

echo Checking for Inno Setup...
where iscc >nul 2>nul
if %ERRORLEVEL% equ 0 (
    echo Building Installer...
    iscc LocAi.iss
    echo Done! Installer is in the Output folder.
) else (
    echo Inno Setup iscc not found in PATH. Skipping installer build.
    echo The portable build is located in the dist folder.
)
