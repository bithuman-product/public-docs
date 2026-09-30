---
title: "Talking video API"
description: "Render a talking-video MP4 from a text script or hosted audio."
section: api
group: "Media"
order: 10
type: endpoint
llms: api
---

## Overview

Renders an MP4 of one of your agents speaking, from a **text** script (in the agent's voice) or a **hosted audio** file. Submit a job and poll for the URL, or pass [`wait: true`](#blocking-mode-wait-true) to get the MP4 in the response.

`essence-2` renders at up to 1080p, `1080×1920` or `1920×1080` to match the source; `expression-2` renders at `416×720`.

Renders bill **per minute of output, rounded up**: 4 credits/min for `essence-2`, `expression-2` and `expression-1`, 2 for `essence-1`. A job charges the 120-second maximum up front and refunds the difference when it finishes, so your balance must cover that maximum at submit time. A failed render is refunded in full.

Limits: up to **120 seconds** of output and **5000 characters** of text.

## Generate a talking video

**Before you start:** you need an agent you own. List yours with `curl https://api.bithuman.ai/v1/agents -H "api-secret: $BITHUMAN_API_SECRET"` and `export BITHUMAN_AGENT_CODE=A…`. Creating one needs the Creator plan or higher ([Pricing](/pricing#plans)).

`POST /v1/video/generate` returns a `job_id` with `status: "processing"`; poll [`GET /v1/video/{job_id}`](#get-talking-video-status) until it completes, or register a [webhook](/api/webhooks) for `video.completed` / `video.failed`.

| Parameter | Type | Required | Description |
|---|---|---|---|
| `model` | string | yes | Engine: `essence-1`, `expression-1`, `expression-2`, or `essence-2`. All four render talking video today. A model outside your plan returns `403 PLAN_REQUIRED`. |
| `agent_code` | string | yes | An agent you own — supplies the avatar identity (and, for text, the default voice). |
| `input` | object | yes | The render source — see below. |
| `input.type` | string | yes | `text` or `audio`. |
| `input.text` | string | for text | Script to speak (≤ 5000 chars). |
| `input.voice` | string | no | Voice id override for text input. Defaults to the agent's own voice. |
| `input.audio_url` | string | for audio | Public URL to a WAV or MP3 file. |
| `wait` | boolean | no | Blocking mode. `false` (default) returns a `job_id` to poll. `true` blocks until the render finishes (up to ~90s) and returns the finished `video_url` — plus `duration_seconds` and `credits_charged` — directly in this response; if it exceeds the cap you get the async `{ job_id }` to poll instead. Accepted as a JSON/multipart field or as a `?wait=true` query parameter. |

### Text input

```bash
curl -X POST https://api.bithuman.ai/v1/video/generate \
  -H "api-secret: $BITHUMAN_API_SECRET" -H "Content-Type: application/json" \
  -d '{"model": "essence-2", "agent_code": "'"$BITHUMAN_AGENT_CODE"'", "input": {"type": "text", "text": "Hello, welcome to bitHuman."}}'
```

```json
{
  "success": true,
  "job_id": "vid_3f9a2c1b8e7d4a6f0b21",
  "status": "processing"
}
```

### Audio input

```bash
curl -X POST https://api.bithuman.ai/v1/video/generate \
  -H "api-secret: $BITHUMAN_API_SECRET" -H "Content-Type: application/json" \
  -d '{"model": "expression-2", "agent_code": "'"$BITHUMAN_AGENT_CODE"'", "input": {"type": "audio", "audio_url": "https://example.com/speech.wav"}}'
```

### Blocking mode (`wait: true`)

Add `"wait": true` (a JSON/multipart field, or `?wait=true` as a query
parameter) to hold the connection until the render finishes and get the mp4 back
in the same response — no polling. If the render exceeds the ~90-second cap you
get the async `{ job_id }` to poll instead.

```bash
curl -X POST https://api.bithuman.ai/v1/video/generate \
  -H "api-secret: $BITHUMAN_API_SECRET" -H "Content-Type: application/json" \
  -d '{"model": "essence-2", "agent_code": "'"$BITHUMAN_AGENT_CODE"'", "input": {"type": "text", "text": "Hello, welcome to bitHuman."}, "wait": true}'
```

```json
{
  "success": true,
  "job_id": "vid_3f9a2c1b8e7d4a6f0b21",
  "status": "completed",
  "video_url": "https://assets.bithuman.ai/.../vid_3f9a2c1b8e7d4a6f0b21.mp4",
  "duration_seconds": 6.5,
  "credits_charged": 4
}
```

Errors are returned at submit time, before any charge: `402 INSUFFICIENT_BALANCE` if your balance cannot cover the up-front maximum; `400` for an invalid `model` or `input`, or text over the limit; [`409 MODEL_NOT_GENERATED`](/api/errors#model-errors) if the agent does not have that model yet. Check the agent's `supported_models` ([poll status](/api/agents#poll-status)) or [add the model](/api/agents#add-a-model-to-an-existing-agent).

## Get talking-video status

Poll a render job.

```bash
curl https://api.bithuman.ai/v1/video/vid_3f9a2c1b8e7d4a6f0b21 -H "api-secret: $BITHUMAN_API_SECRET"
```

While rendering:

```json
{ "success": true, "job_id": "vid_3f9a2c1b8e7d4a6f0b21", "status": "processing", "model": "essence-2" }
```

When complete:

```json
{
  "success": true,
  "job_id": "vid_3f9a2c1b8e7d4a6f0b21",
  "status": "completed",
  "model": "essence-2",
  "video_url": "https://assets.bithuman.ai/.../vid_3f9a2c1b8e7d4a6f0b21.mp4",
  "duration_seconds": 6.5,
  "credits_charged": 4
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

> **Note** Read `video_url` from the response; never construct it. The storage host can change, so allowlist what the API returns.

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

See [pricing](/pricing) for how credits are consumed.
