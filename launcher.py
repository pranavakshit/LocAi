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
        lock_socket.bind(("127.0.0.1", 58789))
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
    """Starts Ollama if it's not already running."""
    if is_ollama_running():
        if dialog:
            dialog.setLabelText("Ollama is already running. Piggybacking.\n(It will remain running for other clients)")
            app.processEvents()
            time.sleep(1.0)
        return
        
    try:
        creationflags = 0x08000000 if os.name == 'nt' else 0
        
        if dialog:
            dialog.setLabelText("Starting Ollama background engine...")
            app.processEvents()
            
        subprocess.Popen(
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
                return
            time.sleep(0.5)
    except FileNotFoundError:
        if dialog:
            dialog.setLabelText("Error: Ollama not found in PATH.\nPlease install Ollama.")
            app.processEvents()
            time.sleep(3)
        print("Ollama not found in PATH. Make sure Ollama is installed.")


def is_server_running():
    """Checks if the backend API is already running."""
    try:
        requests.get(API_URL + "/health", timeout=1)
        return True
    except requests.exceptions.RequestException:
        return False

def ensure_runtime_running(dialog=None, app=None):
    """Starts the LocAi Runtime Platform if it's not already running."""
    if is_server_running():
        return
        
    try:
        creationflags = 0x08000000 if os.name == 'nt' else 0
        
        if dialog:
            dialog.setLabelText("Starting LocAi Runtime Platform...")
            app.processEvents()
            
        subprocess.Popen(
            [sys.executable, "locai-runtime.py"],
            stdout=subprocess.DEVNULL,
            stderr=subprocess.DEVNULL,
            creationflags=creationflags
        )
        
        for i in range(10):
            if dialog:
                dialog.setValue(50 + (i * 4))
                app.processEvents()
            if is_server_running():
                return
            time.sleep(0.5)
    except Exception as e:
        print(f"Failed to start LocAi Runtime: {e}")

def main():
    """Main application entry point."""
    # 1. Prevent multiple launcher instances
    lock_socket = get_single_instance_lock()
    if lock_socket is None:
        # Another instance is running, exit silently
        sys.exit(0)
        
    # pyrefly: ignore [missing-import]
    from PySide6.QtWidgets import QApplication, QProgressDialog
    # pyrefly: ignore [missing-import]
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

    exit_code = 1

    try:
        # 2. Start Ollama and LocAi Runtime as persistent background services
        ensure_ollama_running(dialog, app)
        ensure_runtime_running(dialog, app)

        dialog.setValue(100)
        dialog.close()
        app.processEvents()

        # 3. Launch GUI Client
        import gui.modern_app
        gui.modern_app.main()
        exit_code = 0

    except Exception as e:
        print(f"Application Error: {e}")
        exit_code = 1

    finally:
        # 4. Clean Exit (leaving services running for other potential clients)
        sys.exit(exit_code)

if __name__ == "__main__":
    main()