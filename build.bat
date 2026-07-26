@echo off
echo Building React UI...
cd ui
call npm install
call npm run build
cd ..

echo Installing PyInstaller...
call .venv\Scripts\pip install pyinstaller

echo Compiling Python Executable...
REM Compile locai-runtime as a background daemon
call .venv\Scripts\pyinstaller --name "locai-runtime" --onefile --noconsole locai-runtime.py

REM Compile the GUI which will launch the runtime
call .venv\Scripts\pyinstaller --name "LocAi" --onefile --windowed --add-data "ui/dist;ui/dist" gui/modern_app.py

echo Done! The executables are located in the dist/ folder.
