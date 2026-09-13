---
title: "Python"
description: "pip install bithuman — open an avatar, render 16 kHz audio through it, take RGB frames. Expression 2 and Essence 2 on your own machine."
section: sdk
group: "Platforms"
order: 20
label: "Python"
---

## Install

```bash
pip install "bithuman[expression-2]"
```

`bithuman` 3.1.4 runs on Python 3.10–3.14 on Apple Silicon macOS (14 or
newer), Linux x86_64 and Linux aarch64 — no Windows, Intel Mac or Alpine
wheels. The `[expression-2]` extra opens `.avatar` files; for the Essence 2
clip-to-file route add the offline extra:

```bash
pip install "bithuman[offline]"
```

`pip install bithuman` puts **no `bithuman` command** on your `PATH` — the
command-line tool is the [CLI](/sdk/cli), a separate install.

## Get a model

A showcase avatar is a plain anonymous download — no account, no key:

```bash
curl -fsSLO "https://tmoobjxlwcwvxvjeppzq.supabase.co/storage/v1/object/public/web/showcase/{A23WJF0199.avatar,demo_sample.wav}"
```

`A23WJF0199.avatar` is the free Wise Pup (Expression 2); `demo_sample.wav` is
16 kHz mono, something for it to say. Your own agent's file comes from
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

That is the whole surface: **open an avatar, render audio through it.** The
audio is 16 kHz mono as a file path, an `int16` or `float32` array, raw 16-bit
little-endian bytes, or any iterable of those — a microphone stream and a file
are the same program; `frames = avatar.render(...)` then `frames.close()`
stops early. Every error `bithuman.open` and `avatar.render` raise is an `AvatarError`; the
offline route below raises `bithuman.offline.OfflineRenderError`
(`MeteringNotArmedError` when no credential is set).

To render a whole Essence 2 clip to an MP4 instead of taking live frames, use
the offline route (the `[offline]` extra):

```python
from bithuman.offline import render_offline

render_offline("agent.imx", "speech.wav", out_mp4="rendered.mp4")
```

## Run

```bash
export BITHUMAN_API_SECRET=…        # free at https://www.bithuman.ai/developer/api-keys
python hello.py
```

The download is free; **the render is metered** and refuses before the first
frame without a key — [pricing](/guides/pricing) is the authority. The first
use on a machine prepares the avatar into `~/.cache/bithuman`; an Essence 2
avatar also fetches the shared audio encoder and its 2 s streaming window
automatically, once (about 450 MB in all, kept in `~/.bithuman/deps`).

## Performance

Measured frame rates for every platform are on the
[performance page](/sdk/performance). A completed `render` reports its own
steady-state rate — frames per second from the first audio push to the last
frame, model load excluded, the same definition the CLI prints — on the
`bithuman` logger at INFO:

```python
import logging
logging.basicConfig(level=logging.INFO)
# bithuman: render <frames> frames in <seconds> s = <rate> fps steady state
#           (first audio push -> last frame; model load excluded)
```

## Troubleshooting

| You see | It means | Do this |
|---|---|---|
| `ModuleNotFoundError: No module named 'bithuman'` | not installed in the active environment | `pip install bithuman --upgrade` in the venv you run from |
| `No matching distribution found for bithuman` | no wheel for this platform — Intel Mac, Windows, musl, or a Python outside 3.10–3.14 | a supported platform, or the [cloud API](/api/overview) |
| `NotSupported` opening a `.avatar` | the Expression 2 extra is missing | `pip install "bithuman[expression-2]"` |
| the first `render` raises `NotAuthorised` | no usable key in the running shell | `export BITHUMAN_API_SECRET=…` in the shell you run `python` from |
| `InvalidAvatar` on an Essence 2 file you were given | the file is not usable as published | send the agent code to [hello@bithuman.ai](mailto:hello@bithuman.ai) for re-publishing |
| `404 NOT_FOUND` from `/v1/agent/<CODE>/model/download` | not an agent on your account, and not a public showcase | check the code under [your agents](/api/agents) or on the [showcase](/showcase) |
| `409 MODEL_NOT_GENERATED` from the download | the agent has no model of that family yet | [add the model](/api/agents#add-a-model-to-an-existing-agent), then poll `GET /v1/agent/<CODE>` until it is listed |
| frames look blue | frames are RGB; your sink wants BGR | `image[:, :, ::-1]` |
| the first `render` is slow, with a large download | the shared audio encoder and its 2 s window are being fetched, once | wait; they are cached for every later run |
| the cache fills the wrong disk | downloads land in `~/.cache/bithuman` by default | set `BITHUMAN_CACHE_DIR` to move the download cache |
| code written for a 2.x release fails | 3.0 changed the API: frames are RGB and the key comes from the environment only | port to the snippet above |
