import requests
import json

OLLAMA_GENERATE = "http://localhost:11434/api/generate"
OLLAMA_CHAT = "http://localhost:11434/api/chat"


# -----------------------
# 🧠 Streaming Chat (NEW)
# -----------------------
def chat_stream(model, messages):
    """
    Streams tokens from Ollama (chat endpoint)
    """

    try:
        res = requests.post(
            OLLAMA_CHAT,
            json={
                "model": model,
                "messages": messages,
                "stream": True
            },
            stream=True
        )

        for line in res.iter_lines():
            if not line:
                continue

            try:
                j = json.loads(line.decode("utf-8"))

                # token chunk from chat
                if "message" in j and "content" in j["message"]:
                    yield j["message"]["content"]

            except:
                continue

    except Exception as e:
        yield f"[Error] {e}"


# -----------------------
# 🧠 Normal Chat (fallback)
# -----------------------
def chat(model, messages):
    try:
        response = requests.post(OLLAMA_CHAT, json={
            "model": model,
            "messages": messages,
            "stream": False
        })

        data = response.json()

        if "message" in data and "content" in data["message"]:
            return data["message"]["content"]

        return f"[Unknown Response] {data}"

    except Exception as e:
        return f"[Error] {e}"


# -----------------------
# 📦 Models
# -----------------------
def list_models():
    res = requests.get("http://localhost:11434/api/tags")
    return [m["name"] for m in res.json()["models"]]


def pull_model(model):
    res = requests.post(
        "http://localhost:11434/api/pull",
        json={"name": model},
        stream=True
    )

    seen_status = set()

    for line in res.iter_lines():
        if not line:
            continue

        try:
            j = json.loads(line.decode("utf-8"))

            # status once
            if "status" in j and "digest" not in j:
                status = j["status"]
                if status not in seen_status:
                    print(status)
                    seen_status.add(status)

            # progress
            if "digest" in j and "completed" in j and "total" in j:
                percent = (j["completed"] / j["total"]) * 100

                bar_len = 20
                filled = int(bar_len * percent / 100)
                bar = "█" * filled + " " * (bar_len - filled)

                print(
                    f"\rpulling {j['digest'][:12]}: {percent:5.1f}% |{bar}|",
                    end="",
                    flush=True
                )

        except:
            pass

    print("\nsuccess")