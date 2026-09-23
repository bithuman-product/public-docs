---
title: "Python SDK"
description: "A venv, pip install bithuman, one free model — open an avatar, render audio through it, take RGB frames. Expression 2 and Essence 2 on your own machine."
section: sdk
group: "Platforms"
order: 20
type: platform
label: "Python"
---

**This is the surface you program against.** If you only want to *run* an
avatar — no code — that is the [CLI](/sdk/cli), a binary you install from
[install.bithuman.ai](https://install.bithuman.ai), not from PyPI. The two
serve different purposes and neither replaces the other.

## Before you start

Six things, each one checkable before you type anything else. Check them in
order and stop at the first failure — every later step assumes the ones above
it.

| You need | Why | Check it |
|---|---|---|
| Python 3.10–3.14 | the wheel is built for those; 3.15 has none | `python3 --version` |
| Apple Silicon macOS 14+, Linux x86_64, or Linux aarch64 | no Windows, Intel Mac or musl wheel exists | `python3 -c "import platform; print(platform.system(), platform.machine())"` |
| A virtual environment | a system-wide `pip install` is refused on Debian and Ubuntu — see [Install](#install) | `python3 -m venv --help` |
| `BITHUMAN_API_SECRET` | the model download is free; rendering a frame is metered and refuses without an API secret | `test -n "$BITHUMAN_API_SECRET" && echo set` |
| About 1 GB of free disk | ~570 MB for the installed package, plus 118–190 MB per avatar | `df -h .` |
| `ffmpeg` on `PATH` | only for the MP4 route, `render_offline` | `ffmpeg -version` |

A free key is enough to render: the free tier covers self-hosted minutes, and
it is only *creating your own agent* that a free month cannot pay for —
[pricing](/guides/pricing#the-free-tier-cannot-create-an-agent) is the
authority.

## Install

Three lines, in this order:

```bash
python3 -m venv .venv
source .venv/bin/activate
pip install "bithuman[expression-2]"
```

**Do not skip the first two lines.** On a stock Debian or Ubuntu a bare
`pip install` installs nothing and stops with:

```text
error: externally-managed-environment

× This environment is externally managed
╰─> To install Python packages system-wide, try apt install python3-xyz …
```

That is [PEP 668](https://peps.python.org/pep-0668/): the system interpreter is
owned by the distribution's package manager, and a virtual environment is the
supported way past it. If `python3 -m venv .venv` itself fails with `ensurepip
is not available`, install the `python3-venv` package first (`sudo apt install
-y python3-venv` on Debian and Ubuntu) and re-run the three lines.

The install occupies about 570 MB in the venv. Every later command on this page
assumes the venv is **active** — a new terminal needs
`source .venv/bin/activate` again.

`bithuman` 2.11.6 runs on Python 3.10–3.14 on Apple Silicon macOS (14 or
newer), Linux x86_64 and Linux aarch64 — no Windows, Intel Mac or Alpine
wheels. It is what `pip install bithuman` resolves, and what a `bithuman<3` pin
resolves too; it carries the 2.x import surface (`AsyncBithuman` and the rest)
alongside the `open()` / `render()` surface below. **There is one extra**,
`[expression-2]`, which opens Expression 2 files. The Essence 2 clip-to-MP4
route (`bithuman.offline`) is on the base wheel and needs **`ffmpeg` on `PATH`**.

`pip install bithuman` puts **no `bithuman` command** on your `PATH` — the
command-line tool is the [CLI](/sdk/cli), a separate install.

**[Essence 1](/concepts/essence-1) needs no extra at all** — `bithuman.open`
takes a first-generation `.imx` straight out of `pip install bithuman`. Older
extras and module names are mapped on
[Naming & migration](/concepts/models#naming--migration).

## Quickstart: the whole thing in one block

Paste this into a fresh directory on macOS or Linux. It installs the package,
fetches a free avatar and 15 seconds of speech, and renders. Nothing else has
to be set up first, and the only line you edit is the `BITHUMAN_API_SECRET`
export in step 2.

```bash
# 1 — an isolated environment (a system-wide install is refused on Debian/Ubuntu)
python3 -m venv .venv
source .venv/bin/activate
pip install "bithuman[expression-2]"

# 2 — a credential: free at https://www.bithuman.ai/developer/api-keys
export BITHUMAN_API_SECRET=…

# 3 — a free showcase avatar (189 MB, no account needed) and something to say
curl -fL -o wise-pup.imx "https://api.bithuman.ai/v1/agent/A23WJF0199/model/download?model=expression-2"
curl -fsSLo demo_sample.wav https://docs.bithuman.ai/samples/speech.wav

# 4 — render it
cat > hello.py <<'PY'
import bithuman

frames, shape = 0, None
with bithuman.open("wise-pup.imx") as avatar:
    # each image is (height, width, 3) uint8, RGB, at the avatar's own rate
    for image in avatar.render("demo_sample.wav"):
        frames, shape = frames + 1, image.shape
print(f"{frames} frames of {shape}")
PY
python hello.py
```

`A23WJF0199` is **Wise Pup**, a free [Expression 2](/concepts/expression-2)
showcase avatar; `demo_sample.wav` is 24 kHz mono, 15.0 seconds. Expression 2
plays at 20 frames per second, so the frame count tracks the length of the
audio you hand it.

Step 2 is not optional. Left unedited, the `…` placeholder is a value the
service rejects, so the run stops at `bithuman.open` with *"that key was not
accepted (401)"*; with none set at all it gets one step further and raises
`NotAuthorised` at the **first frame** — see
[Authentication](#authentication) for both refusals and their
exact text.

## Minimal code

```python
# hello.py — needs wise-pup.imx and demo_sample.wav in the working directory,
# and BITHUMAN_API_SECRET in the environment. See the quickstart above.
import bithuman

# an Essence 2 .imx or an Expression 2 .avatar — one call
with bithuman.open("wise-pup.imx") as avatar:
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

To see a frame rather than its shape, write one out with the OpenCV that is
already installed as a dependency of the wheel — note the channel flip, because
the frame is RGB and `imwrite` expects BGR:

```python
# inside the loop above: `image` is the frame you were just handed
import cv2
cv2.imwrite("first_frame.png", image[:, :, ::-1])
```

The call is lazy: `frames = avatar.render(...)` then `frames.close()` stops
early. Every error `bithuman.open` and `avatar.render` raise is an `AvatarError`; the
offline route below raises `bithuman.offline.OfflineRenderError`
(`MeteringNotArmedError` when no credential is set).

Every public name in the package, with the signature it actually has and the
exception it actually raises, is listed on the
[Python API reference](/sdk/python-api) — generated from the wheel a developer
installs, not from our source.

To render a whole Essence 2 clip to an MP4 instead of taking live frames, use
the offline route — on the base wheel, no extra. It needs `ffmpeg` on `PATH`
and a credential:

```python
# needs executive-coach.imx and demo_sample.wav — see "Get a model" below
from bithuman.offline import render_offline

render_offline("executive-coach.imx", "demo_sample.wav", out_mp4="rendered.mp4")
```

**A refused offline render still leaves a file at `out_mp4`.** With no
credential the call raises `MeteringNotArmedError` and leaves a small MP4 that
carries the audio and **no video stream**. Branch on the exception, or count the
video frames — never on the file existing:

```bash
ffprobe -v error -count_frames -select_streams v:0 \
  -show_entries stream=nb_read_frames -of csv=p=0 rendered.mp4
# a real render prints a frame count; the refused stub prints nothing
```

## Get a model

A showcase avatar is a plain anonymous download — no account, no API secret. **Check
the size before you start it**: an [Expression 2](/concepts/expression-2)
avatar is 188–190 MB, an [Essence 2](/concepts/essence-2) avatar 118–148 MB
(the sizes `bithuman list` prints; the [CLI page](/examples#ready-made-avatars)
carries the catalogue).

```bash
# Expression 2 — Wise Pup, 189 MB
curl -fL -o wise-pup.imx "https://api.bithuman.ai/v1/agent/A23WJF0199/model/download?model=expression-2"

# Essence 2 — Executive Coach for Clear Decisions, 118 MB
curl -fL -o executive-coach.imx "https://api.bithuman.ai/v1/agent/A80HVD8577/model/download?model=essence-2"

# 15 s of 24 kHz mono speech, 720 KB
curl -fsSLo demo_sample.wav https://docs.bithuman.ai/samples/speech.wav
```

The same URL serves your own agent — add `-H "api-secret: $BITHUMAN_API_SECRET"`
and your agent code — so there is one route, not two.

To pick a model without installing anything, read the catalogue the CLI reads.
It is a public endpoint, needs no credential, and every row carries the exact
`url` to download:

```bash
curl -fsS https://api.bithuman.ai/v1/models/showcase \
  | jq -r '.models[] | "\(.slug)\t\(.agent_code)\t\(.model)\t\(.size)"'

# …or resolve one slug straight to a file
URL=$(curl -fsS https://api.bithuman.ai/v1/models/showcase | jq -r '.models[] | select(.slug=="wise-pup") | .url')
curl -fL -o wise-pup.imx "$URL"
```

An Essence 2 agent arrives as an `.imx`, an Expression 2 agent as an `.imx` or
an `.avatar` (the same container under two names), and `bithuman.open` takes any
of them — as it does a first-generation `essence-1` `.imx`.
`python -m bithuman <CODE> <audio>` fetches by code into `~/.cache/bithuman/downloads`
and fetches again when the published file has changed.

## Authentication

Set `BITHUMAN_API_SECRET` in the shell you run Python from — an API secret is free at
[your API secrets](https://www.bithuman.ai/developer/api-keys). `BITHUMAN_CACHE_DIR`
moves the download cache off `~/.cache/bithuman`.

The two credential failures happen at different moments, which is how you tell
them apart:

| The key | `bithuman.open()` | The first `render()` frame |
|---|---|---|
| not set at all | succeeds | raises `NotAuthorised`: *"no credential was supplied, so this render cannot be attributed to an account. Set BITHUMAN_API_SECRET…"* |
| set but rejected | raises `NotAuthorised`: *"that key was not accepted (401) — the API secret was rejected — revoked, or from another environment."* | never reached |

So a process with no API secret still opens the file and does real work before it
refuses: the credential is *checked* at the first frame, not at load.

## Billing follows the talking, not the clock

**You are billed for minutes of active talking; idle time is free.** A runtime
that is loaded but not speaking — between utterances, or cached for reuse —
costs nothing, so opening one runtime and keeping it is the efficient shape.
The rule and the rates are on [pricing](/guides/pricing).

### Ending a session: three calls, and only one of them frees the model

`AsyncBithuman` offers three teardown calls and they are **not**
interchangeable:

| Call | What it does | What it does not do |
|---|---|---|
| `await avatar.stop()` | stops the frame producer, and only that; idempotent, and the runtime can be driven again afterwards | does not free the model, and does not release the credential — its own docstring says *"Does NOT release auth"* |
| `await avatar.shutdown()` | `stop()`, then frees the model and its memory, then releases the credential | see the Essence 2 note below |
| `avatar.cleanup()` | the synchronous form, which the LiveKit plugin calls from `AvatarSession.aclose()` | does not stop the frame producer — reach for `shutdown()` unless you are already outside the event loop |

**`shutdown()` is the one to put in a `finally`.** There is no `close()`,
`aclose()` or `async with` on `AsyncBithuman`.

> **An [Essence 2](/concepts/essence-2) runtime leaves one background
> heartbeat thread running after `shutdown()`**, until the process exits. It
> costs nothing — it reports no talking — and it does not hold the model in
> memory. A long-lived service should open a runtime once and keep it.

## Run

```bash
source .venv/bin/activate           # every new terminal
export BITHUMAN_API_SECRET=…        # free at https://www.bithuman.ai/developer/api-keys
python hello.py
```

The download is free; **the render is metered** and refuses before the first
frame without an API secret — [pricing](/guides/pricing) is the authority. An Essence 2
avatar fetches the shared audio encoder automatically, once, into
`~/.bithuman/deps` — about 377 MB. `bithuman.open(...).render(...)` fetches the
2 s streaming window alongside it (about 450 MB in all); `render_offline(...)`
does not, because the batch route runs the encoder once over the whole clip.
Plan for that download on the first Essence 2 run, and for none on the ones
after it.

## Performance

Measured frame rates for every platform, this package included, are on the
[performance page](/performance). A completed `render` logs its own
steady-state rate on the `bithuman` logger at INFO:

```python
import logging
logging.basicConfig(level=logging.INFO)
# bithuman: render <frames> frames in <seconds> s = <rate> fps steady state
```

## Troubleshooting

| You see | It means | Do this |
|---|---|---|
| `error: externally-managed-environment` from `pip install` | the distribution owns the system interpreter ([PEP 668](https://peps.python.org/pep-0668/)); pip installed nothing | create a venv first — the three lines under [Install](#install) |
| `ensurepip is not available` from `python3 -m venv` | the venv module is packaged separately | `sudo apt install -y python3-venv` (Debian, Ubuntu), then re-run |
| `ModuleNotFoundError: No module named 'bithuman'` | not installed in the active environment, or the venv is not activated in this terminal | `source .venv/bin/activate`, then `pip install "bithuman[expression-2]"` |
| `bithuman 2.11.6 has NO WHEEL for this platform.` from `pip install` | no wheel for this platform — Intel Mac, Windows, musl, or a Python outside 3.10–3.14; pip installed nothing | a supported platform (Windows: WSL2), or the [cloud API](/api) |
| `NotSupported` opening a `.avatar` | the Expression 2 extra is missing | `pip install "bithuman[expression-2]"` |
| the first `render` raises `NotAuthorised`, *"no credential was supplied"* | no key in the running shell | `export BITHUMAN_API_SECRET=…` in the shell you run `python` from |
| `bithuman.open` raises `NotAuthorised`, *"that key was not accepted (401)"* | there is an API secret and the service rejected it — revoked, or from another environment | mint a fresh one at [your API secrets](https://www.bithuman.ai/developer/api-keys) |
| `MeteringNotArmedError` from `render_offline` | same missing credential, on the offline route | `export BITHUMAN_API_SECRET=…`, or pass `api_secret=` |
| the MP4 exists but has no picture | a refused render still writes the audio-only stub described above | set the credential, delete the stub, render again — and gate on the frame count, not the file |
| `InvalidAvatar` on an Essence 2 file you were given | the file is not usable as published | send the agent code to [hello@bithuman.ai](mailto:hello@bithuman.ai) for re-publishing |
| `404 NOT_FOUND` from `/v1/agent/<CODE>/model/download` | not an agent on your account, and not a public showcase | check the code under [your agents](/api/agents) or in the [catalogue](/examples#ready-made-avatars) |
| `409 MODEL_NOT_GENERATED` from the download | the agent has no model of that family yet | [add the model](/api/agents#add-a-model-to-an-existing-agent), then poll `GET /v1/agent/<CODE>` until it is listed |
| frames look blue | frames are RGB; your sink wants BGR | `image[:, :, ::-1]` |
| the first `render` is slow, with a large download | the shared audio encoder and its 2 s window are being fetched, once | wait; they are cached for every later run |
| the cache fills the wrong disk | downloads land in `~/.cache/bithuman` by default | set `BITHUMAN_CACHE_DIR` to move the download cache |
| code written for a 2.x release behaves differently | `open()` / `render()` frames are RGB and the API secret comes from the environment; `AsyncBithuman` keeps its 2.x contract | port to the snippet above, or keep `AsyncBithuman` |

## Examples and source

- [`python/quickstart`](https://github.com/bithuman-product/bithuman-examples/tree/main/python/quickstart) — the smallest scripted path:
  an API secret, a model, a first render.
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
- [Performance](/performance) — measured frame rates for every platform
- [SDK](/sdk) — every platform on one page
