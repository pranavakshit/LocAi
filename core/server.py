from fastapi import FastAPI
from pydantic import BaseModel
from core.model_router import chat, list_models, pull_model
import json
import os

app = FastAPI()

CONFIG_FILE = "config.json"


class ChatRequest(BaseModel):
    message: str


class ModelRequest(BaseModel):
    model: str


def get_model():
    if not os.path.exists(CONFIG_FILE):
        return "gemma:latest"

    with open(CONFIG_FILE, "r") as f:
        return json.load(f)["model"]


def set_model(model):
    with open(CONFIG_FILE, "w") as f:
        json.dump({"model": model}, f)


@app.get("/")
def root():
    return {"status": "LocAI running"}


@app.get("/model")
def current_model():
    return {"model": get_model()}


@app.post("/model")
def change_model(req: ModelRequest):
    models = list_models()

    if req.model not in models:
        pull_model(req.model)

    set_model(req.model)
    return {"status": "model set", "model": req.model}


@app.post("/chat")
def chat_endpoint(req: ChatRequest):
    model = get_model()
    response = chat(model, req.message)
    return {"response": response}

@app.get("/models")
def get_models():
    return {"models": list_models()}

@app.post("/model/pull")
def download_model(req: ModelRequest):
    pull_model(req.model)
    return {"status": "downloading", "model": req.model}