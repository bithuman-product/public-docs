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
asynchronous and billed **per model** — `expression-2` costs 2000 credits,
the Essence 2 family (`essence-2`, `essence-2-max`) 500, the v1 families
(`essence-1`, `expression-1`) 250, and `auto` bills the routed model's rate
(machine-readable schedule: [`GET /v1/pricing`](/api/billing#get-the-pricing-schedule)).
The call returns immediately with an `agent_id` and `processing` status.

| Parameter | Type | Required | Default | Description |
|---|---|---|---|---|
| `prompt` | string | no | random | System prompt / personality for the agent. |
| `image` | string | no | — | Image URL or base64 data for appearance. A supplied image is treated as a **reference** and always regenerated via **Seedream 5 edit** to standardize it (never used raw); omit it and a portrait is generated from the `prompt` with **Seedream 5 pro**. |
| `audio` | string | no | — | Audio URL or base64 data for voice cloning. |
| `aspect_ratio` | string | no | `16:9` | Aspect ratio for the generated identity image **and** driver video — `16:9` landscape (default), `9:16` portrait, `1:1` square. Images are generated at 1080p. |
| `transparency` | boolean | no | `false` | When `true`, the identity image is generated on a solid **green-screen** background for chroma-key / transparent embedding — the character itself never uses green. |
| `framing` | string | no | `portrait` | `portrait` (default) frames head-and-shoulders; `full_body` shows the whole figure including the feet (kiosk / standing-avatar layouts). |
| `agent_id` | string | no | auto | Custom agent identifier. |
| `duration` | number | no | — | **Deprecated — omit it.** The internally generated identity video is standardizing on 10 seconds; the parameter is ignored as that rollout completes. |
| `model` | string | no | `expression` | Avatar model **family** — `expression` (default) or `essence` — combined with `version` to pick the engine: `expression`+`v1` = **Expression 1** (the default), `essence`+`v1` = **[Essence 1](/concepts/models)**, `essence`+`v2` = **[`essence-2`](/concepts/essence-2)** (the [combined Essence 2 creation](#essence-2--the-combined-creation)), `expression`+`v2` = **[`expression-2`](/concepts/expression-2)**. You may also pass a **full engine name** directly (`essence-1`, `essence-2`, **[`essence-2-max`](/concepts/essence-2-max)**, `expression-1`, `expression-2`) or **`auto`** ([classify-and-route](#auto--let-the-platform-pick-the-model)) — those pass through unchanged and `version` is ignored, so existing integrations keep working. An omitted `model` defaults to `expression` at `v1` (Expression 1, 250 credits) — a v1 engine at the ungated 250-credit rate; a caller is never silently upgraded onto a v2 engine or a higher price. Invalid values return `400 VALIDATION_ERROR` (no credits charged); the retired `essence-2-light` name returns a targeted hint pointing at `essence-2`. See [models](/concepts/models) and [Essence 2 & Expression 2](/concepts/models-v2). |
| `version` | string | no | `v1` | Engine generation for the chosen `model` family — `v1` (default) selects the first-generation engine (Essence 1 / Expression 1, 250 credits); `v2` selects the second-generation engine (Essence 2, 500 credits, or Expression 2, 2000 credits). Ignored when `model` is a full engine name or `auto`. |

> **Agent creation is image-only.** Provide a portrait `image` (or let the
> prompt generate one) — bitHuman generates a **10-second identity video
> internally** (Seedance 1.5 pro, 25 fps), authored to loop seamlessly (its
> first and last frames match). Video input is not part of the creation
> contract for any model: a request carrying `video` is rejected with
> [`400 VIDEO_INPUT_NOT_SUPPORTED`](/api/errors#agent-operations) before
> anything is billed (verified against the live API, 2026-08-01).

### Model-specific inputs and creation times

The `model` you pick changes what creation needs and how long it runs. All
models share the same pipeline prefix — persona, voice, and image are prepared
first (each generated from your prompt when not supplied) — then the
model-specific identity step runs:

| `model` | Identity input | Identity step | Typical creation time |
|---|---|---|---|
| `essence-1` | `image` (or generated from prompt); an identity video is generated internally if needed | Builds the portable `.imx` avatar | 2–5 minutes |
| `expression-1` (default) | `image` (or generated from prompt) | None (animates the portrait at runtime) | ~1–2 minutes |
| `essence-2` | `image` (or generated from prompt) — a 10-second identity video is generated from it internally (the `video` step) | **Combined**: builds the standard Essence 2 identity bundle on a cloud GPU; Max derives from the same identity video | 25–40 minutes typical; occasionally longer (allowed up to several hours) |
| `essence-2-max` | Included with every `essence-2` creation — its identity derives from the same internally generated identity video | Instant prep of a compact identity bundle (seconds, warm) | Available once the combined creation is ready |
| `expression-2` | `image` (or generated from prompt) | Trains a per-identity model on an H100-class GPU | About 1–1.5 hours (roughly 60–100 minutes; longer when the adaptive recipe extends to hold quality) |
| `auto` | `image` or prompt (classified automatically) | As the routed model — `essence-2` or `expression-2` | As the routed model |

Set your polling timeout per model — a 5-minute client timeout is fine for
`essence-1` but will falsely "fail" every `expression-2` and `essence-2`
creation. Full model behavior (serving tiers, idle, pricing) is in each
model's guide.

### `essence-2` — the combined creation

`model: "essence-2"` creates **both Essence 2 models from one creation**: a
single 500-credit charge runs the standard [Essence 2](/concepts/essence-2)
training, and [Essence 2 Max](/concepts/essence-2-max) becomes
available at no extra charge from the same **internally generated identity
video** (its identity prepares on demand from that video). Sessions
launched as `essence-2` serve
the standard chain by default; launch with `?model=essence-2-max` on
the session/embed URL (or the `model` field on the
[embed token](/api/embedding)) when you want the premium model. Once ready,
the agent's `supported_models` lists both families — `essence-2` (the
standard Essence 2) and `essence-2-max`. Both are public names and can be sent
straight back as a `model` value — the internal tier spellings
`essence-2-light` / `essence-2-quality` are folded before the response is
built and never appear in it.

### `auto` — let the platform pick the model

`model: "auto"` runs an LLM **subject classifier** over your creation input —
the `image` if you provided one, else the `prompt` — and routes it:

- a **photorealistic person** → `essence-2` (the combined creation above);
- a **cartoon, animal, creature, or robot** → `expression-2` (the generative
  engine, which handles any subject and works best for stylized characters).

`auto` never rejects on subject — it routes instead — and charges the routed
model's rate (500 credits for `essence-2`, 2000 for `expression-2`). It is
the default selection in the dashboard's
create flow, but **API callers must pass it explicitly**: an omitted `model`
defaults to `expression-1` (`v1`, 250 credits) for backward compatibility.

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

> **Note** The Python examples below use
> [`requests`](https://pypi.org/project/requests/), which is not in the standard
> library — `pip install requests` first, or use `curl` / `urllib` instead.

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

> **Note — `image` must be publicly fetchable, and this is not checked at
> submit time.** The `https://example.com/…` URLs above are placeholders.
> Posting one verbatim returns `HTTP 200` with
> `{"success": true, "status": "processing"}`, and the job only fails seconds
> later with `Image processing failed: Failed to download after 3 attempts:
> 404`. The credits are charged at submit and **automatically refunded** on that
> failure (verified 2026-07-28: `-500` then `+500` within 4 s), so nothing is
> lost — but a `200` here is not confirmation that your image was accepted. Poll
> [`GET /v1/agent/status/{agent_id}`](/api/agents#poll-status) before assuming
> the creation started.


```json
{
  "success": true,
  "message": "Agent generation started",
  "agent_id": "A80HVD8577",
  "status": "processing"
}
```

> **Note** The generation endpoint is `POST /v1/agent/generate`. (Older docs
> referenced `/v1/agent-generation` — that path is incorrect.)

### Idempotent retries — the `Idempotency-Key` header

Creation is billed, so a network timeout on the response should never make you
guess whether to retry. Send an **`Idempotency-Key`** header (any unique string
you choose, e.g. a UUID) with the request:

```bash
curl -X POST https://api.bithuman.ai/v1/agent/generate \
  -H "Content-Type: application/json" \
  -H "api-secret: $BITHUMAN_API_SECRET" \
  -H "Idempotency-Key: order-42-avatar-1" \
  -d '{"prompt": "You are a helpful retail assistant.", "model": "essence-2"}'
```

- A **repeated** request with the same key returns the **first response
  verbatim** — same `agent_id` — with an `Idempotency-Replayed: true` response
  header, and does **not** start a second billed generation.
- When you don't supply your own `agent_id`, the agent id is **derived from the
  key**, so a retry that lands on a different server replica still converges on
  the same agent.
- Use a **fresh key per intended creation** — reusing a key deliberately gives
  you the previous creation back.

The header is also honored on [`POST /v1/video/generate`](/api/video) and
[`POST /v1/dynamics/generate`](/api/dynamics).

## Poll status

`GET /v1/agent/status/{agent_id}` — returns the current state of a generation
request. Poll every 5 seconds.

| Status | Description |
|---|---|
| `processing` | Initial state — generation queued. |
| `generating` | Active generation in progress (sub-steps running). |
| `completed` | An intermediate sub-step finished. **Not terminal** — it can appear early (even around ~5% `progress`), so do not stop polling on it. |
| `success` | A **sub-step** finished — the voice/portrait step and the identity-video step each write it. **Not terminal**: it appears mid-run, normally at `progress` `0.2` and `0.45`, before training has even started. Count it as done only when `progress` is also `1.0` (some historical rows finished on `success` + `1.0`). |
| `ready` | **Terminal success** — the model is available for use. Always written together with `progress: 1.0` and `current_step: "done"`. |
| `failed` | Failure — check `error_message`. |

Treat `ready` and `failed` as terminal. `processing`, `generating`, `completed`
and `success` are all intermediate, so keep polling. **`success` is a
step-level marker, not the end of the run** — a loop that stops on it exits at
~20% `progress` with a null `model_url` — and `completed` can appear long
before the model is done. The safe terminal test is `status == "ready"`, or
`status == "success"` **together with** `progress == 1.0`. Typical wall-clock
is two to five minutes for `essence-1` — the second-generation models train
real per-identity models and take longer (see
[model-specific inputs and creation times](#model-specific-inputs-and-creation-times)).

While a run is in flight, `current_step` reports the pipeline stage:

| `current_step` | Progress | What's happening |
|---|---|---|
| `payment` | ~2% | Credits reserved (the model's creation cost — 250, 500, or 2000). |
| `persona` | 5–15% | Persona / system prompt prepared. |
| `voice_image` | ~20% | Voice and portrait generated (in parallel). |
| `video` | ~45% | The 10-second identity video is generated internally (`essence-1` and `essence-2`) — authored to loop seamlessly. |
| `awaiting_face_marking` | ~35% | Waiting on manual face marking (rare `essence-1` path). |
| `lip_sync` | 70–99% | The model-specific identity step — `.imx` build (`essence-1`), identity prep (`essence-2-max`), bundle build (`essence-2`), or per-identity training (`expression-2`). The longest step for the v2 models. |
| `done` | 100% | Terminal — the agent is `ready`. |

```json
{
  "success": true,
  "data": {
    "agent_id": "A80HVD8577",
    "status": "ready",
    "progress": 1.0,
    "progress_msg": "Complete",
    "current_step": "done",
    "error_message": null,
    "system_prompt": "You are a professional video content creator.",
    "image_url": "https://...",
    "video_url": "https://...",
    "model_url": "https://...",
    "supported_models": ["essence-2-max", "expression-2"],
    "name": "agent name"
  }
}
```

| Progress field | Type | Description |
|---|---|---|
| `progress` | float (0.0–1.0) | Generation progress as a fraction. `1.0` is complete. |
| `progress_msg` | string | Human-readable progress description. |
| `current_step` | string | Current generation step (see the table above). |
| `supported_models` | string[] | The model families this agent can be **launched as right now**, spelled with the **public model names** — `essence-1`, `expression-1`, `essence-2`, `essence-2-max`, `expression-2` — so every entry can be sent straight back as a `model` / `?model=` value. Trained families (`expression-2`, `essence-2`) appear once their per-identity model exists; `essence-2-max` appears when the agent has a **stored identity video** (generated internally by Essence creations; its identity prepares on demand from that video); `essence-1` appears when its `.imx` exists. Tier slugs inherit their family, and the combined `essence-2` creation shows up as its two tier families (`essence-2` and `essence-2-max`). Also returned on `GET /v1/agent/{code}`, `GET /v1/agents` items, and the embed-token response.<br/><br/>Every entry is a **public** name and is safe to send straight back: the internal tier spellings `essence-2-light` / `essence-2-quality` are folded before the response is built, so they never appear in this array. |

### Generate and poll

```python
import os, time, requests

BASE = "https://api.bithuman.ai"
SECRET = os.environ["BITHUMAN_API_SECRET"]
headers = {"Content-Type": "application/json", "api-secret": SECRET}

resp = requests.post(f"{BASE}/v1/agent/generate", headers=headers,
                     json={"prompt": "You are a friendly AI assistant."})
agent_id = resp.json()["agent_id"]
print("agent_id:", agent_id)   # save this — you can resume polling any time

while True:
    r = requests.get(f"{BASE}/v1/agent/status/{agent_id}",
                     headers={"api-secret": SECRET}, timeout=30)
    if r.status_code != 200:
        # Transient (429 rate limit, edge blip). Creation keeps running
        # server-side — keep polling rather than aborting the run.
        time.sleep(5)
        continue
    data = r.json()["data"]
    # Only `ready` is terminal. `success` is a STEP-level marker (the
    # voice/image and video steps each write it around 20% and 45%), and
    # `completed` is not terminal either — stopping on them exits mid-run
    # with model_url still null.
    if data["status"] == "ready" or (
        data["status"] == "success" and data.get("progress") == 1.0
    ):
        # model_url is null for models with no downloadable per-identity
        # artifact (expression-1) — that is success, not a failure.
        print("Ready:", agent_id, "| launchable as:", data["supported_models"])
        print("       model_url:", data["model_url"])
        break
    if data["status"] == "failed":
        raise SystemExit(f"Failed: {data['error_message']}")
    print(f"  {data['status']} {data.get('current_step')} {data.get('progress')}")
    time.sleep(5)
```

### Creation failure modes

Two kinds of failure exist — **rejected before start** (HTTP error, nothing
charged) and **failed during generation** (`status: "failed"`, credits
automatically refunded):

| Failure | Surface | Notes |
|---|---|---|
| Invalid `model` value | `400 VALIDATION_ERROR` — `Invalid model '<x>'; must be one of: auto, essence, essence-1, essence-2, essence-2-max, expression, expression-1, expression-2` | Rejected before dispatch; no credits charged. Retired names get a **targeted hint** instead of the bare list — e.g. `essence-2-light` → *"'essence-2-light' was consolidated into 'essence-2' (2026-07-05)…"*. |
| Malformed body | `400 VALIDATION_ERROR` — `Request body must be valid JSON` / `…a JSON object` | Rejected before dispatch. |
| `video` in the request body | [`400 VIDEO_INPUT_NOT_SUPPORTED`](/api/errors#agent-operations) — `Agent creation is image-only. Provide a portrait image; bitHuman generates a 10-second idle/driver video internally so it loops seamlessly (first frame == last frame). …` | Rejected before dispatch — nothing charged (verified live 2026-08-01). Send `image` instead — the identity video is always generated internally, for every model. |
| Too many Essence 2 creations in flight | `status: "failed"` with a capacity `error_message` (queue position + an honest ETA derived from the measured drain rate) | `essence-2` creations are **admission-controlled**: at most **2 in-flight creations per account**, and a deep platform queue can also defer admission. Rejection happens **before billing** — nothing is charged, no refund needed. Wait for an in-flight creation to finish, then retry. |
| A second-generation family paused for your account (rare) | [`503 MODEL_NOT_YET_AVAILABLE`](/api/errors#model-errors) — `<model> isn't available for generation yet. Specify 'essence-1' or 'expression-1' to generate now.` | Essence 2 / Expression 2 are **GA** (since July 10, 2026) — creation is open for all accounts, so this isn't returned in normal operation. It remains the safety response if a v2 family is ever re-paused; nothing is charged and the v1 families always work. |
| Non-human subject on an explicit Essence 2 creation | [`422 MODEL_SUBJECT_MISMATCH`](/api/errors#model-errors) — `essence-2 requires a photorealistic human subject; this image looks like a <verdict> — use expression-2` | Rejected **before billing** and before any agent row exists — see [the subject gate](#the-essence-2-subject-gate-422). `auto` routes instead of rejecting. |
| Not enough credits | `402 INSUFFICIENT_BALANCE` (also surfaces as `status: "failed"` with a payment `error_message` if the reserve fails mid-pipeline) | Creation costs the model's rate — 250 (v1), 500 (Essence 2), or 2000 (`expression-2`). |
| A pipeline step fails | `status: "failed"` + `error_message` naming the step (voice, image, video, or the model step) | Terminal for that `agent_id`; the creation credits are refunded automatically. Create again after fixing the input. |
| `essence-2-max` on an agent without a stored identity video | `409 MODEL_NOT_GENERATED` at launch | Max prepares its identity from the agent's internally generated identity video — create with (or [add](#add-a-model-to-an-existing-agent)) the combined `essence-2`, which generates it. See [Essence 2 Max](/concepts/essence-2-max#how-creation-works). |
| v2 creation "stuck" at `lip_sync` | Not a failure | That's the training/prep step — the longest part for `expression-2` / `essence-2`. Keep polling; see [creation times](#model-specific-inputs-and-creation-times). |

More session-time issues (connect latency, tier pinning, idle behavior):
[Session behavior & troubleshooting](/guides/session-troubleshooting).

## Get an agent

`GET /v1/agent/{code}` — retrieve full details for an agent by its code.

```python
import requests

code = "A80HVD8577"
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
    "agent_id": "A80HVD8577",
    "code": "A80HVD8577",
    "status": "ready",
    "model": "essence-2",
    "supported_models": ["essence-2-max", "essence-2"],
    "name": "My Agent",
    "system_prompt": "You are a friendly AI assistant",
    "voice_id": "aBc123…",
    "image_url": "https://assets.bithuman.ai/A80HVD8577/image_20260115_103000_000001.jpg",
    "video_url": "https://assets.bithuman.ai/A80HVD8577/video_20260115_103200_000002.mp4",
    "model_url": "https://assets.bithuman.ai/A80HVD8577/A80HVD8577.lebundle.imx"
  }
}
```

The response carries the agent's full record (abridged above; verified against
the live API 2026-08-01) — the **persona** (`system_prompt`, `name`,
`description`, `language`, `gender`), the **voice** (`voice_id`), the **media**
(`image_url`, `video_url` — the internally generated 10-second identity video —
and `model_url`), the creation state (`status`, `progress`, `current_step`,
`error_message`), and the launch surface (`model`, `supported_models` — every
entry a public model name you can send straight back as a `model` /
`?model=` value).

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
    "https://api.bithuman.ai/v1/agent/A80HVD8577",
    headers={"api-secret": "YOUR_API_SECRET"},
).json()
# {"success": true, "agent_code": "A80HVD8577", "deleted": true}
```

## Update an agent's prompt

`POST /v1/agent/{code}` — update the system prompt of an existing agent without
regenerating it. The agent must already exist. For a new face or voice, generate
a new agent.

```python
import requests

code = "A80HVD8577"
resp = requests.post(
    f"https://api.bithuman.ai/v1/agent/{code}",
    headers={"Content-Type": "application/json", "api-secret": "YOUR_API_SECRET"},
    json={"system_prompt": "You are a professional sales assistant."},
)
print(resp.json())
```

```json
{ "agent_code": "A80HVD8577", "updated": true }
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
| `expression-1` | **Instant enablement** — the shared v1 engine drives the agent's existing image + voice at runtime; nothing is trained | stored image **and** voice (else `422`) | **0** | immediate (this response) |
| `expression-2` | Trains the per-identity Expression 2 model from the stored image | stored image (else `422`) | 2000 | about 1–1.5 h |
| `essence-2` | The **combined** add: trains the standard Essence 2 from the agent's stored identity video (generated internally at creation); Max lights up from the same video at no extra charge | stored identity video (else `422 MODEL_PREREQUISITE_MISSING`) + photorealistic-human subject on the stored image (else `422 MODEL_SUBJECT_MISMATCH`) | 500 | 45 min–3 h |
| `essence-1` | Builds the v1 `.imx` — reuses the stored identity video, or generates one internally from the stored image | stored identity video or image (else `422`) | 250 | ~10–20 min |

```python
import requests

resp = requests.post(
    "https://api.bithuman.ai/v1/agent/A66GYD8664/models",
    headers={"Content-Type": "application/json", "api-secret": "YOUR_API_SECRET"},
    json={"model": "expression-2"},
)
print(resp.json())
```

An **async** add (everything except `expression-1`) responds immediately:

```json
{
  "success": true,
  "agent_id": "A66GYD8664",
  "model": "expression-2",
  "status": "processing",
  "credits": 2000,
  "supported_models": ["essence-1", "essence-2-max"],
  "message": "expression-2 model add started (typically 10-45 minutes). 2000 credits are charged (refunded automatically if the add fails). Poll GET /v1/agent/status/A66GYD8664 until supported_models includes expression-2."
}
```

The minute estimate embedded in the response `message` is advisory — the
table above has the typical times. Poll
[`GET /v1/agent/status/{code}`](#poll-status) until `supported_models`
contains the new family (`essence-2` adds **both** tiers, `essence-2` and
`essence-2-max`). The agent keeps serving as-is while the add runs —
`status` stays `ready` for the v2 adds. An **instant** add (`expression-1`,
or a model the agent already has) returns `status: "ready"` with
`credits: 0` in the same response — re-POSTing the same model never
double-charges, and a failed add refunds automatically.

Failure shapes: `400 VALIDATION_ERROR` · `404 NOT_FOUND` (unknown or
not-owned agent) · `409 AGENT_NOT_READY` ·
[`422 MODEL_PREREQUISITE_MISSING` / `422 MODEL_SUBJECT_MISMATCH`](/api/errors#model-errors) ·
[`503 MODEL_NOT_YET_AVAILABLE`](/api/errors#model-errors) (only if a v2 family
is paused — not returned in normal operation since the July 10, 2026 GA; nothing charged).

### Using Expression 1 on an existing agent

Every model is a **capability of the agent**, not a property of it — an agent
created with `essence-1` can render Expression 1 too, with no change to the
agent, its persona, its voice, or your request. The models are compatible; the
capability just has to be switched on once.

Expression 1 is the only model that needs no training at all: the shared v1
engine drives the agent's stored image with its stored voice at render time. So
enabling it is **one call, instant, and free**:

```python
import requests

code = "A66GYD8664"          # an agent created with essence-1
head = {"Content-Type": "application/json", "api-secret": "YOUR_API_SECRET"}

requests.post(f"https://api.bithuman.ai/v1/agent/{code}/models",
              headers=head, json={"model": "expression-1"})
# -> {"success": true, "status": "ready", "credits": 0,
#     "supported_models": ["essence-1", "expression-1", "essence-2-max"]}

requests.post("https://api.bithuman.ai/v1/video/generate", headers=head,
              json={"model": "expression-1", "agent_code": code,
                    "input": {"type": "text", "text": "Hello!"}})
```

Until that call is made, `expression-1` is absent from the agent's
`supported_models` and every Expression 1 request for it — talking video,
[embed token](/api/embedding), model download — returns
[`409 MODEL_NOT_GENERATED`](/api/errors#model-errors) *before any charge*, with
the enabling call named in the message. Nothing else about the request changes:
same `agent_code`, same `input`, only `model` differs.

## Download an agent's model

`GET /v1/agent/{code}/model/download` — download the generated model artifact
for an agent you own. The family defaults to the agent's own model; override
with `?model=<family>` (public names and runtime tier slugs fold onto their
family — the `essence-2-{gpu,ane,cpu}` force slugs and the retired
`essence-2-light` fold onto `essence-2`). `essence-2-quality` is **no longer
accepted** and returns a `400`; send `essence-2-max`. What you get per family — and what opens each file, in one
place: [what you get, per family](/sdk/cli/commands#what-you-get-per-family).

| Family | Artifact | Notes |
|---|---|---|
| `essence-1` | `<code>.imx` | The portable IMX container — [runs locally](/sdk/cli/commands) in the CLI and the [Python SDK](/sdk/python). |
| `essence-2` | `<code>.lebundle.imx` | The standard Essence 2 artifact — unified IMX container. **~85–105 MB** for an agent created on the current renderer (measured across the live fleet, 2026-07-28). Agents created before the 2026-07-27 renderer change carry a larger bundle — up to ~550 MB — until they are retrained; the artifact shrank roughly **5×**. Size is per identity: read `Content-Length` rather than assuming a fixed figure. **Licensed weights** — a local runtime must complete the license activation flow; today the model serves via bitHuman cloud. |
| `essence-2-max` | `<code>.pkl` | The Essence 2 Max artifact — IMX container; renders on bitHuman's GPU cloud (not a local-playback artifact). **It is derived on demand, not built ahead:** the bundle is produced from the agent's source video the first time the agent is launched as `essence-2-max`, so a download before that returns `404 MODEL_ARTIFACT_NOT_READY`. Start one session, then retry. |
| `expression-2` | `<code>.avatar` | The per-identity Expression 2 artifact (~20–90 MB). **The `.avatar` extension is historical: it is the frozen back-compat alias of `.imx`, not a distinct encoding.** Measured across all 110 published objects on 2026-09-01, **96 are `IMX\0` v2 containers** and **14 are still the pre-2026-07-12 CoreML zip** — those 14 will not be re-published, so check with `bithuman info <file>` rather than assuming either form. [Runs locally](/sdk/cli/commands) on macOS (Apple Silicon), and on Linux x86_64 once the CPU render host is installed (`bithuman engine install linux-x86_64`); also in the browser via [`?render=local`](/guides/browser-rendering), and served on bitHuman's cloud. |
| `expression-1` | usually none; `<code>.imx` for a lip-stepped agent | Expression 1 has no per-identity artifact of its own — the shared v1 engine renders server-side from the agent's image, so the normal answer is `400 MODEL_NOT_DOWNLOADABLE`. **One case does download:** an `expression-1` agent that went through the lip step owns a baked `<code>.imx`, and the endpoint redirects to it exactly as it does for `essence-1`. |

The default response is a **302 redirect** to the artifact (public URL for
`essence-1`, **1-hour signed URL** for the private families), so a plain
curl works:

```bash
curl -LOJ -H "api-secret: $BITHUMAN_API_SECRET" \
  "https://api.bithuman.ai/v1/agent/A17ZTB0222/model/download?model=expression-2"
# → A17ZTB0222.avatar
```

> **`?model=` is the only way to reach a second family.** An agent that gained a
> model through [add-a-model](#add-a-model-to-an-existing-agent) has more than
> one downloadable artifact under the same code, and an omitted `?model=`
> resolves to the family the agent was **created** with — not the one you added.
> The [CLI](/sdk/cli/commands) has no flag for this: `bithuman pull <CODE>`
> always takes the default. Read `supported_models` on
> [`GET /v1/agent/{code}`](#get-an-agent) to see what an agent actually holds.

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
| `400` | `MODEL_NOT_DOWNLOADABLE` | The family has no per-identity artifact for this agent — in practice `expression-1` on an agent with no lip-step `.imx`. Not retryable. |
| `404` | `NOT_FOUND` | Agent unknown **or not owned by this account**. |
| `404` | `MODEL_ARTIFACT_NOT_READY` | The family is supported but its artifact hasn't been published to the download store yet — the message says when to retry. **Poll on this code.** |
| `409` | `MODEL_NOT_GENERATED` | The requested family isn't in the agent's `supported_models` (same gate as embed/session launch). |
| `429` | `RATE_LIMITED` | Read-bucket rate limit. |

> **Tip** The [bitHuman CLI](/sdk/cli/commands) wraps this endpoint:
> `bithuman pull A17ZTB0222` downloads the artifact,
> recognizes its model family, and prints what to do next — an `essence-1`
> `.imx` runs locally with `bithuman run`. It calls this endpoint **without**
> `?model=`, so on a multi-model agent it downloads the default family; use
> `curl` with `?model=` for any other one.

## Download an agent's self-hosted avatar

`GET /v1/agent/{agent_code}/self-hosted-avatar` — download the prepared
avatar bundle (`<code>.pkl`) that the
[self-hosted Essence 2 Max container](/guides/deploy-essence-2-max) serves.
This is the endpoint a live-licensed container calls **automatically** the
first time you render one of your agents by code; call it yourself for
air-gapped installs and copy the file into the container's avatars volume.

Auth is your api-secret — as `Authorization: Bearer` (what the container
forwards) or the classic `api-secret` header. The response is the raw
bundle bytes (no redirect), so a plain curl works:

```bash
curl -H "Authorization: Bearer $BITHUMAN_API_SECRET" \
  "https://api.bithuman.ai/v1/agent/A06ZSE8608/self-hosted-avatar" \
  -o A06ZSE8608.pkl
```

A `404` means the agent doesn't exist, isn't yours, or has no self-hosted
bundle (it must be a completed `essence-2` creation); a `401` means the
credential is bad. The same artifact is also available through
[model download](#download-an-agents-model) with `?model=essence-2-max`
(302-redirect form).

## Make an agent speak

`POST /v1/agent/{agent_code}/speak` — trigger the agent to speak a message to
users in an active session.

> **Requires a LIVE session.** `/speak` speaks into a conversation that is
> already open — it cannot start one. With nobody connected there is no room to
> deliver to and the call returns `404 NOT_FOUND`
> (`"No active rooms found for agent <code>"`). A successful call names the
> sessions it reached in `rooms`, and the ones it could not in `rooms_skipped`
> (live, but no agent worker attached) and `rooms_failed`. On a broadcast a
> partial delivery is normal — read `rooms`, not the counts. If nothing could be
> delivered you get a `404`, never a `200` with `delivered_to_rooms: 0`.

| Parameter | Type | Required | Description |
|---|---|---|---|
| `message` | string | yes | Text the agent will speak. |
| `room_id` | string | no | Speak into ONE session. Omit to broadcast to every deliverable session of this agent. |

Get a `room_id` from [list live sessions](#list-an-agents-live-sessions).
Omitting `room_id` is a **broadcast**: with three sessions open, all three
avatars speak the message.

```bash
curl -X POST https://api.bithuman.ai/v1/agent/A12345678/speak \
  -H "Content-Type: application/json" \
  -H "api-secret: $BITHUMAN_API_SECRET" \
  -d '{
    "message": "We have a 20% discount available today.",
    "room_id": "room-A12345678-x1y2-z3w4"
  }'
```

```json
{
  "agent_code": "A12345678",
  "context_type": "speak",
  "delivered_to_rooms": 1,
  "rooms": ["room-A12345678-x1y2-z3w4"],
  "rooms_skipped": [],
  "rooms_failed": [],
  "rooms_skipped_no_worker": 0
}
```

Every room targeted appears in exactly one of `rooms`, `rooms_skipped` or
`rooms_failed`, so a broadcast tells you what it reached rather than only how many.

## List an agent's live sessions

`GET /v1/agent/{agent_code}/sessions` — the sessions this agent has open now.
Use a returned `room_id` to address one of them with `/speak` or `/add-context`.

```bash
curl https://api.bithuman.ai/v1/agent/A12345678/sessions \
  -H "api-secret: $BITHUMAN_API_SECRET"
```

```json
{
  "agent_code": "A12345678",
  "sessions": [
    {
      "room_id": "room-A12345678-x1y2-z3w4",
      "num_participants": 3,
      "created_at": 1788480000,
      "deliverable": true,
      "matched_by": "name"
    },
    {
      "room_id": "support-call-8842",
      "num_participants": 2,
      "created_at": 1788479100,
      "deliverable": false,
      "matched_by": "ledger"
    }
  ]
}
```

`created_at` is the room's LiveKit creation time in Unix seconds.
`deliverable` is the field that matters: a room can be live and listed while its
agent worker has gone (a worker restart, or a render-only room), and `/speak` on
one of those returns `404`. An agent with nothing open returns `200` with an
empty `sessions` array, not a `404`.

There is **no per-agent limit** on how many sessions `/speak` can address —
every deliverable session of the agent is listed and addressable, including
rooms you named yourself if you drive LiveKit directly. Your account's
concurrent-session allowance still applies; see
[Session concurrency](/api/rate-limits#session-concurrency).

## Inject knowledge

`POST /v1/agent/{agent_code}/add-context` — add background knowledge the agent
uses to inform future responses. Set `type` to `speak` to trigger speech
instead.

| Parameter | Type | Required | Default | Description |
|---|---|---|---|---|
| `context` | string | yes | — | Knowledge to inject (or message to speak). |
| `type` | string | no | `add_context` | `add_context` injects knowledge silently; `speak` triggers a verbal response. |
| `room_id` | string | no | — | Deliver to ONE session ([get one](#list-an-agents-live-sessions)). Omit to deliver to every deliverable session. |

```python
import requests

requests.post(
    "https://api.bithuman.ai/v1/agent/A12345678/add-context",
    headers={"Content-Type": "application/json", "api-secret": "YOUR_API_SECRET"},
    json={
        "context": "Customer has VIP status. Preferred name: Alex. Account since 2021.",
        "type": "add_context",
        "room_id": "room-A12345678-x1y2-z3w4",
    },
)
```

> **Note** `/speak` and `/add-context` target agents created on the bitHuman
> platform that have an **active session** — not local SDK agents. Without a
> live room you'll get `404 NOT_FOUND`. Start a session via the
> [embed flow](/api/embedding) or a LiveKit worker first, then call
> [`GET /v1/agent/{agent_code}/sessions`](#list-an-agents-live-sessions) to see
> what is open.

## Error codes

| HTTP | Code | When |
|---|---|---|
| `401` | `UNAUTHORIZED` | Invalid or missing `api-secret`. |
| `402` | `INSUFFICIENT_BALANCE` | Not enough credits (generation costs 250 for the v1 models, 500 for Essence 2, 2000 for `expression-2`). |
| `404` | `NOT_FOUND` | No agent with the given code (`message`: `"Agent not found for code: <code>"`). |
| `404` | `NOT_FOUND` | Agent has no active session to `/speak` or `/add-context` (`message`: `"No active rooms found for agent <code>"`). |
| `400` | `VALIDATION_ERROR` | Invalid request body (e.g. bad `type` value, or an invalid / retired `model` name — the error message lists the accepted values). |
| `400` | `VIDEO_INPUT_NOT_SUPPORTED` | [Agent creation](#generate-an-agent) with a `video` input. Creation is **image-only** — provide a portrait `image`; the 10-second identity video is generated internally so it loops seamlessly (first frame == last frame). Rejected before anything is billed — never send `video`. |
| `503` | `MODEL_NOT_YET_AVAILABLE` | A second-generation family paused for your account. Essence 2 / Expression 2 are **GA** (since July 10, 2026) and open for all accounts, so [creation](#generate-an-agent) and [model add](#add-a-model-to-an-existing-agent) don't return this in normal operation — it's the safety response if a v2 family is ever re-paused. Nothing charged; the v1 families always work. |
| `409` | `MODEL_NOT_GENERATED` | A launch surface (embed-token `model`, [talking video](/api/video), [model download](#download-an-agents-model)) requested a family the agent can't be launched as — it's missing from `supported_models`. Trained families: `"agent <code>'s <model> model hasn't been generated yet"`; `essence-2-max` is gated on the **stored identity video** it prepares from (generated internally by Essence creations; the message names the public family `essence-2-max`). [Add the model](#add-a-model-to-an-existing-agent) or create the agent with it. |
| `409` | `AGENT_NOT_READY` | [`POST /v1/agent/{code}/models`](#add-a-model-to-an-existing-agent) on an agent that is still generating or failed — models can only be added to a `ready` agent. |
| `422` | `MODEL_SUBJECT_MISMATCH` | An explicit Essence 2 creation or add whose input isn't a photorealistic human subject — see [the subject gate](#the-essence-2-subject-gate-422). Nothing is billed. |
| `422` | `MODEL_PREREQUISITE_MISSING` | [Model add](#add-a-model-to-an-existing-agent) on an agent missing a stored asset the model needs (a stored identity video for `essence-2` — generated internally by Essence creations, never uploaded; image for `expression-2`; image + voice for `expression-1`). |
| `400` | `MODEL_NOT_DOWNLOADABLE` | [Model download](#download-an-agents-model) for a family with no per-identity artifact (`expression-1`). |
| `404` | `MODEL_ARTIFACT_NOT_READY` | [Model download](#download-an-agents-model) for a supported family whose artifact hasn't been published yet — retryable; the message says when. |

See the full [error reference](/api/errors) and the interactive
[API reference](/api/reference).
