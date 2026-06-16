---
title: "LiveKit integration"
description: "Connect a native Apple app to a server-hosted avatar over WebRTC, or deploy a Python voice agent with a face — both via LiveKit."
section: sdk
group: "Real-time"
order: 20
---

## Overview

When the avatar runs on a server — shared between participants, or Expression on
a GPU — your client becomes a thin WebRTC subscriber and a Python agent runs the
avatar. bitHuman ships two LiveKit integration points for this topology:

- **Apple client** — `bithuman-livekit-swift`, a fork of LiveKit's Swift client,
  connects a native iOS/macOS app to a served or cloud avatar.
- **Python deploy path** — `livekit-plugins-bithuman` drops the avatar into any
  LiveKit agent worker, managed or self-hosted.

The fastest path to production is the Python plugin (~5-minute setup, no GPU to
provision). The Apple client is for when the *viewer* is a native app rather
than a browser.

## Python: deploy via the LiveKit plugin

Install the plugin (it pulls in `bithuman` and `livekit-agents`):

```bash
pip install livekit-plugins-bithuman pillow
```

> **Note** The plugin currently requires Pillow but doesn't declare it —
> install `pillow` alongside it (as above), or
> `from livekit.plugins import bithuman` fails with
> `ModuleNotFoundError: No module named 'PIL'`. Upstream fix pending with
> LiveKit. (There is no `bithuman[agent]` extra in the 2.3 slim wheel — the
> plugin is its own package.)

Wire the avatar into an agent worker with a single object:

```python
import os
from livekit.plugins import bithuman

avatar = bithuman.AvatarSession(
    avatar_id="A78WKV4515",
    api_secret=os.environ["BITHUMAN_API_SECRET"],
)
# attach to your AgentSession, then start it
```

`AvatarSession` is the single integration point — the same call works against
both LiveKit Cloud and a self-hosted LiveKit server, and bills at the
[self-hosted or cloud rate](/guides/pricing) depending on whether the avatar
GPU is yours or ours.

What you get:

- **Managed avatar runtime** — no GPU to provision, no Docker to operate.
- **LiveKit Cloud-compatible** — works with LiveKit Cloud and self-hosted servers.
- **WebRTC delivery** — video streamed via LiveKit's media pipeline to any client.

Two runnable LiveKit agents ship in the SDK repo, each with `.env.example`,
`requirements.txt`, and a `docker-compose.yml` full stack:

| Example | Where the avatar runs | Needs |
|---|---|---|
| cloud-essence | bitHuman cloud | API key + agent ID |
| local-essence | Your server (CPU) | API key + `.imx` |

## Production video tuning (avoid a black or laggy avatar)

> **Important for self-hosters.** By default the LiveKit plugin publishes the
> avatar video track with no explicit encoding. LiveKit then maps a small
> (~512×512) track to its **H480 preset — VP8, ~300 kbps, a 20 fps cap, and
> simulcast ON** (a second encoder per session). The avatar engine renders at
> 25 fps, so this:
>
> - **decimates to ~20 fps with judder → "extremely laggy"**, and
> - under CPU/encoder pressure drives WebRTC into **encoder-overuse adaptation:
>   ~1-second frozen frames (which render as a black screen) + a live 512→360
>   downscale**.
>
> This is the most common cause of a self-hosted avatar that shows a **black
> screen / no video, then appears but is laggy and unusable.** bitHuman's
> *managed* workers already fix it; self-hosted agents must apply the same fix.

Publish **one layer, simulcast off, H264, with explicit bitrate/fps**. Apply
this monkey-patch **once, before** you call `avatar.start(...)`:

```python
# tuned_publish.py — import this BEFORE creating/starting bithuman.AvatarSession
import os
from livekit import rtc
from livekit.agents.voice.avatar import AvatarRunner

async def _tuned_publish_track(self) -> None:
    async with self._lock:
        await self._room_connected_fut
        # audio — unchanged
        audio = rtc.LocalAudioTrack.create_audio_track("avatar_audio", self._audio_source)
        self._audio_publication = await self._room.local_participant.publish_track(
            audio, rtc.TrackPublishOptions(source=rtc.TrackSource.SOURCE_MICROPHONE))
        await self._audio_publication.wait_for_subscription()
        # video — single layer, no simulcast, H264, explicit encoding
        video = rtc.LocalVideoTrack.create_video_track("avatar_video", self._video_source)
        self._video_publication = await self._room.local_participant.publish_track(
            video, rtc.TrackPublishOptions(
                source=rtc.TrackSource.SOURCE_CAMERA,
                video_codec=rtc.VideoCodec.H264,                 # ~55% less encode CPU than VP8
                simulcast=os.getenv("AVATAR_VIDEO_SIMULCAST", "0").lower() in ("1", "true", "yes", "on"),
                video_encoding=rtc.VideoEncoding(
                    max_bitrate=int(os.getenv("AVATAR_VIDEO_MAX_BITRATE", "2000000")),
                    max_framerate=float(os.getenv("AVATAR_VIDEO_MAX_FPS", "25")))))

AvatarRunner._publish_track = _tuned_publish_track  # apply before avatar.start(...)
```

Tunables (override the defaults above without code changes): **`AVATAR_VIDEO_MAX_BITRATE`**
(default `2000000`; raise to 3–4 M for portraits larger than 512²),
**`AVATAR_VIDEO_MAX_FPS`** (default `25`, the engine fps),
**`AVATAR_VIDEO_SIMULCAST`** (default off — leave off for single-subscriber avatars).
You should see a published track at the full engine fps with no 512→360
downscale and no frozen intervals. *(The `local-essence` / `cloud-essence`
examples in the SDK repo ship with this applied.)*

### Hardware floor (Essence, CPU)

A self-hosted **Essence** session must render lip-sync **and** software-encode
the video on CPU. Budget **dedicated cores per concurrent 25 fps session** (not
just "a modern CPU") and disable simulcast as above — H264 + single-layer cuts
encode CPU by ~55–82% vs the VP8/simulcast default. An oversubscribed or
shared-vCPU box that can't sustain 25 fps produces the same laggy/frozen video.

### A short black frame at startup is expected

The track may be black for the **first moment** while the engine warms up and
before the first audio arrives. If it stays black after frames should be
flowing, the cause is almost always the publish preset above (a frozen/decimated
track reads as black) — **not** a warmup issue. Gate client joins on the
avatar being live, and apply the tuned publish first.

## Apple: connect a native app via `bithuman-livekit-swift`

`bithuman-livekit-swift` is a **fork** of
[`livekit/client-sdk-swift`](https://github.com/livekit/client-sdk-swift)
maintained by bitHuman. It tracks upstream releases and adds two things upstream
doesn't have yet:

- A **microphone-less app-audio path** — capture system / app audio without
  holding a hardware mic.
- A small **IPC layer** for routing audio between sibling processes.

For anything not bitHuman-specific, the upstream LiveKit Swift docs and APIs
apply unchanged — and upstream bugs should be filed upstream.

### Install

Add the Swift package and attach `LiveKit` to your target:

```swift
// Package.swift
dependencies: [
    .package(url: "https://github.com/bithuman-product/bithuman-livekit-swift.git",
             .upToNextMajor(from: "2.14.0"))
],
targets: [
    .target(name: "MyApp", dependencies: [
        .product(name: "LiveKit", package: "bithuman-livekit-swift")
    ])
]
```

> **Note** Version 2 of the LiveKit Swift client has breaking changes from
> version 1. See the [LiveKit v1→v2 migration
> guide](https://docs.livekit.io/guides/migrate-from-v1/) if you are upgrading.

### Connect and render

Mint a room token from a server you control, connect, and subscribe to the
agent's video track. LiveKit auto-plays subscribed audio and renders video into a
`VideoView`:

```swift
import LiveKit
import UIKit

class RoomViewController: UIViewController {
    lazy var room = Room(delegate: self)
    lazy var remoteVideoView = VideoView()   // add to your view hierarchy

    override func viewDidLoad() {
        super.viewDidLoad()
        Task {
            let url = "wss://your-livekit-host"
            let token = "your_jwt_token"      // minted server-side
            try await room.connect(url: url, token: token)
            // The Python agent publishes the avatar's video track; subscribe
            // and attach it to remoteVideoView in your Room delegate callbacks.
        }
    }
}
```

The bitHuman avatar arrives as a remote participant's video track published by
the Python agent above — this client is the subscriber.

## When to use which

| Your viewer is… | Use |
|---|---|
| A browser | The Python plugin + a web LiveKit client ([JS/TS SDK](/sdk/javascript) or LiveKit web) |
| A native iOS/macOS app | The Python plugin (server) + `bithuman-livekit-swift` (client) |
| On-device only, no server | The native [Swift](/sdk/swift) / [Android](/sdk/android) SDKs instead |

## See also

- [SDK overview](/sdk) — on-device vs cloud
- [Python SDK](/sdk/python) — the runtime the plugin wraps
- [Swift SDK](/sdk/swift) — the on-device alternative for Apple
- [Pricing](/guides/pricing) — self-hosted vs cloud rates
