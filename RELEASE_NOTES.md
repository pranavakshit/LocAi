# LocAi Alpha v0.2.0 - The "RAG & Resilience" Update

We are incredibly excited to announce LocAi `alpha-v0.2.0`. This update transforms LocAi from a simple local LLM chat interface into a robust, self-managing, multi-format AI assistant capable of digesting your local knowledge base.

## 🚀 New Features

* **Local RAG Memory (Retrieval-Augmented Generation)**
  * LocAi now comes with a fully embedded `ChromaDB` vector database running locally on your machine.
  * Your AI can now answer questions accurately based on your own internal data without hallucinating!
* **Multi-Format Document Ingestion**
  * Seamlessly upload and digest files directly from the UI.
  * Supported formats: `.pdf`, `.docx`, `.txt`, `.md`, `.csv`, `.json`, `.py`, and `.html`.
* **Process Lifecycle Control**
  * Brand new dynamic, animated status buttons allow you to visually monitor Ollama and the FastAPI backend.
  * Click to manually start, gracefully terminate, or force-restart background processes right from the UI without ever needing the terminal.
* **System Tray Integration**
  * LocAi is now a true desktop citizen! Closing the chat window no longer kills the app.
  * It will minimize gracefully to your Windows System Tray, allowing Ollama and FastAPI to remain warm in the background. Simply double-click the tray icon to resume chatting instantly.

## 🛠️ Fixes & Improvements

* **Resilience:** Implemented intelligent `taskkill` port-hunting to automatically seek and destroy rogue Python processes stuck on port 8000, ensuring flawless restarts.
* **Granular Process Tracking:** Swapped native subprocess execution to `QProcess` streams, allowing the UI to track real-time boot phases of the internal servers.
* **Efficiency:** RAG pipeline uses `all-MiniLM-L6-v2` as the localized embedding model, ensuring lightning-fast indexing with ultra-low disk and memory overhead.

---

### How to Install
1. Download `LocAi.exe` from the assets below.
2. Ensure you have [Ollama](https://ollama.com/) installed on your machine.
3. Run `LocAi.exe` and enjoy your fully private, localized RAG assistant!
