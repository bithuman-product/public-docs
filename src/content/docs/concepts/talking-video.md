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
    "model": "essence-2",
    "agent_code": "A80HVD8577",
    "input": { "type": "text", "text": "Hello, welcome to bitHuman." }
  }'
# → { "success": true, "job_id": "vid_3f9a2c1b8e7d4a6f0b21", "status": "processing" }

# 2. poll
curl https://api.bithuman.ai/v1/video/vid_3f9a2c1b8e7d4a6f0b21 \
  -H "api-secret: $BITHUMAN_API_SECRET"
# → { "success": true, "status": "completed",
#     "video_url": "https://.../vid_3f9a2c1b8e7d4a6f0b21.mp4",
#     "duration_seconds": 6.5, "credits_charged": 4, "model": "essence-2" }
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

| Model | Best for | Availability |
|---|---|---|
| `essence-1` | Classic photoreal renders — every essence-1 agent. | Available today |
| `expression-1` | Classic stylized renders. | Available today |
| `essence-2` | The standard model — cost-effective renders. | Available (rollout in progress) |
| `expression-2` | Fast, expressive renders. | Available (rollout in progress) |
| `essence-2-max` | Premium fidelity output — the highest-fidelity renderer. | **Not yet available for talking video** — the offline quality render worker isn't live yet; use `essence-2` for now, or serve Max in [real time](/concepts/essence-2-max#serving). |

`essence-2` and `expression-2` talking-video renders work today; `essence-2-max`
talking-video is coming with the offline quality render worker. See
[Essence 2 & Expression 2](/concepts/models-v2) for the full lineup and rollout
status.

## Cost

Talking videos bill **per minute of output, rounded up**, at a per-model
rate — the schedule lives on
[Pricing & credits](/guides/pricing#talking-video--per-minute-of-output).
For example, a 6.5-second `essence-2` clip costs
`ceil(6.5 / 60) × 4 = 4` credits; a 70-second one costs
`ceil(70 / 60) × 4 = 8`. If a render **fails**, the charge is
automatically refunded.

## Limits

- **Output duration:** up to **120 seconds**.
- **Text length:** up to **5000 characters**.
- **Output:** mp4, served from a public CDN URL.

## See also

- [Generate a talking video](/api/video) — the full API reference.
- [Billing & credits](/api/billing) — how credits are consumed.
- [Essence 2 & Expression 2](/concepts/models-v2) — the second-generation models and which to choose.
- [Essence vs Expression](/concepts/models) — the first-generation engine families.
