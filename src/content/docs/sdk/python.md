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
`"bithuman[offline]"` for the Essence 2 clip-to-file route. `pip install
bithuman` puts **no `bithuman` command** on your `PATH` — the command-line tool
is the [CLI](/sdk/cli), a separate artifact.

## Get a model

A showcase avatar is a plain anonymous download — no account, no key:

```bash
curl -fsSLO "https://tmoobjxlwcwvxvjeppzq.supabase.co/storage/v1/object/public/web/showcase/{A23WJF0199.avatar,demo_sample.wav}"
```

`A23WJF0199.avatar` is the free Wise Pup (Expression 2); `demo_sample.wav` is
16 kHz mono, something for it to say. Download the `.avatar`, not the `.imx` —
the `.imx` is the [CLI](/sdk/cli)'s form. Your own agent's file comes from
[`GET /v1/agent/{code}/model/download`](/api/agents#download-an-agents-model)
or `bithuman pull <CODE>`; an Essence 2 agent arrives as an `.imx`, an
Expression 2 agent as an `.avatar`, and `bithuman.open` takes either.

## Minimal code

```python
# hello.py
import bithuman

with bithuman.open("A23WJF0199.avatar") as avatar:      # an Essence 2 .imx or an Expression 2 .avatar — one call
    for image in avatar.render("demo_sample.wav"):     # (height, width, 3) uint8, RGB, at the avatar's own frame rate
        print(image.shape)                             # hand it to your display — OpenCV wants image[:, :, ::-1]
```

That is the whole surface: **open an avatar, render audio through it.**
`audio` is 16 kHz mono as a file path, an `int16` or `float32` array, raw
16-bit little-endian bytes, or any iterable of those — a microphone stream and a
file are the same program; `frames = avatar.render(...)` then `frames.close()`
stops early. Eight public names: `open`, `render`, `Avatar`, and four errors,
all `AvatarError` — `InvalidAvatar` (not found, or not usable: fix the path or
fetch it again), `NotSupported` (cannot run here: install the extra, or use the
cloud), `NotAuthorised` (the key is missing, invalid, or out of credit),
`Failed` (the message says why: retry, then report it). There is no
execution-provider, thread or delegate option. A whole Essence 2 clip to an MP4
on the CPU is `from bithuman.offline import render_offline`, then
`render_offline("agent.imx", "speech.wav", out_mp4="rendered.mp4")`, with the
`[offline]` extra (install the CPU build of `torch` first on a machine with no
GPU).

## Run

```bash
export BITHUMAN_API_SECRET=…        # free at https://www.bithuman.ai/developer/api-keys
python hello.py
```

The download is free; **the render is metered** and refuses before the first
frame without a key — [pricing](/guides/pricing) is the authority. A rejected
key (HTTP 401, 402 or 403) gets a 300-second grace with a warning naming the
seconds left, then `NotAuthorised` on the next frame; an unreachable service
never stops a live render but logs `★ UNMETERED RENDER`
(`BITHUMAN_METER_ENFORCE=1` refuses a rejected key before the first frame
instead). The first use on a machine prepares the avatar into
`BITHUMAN_CACHE_DIR` (`~/.cache/bithuman`); an Essence 2 avatar also fetches
the shared audio encoder once (~377 MB, sha256-verified, kept under
`BITHUMAN_DEPS_DIR`, `~/.bithuman/deps` — mirror it with
`BITHUMAN_DEPS_BASE_URL`, or point at a copy with `BITHUMAN_W2V_ONNX`).

## Performance

Unpaced (frames drained as fast as they are produced), whole process including
`open`:

| Hardware | Model | fps (unpaced) | Measured |
|---|---|---:|---|
| Ryzen Threadripper PRO 5955WX (Linux x86_64), Python 3.14, `bithuman` 3.1.0 | Expression 2 (Wise Pup) | **26** | 2026-09-10 — 309 frames of 416×720 in 12.1 s; playback is 20 fps |
| the same machine, [CLI](/sdk/cli) 2.6.5, 8 threads | Essence 2 | **1** | 2026-09-11 — 408 frames at 1920×1080 in 371 s; render a clip to a file, not a live CPU session |

On Apple Silicon the CLI's CoreML figure on the same engine is on
[macOS](/sdk/macos#performance). Every platform side by side:
[Performance](/sdk/performance).

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
| code written for 2.10.0 fails — `api_secret=`, BGR frames, fourteen error classes | 3.0.0 was a clean break: eight public names, four errors, RGB frames, the key from the environment only | port to the snippet above; `pip install "bithuman<3"` keeps 2.10.0, which stays on PyPI |
