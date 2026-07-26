import uvicorn
import os
import sys

def main():
    # Ensure stdout/stderr are valid to prevent crashes in PyInstaller background mode
    if getattr(sys, 'frozen', False):
        if sys.stdout is None:
            sys.stdout = open(os.devnull, "w")
        if sys.stderr is None:
            sys.stderr = open(os.devnull, "w")
            
    # Import the FastAPI app
    from core.server import app

    # Run the uvicorn server
    print("Starting LocAi Runtime Platform on http://127.0.0.1:8000...")
    uvicorn.run(app, host="127.0.0.1", port=8000, log_level="info", loop="asyncio")

if __name__ == "__main__":
    main()
