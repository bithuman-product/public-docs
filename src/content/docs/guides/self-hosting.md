---
title: "Self-hosting"
description: "Run bitHuman models on your own hardware: which surface runs which model, a first MP4 in four commands, how self-hosting is billed, the Expression 1 GPU container, and offline licensing."
section: guides
group: "Deploy"
order: 30
type: guide
label: "Self-hosting"
---

Self-hosting means the render happens on your hardware — a Mac, a Linux box, a
phone, a browser tab or your own GPU. It is billed in credits at the
self-hosted rate, and **credits are the only gate**: there is no separate
licence to buy and no time limit. Downloading a model is free.

## Pick your surface

Each page below is the one place its install, model download and code live.

| You want | Use | Models |
|---|---|---|
| A talking avatar or an MP4 on a Mac or Linux box, no code | [CLI](/sdk/cli) | Essence 2 and Expression 2 (`run`, `render`); Essence 1 (`run`) |
| Frames or MP4 clips from your own code | [Python SDK](/sdk/python) | Essence 2, Expression 2, Essence 1 |
| An iPhone, iPad or Mac app | [Apple SDK](/sdk/apple) | Essence 2, Expression 2 |
| An Android app | [Android SDK](/sdk/android) | Essence 2, Expression 2 |
| Rendering in your visitor's browser tab | [Web](/sdk/web) (`?render=local`) | Essence 2, Expression 2, Essence 1 |
| Expression 1 on your own NVIDIA GPU | [the Expression 1 GPU container](#the-expression-1-gpu-container) | Expression 1 |

The full model-by-surface matrix is on [Models](/concepts/models#where-each-model-runs).

For a live session on one machine, use `bithuman run`. For a live session in your own LiveKit rooms, use the [LiveKit plugin](/sdk/livekit) with a cloud avatar, or the Expression 1 container below.

## A first MP4 on macOS or Linux

Four commands on macOS Apple Silicon or Linux (x86_64 or arm64), with `ffmpeg` on `PATH`:

```bash
curl -fsSL https://install.bithuman.ai | sh
bithuman login                    # opens your browser; in CI, export BITHUMAN_API_SECRET instead
curl -fsSLo speech.wav https://docs.bithuman.ai/samples/speech.wav
bithuman render "$(bithuman pull wise-pup)" -a speech.wav -o out.mp4
```

`out.mp4` is the free Wise Pup avatar speaking the 15-second sample. The rest of
the CLI — live sessions, your own agents, every flag — is on [the CLI page](/sdk/cli).

## How self-hosting is billed

- **At the self-hosted rate** on [pricing](/guides/pricing#serving--credits-per-live-minute),
  from your credit balance. A live session bills its talking minutes (idle is free); an MP4
  render bills the length of the clip it writes.
- **A credential is required to render.** Sign in with `bithuman login`, or set
  `BITHUMAN_API_SECRET` — get one at
  [Developer → API Secrets](https://www.bithuman.ai/developer/api-keys).
- **Rendering authenticates online** and reports usage as it runs. If the
  connection drops, a session keeps a 5-minute grace.
- **To run completely off the internet**, see [offline licensing](/guides/pricing#offline-licensing).

## The Expression 1 GPU container

A published Docker image runs [Expression 1](/concepts/expression-1) on your own
NVIDIA GPU: a worker that joins a LiveKit room and streams lip-synced video,
with a different portrait per session if you want one. It is for teams that
already run [LiveKit](/sdk/livekit).

```bash
# Put BITHUMAN_API_SECRET=... in ./bithuman.env (chmod 600) — keeps it
# out of shell history and `ps aux`.
docker run --gpus all -p 8089:8089 \
  -v bithuman-models:/data/models \
  --tmpfs /tmp/bh-weights:size=9g,mode=0700 \
  --env-file ./bithuman.env \
  sgubithuman/expression-avatar:latest
```

**Requirements:** an Ampere-or-newer NVIDIA GPU (compute capability 8.0 or
higher — RTX 30xx/40xx, A-series, L4/L40S, H100) with at least 8 GB of VRAM,
the NVIDIA Container Toolkit and Docker 24+. Older GPUs fall back to a path that
is not real time. Weights (~5 GB) download into the `bithuman-models` volume on
the first run. Budget about 3 GB of VRAM per session; `MAX_SESSIONS` caps
concurrency (the image ships `9`).

**Pin the image** by digest; `:latest` moves with every publish:

```bash
docker inspect --format '{{index .RepoDigests 0}}' sgubithuman/expression-avatar:latest
```

**Start a session** by polling `GET /ready` until it returns `200` — the first
run on a new GPU takes a few minutes — then sending `POST /launch`, as JSON or
multipart form data:

| Field | Required | What it is |
|---|---|---|
| `livekit_url` | yes | the room's server, e.g. `ws://livekit:17880` |
| `livekit_token` | yes | a join token for the avatar participant |
| `room_name` | yes | the room to join |
| `avatar_image` | no | the portrait to render, as a multipart file. Supply one — without it the worker renders a test pattern |
| `avatar_image_url` | no | the same, fetched from a URL |

| Endpoint | Use |
|---|---|
| `GET /ready` | `200` when the worker accepts `/launch` |
| `GET /status` | `active_sessions`, `available_sessions`, `max_sessions` |
| `GET /version` | the running worker's version and uptime |
| `POST /tasks/{task_id}/stop` | end one session; `GET /tasks` lists them |
| `GET /health` | liveness, for an orchestrator's probe |

**A black or laggy video** usually comes from the WebRTC publish settings. The container publishes one H.264 layer; tune it with:

| Env | Default | Purpose |
|---|---|---|
| `AVATAR_VIDEO_MAX_BITRATE` | `2000000` | raise to 3–4 M for larger portraits |
| `AVATAR_VIDEO_MAX_FPS` | the engine's frame rate | publish frame-rate cap |
| `AVATAR_VIDEO_SIMULCAST` | off | leave off for single-subscriber avatars |

## Troubleshooting

| Symptom | Cause | Fix |
|---|---|---|
| `bithuman render` refuses with `NOT_SIGNED_IN` | a render is billed, so it needs a credential | `bithuman login`, or `export BITHUMAN_API_SECRET=…` |
| `ffmpeg: command not found` | the MP4 is written through ffmpeg | `brew install ffmpeg` / `sudo apt install -y ffmpeg` |
| `pip install bithuman` finds no wheel | wheels exist for macOS (Apple silicon) and Linux x86_64 / arm64 only | use one of those, or WSL2 on Windows |
| `java.lang.UnsatisfiedLinkError` on an Android emulator | the libraries are `arm64-v8a` only | a physical device, or an `arm64-v8a` emulator image |
| the Expression 1 worker never turns `/ready` | the first run is optimizing for a new GPU, or the GPU is older than Ampere | wait a few minutes; check the GPU generation |

## Next steps

- [Pricing](/guides/pricing) — the self-hosted rate and offline licensing
- [Models](/concepts/models) — which model runs where
- [Performance](/performance) — measured frame rates per platform
