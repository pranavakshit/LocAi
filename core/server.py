from fastapi import FastAPI
from pydantic import BaseModel
from core.model_router import chat_stream, list_models, pull_model
from fastapi.responses import StreamingResponse
import json
import os

app = FastAPI()

CONFIG_FILE = "config.json"


class ChatRequest(BaseModel):
    messages: list[dict[str, str]]


class ModelRequest(BaseModel):
    model: str


def get_model():
    if not os.path.exists(CONFIG_FILE):
        return "gemma4:e2b"

    with open(CONFIG_FILE, "r") as f:
        return json.load(f)["model"]


def set_model(model):
    with open(CONFIG_FILE, "w") as f:
        json.dump({"model": model}, f)


@app.get("/")
def root():
    return {"status": "LocAi running"}


@app.get("/model")
def current_model():
    return {"model": get_model()}


@app.post("/model")
def change_model(req: ModelRequest):

    def stream():
        import requests
        import json

        models = list_models()

        # If model not present → stream download
        if req.model not in models:

            res = requests.post(
                "http://localhost:11434/api/pull",
                json={"name": req.model},
                stream=True
            )

            seen_status = set()

            for line in res.iter_lines():
                if not line:
                    continue

                try:
                    j = json.loads(line.decode("utf-8"))

                    # status (print once)
                    if "status" in j and "digest" not in j:
                        status = j["status"]
                        if status not in seen_status:
                            yield status + "\n"
                            seen_status.add(status)

                    # progress
                    if "digest" in j and "completed" in j and "total" in j:
                        percent = (j["completed"] / j["total"]) * 100
                        yield f"pulling {j['digest'][:12]}: {percent:.2f}%\n"

                except:
                    pass

        # after download / if already exists
        set_model(req.model)
        yield f"Model set to {req.model}\n"
        yield "success\n"

    return StreamingResponse(stream(), media_type="text/plain")


@app.post("/chat")
def chat_endpoint(req: ChatRequest):
    model = get_model()

    def generator():
        for token in chat_stream(model, req.messages):
            yield token
            yield ""  # 🔥 forces flush

    return StreamingResponse(generator(), media_type="text/plain")

@app.get("/models")
def get_models():
    return {"models": list_models()}

@app.post("/model/pull")
def download_model(req: ModelRequest):
    pull_model(req.model)
    return {"status": "downloading", "model": req.model}