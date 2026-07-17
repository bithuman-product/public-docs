---
title: "Self-hosted Expression GPU"
description: "Run Expression on your own NVIDIA hardware with the published Docker image — a GPU worker that joins a LiveKit room and streams 25 FPS lip-synced video, with no cloud calls during inference."
section: guides
group: "Deploy"
order: 11
---

## The Expression GPU container

The self-hosted GPU path runs the first-generation [Expression 1](/concepts/models) model on your own NVIDIA hardware. The Docker image ships everything baked in — a GPU worker that joins a LiveKit room and streams 25 fps lip-synced video entirely on your GPU, with no cloud calls during inference. Use it when you need a different portrait per session. Bills at the self-hosted rate — 2 credits/min ([pricing](/guides/pricing)).

> **Note** Self-hosted **Essence** (no GPU, higher concurrency) doesn't use this container — run the [Python SDK](/sdk/python) or [CLI](/sdk/cli/overview) directly, or point the LiveKit plugin's `api_url` at your own Essence server. On Apple Silicon M3+, Expression runs natively with no Docker/NVIDIA — use the [Swift SDK](/sdk/swift).

## Pull and run

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

> **Pin the image version.** Use a version-pinned tag (e.g. `sgubithuman/expression-avatar:2.3.7`) rather than `:latest` in production, and pull a current build — older image builds shipped a publish-preset cap that produced laggy/black video (see [Troubleshooting](#troubleshooting-black-or-laggy-video)). On a GPU it has never seen before, the first run may also spend a few extra minutes building a TRT engine; `GET /ready` stays non-`200` until that completes, so always poll `/ready` before sending `/launch`.

> **Tip** First-run startup takes ~2 minutes (model download + decrypt + TRT engine warm). Poll `GET /ready` — it returns `200` when the worker is ready to accept `/launch` requests.

## Hardware floor

The Docker image runs Expression, which is the heavier model. Budget **~3 GB VRAM per Expression session**:

| GPU | Concurrent Expression sessions |
|---|---|
| RTX 3090 (24 GB) | 6–8 |
| RTX 4090 (24 GB) | **8–10** (recommended) |
| H100 (80 GB) | 30+ (overkill for most loads) |

Also requires the NVIDIA Container Toolkit and Docker 24+. The same image runs in any Kubernetes/Docker environment with a CUDA-capable GPU exposed.

## Why `--tmpfs`?

Model weights are AES-256-GCM encrypted at rest in the `bithuman-models` volume and decrypted at startup using a key fetched from `api.bithuman.ai` (gated by your `BITHUMAN_API_SECRET`). The `--tmpfs` flag keeps the **decrypted** copy in RAM only — without it the plaintext lands on the container's writable layer and can be read via `docker cp` or baked into a derived image via `docker commit`. The container starts either way; if `--tmpfs` is missing you'll see a loud `SECURITY:` warning in the startup logs.

## Dev / parity testing without metering

Set `BITHUMAN_UNMETERED=1` to skip `api.bithuman.ai` calls entirely — for local dev, CI, and parity work, not production. Production deployments should leave it unset and provide `BITHUMAN_API_SECRET`. See [Pricing](/guides/pricing) for the metering model.

## Billing

Self-hosted GPU sessions bill at the **self-hosted rate** — 2 credits/min for Expression 1. See [Pricing](/guides/pricing) for the full cloud-vs-self-hosted breakdown. Self-hosted serving authenticates online today (a once-per-minute billing heartbeat).

## Essence 2 / Expression 2 self-hosted — coming soon

The Docker image above runs the first-generation
[Expression 1](/concepts/models) model on an NVIDIA GPU. The
[second-generation models](/concepts/models-v2) do **not** self-host through
the developer SDK or CLI yet. A cross-platform (CPU / Neural Engine) developer
self-host runtime for `essence-2` and `expression-2` is in active development —
**today, serve these models through the cloud.**

You can already download the packaged artifacts — the `<code>.lebundle.imx`
([`essence-2`](/concepts/essence-2)) and `<code>.imx` (legacy `.avatar` zip)
([`expression-2`](/concepts/expression-2)) builds — with
[`GET /v1/agent/{code}/model/download`](/api/agents#download-an-agents-model)
or `bithuman pull <code>`, but they are for archival and forward-compatibility
today. The [Python SDK](/sdk/python#which-model-artifacts-can-the-sdk-load) and
[CLI](/sdk/cli/overview) **recognize** these files but their local runtimes only
play `essence-1` `.imx` avatars, so passing a v2 artifact as the model path
**fails at load**. Until the self-host runtime ships, put the second-generation
models on screen through the cloud surfaces:

- the [cloud REST API](/api/agents),
- the [LiveKit plugin](/sdk/livekit) — pass the **agent code**, not a model
  file, and it streams whatever family that agent serves,
- the [embed widget](/guides/deploy-embed), or the dashboard.

The one **on-device** path that exists today is **Apple Silicon** playback via
the [Swift SDK](/sdk/swift) — `essence-2` and `expression-2` have on-device
Neural Engine engines there. That rail is **preview**, not GA: treat it as a
technology preview, not a self-host deployment product.
[`essence-2-max`](/concepts/essence-2-max) has **no on-device or self-hosted
runtime** — it is cloud-GPU-only.

See [where each model runs](/concepts/models-v2#where-each-model-runs) for the
full device/runtime matrix.

## Offline licensing — coming soon

Running the second-generation models **fully disconnected** — no heartbeat, no online auth — is coming soon for Business and Enterprise customers, delivered as per-device, per-model prepaid credit bundles. Packages and rates: [Pricing → Offline licensing](/guides/pricing#offline-licensing--coming-soon).

## Troubleshooting: black or laggy video

If the avatar **joins but shows a black screen / no video, or appears after a
while but is extremely laggy**, the cause is almost always the **WebRTC video
publish preset**, not the engine. LiveKit's default maps a small avatar track to
its H480 preset (VP8 ~300 kbps, 20 fps cap, simulcast on), which decimates the
25 fps render and, under encoder pressure, produces ~1 s frozen frames (black) +
a 512→360 downscale. This container already publishes a tuned single H264 layer;
ensure you are on a **current image build** (older `:latest` builds did not) and
tune via env if needed:

| Env | Default | Purpose |
|---|---|---|
| `AVATAR_VIDEO_MAX_BITRATE` | `2000000` | Raise to 3–4 M for larger portraits |
| `AVATAR_VIDEO_MAX_FPS` | engine fps (25) | Publish frame-rate cap |
| `AVATAR_VIDEO_SIMULCAST` | off | Leave off for single-subscriber avatars |

The startup log prints the chosen publish settings (`video publish: WxH
cap=…fps bitrate=… simulcast=…`) — confirm `simulcast=False` and the full fps.
On a pre-Ampere GPU the worker falls back to a non-real-time PyTorch path (also
laggy); see [Requirements](#pull-and-run). For the **Essence (CPU, LiveKit
plugin)** path, the same tuning is applied in code — see
[LiveKit integration → Production video tuning](/sdk/livekit#production-video-tuning-avoid-a-black-or-laggy-avatar).

## Where to go next

- [Deploy via LiveKit](/guides/deploy-livekit) — the managed cloud path (no GPU to operate).
- [Embed widget](/guides/deploy-embed) — drop an iframe on any page.
- [Architecture](/concepts/architecture) — per-device hardware matrix.
- [Pricing](/guides/pricing) — credit rates and metering.
