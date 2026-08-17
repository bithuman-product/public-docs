---
title: "Video API"
description: "Render a talking-video mp4 over REST — submit a text script or hosted audio, poll the async job, and receive a CDN URL. Per-minute billing, auto-refunded on failure."
section: api
group: "Deliver"
order: 20
---

## Overview

The Video API renders a complete **talking-video mp4** of one of your agents
speaking — from a **text** script (the agent's voice synthesizes it) or from a
**hosted audio** file. It is asynchronous by default: submit a job, then poll for
the finished video URL — or pass [`wait: true`](#blocking-mode-wait-true) for a
blocking render that returns the mp4 in the response. On success you get a public
CDN URL, the output duration, and the credits charged.

`essence-2` renders at **1080p** — `1080×1920` portrait or `1920×1080`
landscape, matching the source orientation and capped at the source's long side.
`expression-2` renders at its native `416×720`.

> **Note** `essence-2-max` currently returns **`720×1280`**, not 1080p —
> measured 2026-07-28 across three renders on two different agents whose source
> assets are both `1080×1920`. Until that is corrected platform-side, the
> 8-credit/min Max tier delivers *fewer* pixels than the 4-credit/min standard
> tier. If output resolution is what you are paying for, use `essence-2`.

Talking videos bill **per minute of output, rounded up**: `essence-2-max`
is 8 credits/min; `expression-1`, `expression-2`, and `essence-2` are
4 credits/min; `essence-1` is 2 credits/min (`essence-2` is the standard
render; the former `essence-2-light` name is retired).

**How the charge actually lands.** Submitting a job charges the **120-second
cap** up front — 2 × the per-minute rate — then refunds the difference once the
real duration is known. So a 6-second `essence-2` render moves your balance
`−8` then `+4`, settling at the documented 4 credits, and you need **8** credits
free at submit time, not 4. Two consequences worth designing for:

- a `402 INSUFFICIENT_BALANCE` at submit reflects the *up-front cap*, so it can
  fire even when your balance covers the render's true cost;
- a `credit_refund_…` row appears in [`GET /v1/usage`](/api/billing) for
  **every** render, successful or not. On success it is the true-up of the
  over-charge; only a *full* refund of the up-front amount means the render
  failed. Compare the refund to the charge, don't treat any refund as a failure.

Limits: up to **120 seconds** of output and **5000 characters** of text.

## Generate a talking video

`POST /v1/video/generate` — submit a render job. **Async by default:** returns
immediately with a `job_id` and `status: "processing"`; poll the GET endpoint for
completion. Pass **`wait: true`** for [blocking mode](#blocking-mode-wait-true) —
the call holds the connection until the render finishes and returns the finished
mp4 directly.

| Parameter | Type | Required | Description |
|---|---|---|---|
| `model` | string | yes | Engine: `essence-1`, `expression-1`, `expression-2`, `essence-2-max`, or `essence-2`. All five render talking video today. |
| `agent_code` | string | yes | An agent you own — supplies the avatar identity (and, for text, the default voice). |
| `input` | object | yes | The render source — see below. |
| `input.type` | string | yes | `text` or `audio`. |
| `input.text` | string | for text | Script to speak (≤ 5000 chars). |
| `input.voice` | string | no | Voice id override for text input. Defaults to the agent's own voice. |
| `input.audio_url` | string | for audio | Public URL to a WAV or MP3 file. |
| `wait` | boolean | no | Blocking mode. `false` (default) returns a `job_id` to poll. `true` blocks until the render finishes (up to ~90s) and returns the finished `video_url` — plus `duration_seconds` and `credits_charged` — directly in this response; if it exceeds the cap you get the async `{ job_id }` to poll instead. Accepted as a JSON/multipart field or as a `?wait=true` query parameter. |

### Text input

> **Note** The Python examples below use
> [`requests`](https://pypi.org/project/requests/), which is not in the standard
> library — `pip install requests` first, or use `curl` / `urllib` instead.

```python
import requests

resp = requests.post(
    "https://api.bithuman.ai/v1/video/generate",
    headers={"Content-Type": "application/json", "api-secret": "YOUR_API_SECRET"},
    json={
        "model": "essence-2",
        "agent_code": "A80HVD8577",
        "input": {"type": "text", "text": "Hello, welcome to bitHuman."},
    },
)
print(resp.json())
```

```json
{
  "success": true,
  "job_id": "vid_3f9a2c1b8e7d4a6f0b21",
  "status": "processing"
}
```

### Audio input

```python
resp = requests.post(
    "https://api.bithuman.ai/v1/video/generate",
    headers={"Content-Type": "application/json", "api-secret": "YOUR_API_SECRET"},
    json={
        "model": "expression-2",
        "agent_code": "A80HVD8577",
        "input": {"type": "audio", "audio_url": "https://example.com/speech.wav"},
    },
)
print(resp.json())
```

### Blocking mode (`wait: true`)

Add `"wait": true` (a JSON/multipart field, or `?wait=true` as a query
parameter) to hold the connection until the render finishes and get the mp4 back
in the same response — no polling. If the render exceeds the ~90-second cap you
get the async `{ job_id }` to poll instead.

```python
resp = requests.post(
    "https://api.bithuman.ai/v1/video/generate",
    headers={"Content-Type": "application/json", "api-secret": "YOUR_API_SECRET"},
    json={
        "model": "essence-2-max",
        "agent_code": "A80HVD8577",
        "input": {"type": "text", "text": "Hello, welcome to bitHuman."},
        "wait": True,
    },
)
print(resp.json())
```

```json
{
  "success": true,
  "job_id": "vid_3f9a2c1b8e7d4a6f0b21",
  "status": "completed",
  "video_url": "https://assets.bithuman.ai/.../vid_3f9a2c1b8e7d4a6f0b21.mp4",
  "duration_seconds": 6.5,
  "credits_charged": 8
}
```

A `402` (`INSUFFICIENT_BALANCE`) is returned at submit time if your balance can't
cover the render. An invalid `model`, a missing/invalid `input`, or text over the
limit returns `400` before any charge. Requesting a model the agent can't be
launched as returns [`409 MODEL_NOT_GENERATED`](/api/errors#model-errors) —
also **before any charge**: for `expression-2` / `essence-2` that means
the trained per-identity model doesn't exist yet (`agent <code>'s <family>
model hasn't been generated yet`); `essence-2-max` is gated on the
agent's **source video**, which its identity prepares from on demand (`agent
<code>'s essence-2-max model requires a source video, which this agent
doesn't have`); `essence-1` needs the agent's `.imx` model file (present on
every completed essence-1 creation), and `expression-1` needs an
expression-1 agent — or the free, instant expression-1 model add on any agent
with an image and a voice ([how](/api/agents#using-expression-1-on-an-existing-agent)).
Every 409 here names the call that fixes it. Check the agent's
`supported_models` on the [Agents API](/api/agents#poll-status), or
[add the model](/api/agents#add-a-model-to-an-existing-agent) first.

## Get talking-video status

`GET /v1/video/{job_id}` — poll a render job.

```python
import requests

job_id = "vid_3f9a2c1b8e7d4a6f0b21"
resp = requests.get(
    f"https://api.bithuman.ai/v1/video/{job_id}",
    headers={"api-secret": "YOUR_API_SECRET"},
)
print(resp.json())
```

While rendering (note: job responses echo the **public** model name you
requested — `essence-2` and `essence-2-max` read back as-is):

```json
{ "success": true, "job_id": "vid_3f9a2c1b8e7d4a6f0b21", "status": "processing", "model": "essence-2-max" }
```

When complete:

```json
{
  "success": true,
  "job_id": "vid_3f9a2c1b8e7d4a6f0b21",
  "status": "completed",
  "model": "essence-2-max",
  "video_url": "https://assets.bithuman.ai/.../vid_3f9a2c1b8e7d4a6f0b21.mp4",
  "duration_seconds": 6.5,
  "credits_charged": 8
}
```

| Field | Type | Description |
|---|---|---|
| `status` | string | `processing`, `completed`, or `failed`. |
| `model` | string | The engine used. |
| `video_url` | string | Public mp4 URL (present when `completed`). |
| `duration_seconds` | number | Output duration (present when `completed`). |
| `credits_charged` | integer | Credits charged for this render (present when `completed`). |
| `error` | object | Failure detail (present when `failed`); the charge is refunded. |

> **Note** Treat `video_url` as **opaque** — read it from the response, never
> construct it. The sample bodies above abbreviate it, but finished renders are
> currently served from the object-storage host
> (`https://<project>.supabase.co/storage/v1/object/public/bithuman/<AGENT>/<job_id>.mp4`),
> not from `assets.bithuman.ai`. If you allowlist egress hosts or proxy the
> download, allowlist what the API returns.

## Polling pattern

```python
import time, requests

def wait_for_video(job_id, api_secret, timeout=600):
    while timeout > 0:
        r = requests.get(
            f"https://api.bithuman.ai/v1/video/{job_id}",
            headers={"api-secret": api_secret},
        ).json()
        if r["status"] == "completed":
            return r["video_url"]
        if r["status"] == "failed":
            raise RuntimeError(r.get("error"))
        time.sleep(3)
        timeout -= 3
    raise TimeoutError("render did not finish in time")
```

See [Talking video generation](/concepts/talking-video) for the concept and
[Billing & credits](/api/billing) for how credits are consumed.
