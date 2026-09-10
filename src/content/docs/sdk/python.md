---
title: "Python SDK"
description: "On-device avatar rendering for Python — pip install bithuman. Two calls, eight names: open an avatar, render audio through it. essence-2 and expression-2 on your own machine, macOS arm64 + Linux x86_64 / aarch64."
section: sdk
group: "Platforms"
order: 20
label: "Python"
---

## Four commands

```bash
pip install "bithuman[expression-2]"

PUB=https://tmoobjxlwcwvxvjeppzq.supabase.co/storage/v1/object/public/web/showcase
curl -fsSLo wise-pup.avatar "$PUB/A23WJF0199.avatar"      # a free avatar, no account
curl -fsSLo demo_sample.wav "$PUB/demo_sample.wav"

export BITHUMAN_API_SECRET=...        # free at Developer -> API Keys
python hello.py
```

`hello.py` is four lines:

```python
# hello.py — open an avatar, render a clip through it
import bithuman

with bithuman.open("wise-pup.avatar") as avatar:      # essence or expression — one call
    for image in avatar.render("demo_sample.wav"):    # (height, width, 3) uint8, RGB
        print(image.shape)
```

That is the whole SDK: **open an avatar, render audio through it.** Run
2026-09-10 on a 24-core Linux x86_64 box, Python 3.14, clean virtualenv, against
that day's release `bithuman 3.1.0`:

```text
frames=309  shape=(720, 416, 3)  — 309 frames in 12.1 s of wall clock
```

**Wise Pup** is a free [expression-2](/concepts/expression-2) identity bitHuman
publishes for exactly this: the download needs no account, and the file is
self-contained. Download the `.avatar`, **not** the `.imx` — both are the same
identity, but the `.imx` is the CLI's two-artifact form and reads the shared
encoder out of a cache the [CLI installer](/sdk/cli) populates. This package
ships no such cache.

**The download is free; the render is metered.** With no
`BITHUMAN_API_SECRET` the same program refuses before the first frame —
`bithuman._errors.Failed: the render stopped`, 0 frames, exit 1 (re-measured
the same day). Set the key first; the free tier is enough.

The program prints a shape per frame and displays nothing — that is the minimal
loop, by design. Hand each `image` to whatever shows pictures on your machine;
`cv2.imshow("avatar", image[:, :, ::-1])` is one way, and the slice is there
because OpenCV wants BGR while these frames are RGB.

### Twenty avatars you can download with no credential

You do not need an agent of your own to hold a second-generation model. The
showcase catalogue lists **twenty** Essence 2 / Expression 2 identities whose
weights anyone may download, and the download costs their owner nothing:

```bash
curl -s https://api.bithuman.ai/v1/models/showcase        # 20 entries, HTTP 200, no credential
curl -L "https://api.bithuman.ai/v1/agent/<CODE>/model/download" -o avatar.imx
```

Re-measured 2026-09-10 with nothing in the environment: `200`, twenty rows.
The [CLI](/sdk/cli) browses and fetches the same set —
`bithuman list --manifest https://api.bithuman.ai/v1/models/showcase`, then
`bithuman pull <slug> --manifest …`.

An `essence-1` showcase avatar also still works with the identical program:
`curl -L https://models.bithuman.ai/showcase/modern-court-jester.imx -o
avatar.imx` rendered **342 frames from 13.87 s of audio in 3.44 s** on the same
box, the same day.

## Install

```bash
pip install bithuman
```

**Python 3.10–3.14.** Apple Silicon macOS (macOS 14 or newer), Linux x86_64 and
Linux aarch64 (`manylinux_2_28`, glibc). Windows and Intel Macs are not built;
pin `bithuman>=3` so the resolver says no out loud rather than handing you a 2.x
release.

Two optional extras, installed once on the machine:

```bash
pip install "bithuman[expression-2]"   # to open an expression-2 avatar
pip install "bithuman[offline]"        # the essence-2 clip-to-file route (torch, onnx, onnxruntime)
```

Open an `expression-2` avatar without the first and the refusal names that
line. The second is what 2.x spelled `bithuman[tessera]`, a deprecated alias
that installs the same three packages until 4.0.0. Install the CPU build of
`torch` first if this machine has no GPU, or the extra pulls in a CUDA stack
this route never touches.

`ffmpeg` must be on your `PATH` to read an audio *file*, or to prepare an avatar
for its first run. Pass 16 kHz mono samples instead and it is not needed.

> **`pip install bithuman` puts no command on your `PATH`.** The `bithuman`
> command-line tool is a [separate artifact](/sdk/cli). That is an invariant,
> not an accident: a pip-installed command named `bithuman` would overwrite the
> one the installer put at the same path.

Auth: export `BITHUMAN_API_SECRET`, free at [Developer → API
Keys](https://www.bithuman.ai/developer/api-keys). The key is read from the
environment and only there — there is no `api_secret=` argument any more.

**Where to get an avatar file.** Any showcase avatar is a plain anonymous
download, as above. Your own agent's file comes from
[`GET /v1/agent/{code}/model/download`](/api/agents#download-an-agents-model) or
`bithuman pull <CODE>`; an `essence-2` file arrives as `<code>.lebundle.imx`,
a [legacy name kept for
compatibility](/concepts/avatars-imx#second-generation-artifacts) in the
filename only — the model is `essence-2`.

> **3.0.0 was a clean break from 2.x.** Thirty-two public names became eight and
> fourteen error classes became four. If you are on 2.10.0 and do not want to
> move, `pip install "bithuman<3"` is a complete and permanent answer — 2.10.0
> stays on PyPI. Everything that changed is in [Coming from
> 2.10.0](#coming-from-2100).

## The surface — eight names

| you write | it means |
|---|---|
| `bithuman.open(source)` | open the avatar file on this machine; returns an `Avatar` |
| `avatar.render(audio)` | yield the frames for that audio |
| `Avatar` | what `open` gives you; a context manager |
| `AvatarError` | catch this for any refusal |
| `InvalidAvatar` | we cannot find it, or it is not a usable avatar |
| `NotSupported` | this avatar cannot run here |
| `NotAuthorised` | the key is missing, invalid, or out of credit |
| `Failed` | we could not do it — the message says why |

There is nothing else, and nothing to configure. This package runs the avatar
on this machine, so there is no choice left about where or how it runs — no
execution provider, no thread count, no delegate.

### Audio in

`audio` is 16 kHz mono, and it is either a buffer or a stream — the same call:

```python
avatar.render("demo_sample.wav")                 # an audio file (needs ffmpeg on PATH)
avatar.render(samples)                     # int16, or float32 in [-1, 1]
avatar.render(raw_bytes)                   # 16 kHz mono, signed 16-bit little-endian
avatar.render(microphone())                # any iterable of the above — a live conversation and a file are the same program
```

Nothing is rendered ahead of what you take.

### Frames out

Each frame is a `(height, width, 3)` uint8 array in **RGB** order, in order, at
the avatar's own frame rate — a property of the avatar, not something you
choose. The yielded value *is* the image; there is no wrapper with two
spellings of it.

```python
import cv2
for image in avatar.render("demo_sample.wav"):
    cv2.imshow("avatar", image[:, :, ::-1])   # OpenCV wants BGR
    cv2.waitKey(1)
```

★ **2.x yielded BGR.** If your pipeline was written against `frame.bgr_image`
and your frames now look blue, this is why — `image[:, :, ::-1]` is the whole
fix.

### Stopping early

Someone interrupting the avatar is "stop consuming and close the iterator":

```python
frames = avatar.render(speech)
for image in frames:
    if interrupted:
        frames.close()
        break
    show(image)
```

### Releasing it

`with` frees everything at the end of the block; without it, the avatar is
freed when it is garbage collected.

```python
with bithuman.open("wise-pup.avatar") as avatar:
    for image in avatar.render("demo_sample.wav"):
        show(image)
```

## The four refusals

Each one leads to a different fix, and none of them asks you to know anything
about how the engine is built:

```python
try:
    avatar = bithuman.open(source)
    for image in avatar.render(audio):
        show(image)
except bithuman.InvalidAvatar:
    ...   # fix the path or the code, or fetch the avatar again
except bithuman.NotSupported:
    ...   # use the cloud, or another machine
except bithuman.NotAuthorised:
    ...   # fix the credential
except bithuman.Failed:
    ...   # retry, then report it
```

Every one of them is an `AvatarError`, so `except bithuman.AvatarError`
catches all four. The refusal **class** is what a program branches on and the
**message** is what a person reads; the 2.x `e.code` and `e.docs_url` are
gone.

**Two refusals worth knowing before you meet them:**

- **An essence-2 avatar renders with its own recorded mouth, or not at all.**
  An avatar file whose recorded-mouth data is missing is refused at `open`
  with `InvalidAvatar`; no frame is ever delivered with a mouth that is not
  the avatar's. If an `.imx` you were handed is refused this way, the
  artifact needs re-publishing on our side — send the agent code to
  [hello@bithuman.ai](mailto:hello@bithuman.ai).
- **Rendering is metered, and a missing key refuses before the first
  frame.** Which class you get depends on the avatar: the package documents
  `NotAuthorised` for a missing, invalid or exhausted key, and on the
  published 3.0.0 wheel a showcase essence-1 avatar opened fine and then
  refused the first `render` with **`Failed: the render stopped`** — no frame
  was delivered, but the message did not name the key
  (re-measured 2026-09-10). Catch `AvatarError` around
  the first render and check the key before you read the class. To tell a
  good key from a bad one without a render — this endpoint always answers
  HTTP `200`, so read the body:

  ```bash
  curl -s -X POST https://api.bithuman.ai/v1/validate -H "api-secret: $BITHUMAN_API_SECRET"
  # {"valid":true}
  ```

- **A key the service rejects gets 300 seconds, then a refusal (3.0.4 and
  later).** The package checks your key with the service when an avatar opens
  and once a minute while frames flow. If the service **cannot be reached**,
  frames keep coming behind a `★ UNMETERED RENDER` warning on the `bithuman`
  logger, and nothing stops for that, however long it lasts. If the service
  **rejects the key** (HTTP 401, 402 or 403), frames keep coming for a grace
  of **300 seconds** from the first rejection while the key is re-checked once
  a minute, with a warning naming the seconds left and the fix; a key accepted
  again clears the clock, and a key still rejected at 300 seconds makes the
  next frame raise `NotAuthorised` (on the [offline route](#rendering-a-whole-clip-to-a-file),
  `MeteringNotArmedError`). A missing key is unchanged: refused at the first
  frame. `BITHUMAN_METER_ENFORCE=1` refuses a rejected key before the first
  frame instead. The same rule applies to every self-hosted runtime;
  [pricing](/guides/pricing) is the authority for what is billed.

## Which avatars open

| Family | `bithuman.open` | Notes |
|---|---|---|
| [essence-2](/concepts/essence-2) `.imx` | **Yes**, on both operating systems | Renders locally with the avatar's own recorded mouth; refused at `open` if that data is missing. The shared audio encoder is fetched for you — see below. |
| [expression-2](/concepts/expression-2) `.avatar` | **Yes**, with `bithuman[expression-2]` | Same two lines. Until 3.0.0 this page said expression-2 was cloud-only from Python; that is no longer true. |
| essence-1 `.imx` | **Yes** | An `.imx` that opened with 2.10.0 opens with 3.0.0 — including every showcase avatar. |
| [essence-2-max](/concepts/essence-2-max) | No | Cloud-only, by design — [talking video](/concepts/talking-video). |
| expression-1 | No | GPU-only; there is no per-identity artifact to download. |

Get an avatar file from
[`GET /v1/agent/{code}/model/download`](/api/agents#download-an-agents-model)
or `bithuman pull <CODE>`; the essence-2 file arrives as
`<code>.lebundle.imx` — a [legacy name kept for
compatibility](/concepts/avatars-imx#second-generation-artifacts) in the
filename — and the model is `essence-2`.

### The shared audio encoder is fetched for you

Every essence-2 avatar reads one shared, identity-agnostic audio encoder — a
~377 MB file that is not in the avatar and not in the wheel. Through 2.10.0
you had to ask us for it. **3.0.0 downloads it once per machine on first
use**, from a public release coordinate that needs no credential (the same
one the [CLI](/sdk/cli) 2.6.0 and later fetch from), and **verifies its
SHA-256** — `95c35c860be3f00c…`, 377,625,424 bytes — before using it. A copy
that does not match is refused rather than reused.

| Variable | Meaning | Default |
|---|---|---|
| `BITHUMAN_DEPS_DIR` | where the encoder is kept, filed under its digest | `~/.bithuman/deps` |
| `BITHUMAN_DEPS_BASE_URL` | the base it is fetched from — for an air-gapped estate that mirrors it | the public release |
| `BITHUMAN_DEPS_OFFLINE` | never fetch; refuse with a message naming the file if it is not already there | unset |
| `BITHUMAN_W2V_ONNX` | a path to a copy you already hold | unset |

Whatever a base serves is still checked against the digest, so replacing the
host can never hand a client a different file.

## Rendering a whole clip to a file

`bithuman.open` / `render` is the surface. For the essence-2 **offline render**
— a whole audio clip to an MP4 on CPU, the route the 2.9.0 and 2.10.0 releases
introduced — the module is `bithuman.offline`, with the `bithuman[offline]`
extra installed:

```python
from bithuman.offline import render_offline

stats = render_offline("A31BSK9325.lebundle.imx", "speech.wav", out_mp4="rendered.mp4")
print(stats["frames"], stats["width"], stats["height"])
```

`OfflineRenderer(imx_path).render(audio, on_frame=callback)` gives you the
frames one at a time instead of a file. `stats` carries the two billing fields
— `billing_type` and `metered_heartbeat` — which are the fields to read;
everything else it returns is engine telemetry, unversioned and free to
change. This route is fail-closed like the rest of the package: with no key it
refuses at the first frame (`MeteringNotArmedError`, an `OfflineRenderError`)
and produces no frames.

The 2.x spellings — the module `bithuman.tessera_offline`, the classes
`OfflineTesseraRenderer` / `TesseraOfflineError` and the extra
`bithuman[tessera]` — are deprecated aliases of the names above: importing the
old module still works and raises one `DeprecationWarning` naming the new
spellings, and both are removed in 4.0.0. The `BITHUMAN_TESSERA_*` environment
keys are read forever beside their `BITHUMAN_OFFLINE_*` twins.

**Throughput is a property of your identity and your box, not a number to plan
against.** `essence-1` and `expression-2` both rendered faster than real time on
the reference box above. `essence-2` on CPU is **much slower than real time and
is being re-measured**, so this page publishes no figure for it: treat
`essence-2` on a CPU as an offline render, never as a live one, and measure your
own identity on your own hardware before you plan around it.

## Environment

| | |
|---|---|
| `BITHUMAN_API_SECRET` | your key — required to render |
| `BITHUMAN_CACHE_DIR` | where a prepared avatar is kept (default `~/.cache/bithuman`) |
| `BITHUMAN_DEPS_DIR`, `BITHUMAN_DEPS_BASE_URL`, `BITHUMAN_DEPS_OFFLINE` | the shared audio encoder, above |

Neither of the first two is a configuration choice: the key is the only thing
you must set, and the cache directory only matters if the default location is
wrong for your host.

## Coming from 2.10.0

3.0.0 is a clean break. Every dropped name raises a refusal whose message says
what to write instead, so the upgrade reads as a rename rather than a broken
install.

```python
# 2.10.0
from bithuman import AsyncBithuman
avatar = await AsyncBithuman.create(model_path="a.imx", api_secret="bh-...")
await avatar.push_audio(pcm, sample_rate=16000, last_chunk=True)
async for frame in avatar.run():
    show(frame.bgr_image)
await avatar.stop()
```

```python
# 3.0.0                                    BITHUMAN_API_SECRET is in the env
import bithuman
avatar = bithuman.open("a.imx")
for image in avatar.render(pcm):
    show(image)
```

| if you see | do this |
|---|---|
| `from bithuman import AsyncBithuman` refuses: *"was removed in 3.0.0: open an avatar with `bithuman.open(avatar)` …"* (same for `Bithuman`, `AudioChunk`, `VideoFrame`, `VideoControl`) | `bithuman.open(...)` and `avatar.render(audio)` replace all of them |
| `cannot import name 'Fixture'` (or `Runtime`, `EP_AUTO`, `EP_CPU`, `EP_COREML`, `ComposedFrame`) | same — they were the layer under `render`, and there is no layer to reach for now |
| `no module named 'bithuman.api'` (or `.models`, `.exceptions`, `.config`, `.bhci`) | gone from the surface; the four refusals replace the error classes |
| `avatar.interrupt()` | stop consuming and `close()` the iterator |
| `avatar.stop()` / `cleanup()` / `shutdown()` | `with bithuman.open(p) as avatar:`, or let it be collected |
| `frame.bgr_image` | the yielded value **is** the image — and it is **RGB** |
| `except BithumanError` never fires; `e.code` / `e.docs_url` are gone | `except bithuman.AvatarError` — the class is what you branch on |
| `ModelNotFoundError`, `ModelLoadError`, `ModelSecurityError`, `ModelError` | `InvalidAvatar` |
| `TokenError`, `TokenExpiredError`, `TokenValidationError`, `TokenRequestError`, `AccountStatusError` | `NotAuthorised` |
| `RuntimeNotReadyError` | `Failed` |
| `module 'bithuman' has no attribute '__version__'` (or `__core_version__`, `__abi_version__`) | `importlib.metadata.version("bithuman")` |
| a `DeprecationWarning` importing the 2.x offline-render module | still works until 4.0.0; write `bithuman.offline`, `OfflineRenderer`, `OfflineRenderError` |
| your `requirements.txt` pins the 2.x offline extra | still installs the same three packages until 4.0.0; the extra is `bithuman[offline]` |
| your frames look blue | frames are RGB now — `image[:, :, ::-1]` if you feed OpenCV |
| you do not want to move | `pip install "bithuman<3"` — 2.10.0 is on PyPI forever |

What did **not** change: the avatar files (an `.imx` that worked with 2.10.0
works with 3.0.0), the audio contract (16 kHz mono), the frame rate and frame
order, `BITHUMAN_API_SECRET`, and that rendering is metered.

## LiveKit voice agents

For a real-time WebRTC voice agent with an avatar, use the LiveKit plugin
instead of driving the runtime yourself:

```bash
pip install livekit-plugins-bithuman pillow
```

```python
import os
from livekit.plugins import bithuman

avatar = bithuman.AvatarSession(
    avatar_id=os.environ["BITHUMAN_AGENT_ID"],
    api_secret=os.environ["BITHUMAN_API_SECRET"],
)
# attach to your AgentSession, then start it
```

`AvatarSession` takes the **agent code** and streams whatever family that
agent serves, cloud or self-hosted. See the [LiveKit page](/sdk/livekit).

> **Caution — the plugin and 3.0.0.** `livekit-plugins-bithuman` is a separate
> package built on the 2.x names. Until it publishes a release against 3.0.0,
> keep the environment it runs in pinned to `bithuman<3`; a plugin importing
> `AsyncBithuman` from a 3.0.0 wheel gets the refusal that names
> `bithuman.open`. The plugin also imports Pillow without declaring it —
> install `pillow` alongside, or `from livekit.plugins import bithuman` fails
> with `ModuleNotFoundError: No module named 'PIL'`.

## Fully on-device

For private, no-cloud operation, install the `[local]` extra on the **CLI**
package and set `BITHUMAN_LOCAL=1`. The conversation brain swaps from OpenAI
Realtime to an entirely in-process stack — no API key, no outbound network.
See [local mode](/sdk/cli/local-mode).

## System requirements

- **Python 3.10–3.14** (cp310–cp314 wheels ship for every supported platform).
- Apple Silicon macOS, or Linux x86_64 / aarch64 on glibc (`manylinux_2_28`).
  Alpine / musl is not supported — use a glibc image such as `python:*-slim`.
- `essence-1`: any modern CPU, 4 GB RAM. `essence-2` and `expression-2` render
  on CPU too, more slowly; read the throughput note above before you plan a
  product around it.

## Troubleshooting

### `ModuleNotFoundError: No module named 'bithuman'`

Not installed in the active environment — `pip install bithuman --upgrade` in
the same venv you run from.

### The first `render` refuses — `NotAuthorised`, or `Failed: the render stopped`

Confirm `BITHUMAN_API_SECRET` is set in the running shell, then check the key
against `/v1/validate` as shown above — it always returns HTTP `200`, so read
the body: `{"valid": true}` means the key is good, `{"valid": false}` means it
is missing or wrong. On the published 3.0.0 wheel a missing key surfaced as
`Failed: the render stopped` on an essence-1 avatar, a message that does not
name the key — check the key first.

### `InvalidAvatar` on an essence-2 file you were given

The file is missing its recorded-mouth data, and 3.0.0 refuses rather than
rendering a mouth that is not the avatar's. The artifact needs re-publishing
on our side: [hello@bithuman.ai](mailto:hello@bithuman.ai) with the agent code.

### `NotSupported` opening an expression-2 avatar

Install the extra: `pip install "bithuman[expression-2]"`. The message names
that line.

### `No matching distribution found for bithuman`

pip found no wheel for your platform: an Intel Mac, Windows, Alpine / musl, or
a Python outside 3.10–3.14. See the platform list above.

### Frames look blue

They are RGB; your sink wants BGR. `image[:, :, ::-1]`.

### The first `render` is slow, and there is a large download

The first use on a machine fetches the ~377 MB shared audio encoder and
prepares the avatar. Both are kept — `BITHUMAN_DEPS_DIR` and
`BITHUMAN_CACHE_DIR` — so it happens once.

## See also

- [Audio streaming](/concepts/audio-streaming) — the push/drain contract behind `render`
- [Models](/concepts/models) — the first-generation pair and the `.imx` format
- [Essence 2 & Expression 2](/concepts/models-v2) — the second-generation models and where each runs
- [Run a model on your own hardware](/guides/self-host-local) — the same route per platform, plus macOS, Android and iOS
- [LiveKit](/sdk/livekit) — WebRTC voice agents with a face
- [CLI](/sdk/cli) — the same engine, no code
