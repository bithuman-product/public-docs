---
title: "Audio streaming"
description: "The push/drain pattern every bitHuman SDK shares — push 16-bit PCM in, drain lip-synced 25 FPS frames out — with the canonical minimal Python loop and the audio/frame formats."
section: concepts
group: "Core"
order: 3
---

## The push/drain pattern

Every SDK and the runtime use the same shape — audio in, video out:

1. **Push** 16-bit PCM audio chunks as they arrive (mic, TTS, WebRTC).
2. **Drain** lip-synced video frames at 25 FPS.

That's the entire surface area. The same two calls drive both [Essence and Expression](/concepts/models) — including the [second-generation `essence-2` and `expression-2`](/concepts/models-v2) — across Python, Swift, and the CLI.

<div class="bh-flow"><span class="bh-node">push audio</span><span class="bh-sep">→</span><span class="bh-node">engine ticks</span><span class="bh-sep">→</span><span class="bh-node">pull frame</span><span class="bh-sep">→</span><span class="bh-node">render</span></div>

You feed PCM in as fast as it arrives and drain visual frames out on a fixed 25 FPS clock — the engine buffers between the two so your audio source and your render loop never have to stay in lockstep.

## The minimal Python loop

This is the canonical, copy-pasteable loop. Other pages link here rather than repeating it.

```python
import asyncio, os
import numpy as np
import soundfile as sf
from bithuman import AsyncBithuman

# bithuman 2.3 is library-only — the old bithuman.audio helpers were
# removed. Inline what we need: load a WAV, downmix to mono, convert
# float32 → int16 PCM. (The SDK resamples to 16 kHz internally, so the
# loader can hand back any sample rate.)
def load_audio(path: str) -> tuple[np.ndarray, int]:
    audio, sr = sf.read(path, dtype="float32", always_2d=False)
    if audio.ndim > 1:
        audio = audio.mean(axis=1)
    return audio, sr

def float32_to_int16(arr: np.ndarray) -> np.ndarray:
    return (np.clip(arr, -1.0, 1.0) * 32767.0).astype(np.int16)

async def main():
    rt = await AsyncBithuman.create(
        model_path="avatar.imx",
        api_secret=os.environ["BITHUMAN_API_SECRET"],
    )

    pcm, sr = load_audio("speech.wav")
    pcm = float32_to_int16(pcm)
    chunk = sr // 100                       # 10 ms chunks
    for i in range(0, len(pcm), chunk):
        await rt.push_audio(pcm[i:i + chunk].tobytes(), sr, last_chunk=False)
    await rt.flush()

    async for frame in rt.run():
        if frame.has_image:
            image = frame.bgr_image         # numpy (H, W, 3) uint8
        if frame.end_of_speech:
            break
    await rt.stop()

asyncio.run(main())
```

The on-device SDK always renders a local `.imx`, so `create()` needs `model_path`; you can also pass `agent_code` for billing attribution. Resolving an avatar purely by code (no local file) is the cloud/REST path — see [Avatars & .imx](/concepts/avatars-imx).

> **Debian/Ubuntu** `create()` failing with `Problem with the SSL CA cert` is
> **fixed in 2.3.4** — the SDK auto-discovers your distro's CA bundle on Linux,
> no configuration needed. If you must stay on ≤ 2.3.3, either upgrade
> (recommended) or symlink once:
> `sudo mkdir -p /etc/pki/tls/certs && sudo ln -s /etc/ssl/certs/ca-certificates.crt /etc/pki/tls/certs/ca-bundle.crt`.
> Note `CURL_CA_BUNDLE` / `SSL_CERT_FILE` override auto-discovery when set — a
> stale value breaks auth even on 2.3.4. Details in
> [Python SDK troubleshooting](/sdk/python#problem-with-the-ssl-ca-cert-on-linux-debianubuntu).

## Audio format

| Property | Value |
|---|---|
| Encoding | 16-bit signed PCM (`int16`) |
| Channels | Mono |
| Sample rate | Any (the SDK auto-resamples) |
| Chunk size | Anything; 10–40 ms is typical |

Push raw `int16` PCM bytes plus the sample rate — the SDK resamples internally. The `load_audio` / `float32_to_int16` helpers are inlined in the loop above; the old `bithuman.audio` module was removed in the 2.3 slim wheel.

## Frame format

Each yielded `frame` exposes:

| Field | Type | What it is |
|---|---|---|
| `bgr_image` | `numpy.ndarray` (H, W, 3) `uint8` | The rendered video frame, BGR channel order |
| `audio_chunk` | `AudioChunk` | Audio aligned with the frame. An object exposing `.array` (numpy samples), `.bytes` (raw PCM), and `.duration` (seconds) — not raw `bytes`. |
| `has_image` | `bool` | `False` for filler frames during silence |
| `end_of_speech` | `bool` | `True` on the last frame of a turn |

Frames arrive at **25 FPS** regardless of audio chunk size.

## When the avatar isn't speaking

During silence the runtime emits filler frames (`has_image=False`) so your render loop keeps its 25 FPS cadence. Skip them, or render a static idle frame.

## Mapping to other SDKs

The push/drain shape is identical everywhere — only the language idioms change:

- **Python** — `await rt.push_audio(...)` / `async for frame in rt.run()`. See the [Python SDK](/sdk/python).
- **Swift** — push PCM into the chat session, receive frames on the render callback. See the [Swift SDK](/sdk/swift).

All SDKs that target the same engine ABI produce byte-equivalent frames from the same audio — see [Architecture](/concepts/architecture) for the compatibility matrix.

## Where to go next

- [Agent lifecycle](/concepts/agent-lifecycle) — generate an agent, then stream it.
- [Quickstart](/api/quickstart) — your first avatar in ~2 minutes.
- [Browser rendering](/guides/browser-rendering) — run the same lip-sync pipeline client-side in WASM.
