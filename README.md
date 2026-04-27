# LocAi

A local AI system built from scratch.

Started as a simple idea: run a local model and talk to it.

## Current Features

* Local AI backend (FastAPI)
* Model execution via Ollama
* CLI interface
* Native desktop GUI (Qt / PySide6)
* Model switching (persistent)
* Automatic model download
* GPU acceleration (via Ollama)

## Structure

```
LocAi/
├── core/        # Backend API
├── cli/         # Command line interface
├── gui/         # Desktop app (Qt)
├── config.json  # Current model config
```

## How to Run

### 1. Start backend

```bash
python -m uvicorn core.server:app --reload
```

### 2. Run GUI

```bash
python gui/app.py
```

### 3. Run CLI (optional)

```bash
python cli/chat.py
```

## Notes

* Requires Ollama running locally
* Models are managed automatically
