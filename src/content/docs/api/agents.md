---
title: "Agents API"
description: "Generate avatar agents, poll their status, retrieve and update them, then make them speak or inject knowledge into live sessions."
section: api
group: "Build"
order: 10
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
| `model` | string | no | `essence-1` | Avatar model — `essence-1` (default), [`essence-2-quality`](/concepts/essence-2-quality), [`essence-2-light`](/concepts/essence-2-light), `expression-1`, or [`expression-2`](/concepts/expression-2) (all five GA). The bare `essence` / `expression` shorthands resolve to `essence-1` / `expression-1`. Invalid or retired values return `400 VALIDATION_ERROR` (no credits charged). See [models](/concepts/models) and [Essence 2 & Expression 2](/concepts/models-v2). |

### Model-specific inputs and creation times

The `model` you pick changes what creation needs and how long it runs. All
models share the same pipeline prefix — persona, voice, and image are prepared
first (each generated from your prompt when not supplied) — then the
model-specific identity step runs:

| `model` | Identity input | Identity step | Typical creation time |
|---|---|---|---|
| `essence-1` (default) | `image` (or generated from prompt); `video` generated if needed | Builds the portable `.imx` avatar | 2–5 minutes |
| `expression-1` | `image` (or generated from prompt) | None (animates the portrait at runtime) | ~1–2 minutes |
| `essence-2-quality` | **`video` required** — the identity is prepared from real footage | Instant prep of a compact identity bundle (seconds, warm) | A few minutes end-to-end |
| `essence-2-light` | `video`, **or** `image` (a video is generated from it first — adds a `video` step) | Distills a compact identity bundle on a cloud GPU | 25–40 minutes typical; occasionally longer (allowed up to several hours) |
| `expression-2` | `image` (or generated from prompt) | Trains a per-identity model on an H100-class GPU | ~45 minutes (30–60; allowed up to 90) |

Set your polling timeout per model — a 5-minute client timeout is fine for
`essence-1` but will falsely "fail" every `expression-2` and `essence-2-light`
creation. Full model behavior (serving tiers, idle, pricing) is in each
model's guide.

```python
import requests

resp = requests.post(
    "https://api.bithuman.ai/v1/agent/generate",
    headers={"Content-Type": "application/json", "api-secret": "YOUR_API_SECRET"},
    json={
        "prompt": "You are a professional video content creator.",
        "image": "https://example.com/avatar.jpg",
        "model": "expression-2",
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
five minutes for `essence-1` — the second-generation models train real
per-identity models and take longer (see
[model-specific inputs and creation times](#model-specific-inputs-and-creation-times)).

While a run is in flight, `current_step` reports the pipeline stage:

| `current_step` | Progress | What's happening |
|---|---|---|
| `payment` | ~2% | Credits reserved (250). |
| `persona` | 5–15% | Persona / system prompt prepared. |
| `voice_image` | ~20% | Voice and portrait generated (in parallel). |
| `video` | ~45% | Identity video generated — `essence-1`, and `essence-2-light` when you supplied only an image. |
| `awaiting_face_marking` | ~35% | Waiting on manual face marking (rare `essence-1` path). |
| `lip_sync` | 70–99% | The model-specific identity step — `.imx` build (`essence-1`), identity prep (`essence-2-quality`), bundle distillation (`essence-2-light`), or per-identity training (`expression-2`). The longest step for the v2 models. |
| `done` | 100% | Terminal — the agent is `ready`. |

```json
{
  "success": true,
  "data": {
    "agent_id": "A91XMB7113",
    "status": "ready",
    "progress": 1.0,
    "progress_msg": "Complete",
    "current_step": "done",
    "error_message": null,
    "system_prompt": "You are a professional video content creator.",
    "image_url": "https://...",
    "video_url": "https://...",
    "model_url": "https://...",
    "supported_models": ["essence-2-quality", "expression-2"],
    "name": "agent name"
  }
}
```

| Progress field | Type | Description |
|---|---|---|
| `progress` | float (0.0–1.0) | Generation progress as a fraction. `1.0` is complete. |
| `progress_msg` | string | Human-readable progress description. |
| `current_step` | string | Current generation step (see the table above). |
| `supported_models` | string[] | The canonical model families this agent can be **launched as right now**. Trained families (`expression-2`, `essence-2-light`) appear once their per-identity model exists; `essence-2-quality` appears whenever the agent has an image (it prepares on demand); `essence-1` appears when its `.imx` exists. Tier slugs inherit their family. Also returned on `GET /v1/agent/{code}`, `GET /v1/agents` items, and the embed-token response. |

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

### Creation failure modes

Two kinds of failure exist — **rejected before start** (HTTP error, nothing
charged) and **failed during generation** (`status: "failed"`, credits
automatically refunded):

| Failure | Surface | Notes |
|---|---|---|
| Invalid `model` value | `400 VALIDATION_ERROR` — `Invalid model '<x>'; must be one of: essence, essence-1, essence-2-light, essence-2-quality, expression, expression-1, expression-2` | Rejected before dispatch; no credits charged. Retired engine names get the same rejection. |
| Malformed body | `400 VALIDATION_ERROR` — `Request body must be valid JSON` / `…a JSON object` | Rejected before dispatch. |
| Not enough credits | `402 INSUFFICIENT_BALANCE` (also surfaces as `status: "failed"` with a payment `error_message` if the reserve fails mid-pipeline) | Creation costs 250 credits. |
| A pipeline step fails | `status: "failed"` + `error_message` naming the step (voice, image, video, or the model step) | Terminal for that `agent_id`; the 250 credits are refunded automatically. Create again after fixing the input. |
| `essence-2-quality` without a source video | `status: "failed"` at the model step | The tier prepares its identity from real footage — supply `video`. See [Essence 2 Quality](/concepts/essence-2-quality#how-creation-works). |
| v2 creation "stuck" at `lip_sync` | Not a failure | That's the training/prep step — the longest part for `expression-2` / `essence-2-light`. Keep polling; see [creation times](#model-specific-inputs-and-creation-times). |

More session-time issues (connect latency, tier pinning, idle behavior):
[Session behavior & troubleshooting](/guides/session-troubleshooting).

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
    "image_url": "https://storage.bithuman.ai/A91XMB7113/image_20260115_103000_000001.jpg",
    "video_url": "https://storage.bithuman.ai/A91XMB7113/video_20260115_103200_000002.mp4",
    "model_url": "https://storage.bithuman.ai/A91XMB7113/my_agent_20260115_103500_000003.imx",
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
| `400` | `VALIDATION_ERROR` | Invalid request body (e.g. bad `type` value, or an invalid / retired `model` name — the error message lists the accepted values). |
| `409` | `MODEL_NOT_GENERATED` | A launch surface (embed-token `model`, [talking video](/api/video)) requested `expression-2` / `essence-2-light` for an agent whose trained per-identity model doesn't exist yet (`message`: `"agent <code>'s <model> model hasn't been generated yet"`). Check `supported_models`, or create the agent with that model. `essence-2-quality` is never gated — it prepares on demand. |

See the full [error reference](/api/errors) and the interactive
[API reference](/api/reference).
