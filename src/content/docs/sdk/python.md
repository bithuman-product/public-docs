---
title: "Python SDK"
description: "On-device avatar runtime for Python — pip install bithuman. Backends, AI agents, batch render jobs, edge boxes. macOS arm64 + Linux x86_64 / aarch64."
section: sdk
group: "Languages"
order: 10
---

## Overview

`bithuman` is the Python SDK and the most popular surface for backend services,
AI agents, batch render jobs, and edge boxes. Audio in (16-bit PCM), numpy BGR
frames out at 25 FPS. The runtime and all native dependencies ship in the wheel
— no compile step. This SDK is **GA**.

## Install

```bash
pip install bithuman
```

**Python 3.10–3.14** supported; the latest release on
[PyPI](https://pypi.org/project/bithuman/) is **2.3.4**. Platforms: macOS arm64, Linux x86_64, Linux
aarch64. (Windows wheels were last published with 1.9.0 and are not yet back in
the 2.x matrix — use WSL2, or fall back to the [CLI](/cli) on a different host.)

> **macOS note** The 2.3.4 macOS wheels are tagged for **macOS 26+ (arm64)**.
> On older macOS versions `pip install bithuman` fails with
> `No matching distribution found` — upgrade to macOS 26+, or build from source
> / contact [hello@bithuman.ai](mailto:hello@bithuman.ai).

> **Note** `pip install bithuman` is the **library** — `from bithuman import
> AsyncBithuman` — and ships cross-platform wheels (macOS arm64 + Linux
> x86_64/aarch64). For the command-line tool, install the sibling
> [`bithuman-cli`](https://pypi.org/project/bithuman-cli/) — via Homebrew or the
> [universal installer](/cli/install) on macOS/Linux; `pip install bithuman-cli`
> is **macOS Apple Silicon only**. Both share the same `libessence` engine.

> **Linux CA certificates — fixed in 2.3.4.** The SDK auto-discovers your
> distro's CA bundle on Linux (Debian, Ubuntu, RHEL, SUSE, Alpine-glibc layouts
> — including `python:*-slim` Docker images); no configuration needed. If you
> must stay on **≤ 2.3.3**, where authenticated calls fail on Debian/Ubuntu with
> `RuntimeError: auth_authenticate: curl_easy_perform: Problem with the SSL CA cert`:
> either upgrade (recommended) or create the symlink:
>
> ```bash
> sudo mkdir -p /etc/pki/tls/certs && \
>   sudo ln -s /etc/ssl/certs/ca-certificates.crt /etc/pki/tls/certs/ca-bundle.crt
> ```
>
> (In a Dockerfile, drop the `sudo`.) Note that the `CURL_CA_BUNDLE` /
> `SSL_CERT_FILE` env vars **override auto-discovery when set** — a stale or
> wrong value will break auth even on 2.3.4; unset them unless you point them at
> a valid bundle.

> **Note** The SDK returns frames as numpy BGR arrays and needs **no** OpenCV
> itself. Only example scripts that *display* a window need `opencv-python` — it
> is in each example's `requirements.txt`.

Auth: export `BITHUMAN_API_SECRET`. Get a secret at [Developer → API
Keys](https://www.bithuman.ai/#developer). See [authentication](/api/quickstart)
for details.

## 2.3 — slim wheel, CLI moved out

Through 2.2, `pip install bithuman` bundled both the Python SDK and a `bithuman`
CLI console-script. As of **2.3.0** the wheel is **library-only** (~5 MB) — the
CLI moved to the sibling [`bithuman-cli`](https://pypi.org/project/bithuman-cli/)
wheel. The runtime API (`AsyncBithuman`, `Bithuman`, `AudioChunk`, `VideoFrame`,
…) is unchanged; code pinned to `bithuman==1.11.3` or any `2.x` runs on 2.3
without edits.

Also removed from the slim wheel: the leaf modules `bithuman.audio`
(`load_audio`, `float32_to_int16`) and `bithuman.utils` (`FPSController`). They
were tiny shims around `soundfile` / `time.monotonic`; applications inline them
now (~15–30 LOC).

## The streaming loop

`AsyncBithuman` is the runtime — one instance per avatar session. Create it,
push audio, drain frames:

```python
import asyncio, os
from bithuman import AsyncBithuman

async def main():
    rt = await AsyncBithuman.create(
        model_path="avatar.imx",
        api_secret=os.environ["BITHUMAN_API_SECRET"],
    )
    print(rt.frame_width, "x", rt.frame_height)
    await rt.stop()

asyncio.run(main())
```

The full `push_audio` / `flush` / `run` loop — including loading a WAV into
int16 PCM without the removed audio helpers — is documented once, canonically,
in [audio streaming](/concepts/audio-streaming). Read that page for the
copy-pasteable end-to-end example; everything below assumes you have it.

| Concept | What it is |
|---|---|
| `AsyncBithuman` | The runtime. One per session. Keep it alive between turns in production. |
| `push_audio(bytes, sr, last_chunk)` | Feed 16-bit PCM; the avatar lip-syncs live. |
| `flush()` | Mark end of audio input. |
| `run()` | Async generator yielding frames at 25 FPS. |
| `interrupt()` | Cancel current playback (barge-in). **Synchronous** — call it directly; `await rt.interrupt()` raises `TypeError`. |
| `frame` | `.bgr_image`, `.audio_chunk`, `.has_image`, `.end_of_speech`, `.frame_index`. |

`push_audio` and `run()` are independent — push as audio arrives (mic, TTS,
WebRTC), drain frames on your render tick.

`Bithuman` (no `Async`) is the sync class, but it is **not** the same surface with
`await` dropped. It does **not** expose `push_audio` / `run` / `flush`. The sync
surface is just two calls: `load()` to load the model, and `compose()` — an
**iterator** that yields frames for an audio input. Use it for batch scripts and
notebooks; use `AsyncBithuman` for the incremental push/drain streaming loop.
`Avatar` / `AsyncAvatar` remain as **soft-deprecated identity aliases** for
pre-2.0 code (`Avatar is Bithuman` evaluates `True`); new code should use the
`Bithuman` names.

## Public API at a glance

Top-level imports are the surface you build against:

```python
from bithuman import (
    AsyncBithuman, Bithuman,              # runtime (async / sync)
    AudioChunk, VideoFrame, VideoControl, # I/O types
    Emotion, EmotionPrediction,           # emotion analysis
    # exceptions
    BithumanError,
    ModelError, ModelLoadError, ModelNotFoundError, ModelSecurityError,
    RuntimeNotReadyError,
    TokenError, TokenExpiredError, TokenValidationError, TokenRequestError,
    AccountStatusError,
    # version metadata
    __version__, __core_version__, __abi_version__,
)
```

Controls let you drive idle behavior and actions out of band:

```python
await rt.push(VideoControl(action="wave"))
await rt.push(VideoControl(target_video="idle"))
```

## Low-level API (advanced)

For multi-tenant servers that share one set of model weights across many
concurrent sessions, the wheel exposes the engine primitives directly:

```python
from bithuman import Fixture, Runtime, EP_AUTO, EP_CPU, EP_COREML

fixture = Fixture("avatar.imx", preferred_ep=EP_AUTO)  # weights, load once
runtime = Runtime(fixture)                             # cheap per session
```

`EP_AUTO` / `EP_CPU` / `EP_COREML` / `EP_NNAPI` / `EP_QNN` select the ONNX
Runtime execution provider. Most users should stick to `AsyncBithuman` /
`Bithuman`, which wrap these for you.

## Native acceleration

The wheel ships a native extension `bithuman/_core.cpython-3X-<platform>.so` — a
pybind11 binding to the shared `libessence` engine that also powers the Swift,
Kotlin, and Rust SDKs. You never import `_core` directly; it loads automatically
behind `AsyncBithuman`. `bithuman.__core_version__` reports the engine version;
`bithuman.__abi_version__` reports the C ABI.

## LiveKit voice agents

For a real-time WebRTC voice agent with an avatar, use the LiveKit plugin
instead of driving the runtime yourself:

```bash
pip install livekit-plugins-bithuman pillow
```

> **Note** The plugin currently imports Pillow but doesn't declare it as a
> dependency — install `pillow` alongside it (as above), or
> `from livekit.plugins import bithuman` fails with
> `ModuleNotFoundError: No module named 'PIL'`. An upstream fix is pending with
> LiveKit.

> **Note** There is no `bithuman[agent]` extra and no
> `bithuman.utils.agent.LocalAvatarRunner` in the slim wheel — install the LiveKit
> plugin as its own package above. The only extra the slim `bithuman` wheel
> declares is `test`.

```python
import os
from livekit.plugins import bithuman

avatar = bithuman.AvatarSession(
    avatar_id=os.environ["BITHUMAN_AGENT_ID"],
    api_secret=os.environ["BITHUMAN_API_SECRET"],
)
# attach to your AgentSession, then start it
```

`AvatarSession` is the single integration point — the same call works cloud or
self-hosted. See the [LiveKit page](/sdk/livekit) for the full deploy path.

## Fully on-device

For private, no-cloud operation, install the `[local]` extra on the **CLI**
package and set `BITHUMAN_LOCAL=1`. The conversation brain swaps from OpenAI
Realtime to an entirely in-process stack (whisper.cpp + llama.cpp + Supertonic +
Silero) — no API key, no outbound network. See [local mode](/cli/local-mode).

## System requirements

- **Python 3.10–3.14** (cp310–cp314 wheels ship for every supported platform).
- **Essence**: any modern CPU, 4 GB RAM. macOS arm64 / Linux x86_64 / Linux aarch64.

## Troubleshooting

### `ModuleNotFoundError: No module named 'bithuman'`

Not installed in the active environment — `pip install bithuman --upgrade` in
the same venv you run from.

### Authentication failed

Confirm `BITHUMAN_API_SECRET` is set in the running shell, then check the key:

```bash
curl -X POST https://api.bithuman.ai/v1/validate -H "api-secret: $BITHUMAN_API_SECRET"
```

`/v1/validate` always returns HTTP `200` — read the body: `{"valid": true}` means
the key is good, `{"valid": false}` means it's missing or wrong (it does **not**
return `401`).

### `Problem with the SSL CA cert` on Linux (Debian/Ubuntu)

**Fixed in 2.3.4** — the SDK auto-discovers your distro's CA bundle on Linux;
no configuration needed. `pip install --upgrade bithuman`.

On **≤ 2.3.3**, `AsyncBithuman.create()` raises
`RuntimeError: auth_authenticate: curl_easy_perform: Problem with the SSL CA cert (path? access rights?)`
on Debian, Ubuntu, and derived images (including `python:*-slim`) because the
wheel's bundled libcurl only reads the RHEL CA path
`/etc/pki/tls/certs/ca-bundle.crt`. Either upgrade (recommended) or symlink the
Debian bundle into place once:

```bash
sudo mkdir -p /etc/pki/tls/certs && \
  sudo ln -s /etc/ssl/certs/ca-certificates.crt /etc/pki/tls/certs/ca-bundle.crt
```

Still failing **on 2.3.4**? Check for stale `CURL_CA_BUNDLE` / `SSL_CERT_FILE`
env vars — when set, they **override** auto-discovery, and a wrong value breaks
auth even on 2.3.4.

### `No matching distribution found for bithuman`

pip found no wheel for your platform. The common causes:

- **macOS older than 26** — the 2.3.4 macOS wheels are tagged for **macOS 26+
  (arm64)**. Upgrade to macOS 26+, or build from source / contact
  [hello@bithuman.ai](mailto:hello@bithuman.ai).
- **Alpine / musl Linux** — not supported. The Linux wheels are
  `manylinux_2_28` (glibc) for x86_64 / aarch64; use a glibc-based image
  (e.g. `python:*-slim`) instead.
- **Python outside 3.10–3.14**, or 32-bit / Windows interpreters (see the
  platform list above).

### Avatar shows but no lip movement

Push **int16 PCM bytes** (clip float32 to ±1 and scale by 32767), call `flush()`
after all audio, and pass the same sample rate you decoded with.

### `ImportError: No module named 'bithuman.audio' / 'bithuman.utils'`

Removed in 2.3.0. Inline `load_audio` / `float32_to_int16` / `FPSController` in
your app — see [audio streaming](/concepts/audio-streaming) for the drop-in.

### `objc: Class AVFFrameReceiver is implemented in both …/cv2/… and …/av/…`

Both OpenCV and PyAV ship their own FFmpeg dylibs. Harmless if you depend on the
headless variant; otherwise fix the variant explicitly:

```bash
pip uninstall -y opencv-python && pip install opencv-python-headless
```

### Slow first startup (30–60 s)

First `.imx` load warms the runtime / upgrades the file format. Keep the runtime
alive between sessions in production.

## See also

- [Audio streaming](/concepts/audio-streaming) — the canonical push/drain loop
- [Models](/concepts/models) — Essence models and the `.imx` format
- [LiveKit](/sdk/livekit) — WebRTC voice agents with a face
- [CLI](/cli) — no-code render and live chat, same engine
