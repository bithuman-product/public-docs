---
title: "Self-hosted Expression GPU"
description: "Run Expression on your own NVIDIA hardware with the published Docker image — a GPU worker that joins a LiveKit room and streams lip-synced video, with no cloud calls during inference."
section: guides
group: "Deploy"
order: 11
---

## The Expression GPU container

The self-hosted GPU path runs the first-generation [Expression 1](/concepts/models) model on your own NVIDIA hardware. The Docker image ships everything baked in — a GPU worker that joins a LiveKit room and streams lip-synced video entirely on your GPU, with no cloud calls during inference. Use it when you need a different portrait per session. It bills at the self-hosted rate ([pricing](/guides/pricing)).

> **Note** Self-hosted **Essence** (no GPU, higher concurrency) doesn't use this container — run the [Python SDK](/sdk/python) or [CLI](/sdk/cli) directly, or point the LiveKit plugin's `api_url` at your own Essence server.

There is no macOS or iOS build of Expression 1. The engine you can attach on Apple Silicon is [Expression 2](/sdk/ios), a different model.

## Pull and run

This page is a reference for teams that already run [LiveKit](/guides/deploy-livekit);
for a first agent, start with the [CLI](/sdk/cli).

```bash
# Put BITHUMAN_API_SECRET=... in ./bithuman.env (chmod 600) — keeps it
# out of shell history and `ps aux`.
docker run --gpus all -p 8089:8089 \
  -v bithuman-models:/data/models \
  --tmpfs /tmp/bh-weights:size=9g,mode=0700 \
  --env-file ./bithuman.env \
  sgubithuman/expression-avatar:latest
```

Then point a LiveKit agent worker at `http://localhost:8089/launch` — the worker spawns render sessions on demand. Each `/launch` takes `{ livekit_url, livekit_token, room_name, avatar_image }`; the container joins the room and publishes video.

**Requirements:** an **Ampere-or-newer NVIDIA GPU** (compute capability ≥ 8.0 with BF16 tensor cores — RTX 30xx/40xx, A-series, L4/L40S, H100; **Turing T4 / GTX 16xx / RTX 20xx and older fall back to a slower non-real-time path**), **≥ 8 GB VRAM**, the NVIDIA Container Toolkit, and Docker 24+. Weights (~5 GB) download on first run into the `bithuman-models` volume; subsequent runs skip the download.

> **Pin the image.** `sgubithuman/expression-avatar` publishes no semver tags. In production pin the **digest**, which never moves:
>
> ```bash
> sgubithuman/expression-avatar@sha256:e9325ab35468be968eb41c4132b642775a45f83def2e11ee2f6ed5297fa696b3
> ```
>
> On a GPU it has never seen before, the first run may spend a few extra minutes optimizing itself for that GPU (a one-time step); `GET /ready` stays non-`200` until that completes, so always poll `/ready` before sending `/launch`.

> **Tip** First-run startup takes ~2 minutes (model download + decrypt + GPU warm-up). Poll `GET /ready` — it returns `200` when the worker is ready to accept `/launch` requests.

## Hardware floor

The Docker image runs Expression, which is the heavier model. Budget **~3 GB VRAM per Expression session**:

| GPU | Concurrent Expression sessions |
|---|---|
| RTX 3090 (24 GB) | 6–8 |
| RTX 4090 (24 GB) | **8–10** (recommended) |
| H100 (80 GB) | 30+ (overkill for most loads) |

Also requires the NVIDIA Container Toolkit and Docker 24+. The same image runs in any Kubernetes/Docker environment with a CUDA-capable GPU exposed.

## Billing

Self-hosted GPU sessions bill at the **self-hosted rate** — see [Pricing](/guides/pricing) for the full cloud-vs-self-hosted breakdown. Self-hosted serving authenticates online — a once-per-minute billing heartbeat.

## Essence 2 on your own CPU

Whole-clip Essence 2 rendering with the Python SDK is covered step by step in
[Run a model on your own hardware](/guides/self-host-local#linux-and-macos) —
install `bithuman[offline]`, pull your agent, render to an MP4.

## Offline licensing — coming soon

Running the second-generation models **fully disconnected** — no heartbeat, no online auth — is coming soon for Business and Enterprise customers, delivered as per-device, per-model prepaid credit bundles. Packages and rates: [Pricing → Offline licensing](/guides/pricing#offline-licensing--coming-soon).

## Troubleshooting: black or laggy video

If the avatar **joins but shows a black screen / no video, or appears after a
while but is extremely laggy**, the cause is almost always the **WebRTC video
publish preset**, not the engine. LiveKit's default maps a small avatar track to
a low-bitrate, frame-rate-capped VP8 preset with simulcast on, which decimates
the render and, under encoder pressure, produces ~1 s frozen frames (black) plus
a downscale. This container already publishes a tuned single H264 layer;
ensure you are on a **current image build** (older builds did not) and
tune via env if needed:

| Env | Default | Purpose |
|---|---|---|
| `AVATAR_VIDEO_MAX_BITRATE` | `2000000` | Raise to 3–4 M for larger portraits |
| `AVATAR_VIDEO_MAX_FPS` | the engine's frame rate | Publish frame-rate cap |
| `AVATAR_VIDEO_SIMULCAST` | off | Leave off for single-subscriber avatars |

The startup log prints the chosen publish settings (`video publish: WxH
cap=…fps bitrate=… simulcast=…`) — confirm `simulcast=False` and the full
frame rate. On a pre-Ampere GPU the worker falls back to a non-real-time PyTorch
path (also laggy); see [Requirements](#pull-and-run). For the **Essence (CPU,
LiveKit plugin)** path, the same tuning is applied in code — see
[LiveKit integration → Production video tuning](/sdk/livekit#production-video-tuning-avoid-a-black-or-laggy-avatar).

## Where to go next

- [Deploy via LiveKit](/guides/deploy-livekit) — the managed cloud path (no GPU to operate).
- [Embed widget](/guides/deploy-embed) — drop an iframe on any page.
- [Architecture](/concepts/architecture) — per-device hardware matrix.
- [Pricing](/guides/pricing) — credit rates and metering.
