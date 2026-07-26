# LocAi v1.0.1 - The "Standalone Portability" Update

We are excited to announce **LocAi v1.0.1**! Following the massive architectural overhaul in v1.0.0, this minor release focuses on deployment flexibility and CI/CD improvements based on community feedback.

## 🚀 New Features

*   **Standalone Portable Executable:** 
    *   Alongside the standard Windows Installer, we now officially distribute a single, standalone executable (`LocAi-v1.0.1-portable.exe`).
    *   No installation required! Just download the file, drop it on your desktop, and double-click to launch the entire LocAi ecosystem instantly.
*   **Dynamic CI/CD Pipeline:**
    *   The GitHub Actions workflow now dynamically finds and tags release artifacts, ensuring the filenames exactly match the version tags.
    *   Added robust manual trigger (`workflow_dispatch`) support that intelligently finds the latest unused tag to prevent accidental release overwrites.

## How to Install

1. Download the new standalone `LocAi-v1.0.1-portable.exe` to run it instantly, OR download the `LocAi-v1.0.1-installer.exe` for a full system installation.
2. Ensure your local Ollama instance is running.
3. Launch LocAi and experience the future of local AI!
