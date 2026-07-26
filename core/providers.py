import abc
import json
import requests
from typing import Generator, List, Dict

class InferenceProvider(abc.ABC):
    """
    Abstract base class for all Local AI Inference Providers (e.g., Ollama, vLLM).
    """

    @abc.abstractmethod
    def chat_stream(self, model: str, messages: List[Dict[str, str]]) -> Generator[str, None, None]:
        pass

    @abc.abstractmethod
    def chat(self, model: str, prompt: str) -> str:
        pass

    @abc.abstractmethod
    def list_models(self) -> List[str]:
        pass

    @abc.abstractmethod
    def pull_model_stream(self, model: str) -> Generator[str, None, None]:
        pass


class OllamaProvider(InferenceProvider):
    def __init__(self, base_url: str = "http://localhost:11434"):
        self.base_url = base_url

    def chat_stream(self, model: str, messages: List[Dict[str, str]]) -> Generator[str, None, None]:
        try:
            res = requests.post(
                f"{self.base_url}/api/chat",
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
                    if "error" in j:
                        yield f"\n[Ollama API Error] {j['error']}\n"
                    elif "message" in j and "content" in j["message"]:
                        yield j["message"]["content"]
                except Exception:
                    continue

        except Exception as e:
            yield f"[Error] {e}"

    def chat(self, model: str, prompt: str) -> str:
        try:
            response = requests.post(f"{self.base_url}/api/generate", json={
                "model": model,
                "prompt": prompt,
                "stream": False
            })

            data = response.json()
            if "error" in data:
                return f"[Ollama API Error] {data['error']}"
            if "response" in data:
                return data["response"]

            # fallback to chat API
            response = requests.post(f"{self.base_url}/api/chat", json={
                "model": model,
                "messages": [
                    {"role": "user", "content": prompt}
                ],
                "stream": False
            })

            data = response.json()
            if "error" in data:
                return f"[Ollama API Error] {data['error']}"
            if "message" in data and "content" in data["message"]:
                return data["message"]["content"]

            return f"[Unknown Response] {data}"

        except Exception as e:
            return f"[Error] {e}"

    def list_models(self) -> List[str]:
        try:
            res = requests.get(f"{self.base_url}/api/tags", timeout=3)
            return [m["name"] for m in res.json().get("models", [])]
        except Exception:
            return []

    def pull_model_stream(self, model: str) -> Generator[str, None, None]:
        try:
            res = requests.post(
                f"{self.base_url}/api/pull",
                json={"name": model},
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

                except Exception:
                    pass
                    
        except Exception as e:
            yield f"[Error pulling model] {e}\n"
