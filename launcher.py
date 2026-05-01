import subprocess
import requests
import time
import sys
import socket
import os

API_URL = "http://127.0.0.1:8000"


def get_single_instance_lock():
    """
    Attempts to bind a socket to a specific port to ensure only one instance 
    of the application runs. Returns the socket to keep it open, or None 
    if already running.
    """
    lock_socket = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
    try:
        lock_socket.bind(("127.0.0.1", 56789))
        return lock_socket
    except OSError:
        return None


def is_ollama_running():
    """Checks if the Ollama service is running."""
    try:
        requests.get("http://127.0.0.1:11434/", timeout=1)
        return True
    except requests.exceptions.RequestException:
        return False


def ensure_ollama_running(dialog=None, app=None):
    """Starts Ollama if it's not already running. Returns the process object if started."""
    if is_ollama_running():
        if dialog:
            dialog.setLabelText("Ollama is already running. Piggybacking.\n(It will NOT be closed when you exit LocAi)")
            app.processEvents()
            time.sleep(1.5)
        return None
        
    try:
        # CREATE_NO_WINDOW = 0x08000000
        creationflags = 0x08000000 if os.name == 'nt' else 0
        
        if dialog:
            dialog.setLabelText("Ollama is not running. Starting Ollama background engine...\n(It will be cleanly exited upon closing LocAi)")
            app.processEvents()
            
        process = subprocess.Popen(
            ["ollama", "serve"],
            stdout=subprocess.DEVNULL,
            stderr=subprocess.DEVNULL,
            creationflags=creationflags
        )
        
        # Wait up to 10 seconds for Ollama to become responsive
        for i in range(20):
            if dialog:
                dialog.setValue(10 + (i * 2))
                app.processEvents()
                
            if is_ollama_running():
                return process
            time.sleep(0.5)
            
        return process
    except FileNotFoundError:
        if dialog:
            dialog.setLabelText("Error: Ollama not found in PATH.\nPlease install Ollama.")
            app.processEvents()
            time.sleep(3)
        print("Ollama not found in PATH. Make sure Ollama is installed.")
        return None


def is_server_running():
    """Checks if the backend API is already running."""
    try:
        requests.get(API_URL, timeout=1)
        return True
    except requests.exceptions.RequestException:
        return False


def wait_for_server(timeout_seconds=10):
    """Polls the server until it responds or the timeout is reached."""
    start_time = time.time()
    while time.time() - start_time < timeout_seconds:
        if is_server_running():
            return True
        time.sleep(0.5)
    return False


def run_backend_server():
    """Starts the FastAPI backend."""
    import uvicorn
    import core.server  # Explicitly import so PyInstaller traces fastapi
    
    # Fix Uvicorn crash in PyInstaller --noconsole mode
    if sys.stdout is None:
        sys.stdout = open(os.devnull, "w")
    if sys.stderr is None:
        sys.stderr = open(os.devnull, "w")
        
    uvicorn.run("core.server:app", host="127.0.0.1", port=8000)
    sys.exit(0)


def main():
    """Main application entry point."""
    # 1. Handle server mode (spawned by the launcher)
    if "--server" in sys.argv:
        run_backend_server()

    # 2. Prevent multiple launcher instances
    lock_socket = get_single_instance_lock()
    if lock_socket is None:
        # Another instance is running, exit silently
        sys.exit(0)
        
    from PySide6.QtWidgets import QApplication, QProgressDialog
    from PySide6.QtCore import Qt
    
    app = QApplication(sys.argv)
    
    # Show loading progress dialog
    dialog = QProgressDialog("Initializing LocAi...", None, 0, 100)
    dialog.setWindowTitle("LocAi Startup")
    dialog.setWindowModality(Qt.WindowModal)
    dialog.setCancelButton(None)
    dialog.setMinimumDuration(0)
    dialog.setValue(5)
    dialog.show()
    app.processEvents()

    server_process = None
    ollama_process = None

    try:
        # Start Ollama if it isn't running
        ollama_process = ensure_ollama_running(dialog, app)

        dialog.setValue(50)
        app.processEvents()

        # 3. Start backend ONLY if not running
        if not is_server_running():
            dialog.setLabelText("Starting FastAPI backend...")
            app.processEvents()
            
            cmd = [sys.executable, "--server"]
            
            # If running from source (uncompiled), we need to pass the script file
            if not getattr(sys, 'frozen', False):
                cmd = [sys.executable, os.path.abspath(__file__), "--server"]
                
            server_process = subprocess.Popen(cmd)

            if not wait_for_server():
                print("Failed to start LocAi engine.")
                sys.exit(1)

        dialog.setValue(100)
        dialog.close()
        app.processEvents()

        # 4. Launch GUI in the main process
        from gui.app import run_gui
        exit_code = run_gui()

    except Exception as e:
        print(f"Application Error: {e}")
        exit_code = 1

    finally:
        # 5. Cleanly stop the backend when GUI exits
        if server_process:
            server_process.terminate()
            server_process.wait()
            
        # Cleanly stop Ollama ONLY if we were the ones who started it
        if ollama_process:
            ollama_process.terminate()
            ollama_process.wait()
        
        sys.exit(exit_code)


if __name__ == "__main__":
    main()