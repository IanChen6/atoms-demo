"""Run against the local development server to verify progressive agent events."""

import http.cookiejar
import json
import urllib.request
import uuid

BASE = "http://localhost:3000"
opener = urllib.request.build_opener(
    urllib.request.HTTPCookieProcessor(http.cookiejar.CookieJar())
)
suffix = uuid.uuid4().hex[:10]
password = "stream-pass-" + uuid.uuid4().hex

register = urllib.request.Request(
    BASE + "/api/auth",
    data=json.dumps(
        {
            "action": "register",
            "email": f"stream-{suffix}@example.com",
            "name": "流式测试",
            "password": password,
        }
    ).encode(),
    headers={"Content-Type": "application/json", "Origin": BASE},
)
opener.open(register).read()

request = urllib.request.Request(
    BASE + "/api/studio",
    data=json.dumps(
        {
            "prompt": "待办清单，支持添加、完成和删除任务",
            "mode": "demo",
        }
    ).encode(),
    headers={
        "Content-Type": "application/json",
        "Origin": BASE,
        "Accept": "text/event-stream",
    },
)
events = []
with opener.open(request) as response:
    for raw in response:
        line = raw.decode().strip()
        if line.startswith("data: "):
            events.append(json.loads(line[6:]))

progress = [event for event in events if event["type"] == "progress"]
result = [event for event in events if event["type"] == "result"]
assert len(progress) >= 4, events
assert [item["status"] for item in progress[0]["trace"]] == [
    "active",
    "pending",
    "pending",
    "pending",
]
assert all(item["status"] == "done" for item in progress[-1]["trace"])
assert result[-1]["outcome"] == "success"
assert "reasoning" not in json.dumps(events).lower()
print("PASS: progressive public agent events and terminal result")
