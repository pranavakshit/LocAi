import sys
import requests
import markdown

from PySide6.QtWidgets import (
    QApplication, QMainWindow, QWidget,
    QVBoxLayout, QHBoxLayout,
    QTextEdit, QLineEdit, QPushButton,
    QLabel, QComboBox
)

from PySide6.QtCore import QThread, Signal, QTimer
from PySide6.QtGui import QTextCursor

API = "http://localhost:8000"


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


class LocAiWindow(QMainWindow):
    def __init__(self):
        super().__init__()

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
        self.model_input = QComboBox()
        self.load_btn = QPushButton("Load")
        self.set_btn = QPushButton("Set")

        top.addWidget(QLabel("Model:"))
        top.addWidget(self.model_input)
        top.addWidget(self.load_btn)
        top.addWidget(self.set_btn)

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
        self.send_btn.clicked.connect(self.send_message)
        self.stop_btn.clicked.connect(self.stop_generation)
        self.clear_btn.clicked.connect(self.clear_chat)
        self.input_field.returnPressed.connect(self.send_message)
        self.load_btn.clicked.connect(self.load_model)
        self.set_btn.clicked.connect(self.set_model)

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

        self.load_model()

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
        self.worker.start()

    def clear_chat(self):
        self.chat_history = []
        self.current_ai_response = ""
        self.chat_history.append({"role": "system", "content": "Chat history cleared. Memory wiped."})
        self.render_chat()


# -----------------------
# 🚀 Entry
# -----------------------
def run_gui():
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

    window = LocAiWindow()
    window.show()
    return app.exec()

if __name__ == "__main__":
    sys.exit(run_gui())