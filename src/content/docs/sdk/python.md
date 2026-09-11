---
title: "Python"
description: "pip install bithuman — open an avatar, render 16 kHz audio through it, take RGB frames. Expression 2 and Essence 2 on your own machine: macOS Apple Silicon, Linux x86_64 / aarch64, Python 3.10–3.14."
section: sdk
group: "Platforms"
order: 20
label: "Python"
---

## Install

```bash
pip install "bithuman[expression-2]"
```

Python **3.10–3.14** on Apple Silicon macOS (14 or newer), Linux x86_64 and
Linux aarch64 (glibc, `manylinux_2_28`). No Windows, Intel Mac or Alpine wheels
— pin `bithuman>=3` so the resolver refuses out loud rather than handing you a
2.x release. The `[expression-2]` extra opens `.avatar` files; add
`"bithuman[offline]"` for the Essence 2 clip-to-file route. `ffmpeg` on `PATH`
is needed only to read an audio *file*; pass 16 kHz samples and it is not.

> `pip install bithuman` puts **no `bithuman` command** on your `PATH`. The
> command-line tool is the [CLI](/sdk/cli), a separate artifact, so the two can
> never overwrite each other.

## Get a model

A showcase avatar is a plain anonymous download — no account, no key:

```bash
PUB=https://tmoobjxlwcwvxvjeppzq.supabase.co/storage/v1/object/public/web/showcase
curl -fsSLo wise-pup.avatar "$PUB/A23WJF0199.avatar"     # the free Expression 2 avatar
curl -fsSLo speech.wav      "$PUB/demo_sample.wav"        # 16 kHz mono, something for it to say
```

Download the `.avatar`, not the `.imx` — the `.imx` is the [CLI](/sdk/cli)'s
form and reads a cache this package does not have. Your own agent's file comes
from [`GET /v1/agent/{code}/model/download`](/api/agents#download-an-agents-model)
or `bithuman pull <CODE>`; an Essence 2 agent arrives as an `.imx`, an
Expression 2 agent as an `.avatar`, and `bithuman.open` takes either.

## Minimal code

```python
# hello.py
import bithuman

with bithuman.open("wise-pup.avatar") as avatar:       # an Essence 2 .imx or an Expression 2 .avatar — one call
    for image in avatar.render("speech.wav"):          # (height, width, 3) uint8, RGB, at the avatar's own frame rate
        print(image.shape)                             # hand it to your display — OpenCV wants image[:, :, ::-1]
```

That is the whole surface: **open an avatar, render audio through it.**
`audio` is 16 kHz mono as a file path, an `int16` or `float32` array, raw
16-bit little-endian bytes, or any iterable of those — a microphone stream and a
file are the same program. Nothing is rendered ahead of what you take;
`frames = avatar.render(...)` then `frames.close()` stops early.

## Run

```bash
export BITHUMAN_API_SECRET=…        # free at https://www.bithuman.ai/developer/api-keys
python hello.py
```

The download is free; **the render is metered** and refuses before the first
frame without a key — [pricing](/guides/pricing) is the authority for what a
session costs. The first use on a machine prepares the avatar into
`BITHUMAN_CACHE_DIR` (`~/.cache/bithuman`) and, for Essence 2, fetches the
shared audio encoder once (~377 MB, sha256-verified, kept under
`BITHUMAN_DEPS_DIR`, `~/.bithuman/deps`); both happen once.

## Performance

Measured 2026-09-10, unpaced (frames drained as fast as they are produced),
whole-process wall clock including `open`:

| Device | Model | fps (unpaced) | Notes |
|---|---|---:|---|
| Linux x86_64, 24 cores, Python 3.14, `bithuman 3.1.0` | Expression 2 (Wise Pup) | 25.5 | 309 frames of 416×720 in 12.1 s; the model plays at 20 fps |
| Apple Silicon | Expression 2 | see [macOS](/sdk/macos#performance) | the CLI's CoreML figure on the same engine |
| any CPU | Essence 2 | below real time | render a clip to a file (below); do not plan a live CPU session on it |

The rendered rate is a property of your avatar and your machine — measure
yours before you plan a product on it.

Every platform side by side: [Performance](/sdk/performance).

## The four refusals

```python
try:
    with bithuman.open(source) as avatar:
        for image in avatar.render(audio):
            show(image)
except bithuman.InvalidAvatar:    # not found, or not a usable avatar — fix the path, or fetch it again
    ...
except bithuman.NotSupported:     # this avatar cannot run here — install the extra, or use the cloud
    ...
except bithuman.NotAuthorised:    # the key is missing, invalid, or out of credit
    ...
except bithuman.Failed:           # the message says why — retry, then report it
    ...
```

All four are `AvatarError`. Those, plus `open`, `render` and `Avatar`, are the
eight public names; there is no execution-provider, thread or delegate option —
the package runs the avatar on this machine and decides the rest.

A rejected key (HTTP 401, 402 or 403 from the service) gets a 300-second grace
with a warning naming the seconds left, then `NotAuthorised` on the next frame;
an unreachable service never stops a live render but logs
`★ UNMETERED RENDER`. `BITHUMAN_METER_ENFORCE=1` refuses a rejected key before
the first frame instead.

## Render a clip to a file

The Essence 2 offline route — a whole clip to an MP4 on CPU — is
`bithuman.offline`, with the `bithuman[offline]` extra installed:

```python
from bithuman.offline import render_offline

stats = render_offline("A31BSK9325.imx", "speech.wav", out_mp4="rendered.mp4")
print(stats["frames"], stats["billing_type"])      # billing_type and metered_heartbeat are the stable fields
```

`OfflineRenderer(path).render(audio, on_frame=callback)` hands you the frames
instead of a file. With no key it refuses at the first frame and writes
nothing. Install the CPU build of `torch` first on a machine with no GPU, or
the extra pulls in a CUDA stack this route never touches.

## Troubleshooting

| You see | It means | Do this |
|---|---|---|
| `ModuleNotFoundError: No module named 'bithuman'` | not installed in the active environment | `pip install bithuman --upgrade` in the venv you run from |
| `No matching distribution found for bithuman` | no wheel for this platform — Intel Mac, Windows, musl, or a Python outside 3.10–3.14 | a supported platform, or the [cloud API](/api/overview) |
| `NotSupported` opening a `.avatar` | the Expression 2 extra is missing | `pip install "bithuman[expression-2]"` |
| the first `render` raises `NotAuthorised` or `Failed: the render stopped` | no usable key in the running shell | `export BITHUMAN_API_SECRET=…`, then `curl -s -X POST https://api.bithuman.ai/v1/validate -H "api-secret: $BITHUMAN_API_SECRET"` — it always answers 200; the body must say `{"valid":true}` |
| `InvalidAvatar` on an Essence 2 file you were given | its recorded-mouth data is missing, and no frame is ever rendered with another mouth | send the agent code to [hello@bithuman.ai](mailto:hello@bithuman.ai) for re-publishing |
| `404 NOT_FOUND` from `/v1/agent/<CODE>/model/download` | not an agent on your account, and not a public showcase | check the code under [your agents](/api/agents) or on the [showcase](/showcase) |
| `409 MODEL_NOT_GENERATED` from the download | the agent has no model of that family yet | [add the model](/api/agents#add-a-model-to-an-existing-agent), then poll `GET /v1/agent/<CODE>` until it is listed |
| `MODEL_ARTIFACT_NOT_READY` from the download | trained, not yet published to the download store | poll the same download URL; it clears on its own |
| frames look blue | frames are RGB; your sink wants BGR | `image[:, :, ::-1]` |
| the first `render` is slow, with a large download | the ~377 MB shared encoder is being fetched, once | wait; on an air-gapped box mirror it (`BITHUMAN_DEPS_BASE_URL`) or point at a copy (`BITHUMAN_W2V_ONNX`) |

## Environment

| Variable | Meaning |
|---|---|
| `BITHUMAN_API_SECRET` | your key — required to render; read from the environment and only there |
| `BITHUMAN_CACHE_DIR` | where a prepared avatar is kept (default `~/.cache/bithuman`) |
| `BITHUMAN_DEPS_DIR`, `BITHUMAN_DEPS_BASE_URL`, `BITHUMAN_DEPS_OFFLINE`, `BITHUMAN_W2V_ONNX` | the shared Essence 2 audio encoder: where it is kept, mirrored from, never fetched, or already held |

## Coming from 2.10.0

3.0.0 was a clean break: thirty-two public names became eight, fourteen error
classes became four, frames are RGB (2.x yielded BGR), and the key is read from
the environment only — there is no `api_secret=` argument. The 2.x offline
module, class and extra names are deprecated aliases of `bithuman.offline` /
`bithuman[offline]` that warn on import and are removed in 4.0.0.
`pip install "bithuman<3"` keeps 2.10.0, which stays on PyPI.

## See also

- [LiveKit](/sdk/livekit) — a real-time voice agent with this avatar as its face
- [CLI](/sdk/cli) — the same engines as one command; `bithuman pull` for your own agent's file
- [Agents](/api/agents) — creating an agent and downloading its model
- [Local mode](/sdk/cli/local-mode) — the conversation brain fully on-device
- [SDK](/sdk) — every platform on one table
