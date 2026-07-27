# LocAi v1.2.0 Release Notes

## 🐛 Bug Fixes
* **PyInstaller Crash Resolved**: Completely eradicated `tkinter` dependencies from the launcher. The application now uses pywebview's native cross-platform file dialogs, resolving the startup crash caused by missing Tcl/Tk data directories.
* **Dynamic Model Detection**: Fixed the UI chatbox which previously showed a hardcoded placeholder (`opus-4-8`). It now dynamically fetches and accurately displays the active engine model.
* **Chat Tab Navigation**: Fixed an issue in the Left Panel where clicking a recent session would fetch the history but fail to switch the active UI tab. Clicking a recent session now instantly snaps the interface to the Chat view.
* **Stale Version Tags**: Purged the outdated `v2.4.1 Pro` hardcoded text from the application header.

## 📦 Build & Architecture
* **Portable Executable**: Generated fresh standalone `LocAi-portable.exe` binaries with the new architecture.
* **Architecture Documentation**: Documented the conversation and state management architecture following a comprehensive system audit.

*Enjoy a much smoother, crash-free native experience!*