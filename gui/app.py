import sys
import requests
import markdown
import logging
import threading
import uvicorn

from PySide6.QtWidgets import (
    QApplication, QMainWindow, QWidget,
    QVBoxLayout, QHBoxLayout,
    QTextEdit, QLineEdit, QPushButton,
    QLabel, QComboBox, QSystemTrayIcon, QMenu, QStyle
)

from PySide6.QtCore import QObject, QThread, Signal, QTimer, QProcess
from PySide6.QtGui import QTextCursor

API = "http://localhost:8000"


class UvicornLogSignals(QObject):
    progress_update = Signal(float)
    text_update = Signal(str)

class UvicornLogHandler(logging.Handler):
    def __init__(self, signals):
        super().__init__()
        self.signals = signals

    def emit(self, record):
        msg = self.format(record)
        if "Started server process" in msg:
            self.signals.progress_update.emit(0.3)
        if "Waiting for application startup" in msg:
            self.signals.progress_update.emit(0.6)
        if "Application startup complete" in msg:
            self.signals.progress_update.emit(0.8)
        if "Uvicorn running" in msg:
            self.signals.progress_update.emit(1.0)
            self.signals.text_update.emit("API Server: Running")
        if "Shutting down" in msg:
            self.signals.progress_update.emit(0.7)
            self.signals.text_update.emit("Server: Stopping...")
        if "Waiting for background tasks" in msg:
            self.signals.progress_update.emit(0.4)
        if "Finished server process" in msg:
            self.signals.progress_update.emit(0.0)


class StreamWorker(QThread):
    chunk_received = Signal(str)
    started_stream = Signal()
    finished = Signal()

    def __init__(self, func):
        super().__init__()
        self.func = func

    def run(self):
        first = True
        try:
            for chunk in self.func():
                if first:
                    self.started_stream.emit()  # 🔥 stop animation
                    first = False
                self.chunk_received.emit(chunk)
        except Exception as e:
            self.chunk_received.emit(f"[Error] {e}")
        finally:
            self.finished.emit()


class ProgressButton(QPushButton):
    def __init__(self, text=""):
        super().__init__(text)
        self.progress = 0.0  # 0.0 = full red, 1.0 = full green
        self.target_progress = 0.0
        self.anim_timer = QTimer()
        self.anim_timer.timeout.connect(self.update_animation)
        self.anim_timer.start(16)  # ~60fps smooth animation
        self.update_style()

    def set_target(self, target):
        self.target_progress = target

    def update_animation(self):
        if abs(self.progress - self.target_progress) < 0.01:
            self.progress = self.target_progress
            return

        # Fill speed
        step = 0.05
        if self.progress < self.target_progress:
            self.progress = min(self.progress + step, self.target_progress)
        else:
            self.progress = max(self.progress - step, self.target_progress)

        self.update_style()

    def update_style(self):
        p = self.progress
        if p <= 0:
            self.setStyleSheet("background-color: #c62828; color: white; border-radius: 4px; font-weight: bold;")
        elif p >= 1:
            self.setStyleSheet("background-color: #2e7d32; color: white; border-radius: 4px; font-weight: bold;")
        else:
            style = f"""
            QPushButton {{
                background: qlineargradient(x1:0, y1:0, x2:1, y2:0,
                    stop: 0 #2e7d32, stop: {p} #2e7d32,
                    stop: {p+0.001} #c62828, stop: 1 #c62828);
                color: white;
                border-radius: 4px;
                font-weight: bold;
            }}
            QPushButton:hover {{
                border: 1px solid white;
            }}
            """
            self.setStyleSheet(style)


class LocAiWindow(QMainWindow):
    def __init__(self, ollama_proc=None):
        super().__init__()
        self.ollama_proc = ollama_proc
        self.backend_server = None
        self.backend_thread = None
        
        self.uvicorn_signals = UvicornLogSignals()

        self.setWindowTitle("LocAi")
        self.setMinimumSize(800, 600)

        central = QWidget()
        self.setCentralWidget(central)

        layout = QVBoxLayout()
        layout.setSpacing(10)
        layout.setContentsMargins(10, 10, 10, 10)
        central.setLayout(layout)

        # --- Top bar ---
        top = QHBoxLayout()
        self.btn_ollama = ProgressButton("Ollama")
        self.btn_backend = ProgressButton("API Server")
        self.model_input = QComboBox()
        self.load_btn = QPushButton("Load")
        self.set_btn = QPushButton("Set")
        self.upload_btn = QPushButton("📁 Upload File")
        self.quit_app_btn = QPushButton("❌ Quit")
        self.quit_app_btn.setStyleSheet("background-color: #c62828; color: white;")

        top.addWidget(self.btn_ollama)
        top.addWidget(self.btn_backend)
        top.addWidget(QLabel(" | Model:"))
        top.addWidget(self.model_input)
        top.addWidget(self.load_btn)
        top.addWidget(self.set_btn)
        top.addWidget(self.upload_btn)
        top.addWidget(self.quit_app_btn)

        layout.addLayout(top)

        # --- Chat ---
        self.chat_box = QTextEdit()
        self.chat_box.setReadOnly(True)
        layout.addWidget(self.chat_box)

        # --- Input ---
        bottom = QHBoxLayout()
        self.input_field = QLineEdit()
        self.send_btn = QPushButton("Send")
        self.stop_btn = QPushButton("Stop")
        self.clear_btn = QPushButton("Clear")

        bottom.addWidget(self.input_field)
        bottom.addWidget(self.send_btn)
        bottom.addWidget(self.stop_btn)
        bottom.addWidget(self.clear_btn)

        layout.addLayout(bottom)

        # --- Connections ---
        self.btn_ollama.clicked.connect(self.toggle_ollama)
        self.btn_backend.clicked.connect(self.toggle_backend)
        self.send_btn.clicked.connect(self.send_message)
        self.stop_btn.clicked.connect(self.stop_generation)
        self.clear_btn.clicked.connect(self.clear_chat)
        self.input_field.returnPressed.connect(self.send_message)
        self.load_btn.clicked.connect(self.load_model)
        self.set_btn.clicked.connect(self.set_model)
        self.upload_btn.clicked.connect(self.upload_document)
        self.quit_app_btn.clicked.connect(self.quit_app)

        # --- System Tray Integration ---
        self.tray_icon = QSystemTrayIcon(self)
        
        # Use a built-in standard icon for the tray
        icon = self.style().standardIcon(QStyle.SP_ComputerIcon)
        self.tray_icon.setIcon(icon)
        
        tray_menu = QMenu()
        show_action = tray_menu.addAction("Show LocAi")
        show_action.triggered.connect(self.show_app)
        
        quit_action = tray_menu.addAction("Quit")
        quit_action.triggered.connect(self.quit_app)
        
        self.tray_icon.setContextMenu(tray_menu)
        self.tray_icon.activated.connect(self.tray_activated)
        self.tray_icon.show()

        # --- Status Monitor ---
        self.status_timer = QTimer()
        self.status_timer.timeout.connect(self.check_status)
        self.status_timer.start(500)  # Faster polling for real-time progress snappiness
        self.check_status()

        # --- Streaming buffer ---
        self.buffer = ""
        self.timer = QTimer()
        self.timer.timeout.connect(self.flush_buffer)
        self.timer.start(20)

        # --- Thinking animation ---
        self.thinking_timer = QTimer()
        self.thinking_timer.timeout.connect(self.update_thinking)
        self.thinking_states = [".", "..", "...", ".."]
        self.thinking_index = 0
        self.thinking_active = False

        self.chat_history = []
        self.current_ai_response = ""
        self.stream_role = "assistant"
        self.needs_render = False
        self.stop_requested = False
        self.is_quitting = False
        
        self.uvicorn_signals.progress_update.connect(self.btn_backend.set_target)
        self.uvicorn_signals.text_update.connect(self.btn_backend.setText)

        self.load_model()
        
        # Start backend automatically
        QTimer.singleShot(100, lambda: self.toggle_backend(force_start=True))

    def closeEvent(self, event):
        if self.is_quitting:
            event.accept()
            return
            
        # Prevent the window from actually closing and destroying the threads/processes
        event.ignore()
        self.hide()
        self.tray_icon.showMessage(
            "LocAi",
            "LocAi is still running in the background.",
            QSystemTrayIcon.Information,
            2000
        )

    def show_app(self):
        self.show()
        self.activateWindow()

    def tray_activated(self, reason):
        if reason == QSystemTrayIcon.DoubleClick:
            self.show_app()

    def quit_app(self):
        self.is_quitting = True
        # Gracefully shut down background processes before quitting
        if self.backend_server:
            self.backend_server.should_exit = True
        if self.ollama_proc:
            self.ollama_proc.kill()
            self.ollama_proc.waitForFinished(1000)
            
        QApplication.quit()

    # -----------------------
    # 💬 Chat with animation
    # -----------------------
    def send_message(self):
        msg = self.input_field.text().strip()
        if not msg:
            return

        self.input_field.clear()

        # Start thinking animation
        self.thinking_active = True
        self.thinking_index = 0
        self.thinking_timer.start(300)

        self.chat_history.append({"role": "user", "content": msg})
        self.current_ai_response = ""
        self.stream_role = "assistant"
        self.stop_requested = False
        self.render_chat()

        def task():
            res = requests.post(
                f"{API}/chat",
                json={"messages": self.chat_history},
                stream=True
            )

            for chunk in res.iter_content(chunk_size=32):
                if self.stop_requested:
                    res.close()
                    break
                if chunk:
                    yield chunk.decode("utf-8")

        self.worker = StreamWorker(task)
        self.worker.chunk_received.connect(self.enqueue_text)
        self.worker.started_stream.connect(self.stop_thinking)
        self.worker.finished.connect(self.on_ai_finished)
        self.worker.start()

    def stop_generation(self):
        self.stop_requested = True

    def on_ai_finished(self):
        if self.current_ai_response:
            self.chat_history.append({"role": self.stream_role, "content": self.current_ai_response})
            self.current_ai_response = ""
            self.render_chat()

    # -----------------------
    # 🤖 Thinking animation
    # -----------------------
    def update_thinking(self):
        if not self.thinking_active:
            return

        state = self.thinking_states[self.thinking_index]
        self.thinking_index = (self.thinking_index + 1) % len(self.thinking_states)
        self.render_chat(thinking_state=state)

    def stop_thinking(self):
        self.thinking_active = False
        self.thinking_timer.stop()
        self.render_chat()

    # -----------------------
    # 🧠 Stateful Rendering
    # -----------------------
    def enqueue_text(self, text):
        self.current_ai_response += text
        self.needs_render = True

    def flush_buffer(self):
        if self.needs_render:
            self.render_chat()
            self.needs_render = False

    def render_chat(self, thinking_state=""):
        html = "<style>code { background-color: #333; padding: 2px 4px; border-radius: 4px; font-family: Consolas; } pre { background-color: #2b2b2b; padding: 10px; border-radius: 6px; } table { border-collapse: collapse; width: 100%; } th, td { border: 1px solid #555; padding: 8px; }</style>"
        
        for msg in self.chat_history:
            if msg["role"] == "user":
                html += f"<b style='color:#4fc3f7'>You:</b><br>{msg['content']}<br><br>"
            elif msg["role"] == "assistant":
                md_html = markdown.markdown(msg["content"], extensions=['fenced_code', 'tables'])
                html += f"<b style='color:#81c784'>AI:</b><br>{md_html}<br><br>"
            elif msg["role"] == "system":
                html += f"<b style='color:#bbb'>[System]</b> {msg['content'].replace(chr(10), '<br>')}<br><br>"
                
        if self.current_ai_response:
            if self.stream_role == "assistant":
                md_html = markdown.markdown(self.current_ai_response, extensions=['fenced_code', 'tables'])
                html += f"<b style='color:#81c784'>AI:</b><br>{md_html}<br><br>"
            elif self.stream_role == "system":
                html += f"<b style='color:#bbb'>[System]</b> {self.current_ai_response.replace(chr(10), '<br>')}<br><br>"
        elif self.thinking_active:
            html += f"<b style='color:#81c784'>AI:</b> {thinking_state}<br><br>"
            
        vbar = self.chat_box.verticalScrollBar()
        scroll_pos = vbar.value()
        at_bottom = scroll_pos == vbar.maximum()
        
        self.chat_box.setHtml(html)
        
        if at_bottom:
            vbar.setValue(vbar.maximum())
        else:
            vbar.setValue(scroll_pos)

    # -----------------------
    # 🧠 Model handling
    # -----------------------
    def load_model(self):
        try:
            # Load list of available models
            models_res = requests.get(f"{API}/models")
            models = models_res.json().get("models", [])
            self.model_input.clear()
            self.model_input.addItems(models)
            self.model_input.setEditable(True)  # Allow typing new models to pull
            
            # Load currently active model
            res = requests.get(f"{API}/model")
            current_model = res.json()["model"]
            self.model_input.setCurrentText(current_model)
        except Exception as e:
            self.chat_history.append({"role": "system", "content": f"Error loading model: {e}"})
            self.render_chat()

    def set_model(self):
        model = self.model_input.currentText().strip()
        if not model:
            return

        self.current_ai_response = f"Switching to model: {model}...\n"
        self.stream_role = "system"
        self.stop_requested = False
        self.render_chat()

        def task():
            res = requests.post(
                f"{API}/model",
                json={"model": model},
                stream=True
            )

            for line in res.iter_lines():
                if self.stop_requested:
                    res.close()
                    break
                if line:
                    yield line.decode("utf-8") + "\n"

        self.worker = StreamWorker(task)
        self.worker.chunk_received.connect(self.enqueue_text)
        self.worker.finished.connect(self.on_ai_finished)
        self.worker.start()

    def upload_document(self):
        from PySide6.QtWidgets import QFileDialog
        file_path, _ = QFileDialog.getOpenFileName(
            self, "Select Document", "", "Documents (*.pdf *.docx *.txt *.md *.csv *.json *.py *.html)"
        )
        if not file_path:
            return

        self.current_ai_response = f"Reading and indexing document: {file_path}...\n"
        self.stream_role = "system"
        self.stop_requested = False
        self.render_chat()

        def task():
            try:
                res = requests.post(f"{API}/rag/add", json={"file_path": file_path})
                data = res.json()
                if "error" in data:
                    yield f"\n[Error] Failed to index file: {data['error']}\n"
                elif "chunks" in data:
                    yield f"\n[Success] Indexed {data['chunks']} segments into Local RAG memory!\nLocAi will now use this document to answer relevant questions.\n"
                else:
                    yield f"\n[Error] Unknown response: {data}\n"
            except Exception as e:
                yield f"\n[Error] Could not reach backend: {e}\n"

        self.worker = StreamWorker(task)
        self.worker.chunk_received.connect(self.enqueue_text)
        self.worker.finished.connect(self.on_ai_finished)
        self.worker.start()

    def check_status(self):
        # Check Ollama
        try:
            requests.get("http://localhost:11434", timeout=0.2)
            self.btn_ollama.set_target(1.0)
            self.btn_ollama.setText("Ollama: Running")
        except requests.exceptions.RequestException:
            # If target is 0.5, we are actively starting up, don't drop to 0.0 yet
            if self.btn_ollama.target_progress != 0.5:
                self.btn_ollama.set_target(0.0)
            self.btn_ollama.setText("Ollama: Stopped")

        # Check API Server
        try:
            requests.get("http://127.0.0.1:8000/health", timeout=0.2)
            self.btn_backend.set_target(1.0)
            self.btn_backend.setText("API Server: Running")
        except requests.exceptions.RequestException:
            if self.btn_backend.target_progress != 0.5:
                self.btn_backend.set_target(0.0)
            self.btn_backend.setText("API Server: Stopped")

    def toggle_ollama(self):
        import subprocess
        try:
            requests.get("http://localhost:11434", timeout=0.5)
            # Running -> Stop it
            self.btn_ollama.set_target(0.0)
            subprocess.run(["taskkill", "/IM", "ollama.exe", "/F", "/T"], capture_output=True)
            if self.ollama_proc:
                self.ollama_proc.kill()
                self.ollama_proc = None
        except requests.exceptions.RequestException:
            # Stopped -> Start it
            self.btn_ollama.set_target(0.1)  # Initialize
            self.btn_ollama.setText("Ollama: Booting...")
            self.ollama_proc = QProcess()
            self.ollama_proc.readyReadStandardError.connect(self.handle_ollama_stderr)
            self.ollama_proc.start("ollama", ["serve"])
        self.check_status()

    def handle_ollama_stderr(self):
        if not self.ollama_proc: return
        data = self.ollama_proc.readAllStandardError().data().decode()
        # Ollama mostly logs to stderr
        if "Listening on" in data:
            self.btn_ollama.set_target(1.0)
            self.btn_ollama.setText("Ollama: Running")

    def toggle_backend(self, force_start=False):
        try:
            requests.get("http://127.0.0.1:8000/health", timeout=0.5)
            # Running -> Stop it
            if not force_start and self.backend_server:
                self.backend_server.should_exit = True
                self.backend_server = None
        except requests.exceptions.RequestException:
            # Stopped -> Start it
            self.btn_backend.set_target(0.1)  # Initialize
            self.btn_backend.setText("Server: Booting...")
            
            # Attach to uvicorn logger if not already attached
            logger = logging.getLogger("uvicorn.error")
            if not any(isinstance(h, UvicornLogHandler) for h in logger.handlers):
                handler = UvicornLogHandler(self.uvicorn_signals)
                logger.addHandler(handler)
            
            # Start Uvicorn in a daemon thread
            config = uvicorn.Config("core.server:app", host="127.0.0.1", port=8000, log_level="info", loop="asyncio")
            self.backend_server = uvicorn.Server(config)
            
            # Disable signal handlers so it can run outside the main thread
            self.backend_server.install_signal_handlers = lambda: None 
            
            self.backend_thread = threading.Thread(target=self.backend_server.run, daemon=True)
            self.backend_thread.start()
            
        if not force_start:
            self.check_status()

    def clear_chat(self):
        self.chat_history = []
        self.current_ai_response = ""
        self.chat_history.append({"role": "system", "content": "Chat history cleared. Memory wiped."})
        self.render_chat()


# -----------------------
# 🚀 Entry
# -----------------------
def run_gui(ollama_proc=None):
    app = QApplication.instance()
    if app is None:
        app = QApplication(sys.argv)

    app.setStyleSheet("""
    QMainWindow { background-color: #1e1e1e; }
    QTextEdit {
        background-color: #252526;
        color: #eaeaea;
        border: 1px solid #333;
        font-family: Consolas;
        font-size: 13px;
    }
    QLineEdit {
        background-color: #2d2d2d;
        color: #ffffff;
        border: 1px solid #444;
        padding: 6px;
        border-radius: 4px;
    }
    QPushButton {
        background-color: #3a3a3a;
        color: white;
        border: none;
        padding: 6px 12px;
        border-radius: 4px;
    }
    QPushButton:hover { background-color: #505050; }
    QLabel { color: #cccccc; }
    """)

    window = LocAiWindow(ollama_proc)
    window.show()
    return app.exec()

if __name__ == "__main__":
    sys.exit(run_gui())