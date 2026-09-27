---
title: "How it works"
description: "How bitHuman is built: one portable engine, thin language SDKs on top, and your app on top of that. Push 16 kHz audio in, drain lip-synced frames out, the same way on every platform."
section: models
group: "Concepts"
order: 10
type: concept
next: ["/models/avatar-file", "/platforms", "/models"]
---

## The three layers

bitHuman is one portable engine with thin language bindings on top, and your app on top of that. Every layer reads the same [model file](/models/avatar-file) and produces the same lip-synced frames — on an iPhone, a Mac, a Linux box, a browser, or a cloud GPU.

<div class="bh-stack">
  <div class="bh-layer"><div class="bh-l-title">Apps &amp; tools</div><div class="bh-l-sub">the bitHuman CLI · your own app · LiveKit transport for WebRTC</div></div>
  <div class="bh-layer"><div class="bh-l-title">Language SDKs</div><div class="bh-l-sub">Python · Swift · Kotlin — thin, idiomatic bindings over the same engine; the browser through the hosted URL or an iframe</div></div>
  <div class="bh-layer bh-accent"><div class="bh-l-title">The bitHuman engine</div><div class="bh-l-sub">The portable avatar renderer, shipped inside every SDK — nothing separate to install. macOS · iOS · Android · Linux · the browser</div></div>
</div>

Every layer drives the same pipeline — audio goes in, lip-synced frames come out:

<div class="bh-flow"><span class="bh-node">16 kHz mono audio</span><span class="bh-sep">→</span><span class="bh-node">bitHuman engine</span><span class="bh-sep">→</span><span class="bh-node">lip-synced frames</span></div>

You integrate at the SDK layer. The engine is built into each SDK, so your app needs the bitHuman dependency and nothing else. To pick a platform, start at [SDK](/platforms); which model runs where is on [Models](/models#where-each-model-runs).

## What stays true across every surface

- **One model file, every surface.** The same audio drives the same lip-sync on every SDK; pixels can differ slightly between hardware backends.
- **A stable public API.** Deprecated options keep working with a warning until the next major, and majors call out breaks explicitly.
- **Surfaces mix.** The Swift SDK in your iOS app with the Python package on your backend is supported; keep each one current — [Downloads](/downloads#current-versions) lists the current versions.
- **One credential.** The same key drives every surface; how it is exchanged and billed is on [Authentication](/api/authentication) and [pricing](/pricing).

## Audio in, frames out

Every SDK has the same shape — audio in, video out:

1. **Push** audio as it arrives — a microphone, TTS, a WebRTC track.
2. **Drain** lip-synced frames at the model's own rate — 25 fps for Essence 2 and
   Essence 1, 20 fps for Expression 2.

The engine buffers between the two, so your audio source and your render loop
never have to run in lockstep.

<div class="bh-flow"><span class="bh-node">push audio</span><span class="bh-sep">→</span><span class="bh-node">engine</span><span class="bh-sep">→</span><span class="bh-node">pull frame</span><span class="bh-sep">→</span><span class="bh-node">render</span></div>

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
(416x720). Python yields RGB `uint8` arrays; the Apple and Android SDKs hand you
their platform's image types.

### In the other SDKs

- **Apple** — `feed()` PCM, then `pull()` frames. See the [Apple SDK](/platforms/ios).
- **Android** — `feed()` PCM, then `pull()` into a reused buffer: a `Bitmap` for Expression 2, an RGBA `ByteBuffer` for Essence 2. See the [Android SDK](/platforms/android).
- **CLI** — `bithuman render` takes an audio file; `bithuman run` streams a live conversation. See the [CLI](/platforms/cli).
