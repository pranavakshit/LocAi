import subprocess
import requests
import time
import sys
import socket
import os
import threading

API_URL = "http://127.0.0.1:8000"


def get_single_instance_lock():
    lock_socket = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
    try:
        lock_socket.bind(("127.0.0.1", 58789))
        return lock_socket
    except OSError:
        return None


def is_ollama_running():
    try:
        requests.get("http://127.0.0.1:11434/", timeout=1)
        return True
    except requests.exceptions.RequestException:
        return False


def ensure_ollama_running():
    if is_ollama_running():
        return
        
    try:
        creationflags = 0x08000000 if os.name == 'nt' else 0
            
        subprocess.Popen(
            ["ollama", "serve"],
            stdout=subprocess.DEVNULL,
            stderr=subprocess.DEVNULL,
            creationflags=creationflags
        )
        
        for i in range(20):
            if is_ollama_running():
                return
            time.sleep(0.5)
    except FileNotFoundError:
        print("Ollama not found in PATH. Make sure Ollama is installed.")


def is_server_running():
    try:
        requests.get(API_URL + "/health", timeout=1)
        return True
    except requests.exceptions.RequestException:
        return False


def run_daemon():
    lock_socket = get_single_instance_lock()
    if lock_socket is None:
        # Daemon already running
        sys.exit(0)
        
    # 1. Start Ollama
    ensure_ollama_running()
    
    # 2. Start FastAPI Server
    import uvicorn
    from core.server import app as fastapi_app
    
    def start_uvicorn():
        if getattr(sys, 'frozen', False):
            if sys.stdout is None:
                sys.stdout = open(os.devnull, "w")
            if sys.stderr is None:
                sys.stderr = open(os.devnull, "w")
        uvicorn.run(fastapi_app, host="127.0.0.1", port=8000, log_level="info", loop="asyncio")
        
    server_thread = threading.Thread(target=start_uvicorn, daemon=True)
    server_thread.start()
    
    for _ in range(20):
        if is_server_running():
            break
        time.sleep(0.5)
        
    # 3. Setup System Tray
    import pystray
    from PIL import Image, ImageDraw
    
    # Create simple image for icon
    width = 64
    height = 64
    image = Image.new('RGB', (width, height), color=(30, 58, 95))
    dc = ImageDraw.Draw(image)
    dc.rectangle([16, 16, 48, 48], fill=(45, 27, 105))
    
    def on_open(icon, item):
        subprocess.Popen([sys.executable], creationflags=0x08000000 if os.name == 'nt' else 0)
        
    def on_quit(icon, item):
        icon.stop()
        sys.exit(0)
        
    icon = pystray.Icon("LocAi", image, "LocAi Runtime", menu=pystray.Menu(
        pystray.MenuItem("Open LocAi", on_open, default=True),
        pystray.MenuItem("Quit", on_quit)
    ))
    
    icon.run()


def run_ui():
    if not is_server_running():
        # Spawn daemon process
        creationflags = 0x08000000 if os.name == 'nt' else 0
        subprocess.Popen(
            [sys.executable, "--daemon"],
            stdout=subprocess.DEVNULL,
            stderr=subprocess.DEVNULL,
            creationflags=creationflags
        )
        
        # We optionally show a loading dialog while waiting for daemon to spin up
        from PySide6.QtWidgets import QApplication, QProgressDialog
        from PySide6.QtCore import Qt
        app = QApplication(sys.argv)
        dialog = QProgressDialog("Initializing LocAi Daemon...", None, 0, 100)
        dialog.setWindowTitle("LocAi Startup")
        dialog.setWindowModality(Qt.WindowModal)
        dialog.setCancelButton(None)
        dialog.show()
        
        for i in range(20):
            dialog.setValue(i * 5)
            app.processEvents()
            if is_server_running():
                break
            time.sleep(0.5)
        
        dialog.setValue(100)
        dialog.close()
        app.quit()
        
    import gui.modern_app
    gui.modern_app.main()


def main():
    if "--daemon" in sys.argv:
        run_daemon()
    else:
        run_ui()

if __name__ == "__main__":
    main()