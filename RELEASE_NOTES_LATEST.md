# LocAi v2.1.0 Release Notes

Welcome to LocAi **v2.1.0**! This release introduces powerful new real-time capabilities and significantly hardens our backend architecture and CI/CD pipelines.

### 🌐 Live Web Search
- **DuckDuckGo Integration:** LocAi is no longer confined to local data. We've introduced a live web search capability (powered by `ddgs`). The agent can now query the internet in real-time to augment its context during complex problem-solving.

### ⚡ True UI Streaming & Controls
- **Granular Status Indicators:** Replaced static loading states with dynamic, real-time indicators ("Connecting...", "Thinking...").
- **Stop Generation:** Added a highly requested 'Stop' button (gracefully leveraging `AbortController` and backend generator termination) so you can cancel long-running generations instantly.

### 🛠️ Architecture & Build Hardening
- **Comprehensive Blueprint:** Massively expanded the `architecture.puml` blueprint to meticulously map out every granular component, pub/sub event, SQLite/ChromaDB table structure, and external service dependency.
- **Model Download Fixes:** Resolved an issue where the model download payload caused silent 422 API errors.
- **Bulletproof CI:** Conducted a deep dive into the CI pipeline to uncover and resolve a hidden PyInstaller failure by natively tracking `LocAi.spec` and correcting `.gitignore` exclusions.

*Stay curious. The agentic future is local.*
