---
title: "Talking video generation"
description: "Talking-video generation — the offline counterpart to bitHuman's real-time avatars. Render a finished mp4 from a script or audio for social clips, explainers, and batch content."
section: concepts
group: "Models"
order: 6
---

## What it is

Most of the bitHuman platform is **real-time** — audio streams in, a talking
avatar streams out at 25 FPS. **Talking video generation** is the offline
counterpart: you submit a script (text) or a hosted audio file, and the platform
renders a complete **mp4** of one of your agents speaking it, then hands you a
public URL.

Use it when you want a file rather than a live session — short clips for social,
product explainers, voiceover-driven segments, batch content, and anywhere a
ready-made video is more convenient than a stream.

## How it works

```
TEXT   →  the agent's voice speaks your text  →  render  →  mp4 → URL
AUDIO  →  your audio drives the render directly  →  mp4 → URL
```

- **Text input** — you provide a `text` script. The agent's **own voice** speaks
  it (the platform synthesizes the speech for you). Pass `input.voice` to use a
  different voice for a single render.
- **Audio input** — you provide a public `audio_url` (WAV or MP3). The audio
  drives the render directly; no speech synthesis happens.

Either way, the avatar identity comes from an **agent you own** (`agent_code`).

## Asynchronous: submit, then poll

Rendering a full clip can take a while, so the API is asynchronous — the same
submit-then-poll shape as agent and dynamics generation:

1. `POST /v1/video/generate` returns immediately with a `job_id` and
   `status: "processing"`.
2. Poll `GET /v1/video/{job_id}` until `status` is `completed` (the response then
   carries `video_url`, `duration_seconds`, and `credits_charged`) or `failed`.

```bash
# 1. submit
curl -X POST https://api.bithuman.ai/v1/video/generate \
  -H "api-secret: $BITHUMAN_API_SECRET" \
  -H "Content-Type: application/json" \
  -d '{
    "model": "essence-2-max",
    "agent_code": "A80HVD8577",
    "input": { "type": "text", "text": "Hello, welcome to bitHuman." }
  }'
# → { "success": true, "job_id": "vid_3f9a2c1b8e7d4a6f0b21", "status": "processing" }

# 2. poll
curl https://api.bithuman.ai/v1/video/vid_3f9a2c1b8e7d4a6f0b21 \
  -H "api-secret: $BITHUMAN_API_SECRET"
# → { "success": true, "status": "completed",
#     "video_url": "https://.../vid_3f9a2c1b8e7d4a6f0b21.mp4",
#     "duration_seconds": 6.5, "credits_charged": 8, "model": "essence-2-quality" }
#    (during the rename rollout, job responses may echo the pre-rename family
#     name — see /concepts/models-v2#naming--migration)
```

Audio input is the same call with an audio block:

```jsonc
{
  "model": "expression-2",
  "agent_code": "A80HVD8577",
  "input": { "type": "audio", "audio_url": "https://example.com/speech.wav" }
}
```

## Models

| Model | Best for |
|---|---|
| `essence-1` | Classic photoreal renders — every essence-1 agent, available today. |
| `expression-1` | Classic stylized renders — available today. |
| `expression-2` | Fast, expressive renders. |
| `essence-2-max` | Premium fidelity output — the highest-fidelity renderer (the pre-rename `essence-2-quality` is still accepted as a deprecated alias — see [Naming & migration](/concepts/models-v2#naming--migration)). |
| `essence-2` | The standard model — cost-effective renders. |

Essence 2 and Expression 2 are [launching July 10, 2026 — rollout in progress](/concepts/models-v2); `essence-1` and `expression-1` are available today.

## Cost

Talking videos bill **per minute of output, rounded up**, at a per-model
rate — the schedule lives on
[Pricing & credits](/guides/pricing#talking-video--per-minute-of-output).
For example, a 6.5-second `essence-2-max` clip costs
`ceil(6.5 / 60) × 8 = 8` credits; a 70-second one costs
`ceil(70 / 60) × 8 = 16`. If a render **fails**, the charge is
automatically refunded.

## Limits

- **Output duration:** up to **120 seconds**.
- **Text length:** up to **5000 characters**.
- **Output:** mp4, served from a public CDN URL.

## See also

- [Generate a talking video](/api/video) — the full API reference.
- [Billing & credits](/api/billing) — how credits are consumed.
- [Essence vs Expression](/concepts/models) — the engine families.
