---
title: "Self-hosted Expression GPU"
description: "Run Expression on your own NVIDIA hardware with the published Docker image — a GPU worker that joins a LiveKit room and streams 25 FPS lip-synced video, with no cloud calls during inference."
section: guides
group: "Deploy"
order: 21
---

## The Expression GPU container

The self-hosted GPU path runs [Expression](/concepts/models) on your own NVIDIA hardware. The Docker image ships everything baked in — a GPU worker that joins a LiveKit room and streams 25 FPS lip-synced video entirely on your GPU, with no cloud calls during inference. Use it when you need a different portrait per session. Bills at the self-hosted rate (2 cr/min Expression).

> **Note** Self-hosted **Essence** (no GPU, higher concurrency) doesn't use this container — run the [Python SDK](/sdk/python) or [CLI](/cli) directly, or point the LiveKit plugin's `api_url` at your own Essence server. On Apple Silicon M3+, Expression runs natively with no Docker/NVIDIA — use the [Swift SDK](/sdk/swift).

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

**Requirements:** an NVIDIA GPU (≥ 8 GB VRAM), the NVIDIA Container Toolkit, and Docker 24+. Weights (~5 GB) download on first run into the `bithuman-models` volume; subsequent runs skip the download.

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

Self-hosted GPU sessions bill at the **self-hosted rate** (2 cr/min Expression). See [Pricing](/guides/pricing) for the full cloud-vs-self-hosted breakdown.

## Where to go next

- [Deploy via LiveKit](/guides/deploy-livekit) — the managed cloud path (no GPU to operate).
- [Embed widget](/guides/deploy-embed) — drop an iframe on any page.
- [Architecture](/concepts/architecture) — per-device hardware matrix.
- [Pricing](/guides/pricing) — credit rates and metering.
