---
title: "Agents API"
description: "Generate avatar agents, poll their status, retrieve and update them, then make them speak or inject knowledge into live sessions."
section: api
group: "Agents"
order: 20
---

## The agent lifecycle

From "I have a face and voice" to "live talking avatar":

```text
Generate → Poll until ready → Resolve by code → Live session → Speak
```

This page covers the full REST lifecycle. For the in-process SDK flow, see the
[Python SDK](/sdk/python) and [agent lifecycle](/concepts/agent-lifecycle)
concepts.

## Validate your key

`POST /v1/validate` — verify your API secret before making other calls. Costs no
credits.

```bash
curl -X POST https://api.bithuman.ai/v1/validate \
  -H "api-secret: $BITHUMAN_API_SECRET"
```

```json
{ "valid": true }
```

## Generate an agent

`POST /v1/agent/generate` — create a new avatar agent. Generation is
asynchronous and costs 250 credits; the call returns immediately with an
`agent_id` and `processing` status.

| Parameter | Type | Required | Default | Description |
|---|---|---|---|---|
| `prompt` | string | no | random | System prompt / personality for the agent. |
| `image` | string | no | — | Image URL or base64 data for appearance. |
| `video` | string | no | — | Video URL or base64 data for appearance and mannerisms. |
| `audio` | string | no | — | Audio URL or base64 data for voice cloning. |
| `aspect_ratio` | string | no | `16:9` | Image aspect ratio (`16:9`, `9:16`, `1:1`). |
| `video_aspect_ratio` | string | no | `16:9` | Video aspect ratio (`16:9`, `9:16`, `1:1`). |
| `agent_id` | string | no | auto | Custom agent identifier. |
| `duration` | number | no | `10` | Source video duration in seconds. |
| `model` | string | no | `essence` | Avatar runtime model: `essence` or `expression` (`elevate` is also accepted). See [models](/concepts/models). **Warning:** unknown values are not rejected — generation silently falls back to the default pipeline and still bills 250 credits, so double-check spelling. |

```python
import requests

resp = requests.post(
    "https://api.bithuman.ai/v1/agent/generate",
    headers={"Content-Type": "application/json", "api-secret": "YOUR_API_SECRET"},
    json={
        "prompt": "You are a professional video content creator.",
        "image": "https://example.com/avatar.jpg",
    },
)
print(resp.json())
```

```json
{
  "success": true,
  "message": "Agent generation started",
  "agent_id": "A91XMB7113",
  "status": "processing"
}
```

> **Note** The generation endpoint is `POST /v1/agent/generate`. (Older docs
> referenced `/v1/agent-generation` — that path is incorrect.)

## Poll status

`GET /v1/agent/status/{agent_id}` — returns the current state of a generation
request. Poll every 5 seconds.

| Status | Description |
|---|---|
| `processing` | Initial state — generation queued. |
| `generating` | Active generation in progress (sub-steps running). |
| `completed` | An intermediate sub-step finished. **Not terminal** — it can appear early (even around ~5% `progress`), so do not stop polling on it. |
| `success` | Success — the `.imx` model is available for use. |
| `ready` | Success — the `.imx` model is available for use (equivalent to `success`). |
| `failed` | Failure — check `error_message`. |

Treat `success` / `ready` and `failed` as terminal. `processing`, `generating`,
and `completed` are intermediate, so keep polling (don't stop on `completed` —
it can appear long before the model is done). Drive your loop off `progress`
reaching `1.0` together with a terminal status. Typical wall-clock is two to
five minutes.

```json
{
  "success": true,
  "data": {
    "agent_id": "A91XMB7113",
    "status": "ready",
    "progress": 1.0,
    "progress_msg": "Done",
    "current_step": "lip_created",
    "error_message": null,
    "system_prompt": "You are a professional video content creator.",
    "image_url": "https://...",
    "video_url": "https://...",
    "model_url": "https://...",
    "name": "agent name"
  }
}
```

| Progress field | Type | Description |
|---|---|---|
| `progress` | float (0.0–1.0) | Generation progress as a fraction. `1.0` is complete. |
| `progress_msg` | string | Human-readable progress description. |
| `current_step` | string | Current generation step (e.g. `lip_created`). |

### Generate and poll

```python
import os, time, requests

BASE = "https://api.bithuman.ai"
SECRET = os.environ["BITHUMAN_API_SECRET"]
headers = {"Content-Type": "application/json", "api-secret": SECRET}

resp = requests.post(f"{BASE}/v1/agent/generate", headers=headers,
                     json={"prompt": "You are a friendly AI assistant."})
agent_id = resp.json()["agent_id"]

while True:
    data = requests.get(f"{BASE}/v1/agent/status/{agent_id}",
                        headers={"api-secret": SECRET}).json()["data"]
    # `success` and `ready` both mean done; `completed` is NOT terminal.
    if data["status"] in ("ready", "success"):
        print("Ready:", data["model_url"])
        break
    if data["status"] == "failed":
        raise SystemExit(f"Failed: {data['error_message']}")
    time.sleep(5)
```

## Get an agent

`GET /v1/agent/{code}` — retrieve full details for an agent by its code.

```python
import requests

code = "A91XMB7113"
data = requests.get(
    f"https://api.bithuman.ai/v1/agent/{code}",
    headers={"api-secret": "YOUR_API_SECRET"},
).json()
agent = data["data"]
print(agent["name"], agent["status"])
```

```json
{
  "success": true,
  "data": {
    "agent_id": "A91XMB7113",
    "status": "ready",
    "system_prompt": "You are a friendly AI assistant",
    "image_url": "https://tmoobjxlwcwvxvjeppzq.supabase.co/storage/v1/object/public/bithuman/A91XMB7113/image_20260115_103000_000001.jpg",
    "video_url": "https://tmoobjxlwcwvxvjeppzq.supabase.co/storage/v1/object/public/bithuman/A91XMB7113/video_20260115_103200_000002.mp4",
    "model_url": "https://tmoobjxlwcwvxvjeppzq.supabase.co/storage/v1/object/public/bithuman/A91XMB7113/my_agent_20260115_103500_000003.imx",
    "name": "My Agent"
  }
}
```

## List your agents

`GET /v1/agents` — list the agents owned by your API secret, newest first.
Paginated with `limit` (default 20, max 100) and `offset`; filter by generation
state with `status`.

```python
import requests

resp = requests.get(
    "https://api.bithuman.ai/v1/agents",
    headers={"api-secret": "YOUR_API_SECRET"},
    params={"limit": 20, "offset": 0, "status": "ready"},
).json()

for a in resp["data"]:
    print(a["code"], a["status"])
print(resp["pagination"])   # {limit, offset, total, has_more}
```

Page through with `offset` until `pagination.has_more` is `false`.

## Delete an agent

`DELETE /v1/agent/{code}` — permanently delete an agent you own. Stored assets
are cleaned up best-effort; usage history is retained for billing. Deleting a
missing or non-owned agent returns `404`.

```python
import requests

requests.delete(
    "https://api.bithuman.ai/v1/agent/A91XMB7113",
    headers={"api-secret": "YOUR_API_SECRET"},
).json()
# {"success": true, "agent_code": "A91XMB7113", "deleted": true}
```

## Update an agent's prompt

`POST /v1/agent/{code}` — update the system prompt of an existing agent without
regenerating it. The agent must already exist. For a new face or voice, generate
a new agent.

```python
import requests

code = "A91XMB7113"
resp = requests.post(
    f"https://api.bithuman.ai/v1/agent/{code}",
    headers={"Content-Type": "application/json", "api-secret": "YOUR_API_SECRET"},
    json={"system_prompt": "You are a professional sales assistant."},
)
print(resp.json())
```

```json
{ "agent_code": "A91XMB7113", "updated": true }
```

## Make an agent speak

`POST /v1/agent/{agent_code}/speak` — trigger the agent to speak a message to
users in an active session.

| Parameter | Type | Required | Description |
|---|---|---|---|
| `message` | string | yes | Text the agent will speak. |
| `room_id` | string | no | Target a specific room. If omitted, delivers to all active rooms. |

```bash
curl -X POST https://api.bithuman.ai/v1/agent/A12345678/speak \
  -H "Content-Type: application/json" \
  -H "api-secret: $BITHUMAN_API_SECRET" \
  -d '{
    "message": "We have a 20% discount available today.",
    "room_id": "customer_session_1"
  }'
```

```json
{
  "agent_code": "A12345678",
  "context_type": "speak",
  "delivered_to_rooms": 1
}
```

## Inject knowledge

`POST /v1/agent/{agent_code}/add-context` — add background knowledge the agent
uses to inform future responses. Set `type` to `speak` to trigger speech
instead.

| Parameter | Type | Required | Default | Description |
|---|---|---|---|---|
| `context` | string | yes | — | Knowledge to inject (or message to speak). |
| `type` | string | no | `add_context` | `add_context` injects knowledge silently; `speak` triggers a verbal response. |
| `room_id` | string | no | — | Target a specific room. If omitted, delivers to all active rooms. |

```python
import requests

requests.post(
    "https://api.bithuman.ai/v1/agent/A12345678/add-context",
    headers={"Content-Type": "application/json", "api-secret": "YOUR_API_SECRET"},
    json={
        "context": "Customer has VIP status. Preferred name: Alex. Account since 2021.",
        "type": "add_context",
        "room_id": "vip_session_42",
    },
)
```

> **Note** `/speak` and `/add-context` target agents created on the bitHuman
> platform that have an **active session** — not local SDK agents. Without a
> live room you'll get `404 NOT_FOUND`. Start a session via the
> [embed flow](/api/embedding) or a LiveKit worker first.

## Error codes

| HTTP | Code | When |
|---|---|---|
| `401` | `UNAUTHORIZED` | Invalid or missing `api-secret`. |
| `402` | `INSUFFICIENT_BALANCE` | Not enough credits (generation costs 250). |
| `404` | `NOT_FOUND` | No agent with the given code (`message`: `"Agent not found for code: <code>"`). |
| `404` | `NOT_FOUND` | Agent has no active session to `/speak` or `/add-context` (`message`: `"No active rooms found for agent <code>"`). |
| `400` | `VALIDATION_ERROR` | Invalid request body (e.g. bad `type` value). |

See the full [error reference](/api/errors) and the interactive
[API reference](/api/reference).
