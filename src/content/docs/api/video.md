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
**hosted audio** file. It is asynchronous: submit a job, then poll for the
finished video URL. On success you get a public CDN URL, the output duration, and
the credits charged.

Talking videos bill **per minute of output, rounded up**: `expression-2` is 4
credits/min, `essence-2-quality` is 8 credits/min, and `essence-2-light` is 4
credits/min. If a render fails, the charge is automatically refunded.

Limits: up to **120 seconds** of output and **5000 characters** of text.

## Generate a talking video

`POST /v1/video/generate` — submit a render job. Returns immediately with a
`job_id` and `status: "processing"`; poll the GET endpoint for completion.

| Parameter | Type | Required | Description |
|---|---|---|---|
| `model` | string | yes | Engine: `expression-2`, `essence-2-quality`, or `essence-2-light`. |
| `agent_code` | string | yes | An agent you own — supplies the avatar identity (and, for text, the default voice). |
| `input` | object | yes | The render source — see below. |
| `input.type` | string | yes | `text` or `audio`. |
| `input.text` | string | for text | Script to speak (≤ 5000 chars). |
| `input.voice` | string | no | Voice id override for text input. Defaults to the agent's own voice. |
| `input.audio_url` | string | for audio | Public URL to a WAV or MP3 file. |

### Text input

```python
import requests

resp = requests.post(
    "https://api.bithuman.ai/v1/video/generate",
    headers={"Content-Type": "application/json", "api-secret": "YOUR_API_SECRET"},
    json={
        "model": "essence-2-quality",
        "agent_code": "A91XMB7113",
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
        "agent_code": "A91XMB7113",
        "input": {"type": "audio", "audio_url": "https://example.com/speech.wav"},
    },
)
print(resp.json())
```

A `402` (`INSUFFICIENT_BALANCE`) is returned at submit time if your balance can't
cover the render. An invalid `model`, a missing/invalid `input`, or text over the
limit returns `400` before any charge.

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

While rendering:

```json
{ "success": true, "job_id": "vid_3f9a2c1b8e7d4a6f0b21", "status": "processing", "model": "essence-2-quality" }
```

When complete:

```json
{
  "success": true,
  "job_id": "vid_3f9a2c1b8e7d4a6f0b21",
  "status": "completed",
  "model": "essence-2-quality",
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
