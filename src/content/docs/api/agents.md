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
asynchronous and billed **per model** — the second-generation families
(`essence-2`, `essence-2-max`, `expression-2`, and
`auto`) cost 500 credits, the v1 families (`essence-1`, `expression-1`) 250
(machine-readable schedule: [`GET /v1/pricing`](/api/billing#get-the-pricing-schedule)).
The call returns immediately with an `agent_id` and `processing` status.

| Parameter | Type | Required | Default | Description |
|---|---|---|---|---|
| `prompt` | string | no | random | System prompt / personality for the agent. |
| `image` | string | no | — | Image URL or base64 data for appearance. |
| `audio` | string | no | — | Audio URL or base64 data for voice cloning. |
| `aspect_ratio` | string | no | `16:9` | Image aspect ratio (`16:9`, `9:16`, `1:1`). |
| `agent_id` | string | no | auto | Custom agent identifier. |
| `duration` | number | no | — | **Deprecated — accepted but ignored.** The internally generated identity video is always 10 seconds. |
| `model` | string | no | `essence-1` | Avatar model — `essence-1` (default), **[`essence-2`](/concepts/essence-2)** (the [combined Essence 2 creation](#essence-2--the-combined-creation)), [`essence-2-max`](/concepts/essence-2-max), `expression-1`, or [`expression-2`](/concepts/expression-2) — plus **`auto`** ([classify-and-route](#auto--let-the-platform-pick-the-model)). The bare `essence` / `expression` shorthands resolve to `essence-1` / `expression-1`. `auto` must be sent **explicitly** — an omitted `model` keeps the historical `essence-1` default (and its 250-credit rate); a caller is never silently upgraded onto a 500-credit pipeline. Invalid values return `400 VALIDATION_ERROR` (no credits charged); the retired `essence-2-light` name returns a targeted hint pointing at `essence-2`, and the pre-rename `essence-2-quality` is still accepted as a **deprecated alias** for `essence-2-max` during the migration. See [models](/concepts/models) and [Essence 2 & Expression 2](/concepts/models-v2). |

> **Agent creation is image-only.** Provide a portrait `image` (or let the
> prompt generate one) — bitHuman generates a **10-second idle/driver video
> internally**, authored to loop seamlessly (its first and last frames
> match). Video input is not accepted for any model: a request carrying
> `video` is rejected with
> [`400 VIDEO_INPUT_NOT_SUPPORTED`](/api/errors#agent-operations) before
> anything is billed.

### Model-specific inputs and creation times

The `model` you pick changes what creation needs and how long it runs. All
models share the same pipeline prefix — persona, voice, and image are prepared
first (each generated from your prompt when not supplied) — then the
model-specific identity step runs:

| `model` | Identity input | Identity step | Typical creation time |
|---|---|---|---|
| `essence-1` (default) | `image` (or generated from prompt); an identity video is generated internally if needed | Builds the portable `.imx` avatar | 2–5 minutes |
| `expression-1` | `image` (or generated from prompt) | None (animates the portrait at runtime) | ~1–2 minutes |
| `essence-2` | `image` (or generated from prompt) — a 10-second identity video is generated from it internally (the `video` step) | **Combined**: distills the standard Essence 2 identity bundle on a cloud GPU; Max derives from the same identity video | 25–40 minutes typical; occasionally longer (allowed up to several hours) |
| `essence-2-max` | Included with every `essence-2` creation — its identity derives from the same internally generated identity video | Instant prep of a compact identity bundle (seconds, warm) | Available once the combined creation is ready |
| `expression-2` | `image` (or generated from prompt) | Trains a per-identity model on an H100-class GPU | ~45 minutes (30–60; allowed up to 90) |
| `auto` | `image` or prompt (classified automatically) | As the routed model — `essence-2` or `expression-2` | As the routed model |

Set your polling timeout per model — a 5-minute client timeout is fine for
`essence-1` but will falsely "fail" every `expression-2` and `essence-2`
creation. Full model behavior (serving tiers, idle, pricing) is in each
model's guide.

### `essence-2` — the combined creation

`model: "essence-2"` creates **both Essence 2 models from one creation**: a
single 500-credit charge runs the standard [Essence 2](/concepts/essence-2)
distillation, and [Essence 2 Max](/concepts/essence-2-max) becomes
available at no extra charge from the same **internally generated identity
video** (its identity prepares on demand from that video). Sessions
launched as `essence-2` serve
the standard chain by default; launch with `?model=essence-2-max` on
the session/embed URL (or the `model` field on the
[embed token](/api/embedding)) when you want the premium model (the
pre-rename `essence-2-quality` slug still works too). Once ready,
the agent's `supported_models` lists the two families under their internal
names — `essence-2-light` (the standard Essence 2) and `essence-2-quality`
(Essence 2 Max) — until the platform-side flip.

### `auto` — let the platform pick the model

`model: "auto"` runs an LLM **subject classifier** over your creation input —
the `image` if you provided one, else the `prompt` — and routes it:

- a **photorealistic person** → `essence-2` (the combined creation above);
- a **cartoon, animal, creature, or robot** → `expression-2` (the generative
  engine, which handles any subject and works best for stylized characters).

`auto` never rejects on subject — it routes instead — and charges the routed
model's 500-credit rate. It is the default selection in the dashboard's
create flow, but **API callers must pass it explicitly**: an omitted `model`
keeps the historical `essence-1` default for backward compatibility.

### The Essence 2 subject gate (422)

An **explicit** Essence 2 creation (`essence-2`, `essence-2-max`)
requires a **photorealistic human subject** — the Essence
identity pipelines train on real human faces. The same classifier runs on
your input **before anything is billed** and before any agent row is created;
a non-human or stylized subject is rejected with
[`422 MODEL_SUBJECT_MISMATCH`](/api/errors#model-errors):

```json
{
  "error": {
    "code": "MODEL_SUBJECT_MISMATCH",
    "message": "essence-2 requires a photorealistic human subject; this image looks like a cartoon — use expression-2",
    "httpStatus": 422
  },
  "status": "error",
  "status_code": 422
}
```

(With a prompt-only input the message reads "this description sounds like
a …".) Use `expression-2` for those subjects, or `model: "auto"` to route
automatically. A classifier outage never blocks creation — the gate fails
open.

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
| `payment` | ~2% | Credits reserved (the model's creation cost — 250 or 500). |
| `persona` | 5–15% | Persona / system prompt prepared. |
| `voice_image` | ~20% | Voice and portrait generated (in parallel). |
| `video` | ~45% | The 10-second identity video is generated internally (`essence-1` and `essence-2`) — authored to loop seamlessly. |
| `awaiting_face_marking` | ~35% | Waiting on manual face marking (rare `essence-1` path). |
| `lip_sync` | 70–99% | The model-specific identity step — `.imx` build (`essence-1`), identity prep (`essence-2-max`), bundle distillation (`essence-2`), or per-identity training (`expression-2`). The longest step for the v2 models. |
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
| `supported_models` | string[] | The canonical model families this agent can be **launched as right now**. Trained families (`expression-2`, `essence-2-light` — the internal family name for the standard `essence-2`) appear once their per-identity model exists; `essence-2-quality` (the internal family name for `essence-2-max`, kept until the platform-side flip) appears when the agent has a **stored identity video** (generated internally by Essence creations; its identity prepares on demand from that video); `essence-1` appears when its `.imx` exists. Tier slugs inherit their family, and the combined `essence-2` creation shows up as its two tier families. Also returned on `GET /v1/agent/{code}`, `GET /v1/agents` items, and the embed-token response. |

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
| Invalid `model` value | `400 VALIDATION_ERROR` — `Invalid model '<x>'; must be one of: auto, essence, essence-1, essence-2, essence-2-max, essence-2-quality, expression, expression-1, expression-2` | Rejected before dispatch; no credits charged. Retired names get a **targeted hint** instead of the bare list — e.g. `essence-2-light` → *"'essence-2-light' was consolidated into 'essence-2' (2026-07-05)…"*. |
| Malformed body | `400 VALIDATION_ERROR` — `Request body must be valid JSON` / `…a JSON object` | Rejected before dispatch. |
| `video` in the request body | [`400 VIDEO_INPUT_NOT_SUPPORTED`](/api/errors#agent-operations) — `Agent creation is image-only. Provide a portrait image; bitHuman generates a 10-second idle/driver video internally so it loops seamlessly (first frame == last frame). …` | Rejected before dispatch; nothing charged. Send `image` instead — the idle/driver video is always generated internally, for every model. |
| Non-human subject on an explicit Essence 2 creation | [`422 MODEL_SUBJECT_MISMATCH`](/api/errors#model-errors) — `essence-2 requires a photorealistic human subject; this image looks like a <verdict> — use expression-2` | Rejected **before billing** and before any agent row exists — see [the subject gate](#the-essence-2-subject-gate-422). `auto` routes instead of rejecting. |
| Not enough credits | `402 INSUFFICIENT_BALANCE` (also surfaces as `status: "failed"` with a payment `error_message` if the reserve fails mid-pipeline) | Creation costs the model's rate — 250 (v1) or 500 (second generation). |
| A pipeline step fails | `status: "failed"` + `error_message` naming the step (voice, image, video, or the model step) | Terminal for that `agent_id`; the creation credits are refunded automatically. Create again after fixing the input. |
| `essence-2-max` on an agent without a stored identity video | `409 MODEL_NOT_GENERATED` at launch | Max prepares its identity from the agent's internally generated identity video — create with (or [add](#add-a-model-to-an-existing-agent)) the combined `essence-2`, which generates it. See [Essence 2 Max](/concepts/essence-2-max#how-creation-works). |
| v2 creation "stuck" at `lip_sync` | Not a failure | That's the training/prep step — the longest part for `expression-2` / `essence-2`. Keep polling; see [creation times](#model-specific-inputs-and-creation-times). |

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

## Add a model to an existing agent

`POST /v1/agent/{code}/models` — add an avatar model to an agent you already
created, without re-creating it or regenerating its persona/voice/image. The
agent must be in the `ready` state (else
[`409 AGENT_NOT_READY`](/api/errors#model-errors)).

Body: `{"model": "<name>"}` — one of `essence-1`, `essence-2`,
`expression-1`, `expression-2` (anything else returns `400 VALIDATION_ERROR`
listing the options; the Essence 2 tiers are not individually addable —
`essence-2` is the one combined add).

| `model` | What happens | Prerequisites | Credits | Time |
|---|---|---|---|---|
| `expression-1` | **Instant enablement** — the v1 foundation model drives the agent's existing image + voice at runtime; nothing is trained | stored image **and** voice (else `422`) | **0** | immediate (this response) |
| `expression-2` | Trains the per-identity Expression 2 model from the stored image | stored image (else `422`) | 500 | ~10–45 min |
| `essence-2` | The **combined** add: trains the standard Essence 2 from the agent's stored identity video (generated internally at creation); Max lights up from the same video at no extra charge | stored identity video (else `422 MODEL_PREREQUISITE_MISSING`) + photorealistic-human subject on the stored image (else `422 MODEL_SUBJECT_MISMATCH`) | 500 | 45 min–3 h |
| `essence-1` | Builds the v1 `.imx` — reuses the stored identity video, or generates one internally from the stored image | stored identity video or image (else `422`) | 250 | ~10–20 min |

```python
import requests

resp = requests.post(
    "https://api.bithuman.ai/v1/agent/A56ZFX6217/models",
    headers={"Content-Type": "application/json", "api-secret": "YOUR_API_SECRET"},
    json={"model": "expression-2"},
)
print(resp.json())
```

An **async** add (everything except `expression-1`) responds immediately:

```json
{
  "success": true,
  "agent_id": "A56ZFX6217",
  "model": "expression-2",
  "status": "processing",
  "credits": 500,
  "supported_models": ["essence-1", "essence-2-quality"],
  "message": "expression-2 model add started (typically 10-45 minutes). 500 credits are charged (refunded automatically if the add fails). Poll GET /v1/agent/status/A56ZFX6217 until supported_models includes expression-2."
}
```

Poll [`GET /v1/agent/status/{code}`](#poll-status) until `supported_models`
contains the new family (`essence-2` adds **both** internal family names,
`essence-2-light` and `essence-2-quality`). The agent keeps serving as-is while the add runs —
`status` stays `ready` for the v2 adds. An **instant** add (`expression-1`,
or a model the agent already has) returns `status: "ready"` with
`credits: 0` in the same response — re-POSTing the same model never
double-charges, and a failed add refunds automatically.

Failure shapes: `400 VALIDATION_ERROR` · `404 NOT_FOUND` (unknown or
not-owned agent) · `409 AGENT_NOT_READY` ·
[`422 MODEL_PREREQUISITE_MISSING` / `422 MODEL_SUBJECT_MISMATCH`](/api/errors#model-errors).

## Download an agent's model

`GET /v1/agent/{code}/model/download` — download the generated model artifact
for an agent you own. The family defaults to the agent's own model; override
with `?model=<family>` (public names, deprecated aliases and runtime tier
slugs fold onto their family — `essence-2` and the `essence-2-{gpu,ane,cpu}`
force slugs fold onto `essence-2-light`, and `essence-2-max` folds onto
`essence-2-quality`, the families' internal names). What you get per family:

| Family | Artifact | Notes |
|---|---|---|
| `essence-1` | `<code>.imx` | The portable IMX container — [runs locally](/sdk/cli/commands) in the CLI and the [Python SDK](/sdk/python). |
| `essence-2-light` | `<code>.lebundle.imx` | The standard Essence 2 artifact — unified IMX container, ~350–550 MB. **Licensed weights** — a local runtime must complete the license activation flow; today the model serves via bitHuman cloud. |
| `essence-2-quality` | `<code>.pkl` | The Essence 2 Max artifact — IMX container; renders on bitHuman's GPU cloud (not a local-playback artifact). |
| `expression-2` | `<code>.avatar` | CoreML zip (~90 MB) — the Mac-runnable form of the trained model. |
| `expression-1` | — | Not downloadable: no per-identity artifact exists (the v1 foundation model renders server-side from the agent's image) → `400 MODEL_NOT_DOWNLOADABLE`. |

The default response is a **302 redirect** to the artifact (public URL for
`essence-1`, **1-hour signed URL** for the private families), so a plain
curl works:

```bash
curl -LOJ -H "api-secret: $BITHUMAN_API_SECRET" \
  "https://api.bithuman.ai/v1/agent/A17ZTB0222/model/download?model=expression-2"
# → A17ZTB0222.avatar
```

Pass `?redirect=false` to get the URL as JSON instead (for UIs that want to
fetch or label first):

```json
{
  "success": true,
  "data": {
    "code": "A17ZTB0222",
    "model": "expression-2",
    "filename": "A17ZTB0222.avatar",
    "url": "https://…signed…",
    "expires_in": 3600
  }
}
```

(`expires_in` is `null` for the public `essence-1` URL.)

Errors ([full reference](/api/errors#model-errors)):

| Status | Code | When |
|---|---|---|
| `400` | `VALIDATION_ERROR` | Unknown `model` value — the message lists the downloadable families. |
| `400` | `MODEL_NOT_DOWNLOADABLE` | The family has no per-identity artifact (`expression-1`). Not retryable. |
| `404` | `NOT_FOUND` | Agent unknown **or not owned by this account**. |
| `404` | `MODEL_ARTIFACT_NOT_READY` | The family is supported but its artifact hasn't been published to the download store yet — the message says when to retry. **Poll on this code.** |
| `409` | `MODEL_NOT_GENERATED` | The requested family isn't in the agent's `supported_models` (same gate as embed/session launch). |
| `429` | `RATE_LIMITED` | Read-bucket rate limit. |

> **Tip** The [bitHuman CLI](/sdk/cli/commands) wraps this endpoint:
> `bithuman pull A17ZTB0222` downloads the artifact,
> recognizes its model family, and prints what to do next — an `essence-1`
> `.imx` runs locally with `bithuman run`.

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
| `402` | `INSUFFICIENT_BALANCE` | Not enough credits (generation costs 250 for the v1 models, 500 for the second generation). |
| `404` | `NOT_FOUND` | No agent with the given code (`message`: `"Agent not found for code: <code>"`). |
| `404` | `NOT_FOUND` | Agent has no active session to `/speak` or `/add-context` (`message`: `"No active rooms found for agent <code>"`). |
| `400` | `VALIDATION_ERROR` | Invalid request body (e.g. bad `type` value, or an invalid / retired `model` name — the error message lists the accepted values). |
| `400` | `VIDEO_INPUT_NOT_SUPPORTED` | [Agent creation](#generate-an-agent) with a `video` input. Creation is **image-only** — provide a portrait `image`; the 10-second idle/driver video is generated internally so it loops seamlessly (first frame == last frame). Rejected before dispatch; nothing charged. |
| `409` | `MODEL_NOT_GENERATED` | A launch surface (embed-token `model`, [talking video](/api/video), [model download](#download-an-agents-model)) requested a family the agent can't be launched as — it's missing from `supported_models`. Trained families: `"agent <code>'s <model> model hasn't been generated yet"`; `essence-2-max` is gated on the **stored identity video** it prepares from (generated internally by Essence creations — the message keeps the internal `essence-2-quality` family name until the platform-side flip). [Add the model](#add-a-model-to-an-existing-agent) or create the agent with it. |
| `409` | `AGENT_NOT_READY` | [`POST /v1/agent/{code}/models`](#add-a-model-to-an-existing-agent) on an agent that is still generating or failed — models can only be added to a `ready` agent. |
| `422` | `MODEL_SUBJECT_MISMATCH` | An explicit Essence 2 creation or add whose input isn't a photorealistic human subject — see [the subject gate](#the-essence-2-subject-gate-422). Nothing is billed. |
| `422` | `MODEL_PREREQUISITE_MISSING` | [Model add](#add-a-model-to-an-existing-agent) on an agent missing a stored asset the model needs (a stored identity video for `essence-2` — generated internally by Essence creations, never uploaded; image for `expression-2`; image + voice for `expression-1`). |
| `400` | `MODEL_NOT_DOWNLOADABLE` | [Model download](#download-an-agents-model) for a family with no per-identity artifact (`expression-1`). |
| `404` | `MODEL_ARTIFACT_NOT_READY` | [Model download](#download-an-agents-model) for a supported family whose artifact hasn't been published yet — retryable; the message says when. |

See the full [error reference](/api/errors) and the interactive
[API reference](/api/reference).
