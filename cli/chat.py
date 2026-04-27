import requests

API = "http://localhost:8000"

print("LocAi CLI (type 'exit' to quit)\n")

while True:
    msg = input("You: ")

    if msg.lower() == "exit":
        break

    try:
        res = requests.post(f"{API}/chat", json={"message": msg})
        print("AI:", res.json()["response"], "\n")
    except Exception as e:
        print("Error:", e)