---
title: "Python SDK"
description: "pip install bithuman — open an avatar, render audio through it, take RGB frames. Expression 2 and Essence 2 on your own machine."
section: sdk
group: "Platforms"
order: 20
label: "Python"
---

**This is the surface you program against.** If you only want to *run* an
avatar — no code — that is the [CLI](/sdk/cli), a binary you install from
[install.bithuman.ai](https://install.bithuman.ai), not from PyPI. The two
serve different purposes and neither replaces the other.

## Install

```bash
pip install "bithuman[expression-2]"
```

`bithuman` 2.11.5 runs on Python 3.10–3.14 on Apple Silicon macOS (14 or
newer), Linux x86_64 and Linux aarch64 — no Windows, Intel Mac or Alpine
wheels. It is what an unconstrained `pip install bithuman` resolves, and what
a `bithuman<3` pin resolves too: the 3.x line (3.0.0–3.1.10) was withdrawn
from PyPI on 2026-09-16, and 2.11.5 carries the same engine with the 2.x
import surface (`AsyncBithuman` and the rest) alongside the `open()` /
`render()` surface below. The `[expression-2]` extra opens `.avatar` files. The Essence 2
clip-to-file route (`bithuman.offline`) needs **no extra** since 2.11.5 — it
runs the same engine the streaming route runs, so `torch` and `onnxruntime`
are no longer pulled in for it (`bithuman[offline]` still resolves, for an
install that pins it). Writing the MP4 needs **`ffmpeg` on `PATH`**.

`pip install bithuman` puts **no `bithuman` command** on your `PATH` — the
command-line tool is the [CLI](/sdk/cli), a separate install.

**[essence-1](/concepts/essence-1) needs no extra at all.** It is the base
wheel's own path — `bithuman.open` takes a first-generation `.imx`
straight out of `pip install bithuman`, which is why the CLI and the
[Swift](/sdk/ios) page send you here for it. One newer engine is behind an
extra: `.avatar` files need `[expression-2]`. The Essence 2 clip-to-file route
(`bithuman.offline`) is on the base wheel — see above.

## Authentication and configuration

Set `BITHUMAN_API_SECRET` in the shell you run Python from — a key is free at
[your API keys](https://www.bithuman.ai/developer/api-keys). `bithuman.open()` succeeds without one; metering bites
at the **first frame**, so a process with no key opens the avatar and then
raises `NotAuthorised` as soon as you pull from `render()`. `BITHUMAN_CACHE_DIR`
moves the download cache off `~/.cache/bithuman`.

## Get a model

A free-gallery avatar is a plain anonymous download — no account, no key:

```bash
curl -fL -o A23WJF0199.imx "https://api.bithuman.ai/v1/agent/A23WJF0199/model/download?model=expression-2"
curl -fsSLO "https://tmoobjxlwcwvxvjeppzq.supabase.co/storage/v1/object/public/web/showcase/demo_sample.wav"
```

`A23WJF0199` is the free **Wise Pup** ([Expression 2](/concepts/expression-2));
`demo_sample.wav` is 24 kHz mono, 15 s, something for it to say. The same URL
serves your own agent — add `-H "api-secret: $BITHUMAN_API_SECRET"` and your
code — so there is one route, not two. `bithuman list` shows every identity the
door serves without a credential, and `bithuman pull <SLUG>` is the same fetch
from the CLI. An Essence 2 agent arrives as an `.imx`, an Expression 2 agent as
an `.imx` or `.avatar` (the same container under two names), and `bithuman.open`
takes any of them — as it does a first-generation `essence-1` `.imx`.
`python -m bithuman <CODE> <audio>` fetches by code into `~/.cache/bithuman/downloads`
and, from 2.11.6, fetches the file again when the published one changed since it was cached
(a length comparison; when it cannot be asked, the cached file is used).

## Minimal code

```python
# hello.py
import bithuman

# an Essence 2 .imx or an Expression 2 .avatar — one call
with bithuman.open("A23WJF0199.imx") as avatar:
    # (height, width, 3) uint8, RGB, at the avatar's own frame rate
    for image in avatar.render("demo_sample.wav"):
        # hand it to your display — OpenCV wants image[:, :, ::-1]
        print(image.shape)
```

That is the whole surface: **open an avatar, render audio through it.** The
audio is a file path in any format ffmpeg reads — the rate is converted for you
— or, already decoded, **16 kHz mono** as an `int16` or `float32` array, raw
16-bit little-endian bytes, or any iterable of those; a microphone stream and a
file are the same program.

> **The 16 kHz applies only to the decoded forms.** `demo_sample.wav` above is
> 24 kHz, so handing its raw bytes straight to `render` plays back about 1.5x
> long and slowed — pass it as a **path** and let it be converted, or resample
> it yourself before you pass samples.

The call is lazy: `frames = avatar.render(...)` then `frames.close()` stops
early. Every error `bithuman.open` and `avatar.render` raise is an `AvatarError`; the
offline route below raises `bithuman.offline.OfflineRenderError`
(`MeteringNotArmedError` when no credential is set).

Every public name in the package, with the signature it actually has and the
exception it actually raises, is listed on the
[Python API reference](/sdk/python-api) — generated from the wheel a developer
installs, not from our source.

To render a whole Essence 2 clip to an MP4 instead of taking live frames, use
the offline route — on the base wheel, no extra:

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
frame without a key — [pricing](/guides/pricing) is the authority. An Essence 2
avatar fetches the shared audio encoder automatically, once, into
`~/.bithuman/deps` — about 377 MB. `bithuman.open(...).render(...)` fetches the
2 s streaming window alongside it (about 450 MB in all); `render_offline(...)`
does not, because the batch route runs the encoder once over the whole clip.

## Performance

Measured frame rates for every platform are on the
[performance page](/sdk/performance). **On Apple Silicon that page's Expression 2
number is the [CLI](/sdk/cli)'s, and this package does not reach it.** The CLI
renders Expression 2 through Core ML; this package runs the portable CPU runtime
on every platform it ships for, so the same avatar renders more slowly here on a
Mac. On Linux the CLI runs that same CPU runtime, so there the two match.

A completed `render` reports its own
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
| `bithuman 2.11.5 has NO WHEEL for this platform.` from `pip install` | no wheel for this platform — Intel Mac, Windows, musl, or a Python outside 3.10–3.14. pip installed nothing: the release's source distribution exists only to print this (since 2026-09-20; before that, pip could quietly resolve a 1.x wheel) | a supported platform (Windows: WSL2), or the [cloud API](/api/overview) |
| `NotSupported` opening a `.avatar` | the Expression 2 extra is missing | `pip install "bithuman[expression-2]"` |
| the first `render` raises `NotAuthorised` | no usable key in the running shell | `export BITHUMAN_API_SECRET=…` in the shell you run `python` from |
| `InvalidAvatar` on an Essence 2 file you were given | the file is not usable as published | send the agent code to [hello@bithuman.ai](mailto:hello@bithuman.ai) for re-publishing |
| `404 NOT_FOUND` from `/v1/agent/<CODE>/model/download` | not an agent on your account, and not a public showcase | check the code under [your agents](/api/agents) or on the [showcase](/showcase) |
| `409 MODEL_NOT_GENERATED` from the download | the agent has no model of that family yet | [add the model](/api/agents#add-a-model-to-an-existing-agent), then poll `GET /v1/agent/<CODE>` until it is listed |
| frames look blue | frames are RGB; your sink wants BGR | `image[:, :, ::-1]` |
| the first `render` is slow, with a large download | the shared audio encoder and its 2 s window are being fetched, once | wait; they are cached for every later run |
| the cache fills the wrong disk | downloads land in `~/.cache/bithuman` by default | set `BITHUMAN_CACHE_DIR` to move the download cache |
| code written for a 2.x release behaves differently | `open()` / `render()` frames are RGB and the key comes from the environment; `AsyncBithuman` keeps its 2.x contract | port to the snippet above, or keep `AsyncBithuman` |

## Examples and source

- [`python/quickstart`](https://github.com/bithuman-product/bithuman-examples/tree/main/python/quickstart) — the smallest scripted path:
  a key, a model, a first render.
- [`python/local-essence`](https://github.com/bithuman-product/bithuman-examples/tree/main/python/local-essence) — Essence on your own CPU
  box, with a microphone script, a conversation script and a web UI.
- [`python/cloud-essence`](https://github.com/bithuman-product/bithuman-examples/tree/main/python/cloud-essence) — Essence on bitHuman
  cloud over LiveKit; the production shape.
- [Examples](/examples) — every runnable project. The wheel itself is on
  [PyPI](https://pypi.org/project/bithuman/), and its public surface — read back
  out of the installed bytes — is the
  [Python API reference](/sdk/python-api).

## See also

- [Python API reference](/sdk/python-api) — every public name in the installed
  package, its signature, and what it raises
- [LiveKit](/sdk/livekit) — running this library inside an agent worker, and
  the interpreter range that path needs
- [CLI](/sdk/cli) — the same engines as a binary
- [Performance](/sdk/performance) — measured frame rates for every platform
- [SDK](/sdk) — every platform on one page
