import requests

OLLAMA_URL = "http://localhost:11434/api/generate"

def chat(model, prompt):
    response = requests.post(OLLAMA_URL, json={
        "model": model,
        "prompt": prompt,
        "stream": False
    })

    return response.json()["response"]
def list_models():
    res = requests.get("http://localhost:11434/api/tags")
    return [m["name"] for m in res.json()["models"]]


def pull_model(model):
    res = requests.post(
        "http://localhost:11434/api/pull",
        json={"name": model},
        stream=True
    )

    import json

    for line in res.iter_lines():
        if line:
            try:
                j = json.loads(line.decode("utf-8"))

                if "completed" in j and "total" in j:
                    percent = (j["completed"] / j["total"]) * 100
                    print(
                        f"\rDownloading {model}: {percent:.2f}%",
                        end="",
                        flush=True
                    )

                elif "status" in j:
                    print(f"\nStatus: {j['status']}")

            except:
                pass

    print() 