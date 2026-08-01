# LocAi v2.0.0 Release Notes

## 🚀 Major Features & Architectural Overhaul
* **SQLite & FTS5 Semantic Search**: Replaced the legacy `sessions.json` backend with a robust SQLite database running in WAL mode, ensuring atomic transactions and zero data corruption. Fast Text Search (FTS5) enables blazing fast retrieval.
* **Intelligent File Attachments**: Introduced a robust file-attachment routing system. Files are now securely hashed and copied to a dedicated `brain` context directory. Even if you move your local files, LocAi retains the context flawlessly!
* **Artifact Extraction Engine**: LocAi now parses markdown code blocks dynamically via the backend Event Bus. It intercepts code generation in real-time and physically saves them to `userdata/conversations/{id}/artifacts/` as standalone files.
* **Dynamic Auto-Titles**: Implemented intelligent conversation naming. The first message sent in a new chat automatically triggers a backend routine that slices the prompt and renames the session tab organically.
* **Dynamic Appearance & Theming**: Completely rebuilt the CSS token system to support dynamic Light, Dark, and System Default themes. Settings are natively persisted to the user configuration file.
* **Artifact UI Canvas**: The React interface now tracks the `artifacts` array and visually renders generated code files directly under the message bubble with a clickable pill interface.
* **Live Web Search**: Implemented a `WebSearchProvider` using `ddgs`. If a prompt contains trigger words like "search", "latest", or "news", LocAi autonomously queries the web and injects real-time information into the context!
* **Dynamic NDJSON Streaming**: Migrated the `/chat` streaming protocol from plain text to Server-Sent NDJSON. The frontend now accurately parses metadata chunks and beautifully renders dynamic status indicators (e.g., *Gathering context...*) that cleanly disappear when token generation begins.

## 🛠 Cleanup & Deprecations
* Deprecated and deleted the legacy `store.py` and its endpoints (`/sessions`).
* Migrated configuration states to a dedicated `settings.py` module.
* Unified the entire Event Bus and Conversation Router.

*Welcome to the true v2.0.0 autonomous agent experience!*
