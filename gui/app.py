# from pydoc import text
import sys
# from xml.parsers.expat import model
import requests
from PySide6.QtWidgets import (
    QApplication, QMainWindow, QWidget,
    QVBoxLayout, QHBoxLayout,
    QTextEdit, QLineEdit, QPushButton,
    QLabel
)

from PySide6.QtCore import Qt, QThread, Signal

API = "http://localhost:8000"

class Worker(QThread):
    finished = Signal(str)

    def __init__(self, func):
        super().__init__()
        self.func = func

    def run(self):
        try:
            result = self.func()
            self.finished.emit(result)
        except Exception as e:
            self.finished.emit(f"Error: {e}")

class LocAIWindow(QMainWindow):
    def __init__(self):
        super().__init__()

        self.setWindowTitle("LocAI")
        self.setMinimumSize(800, 600)

        # Main widget
        central = QWidget()
        self.setCentralWidget(central)

        main_layout = QVBoxLayout()
        main_layout.setSpacing(10)
        main_layout.setContentsMargins(10, 10, 10, 10)

        central.setLayout(main_layout)

        # --- Top bar (model controls) ---
        top_bar = QHBoxLayout()

        self.model_label = QLabel("Model:")
        self.model_input = QLineEdit()
        self.load_btn = QPushButton("Load")
        self.set_btn = QPushButton("Set")

        top_bar.addWidget(self.model_label)
        top_bar.addWidget(self.model_input)
        top_bar.addWidget(self.load_btn)
        top_bar.addWidget(self.set_btn)

        main_layout.addLayout(top_bar)

        # --- Chat display ---
        self.chat_box = QTextEdit()
        self.chat_box.setReadOnly(True)
        main_layout.addWidget(self.chat_box)

        # --- Input area ---
        input_bar = QHBoxLayout()

        self.input_field = QLineEdit()
        self.send_btn = QPushButton("Send")

        input_bar.addWidget(self.input_field)
        input_bar.addWidget(self.send_btn)

        main_layout.addLayout(input_bar)

        # --- Connections ---
        self.send_btn.clicked.connect(self.send_message)
        self.input_field.returnPressed.connect(self.send_message)
        self.load_btn.clicked.connect(self.load_model)
        self.set_btn.clicked.connect(self.set_model)

        # Load model on startup
        self.load_model()

    # --- Functions ---

    def send_message(self):
        msg = self.input_field.text().strip()
        if not msg:
            return

        self.input_field.clear()
        self.chat_box.append(f"<b style='color:#4fc3f7'>You:</b> {msg}")

        def task():
            res = requests.post(f"{API}/chat", json={"message": msg})
            return res.json()["response"]

        self.worker = Worker(task)
        self.worker.finished.connect(self.handle_response)
        self.worker.start()

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

        self.chat_box.append(f"Switching to model: {model}...")

        def task():
            requests.post(f"{API}/model", json={"model": model})
            return f"Model set to {model}"

        self.worker = Worker(task)
        self.worker.finished.connect(self.handle_model_result)
        self.worker.start()
    
    def handle_response(self, text):
        self.chat_box.append(f"<b style='color:#81c784'>AI:</b> {text}<br><br>")

    def handle_model_result(self, text):
        self.chat_box.append(text + "\n")

if __name__ == "__main__":
    app = QApplication(sys.argv)

    app.setStyleSheet("""
    QMainWindow {
        background-color: #1e1e1e;
    }

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

    QPushButton:hover {
        background-color: #505050;
    }

    QLabel {
        color: #cccccc;
    }
    """)

    window = LocAIWindow()
    window.show()
    sys.exit(app.exec())