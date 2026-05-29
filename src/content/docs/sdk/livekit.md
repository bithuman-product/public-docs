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
pip install livekit-plugins-bithuman   # or: pip install bithuman[agent]
```

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
[self-hosted or cloud rate](/concepts/pricing) depending on whether the avatar
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
- [Pricing](/concepts/pricing) — self-hosted vs cloud rates
