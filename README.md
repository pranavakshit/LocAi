# LocAi

A local AI system built from scratch.

Started as a simple idea: run a local model and talk to it. Now evolving into a fully agentic, autonomous workspace.

## Current Features

*   **Agentic Autonomous Execution**: Robust ReAct loop in the backend capable of executing tools on your machine.
*   **Projects & Workspaces**: Sandboxed workspaces linked directly to local directories.
*   **Next-Generation React Interface**: Gorgeous React SPA bundled with `pywebview` for native desktop performance. (Now features **Dynamic Theming** with Light/Dark modes).
*   **Artifact Canvas & Playground**: Built-in code editor for debugging and a sliding Artifact Canvas that auto-extracts markdown code blocks as physical files.
*   **Git Integration**: Issue git commands (commit, push) directly to the AI through the UI.
*   **Local Models Manager**: Dedicated hub to manage and download models locally (e.g., HuggingFace, Ollama integrations).
*   **Event-Driven Architecture**: Scalable, capability-driven backend featuring a lightweight internal Pub/Sub Event Bus.
*   **Multi-Session Chat History**: Conversations are safely persisted to disk using a **robust SQLite database (WAL mode)** and are fully indexed with **FTS5** semantic search.
*   **Native File Attachments**: Seamlessly inject local documents into your prompt context. Files are safely hashed and copied to an isolated `brain` folder for reliable retrieval.
*   **Decoupled Headless Runtime**: Dual-mode `LocAi.exe` handles both the UI and background daemon, providing a System Tray icon for persistence.
*   **Auto Updates**: Checks GitHub releases for updates and notifies the user directly in the UI.
*   **Legal Consent System**: Onboarding system to review offline vs online data handling via `PRIVACY.md` and `TERMS.md`.

## Structure

```
LocAi/
├── core/         # Backend API, Event Bus, Tools, and Vector Store
├── gui/          # pywebview native wrapper
├── ui/           # React Single Page Application (Vite, TSX)
├── launcher.py   # Dual-mode entry point (Daemon + UI Launcher)
├── LocAi.iss     # Inno Setup compiler script for Windows Installer
```

## How to Install (Recommended)

1. Go to the [Releases](https://github.com/pranavakshit/LocAi/releases) page.
2. Download `LocAi-installer.exe`.
3. Ensure you have Ollama running locally.
4. Run the installer and launch LocAi from your Start Menu!

## How to Build Locally

### Prerequisites
* Python 3.14
* Node.js 20+
* Inno Setup Compiler (`iscc`)

### 1. Build the React UI
```bash
cd ui
npm install
npm run build
cd ..
```

### 2. Compile the Executable
```bash
pip install -r requirements.txt
pip install pyinstaller pystray Pillow
pyinstaller --name "LocAi" --onedir --windowed --add-data "ui/dist;ui/dist" launcher.py
```

### 3. Build the Installer
```bash
iscc LocAi.iss
```
*The installer will be located in the `Output/` folder.*

## Notes

* Requires Ollama running locally.
* User data (sessions, projects, database) is stored in `%USERPROFILE%\LocAi\userdata\`.
