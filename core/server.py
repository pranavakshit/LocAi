from fastapi import FastAPI
from pydantic import BaseModel
from fastapi.responses import StreamingResponse
import json
import os
import uuid
import queue

# Import the EventBus and routers to ensure they start listening
from core.events import event_bus, EVENT_CHAT_STARTED, EVENT_TOKEN_GENERATED, EVENT_CHAT_FINISHED
from core.routers import chat_router
from core.settings import settings

# v2 Initialization
from core.db.schema import init_db
from core.db.repository import ConversationRepository
from core.services.conversation_service import ConversationService
from core.db.migrator import LegacyMigrator
from core.services.attachment_service import AttachmentService
import re

_user_profile = os.environ.get("USERPROFILE", os.path.expanduser("~"))
_db_path = os.path.join(_user_profile, "LocAi", "userdata", "locai_v2.db")
init_db(_db_path)
v2_repo = ConversationRepository(_db_path)
v2_service = ConversationService(v2_repo)
v2_attachment = AttachmentService(v2_service)
LegacyMigrator(v2_service).run()

from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse

__version__ = "v1.1.0"

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
CONFIG_FILE = "config.json"

class ChatRequest(BaseModel):
    messages: list[dict[str, str]]
    session_id: str | None = None
    temperature: float | None = None
    max_tokens: int | None = None
    system_prompt: str | None = None
    web_search: bool = False

class ModelRequest(BaseModel):
    model: str

class RAGRequest(BaseModel):
    file_path: str
    project_id: str | None = None

def get_model():
    if not os.path.exists(CONFIG_FILE):
        return "gemma4:e2b"
    with open(CONFIG_FILE, "r") as f:
        return json.load(f)["model"]

def set_model(model):
    with open(CONFIG_FILE, "w") as f:
        json.dump({"model": model}, f)



@app.get("/version")
def get_version():
    return {"version": __version__}

@app.get("/model")
def current_model():
    return {"model": get_model()}

@app.post("/model")
def change_model(req: ModelRequest):
    def stream():
        models = chat_router.inference_provider.list_models()
        if req.model not in models:
            for chunk in chat_router.inference_provider.pull_model_stream(req.model):
                yield chunk
        set_model(req.model)
        yield f"Model set to {req.model}\n"
        yield "success\n"
    return StreamingResponse(stream(), media_type="text/plain; charset=utf-8")

@app.post("/chat")
def chat_endpoint(req: ChatRequest):
    request_id = str(uuid.uuid4())
    token_queue = queue.Queue()
    
    from core.events import EVENT_STATUS_UPDATE, EVENT_USAGE_UPDATE
    
    # Callbacks to bridge the Event Bus back to this specific HTTP request
    def on_token(payload):
        if payload.get("request_id") == request_id:
            token_queue.put({"type": "token", "content": payload.get("token", "")})
            
    def on_status(payload):
        if payload.get("request_id") == request_id:
            token_queue.put({"type": "status", "content": payload.get("status", "")})
            
    def on_usage(payload):
        if payload.get("request_id") == request_id:
            token_queue.put({"type": "usage", "content": payload.get("tokens", 0)})
            
    def on_finish(payload):
        if payload.get("request_id") == request_id:
            token_queue.put(None) # Sentinel to stop generator
            
    # Subscribe to events
    event_bus.subscribe(EVENT_TOKEN_GENERATED, on_token)
    event_bus.subscribe(EVENT_STATUS_UPDATE, on_status)
    event_bus.subscribe(EVENT_USAGE_UPDATE, on_usage)
    event_bus.subscribe(EVENT_CHAT_FINISHED, on_finish)
    
    # Save the user's message if session_id is provided
    if req.session_id and len(req.messages) > 0:
        user_msg_data = req.messages[-1]
        
        # Load or create conversation in v2 DB
        conv = v2_service.load_conversation(req.session_id)
        if not conv:
            conv = v2_service.create_conversation(title="New Chat")
            req.session_id = conv.metadata.id
            
        from core.models.conversation import Message as V2Message
        v2_msg = V2Message(
            conversation_id=req.session_id,
            role=user_msg_data.get("role", "user"),
            content=user_msg_data.get("content", "")
        )
        v2_service.append_message(req.session_id, v2_msg)
        
        # Parse and process attachments
        attached_matches = re.findall(r'\[Attached: (.*?)\]', user_msg_data.get("content", ""))
        for match in attached_matches:
            v2_attachment.save_attachment(req.session_id, v2_msg.id, match.strip())

    # Emit the start event to kick off the router in the background
    event_bus.emit(EVENT_CHAT_STARTED, {
        "request_id": request_id, 
        "messages": req.messages, 
        "model": get_model(),
        "session_id": req.session_id,
        "temperature": req.temperature,
        "max_tokens": req.max_tokens,
        "system_prompt": req.system_prompt,
        "web_search": req.web_search
    })

    def generator():
        import json
        full_response = ""
        total_tokens = 0
        try:
            while True:
                item = token_queue.get()
                if item is None:
                    break
                if item["type"] == "token":
                    full_response += item["content"]
                elif item["type"] == "usage":
                    total_tokens = item["content"]
                yield json.dumps(item) + "\n"
                yield ""  # 🔥 forces flush
        finally:
            if req.session_id and full_response:
                from core.models.conversation import Message as V2Message, Artifact
                import re, os, hashlib
                
                v2_ast_msg = V2Message(
                    conversation_id=req.session_id,
                    role="assistant",
                    content=full_response,
                    tokens=total_tokens if total_tokens > 0 else None
                )
                v2_service.append_message(req.session_id, v2_ast_msg)
                
                # Artifact Extraction (Phase 9)
                code_blocks = re.findall(r'```(\w*)\n(.*?)```', full_response, re.DOTALL)
                for idx, (lang, code) in enumerate(code_blocks):
                    lang = lang.strip() or "txt"
                    filename = f"artifact_{idx+1}.{lang}"
                    content_hash = hashlib.md5(code.encode()).hexdigest()[:8]
                    
                    artifacts_dir = os.path.join(_user_profile, "LocAi", "userdata", "conversations", req.session_id, "artifacts")
                    os.makedirs(artifacts_dir, exist_ok=True)
                    
                    file_path = os.path.join(artifacts_dir, f"{content_hash}_{filename}")
                    with open(file_path, "w", encoding="utf-8") as f:
                        f.write(code)
                        
                    art = Artifact(
                        message_id=v2_ast_msg.id,
                        filename=filename,
                        storage_path=file_path,
                        type="code"
                    )
                    v2_service.attach_artifact(req.session_id, art)
                
                # Automatic Titles (Phase 10)
                # If this is the first assistant message, generate a title based on the first user message
                if len(req.messages) == 1:
                    first_msg = req.messages[0].get("content", "")
                    title = first_msg[:25].strip() + ("..." if len(first_msg) > 25 else "")
                    v2_service.rename_conversation(req.session_id, title)
                
            event_bus.unsubscribe(EVENT_TOKEN_GENERATED, on_token)
            event_bus.unsubscribe(EVENT_STATUS_UPDATE, on_status)
            event_bus.unsubscribe(EVENT_USAGE_UPDATE, on_usage)
            event_bus.unsubscribe(EVENT_CHAT_FINISHED, on_finish)

    return StreamingResponse(generator(), media_type="application/x-ndjson")

@app.get("/health")
def health_check():
    return {"status": "ok"}

@app.post("/shutdown")
def shutdown_server():
    # In a real environment we would gracefully shutdown Uvicorn
    # For this local daemon, a hard exit is sufficient.
    import os
    os._exit(0)

@app.get("/models")
def get_models():
    return {"models": chat_router.inference_provider.list_models()}

@app.post("/model/pull")
def download_model(req: ModelRequest):
    for _ in chat_router.inference_provider.pull_model_stream(req.model):
        pass
    return {"status": "downloading", "model": req.model}

@app.post("/rag/add")
def add_rag_doc(req: RAGRequest):
    try:
        chunks = chat_router.vector_store.add_document(req.file_path, req.project_id)
        return {"chunks": chunks}
    except Exception as e:
        return {"error": str(e)}

@app.get("/rag/list")
def list_rag_docs(project_id: str | None = None):
    try:
        collection = chat_router.vector_store.get_collection(project_id)
        data = collection.get()
        sources = list(set([m.get("source", "unknown") for m in data.get("metadatas", []) if m]))
        return {"documents": sources}
    except Exception as e:
        return {"documents": [], "error": str(e)}

@app.get("/models/recommended")
def get_recommended_models():
    import urllib.request
    import re
    try:
        req = urllib.request.Request("https://ollama.com/library", headers={'User-Agent': 'Mozilla/5.0'})
        html = urllib.request.urlopen(req).read().decode('utf-8')
        models = re.findall(r'href="/library/([^/"]+)"', html)
        seen = set()
        unique_models = [m for m in models if not (m in seen or seen.add(m))]
        return {"models": unique_models[:10]}
    except Exception as e:
        return {"models": ["llama3.1", "mistral", "gemma2", "phi3", "qwen2"]}

class ExecuteRequest(BaseModel):
    code: str

@app.post("/execute")
def execute_code(req: ExecuteRequest):
    import subprocess
    import tempfile
    import os
    
    with tempfile.NamedTemporaryFile(suffix=".py", delete=False, mode="w") as f:
        f.write(req.code)
        temp_name = f.name
        
    try:
        result = subprocess.run(["python", temp_name], capture_output=True, text=True, timeout=10)
        return {"output": result.stdout + result.stderr}
    except subprocess.TimeoutExpired:
        return {"output": "Error: Execution timed out (10s limit)."}
    finally:
        if os.path.exists(temp_name):
            os.remove(temp_name)

class ProjectRequest(BaseModel):
    name: str
    root_path: str

@app.post("/projects")
def create_project(req: ProjectRequest):
    return settings.create_project(req.name, req.root_path)

@app.get("/projects")
def list_projects():
    return {"projects": settings.list_projects()}

# ==========================================
# v2 Conversation API
# ==========================================

class V2CreateConversationRequest(BaseModel):
    title: str = "New Conversation"
    project_id: str | None = None

@app.get("/v2/conversations")
def v2_list_conversations():
    return {"conversations": [c.model_dump() for c in v2_service.search_conversation("")]}

@app.get("/v2/conversations/{conv_id}")
def v2_get_conversation(conv_id: str):
    conv = v2_service.load_conversation(conv_id)
    if conv:
        return conv.model_dump()
    return {"error": "Conversation not found"}

@app.post("/v2/conversations")
def v2_create_conversation(req: V2CreateConversationRequest):
    conv = v2_service.create_conversation(req.title, req.project_id)
    return conv.model_dump()

@app.delete("/v2/conversations/{conv_id}")
def v2_delete_conversation(conv_id: str):
    v2_service.delete_conversation(conv_id)
    return {"status": "ok"}

class V2RenameRequest(BaseModel):
    title: str

@app.put("/v2/conversations/{conv_id}/title")
def v2_rename_conversation(conv_id: str, req: V2RenameRequest):
    v2_service.rename_conversation(conv_id, req.title)
    return {"status": "ok"}

@app.get("/update/check")
def check_update():
    import requests
    import time
    
    config = settings.get_config()
    last_check = config.get("last_update_check", 0)
    current_time = time.time()
    
    # 15 days = 15 * 24 * 60 * 60 = 1296000 seconds
    if current_time - last_check < 1296000:
        latest = config.get("last_known_latest_version")
        update_available = latest and latest != __version__
        return {"latest_version": latest, "url": config.get("last_known_latest_url"), "cached": True, "update_available": update_available}

    try:
        res = requests.get("https://api.github.com/repos/pranavakshit/LocAi/releases/latest", timeout=3)
        if res.status_code == 200:
            data = res.json()
            latest_version = data.get("tag_name")
            url = data.get("html_url")
            
            settings.update_config({
                "last_update_check": current_time,
                "last_known_latest_version": latest_version,
                "last_known_latest_url": url
            })
            
            update_available = latest_version and latest_version != __version__
            return {"latest_version": latest_version, "url": url, "cached": False, "update_available": update_available}
    except Exception:
        pass
    return {"latest_version": None, "cached": False, "update_available": False}

@app.get("/config")
def get_config():
    return settings.get_config()

class ConfigUpdateRequest(BaseModel):
    updates: dict

@app.post("/config")
def update_config(req: ConfigUpdateRequest):
    return settings.update_config(req.updates)

# Serve the React UI static build in production
dist_path = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', 'ui', 'dist'))
if os.path.exists(dist_path):
    app.mount("/assets", StaticFiles(directory=os.path.join(dist_path, "assets")), name="assets")
    
    @app.get("/{full_path:path}")
    def serve_react_app(full_path: str):
        file_path = os.path.join(dist_path, full_path)
        if os.path.exists(file_path) and os.path.isfile(file_path):
            return FileResponse(file_path)
        return FileResponse(os.path.join(dist_path, "index.html"))