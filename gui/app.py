import sys
import requests

from PySide6.QtWidgets import (
    QApplication, QMainWindow, QWidget,
    QVBoxLayout, QHBoxLayout,
    QTextEdit, QLineEdit, QPushButton,
    QLabel
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
        self.model_input = QLineEdit()
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

        bottom.addWidget(self.input_field)
        bottom.addWidget(self.send_btn)

        layout.addLayout(bottom)

        # --- Connections ---
        self.send_btn.clicked.connect(self.send_message)
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

        self.load_model()

    # -----------------------
    # 💬 Chat with animation
    # -----------------------
    def send_message(self):
        msg = self.input_field.text().strip()
        if not msg:
            return

        self.input_field.clear()

        self.chat_box.append(f"<b style='color:#4fc3f7'>You:</b> {msg}")

        # Start AI line
        self.chat_box.append("<b style='color:#81c784'>AI:</b> ")
        self.ai_cursor = self.chat_box.textCursor()

        # Start thinking animation
        self.thinking_active = True
        self.thinking_index = 0
        self.thinking_timer.start(300)

        self.chat_history.append({"role": "user", "content": msg})
        self.current_ai_response = ""

        def task():
            res = requests.post(
                f"{API}/chat",
                json={"messages": self.chat_history},
                stream=True
            )

            for chunk in res.iter_content(chunk_size=32):
                if chunk:
                    yield chunk.decode("utf-8")

        self.worker = StreamWorker(task)
        self.worker.chunk_received.connect(self.enqueue_text)
        self.worker.started_stream.connect(self.stop_thinking)
        self.worker.finished.connect(self.on_ai_finished)
        self.worker.start()

    def on_ai_finished(self):
        if self.current_ai_response:
            self.chat_history.append({"role": "assistant", "content": self.current_ai_response})
            self.current_ai_response = ""

    # -----------------------
    # 🤖 Thinking animation
    # -----------------------
    def update_thinking(self):
        if not self.thinking_active:
            return

        state = self.thinking_states[self.thinking_index]
        self.thinking_index = (self.thinking_index + 1) % len(self.thinking_states)

        cursor = self.chat_box.textCursor()
        cursor.movePosition(QTextCursor.End)

        # remove last thinking dots
        cursor.select(QTextCursor.LineUnderCursor)
        line = cursor.selectedText()

        if "AI:" in line:
            cursor.removeSelectedText()
            cursor.insertText(f"AI: {state}")

        self.chat_box.setTextCursor(cursor)

    def stop_thinking(self):
        self.thinking_active = False
        self.thinking_timer.stop()

        # Clear dots and prepare for real text
        cursor = self.chat_box.textCursor()
        cursor.movePosition(QTextCursor.End)
        cursor.select(QTextCursor.LineUnderCursor)
        cursor.removeSelectedText()
        cursor.insertText("AI: ")

        self.chat_box.setTextCursor(cursor)

    # -----------------------
    # 🧠 Streaming buffer
    # -----------------------
    def enqueue_text(self, text):
        self.buffer += text
        self.current_ai_response += text

    def flush_buffer(self):
        if not self.buffer:
            return

        chunk_size = max(1, len(self.buffer) // 8)

        text = self.buffer[:chunk_size]
        self.buffer = self.buffer[chunk_size:]

        cursor = self.chat_box.textCursor()
        cursor.movePosition(QTextCursor.End)
        cursor.insertText(text)
        self.chat_box.setTextCursor(cursor)
        self.chat_box.ensureCursorVisible()

    # -----------------------
    # 🧠 Model handling
    # -----------------------
    def load_model(self):
        try:
            res = requests.get(f"{API}/model")
            self.model_input.setText(res.json()["model"])
        except Exception as e:
            self.chat_box.append(f"Error loading model: {e}")

    def set_model(self):
        model = self.model_input.text().strip()
        if not model:
            return

        self.chat_box.append(f"\nSwitching to model: {model}...\n")

        def task():
            res = requests.post(
                f"{API}/model",
                json={"model": model},
                stream=True
            )

            for line in res.iter_lines():
                if line:
                    yield line.decode("utf-8") + "\n"

        self.worker = StreamWorker(task)
        self.worker.chunk_received.connect(self.enqueue_text)
        self.worker.start()


# -----------------------
# 🚀 Entry
# -----------------------
def run_gui():
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