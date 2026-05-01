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

    server_process = None

    try:
        # 3. Start backend ONLY if not running
        if not is_server_running():
            cmd = [sys.executable, "--server"]
            
            # If running from source (uncompiled), we need to pass the script file
            if not getattr(sys, 'frozen', False):
                cmd = [sys.executable, os.path.abspath(__file__), "--server"]
                
            server_process = subprocess.Popen(cmd)

            if not wait_for_server():
                print("Failed to start LocAi engine.")
                sys.exit(1)

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
        
        sys.exit(exit_code)


if __name__ == "__main__":
    main()