---
title: "Audio streaming"
description: "The push/drain pattern every bitHuman SDK shares — push audio in, drain lip-synced frames out at the model's own rate — with a streaming Python example and the audio and frame formats."
section: guides
group: "Learn"
order: 7
type: concept
label: "Audio in, frames out"
---

## The push/drain pattern

Every SDK has the same shape — audio in, video out:

1. **Push** audio as it arrives — a microphone, TTS, a WebRTC track.
2. **Drain** lip-synced frames at the model's own rate — 25 fps for Essence 2 and
   Essence 1, 20 fps for Expression 2.

The engine buffers between the two, so your audio source and your render loop
never have to run in lockstep.

<div class="bh-flow"><span class="bh-node">push audio</span><span class="bh-sep">→</span><span class="bh-node">engine</span><span class="bh-sep">→</span><span class="bh-node">pull frame</span><span class="bh-sep">→</span><span class="bh-node">render</span></div>

## In Python

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
[Python SDK](/sdk/python) page. `speech16k.raw` is any speech converted with
`ffmpeg -i speech.wav -ac 1 -ar 16000 -f s16le speech16k.raw`.

## Audio format

| Property | Value |
|---|---|
| Encoding | 16-bit signed PCM (`int16`), or `float32` in [-1, 1] |
| Channels | mono |
| Sample rate | 16 kHz for decoded samples; a file path in any format ffmpeg reads is converted for you |
| Chunk size | anything; 10–40 ms is typical |

## Frame format

Frames arrive at the model's own rate, whatever the chunk size: 25 fps for
Essence 2 (up to 1080p: the identity's own canvas, 1080×1920 portrait for a standard identity) and 20 fps for Expression 2
(416x720). Python yields RGB `uint8` arrays; the Apple and Android SDKs hand you
their platform's image types.

## In the other SDKs

- **Apple** — `feed()` PCM, then `pull()` frames. See the [Apple SDK](/sdk/apple).
- **Android** — `feed()` PCM, then `pull()` into a reused buffer: a `Bitmap` for Expression 2, an RGBA `ByteBuffer` for Essence 2. See the [Android SDK](/sdk/android).
- **CLI** — `bithuman render` takes an audio file; `bithuman run` streams a live conversation. See the [CLI](/sdk/cli).

## Where to go next

- [Quickstart](/api/quickstart) — your first avatar in ~2 minutes.
- [Render in the tab](/sdk/web#integrate-into-your-app) — run the same lip-sync client-side in the browser.
