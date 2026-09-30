---
title: "How it works"
description: "One portable engine, thin language SDKs, and your app on top."
section: models
group: "Concepts"
order: 10
type: concept
llms: models
next: ["/models/avatar-file", "/platforms", "/models"]
---

```diagram
engine
```

## The three layers

bitHuman is one portable engine with thin language bindings on top, and your app on top of that. Every layer reads the same [model file](/models/avatar-file) and produces the same lip-synced frames, on an iPhone, a Mac, a Linux PC, in a browser or in the bitHuman cloud.

| Layer | What it is |
|---|---|
| **Apps and tools** | the bitHuman CLI, your own app, LiveKit for WebRTC transport |
| **Language SDKs** | Python, Swift and Kotlin: thin bindings over the same engine; the browser through the web embed |
| **The bitHuman engine** | the avatar renderer, inside every SDK, so there is nothing separate to install: macOS, iOS, Android, Linux and the browser |

You integrate at the SDK layer. The engine is built into each SDK, so your app needs the bitHuman dependency and nothing else. To pick a platform, start at [Platforms](/platforms); which model runs where is on [Models](/models#where-each-model-runs).

## Serving tiers

Every published configuration, including a desktop CPU with no GPU, renders faster than real time ([performance](/performance)). In the bitHuman cloud, the service picks the hardware for each session; to benchmark one tier, see [pin a tier for a benchmark](/performance/method#pin-a-tier-for-a-benchmark); in production, let the service choose.

## Idle and speaking behavior

**Essence 2.** The identity video plays continuously and loops **forward-only**: at its last
frame it wraps to the first, and it never plays in reverse. While idle it is
pure playback of your footage; while talking, the animated face is rendered
over the same frames.

**Expression 2.** During silences the avatar plays its **10-second idle clip**, generated from the
identity at creation, looping forward-only without a seam. When speech starts,
the engine hands off to generated frames with a per-identity color match, so the
two stay visually continuous; idle resumes only after sustained silence, not in
pauses inside a sentence.

**Speech onset.** The engine renders in fixed audio chunks; the moving idle
clip covers the start of each reply.

A running session bills talking and idle time alike ([pricing](/pricing)).

## What stays true across every surface

- **One model file, every surface.** The same audio drives the same lip-sync on every SDK; pixels can differ slightly between hardware backends.
- **A stable public API.** Deprecated options keep working with a warning until the next major, and majors call out breaks explicitly.
- **Surfaces mix.** The Swift package in your iOS app with the Python package on your backend is supported; keep each one current — [Downloads](/downloads#current-versions) lists the current versions.
- **One credential.** The same key drives every surface; how it is exchanged and billed is on [Authentication](/api/authentication) and [pricing](/pricing).

## Audio in, frames out

Every SDK has the same shape — audio in, video out:

1. **Push** audio as it arrives — a microphone, TTS, a WebRTC track.
2. **Drain** lip-synced frames at the model's own rate — 25 fps for Essence 2 and
   Essence 1, 20 fps for Expression 2.

The engine buffers between the two, so your audio source and your render loop
never have to run in lockstep.

### In Python

`render()` takes audio a chunk at a time and yields frames as it goes, so a
stream and a file are the same program:

```python
import numpy as np
import bithuman

def chunks(path="speech16k.raw", ms=40):
    """16 kHz mono int16 audio, delivered a chunk at a time — a mic, TTS or a socket."""
    pcm = np.fromfile(path, dtype=np.int16)
    step = 16000 * ms // 1000
    for i in range(0, len(pcm), step):
        yield pcm[i:i + step]

frames = 0
with bithuman.open("wise-pup.imx") as avatar:
    for image in avatar.render(chunks()):      # frames come out as audio goes in
        frames += 1                            # image: (height, width, 3) uint8, RGB
print(frames, image.shape)
```

Install, the model download and the credential are on the
[Python SDK](/platforms/python) page. `speech16k.raw` is any speech converted with
`ffmpeg -i speech.wav -ac 1 -ar 16000 -f s16le speech16k.raw`.

### Audio format

| Property | Value |
|---|---|
| Encoding | 16-bit signed PCM (`int16`), or `float32` in [-1, 1] |
| Channels | mono |
| Sample rate | 16 kHz for decoded samples; a file path in any format ffmpeg reads is converted for you |
| Chunk size | anything; 10–40 ms is typical |

### Frame format

Frames arrive at the model's own rate, whatever the chunk size: 25 fps for
Essence 2 (up to 1080p: the identity's own canvas, 1080×1920 portrait for a standard identity) and 20 fps for Expression 2
(416x720). Python yields RGB `uint8` arrays; the Swift package and the Android SDK hand you
their platform's image types.

### In the other SDKs

- **Apple** — `feed()` PCM, then `pull()` frames. See the [Swift package](/platforms/ios).
- **Android** — `feed()` PCM, then `pull()` into a reused buffer: a `Bitmap` for Expression 2, an RGBA `ByteBuffer` for Essence 2. See the [Android SDK](/platforms/android).
- **CLI** — `bithuman render` takes an audio file; `bithuman run` streams a live conversation. See the [CLI](/platforms/cli).
