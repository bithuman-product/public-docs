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

> **Pin the image.** `sgubithuman/expression-avatar` publishes no semver tags — the tags are build ids and dated builds, and `:latest` moves. In production pin the **digest**, which never moves:
>
> ```bash
> sgubithuman/expression-avatar@sha256:e9325ab35468be968eb41c4132b642775a45f83def2e11ee2f6ed5297fa696b3
> ```
>
> That is the current build (tagged `0822021b`, pushed 2026-06-16), which `:latest` also points at today. Pull a current build — older image builds shipped a publish-preset cap that produced laggy/black video (see [Troubleshooting](#troubleshooting-black-or-laggy-video)). On a GPU it has never seen before, the first run may also spend a few extra minutes optimizing itself for that GPU (a one-time step); `GET /ready` stays non-`200` until that completes, so always poll `/ready` before sending `/launch`.

> **Tip** First-run startup takes ~2 minutes (model download + decrypt + GPU warm-up). Poll `GET /ready` — it returns `200` when the worker is ready to accept `/launch` requests.

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

## Essence 2 self-hosted — CPU offline rendering (SDK 2.9.0+)

As of **`bithuman` 2.9.0** on Linux x86_64/aarch64 and **2.10.0** on macOS
arm64 (Python 3.10–3.14), the [`essence-2`](/concepts/essence-2) model
**self-hosts on CPU** — no GPU required.

> **Start here instead if you just want it working.**
> [Run a model on your own hardware](/guides/self-host-local) walks the whole
> path per platform — install, download an artifact, render, and verify — with
> the exact error text for each prerequisite. The section below is the
> reference.

> ★ **One prerequisite is not self-serve.** This route needs a ~377 MB shared
> speech encoder that ships **neither in the model artifact nor in the wheel**,
> and that the SDK **will not download for you**. On a machine that does not
> already have it the render raises before the first frame. Read
> [Prerequisites](#prerequisites) before you plan around this route.

> **macOS needs 2.10.0, not 2.9.0.** This route calls a native library,
> `lible_core`, that the macOS wheels did not ship until 2.10.0 — earlier macOS
> wheels carried the Python half alone and raised `lible_core.so not found` at
> the first frame. The Linux wheels have carried it since 2.8.1. The SDK renders the same `<code>.lebundle.imx` you download with
[`GET /v1/agent/{code}/model/download`](/api/agents#download-an-agents-model)
or `bithuman pull <code>`, entirely on your own hardware, teeth-refinement
stage included.

```bash
pip install "bithuman[tessera]"   # torch + onnx + onnxruntime extras
```

```python
import os
from bithuman.tessera_offline import render_offline

stats = render_offline(
    "A80XXXXXXXX.lebundle.imx",          # the downloaded essence-2 artifact
    "speech_16k.wav",                     # 16 kHz mono works best
    out_mp4="rendered.mp4",
    api_secret=os.environ["BITHUMAN_API_SECRET"],
)
print(stats["frames"], "frames,", stats["fps"], "fps")
```

For frame-level control, `OfflineTesseraRenderer(imx_path,
api_secret=...).render(audio, on_frame=callback)` delivers RGB numpy frames
as they are produced.

**The metering key is required — plainly.** The self-hosted runtime ships
**with** its license/metering support as one artifact: the renderer
authenticates your `BITHUMAN_API_SECRET` at construction and sends a
once-per-minute billing heartbeat (self-hosted rate — see
[Pricing](/guides/pricing)). Without a valid key the runtime is
**fail-closed**: it renders **zero frames** and raises at the first frame.
There is no unmetered mode in the released wheel.

### Prerequisites

**`ffmpeg` on `PATH`** — the SDK shells out to it for audio decode and MP4
encode.

**The shared speech encoder** — a ~377 MB ONNX file, identity-agnostic (one copy
serves every agent on the host). It is **not** inside the `.lebundle.imx` and
**not** inside the wheel, and **nothing installs it for you**: no CLI subcommand
fetches it, and no public URL is published. Without it the renderer raises at
construction:

```text
bithuman.tessera_offline.TesseraOfflineError: shared audio encoder
(wav2vec2 fp32 8s, ~377MB) not found — set BITHUMAN_W2V_ONNX, or provision
the dependency store (~/.bithuman/deps, asset id audio-encoder-fp32).
```

Resolution order: `$BITHUMAN_W2V_ONNX` (or `$W2V_ONNX`), then the per-host
dependency store `~/.bithuman/deps` (override with `$BITHUMAN_DEPS_DIR`) for
asset id `audio-encoder-fp32`. To get the file, email
[hello@bithuman.ai](mailto:hello@bithuman.ai) and say you are self-hosting
Essence 2 on CPU; then `export BITHUMAN_W2V_ONNX=/path/to/the/file.onnx`.

> **The `tessera` extra pulls a CUDA build of PyTorch (~2.5 GB) this CPU route
> never uses.** Install the CPU wheel first to keep the environment small:
>
> ```bash
> pip install torch --index-url https://download.pytorch.org/whl/cpu
> pip install "bithuman[tessera]"
> ```

**Honest performance expectations (measured, 600-frame runs):** on a 16-core
x86 desktop the route sustains **~22–25 FPS end-to-end** with the default
`fast` CPU tier, and **~31 FPS** on newer artifacts, which carry an extra
CPU-acceleration member. Smaller boxes scale roughly with cores; the output
is 25 FPS video, so a 16-core-class machine renders about real-time. Tuning
knobs:

| Env | Default | Purpose |
|---|---|---|
| `BITHUMAN_TESSERA_CPU_TIER` | `fast` | `reference` = the slower fp32 parity tier |
| `BITHUMAN_TESSERA_TORCH_THREADS` | ~half the cores (≤12) | torch intra-op pool; oversubscribing thrashes |
| `BITHUMAN_TESSERA_PIPELINE` | `1` | producer/consumer pipelined render; `0` disables |
| `BITHUMAN_TESSERA_DIRECTOR` | `auto` | `ts`/`onnx` pins the inference backend |

Beyond `essence-2` offline CPU rendering, the rest of the second-generation
matrix today:

- **[`expression-2`](/concepts/expression-2)** renders locally via the
  [CLI](/sdk/cli/overview#local-rendering-by-platform) — macOS (Apple
  Silicon) and Linux x86_64 — and on-device on Apple Silicon via the
  [Swift SDK](/sdk/swift).
- **`essence-2` live streaming** (LiveKit-style sessions from your own
  server) is still served **through the cloud** — the streaming loader does
  not accept current cloud-form bundles yet (see the
  [Python SDK loader notes](/sdk/python#which-model-artifacts-can-the-sdk-load)).
- **Apple Silicon on-device** playback via the [Swift SDK](/sdk/swift) is
  `expression-2` **only**, and it is **engine only** — the `Expression2`
  product (2.5.0+) builds and runs, but **no model bundle is published in the
  form it loads**
  ([details](/sdk/swift#expression-2-on-device)). The Swift SDK carries **no
  `essence-2` engine at all**; the Apple tier for `essence-2` is
  bitHuman's own Apple Silicon, reached over the network like any other cloud
  tier.
- [`essence-2-max`](/concepts/essence-2-max) has **no on-device or CPU
  runtime**, but it now ships a **hand-delivered self-hosted GPU container**
  for NVIDIA RTX 40-series hardware — see
  [Self-hosted Essence 2 Max](/guides/deploy-essence-2-max).

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
