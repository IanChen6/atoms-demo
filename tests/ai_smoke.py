"""Opt-in local smoke test for the configured model: python3 tests/ai_smoke.py."""
import http.cookiejar
import json
import secrets
import urllib.request

BASE = "http://localhost:3000"
client = urllib.request.build_opener(
    urllib.request.HTTPCookieProcessor(http.cookiejar.CookieJar())
)


def call(path, data=None):
    request = urllib.request.Request(
        BASE + path,
        data=json.dumps(data).encode() if data is not None else None,
        headers={"Content-Type": "application/json", "Origin": BASE},
    )
    with client.open(request, timeout=105) as response:
        return response.status, json.load(response)


suffix = secrets.token_hex(5)
status, _ = call(
    "/api/auth",
    {
        "action": "register",
        "email": f"ai-smoke-{suffix}@example.com",
        "name": "AI smoke test",
        "password": "ai-smoke-" + secrets.token_hex(12),
    },
)
assert status == 200
status, generated = call(
    "/api/studio",
    {
        "prompt": "做一个极简计数器，可以增加、减少和归零数字。",
    },
)
assert status == 200, generated
assert generated["outcome"] == "success", generated
status, state = call("/api/studio?project=" + generated["project"])
assert status == 200
assert len(state["versions"]) == 1
assert [message["status"] for message in state["messages"]] == [
    "success",
    "success",
]
print("PASS: configured model generated and persisted one interactive app")
