# LocAi v1.0.0 - The "Agentic Workspace" Update

We are incredibly proud to announce **LocAi v1.0.0**, marking our official departure from the alpha stage! This monumental release completely reimagines LocAi from the ground up—transforming it from a simple local chat client into a powerful, autonomous, capability-driven AI desktop workspace.

## 🚀 Epic New Features

*   **Agentic Autonomous Execution**
    *   LocAi is now fully agentic! We've implemented a robust ReAct (Reasoning and Acting) loop in the backend.
    *   The AI can now autonomously read files, write code, and create artifacts directly on your hard drive using secure, custom Python tools.
*   **Projects & Workspaces**
    *   Say goodbye to isolated chats. The new Projects Tab allows you to create designated workspaces linked directly to local directories via your native OS file picker.
    *   The AI is securely sandboxed to operate exclusively within the bounds of your selected Project root.
*   **Next-Generation React Interface**
    *   We have completely retired the old PySide6 UI in favor of a gorgeous, state-of-the-art React Single Page Application (SPA).
    *   Wrapped seamlessly in `pywebview`, you get the blazing speed of modern web tech combined with the flawless native feel of a desktop executable.
*   **Event-Driven vNext Architecture**
    *   The entire backend has been refactored into a scalable, capability-driven architecture featuring a lightweight internal Pub/Sub Event Bus.
    *   This paves the way for complex, multi-modal workflows and community plugins in the future.
*   **Multi-Session Chat History**
    *   Your conversations are now safely persisted to disk in `userdata/sessions.json`. 
    *   The beautiful new Left Sidebar allows you to effortlessly toggle between past sessions and workspaces.
*   **Native File Attachments**
    *   A brand new paperclip icon in the chat input instantly launches your native Windows File Explorer, allowing you to seamlessly inject local documents into your prompt context.
*   **Decoupled Headless Runtime**
    *   The execution platform has been extracted into a standalone `locai-runtime.exe` background daemon, drastically improving stability and resource management.

## 🛠 Fixes & Improvements

*   **Clean Git Hierarchy**: Consolidated all user-specific data into the ignored `userdata/` folder to ensure local RAG databases and chat histories are never accidentally committed.
*   **Production Build Pipeline**: Updated the packaging pipeline to fully compile the React build alongside PyInstaller, delivering a flawless, single-click install experience.

## How to Install

1. Download the brand new `LocAi-installer.exe` from the assets below.
2. Ensure your local Ollama instance is running.
3. Run the installer and experience the future of local AI!
