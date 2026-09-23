---
title: "LiveKit integration"
description: "Put a bitHuman avatar into a LiveKit agent worker with the Python plugin — managed, no GPU to run — tune its video for production, and connect a native Apple app as the viewer."
section: sdk
group: "Reference"
order: 80
label: "LiveKit"
---

When the avatar runs on a server and your viewers connect over WebRTC, LiveKit
is the transport. Two integration points:

- **`livekit-plugins-bithuman`** (Python) drops the avatar into any LiveKit agent
  worker, against LiveKit Cloud or your own LiveKit server. bitHuman renders the
  avatar; there is no GPU for you to provision.
- **LiveKit's Swift client** connects a native iOS or macOS app as the viewer.

## Python: the LiveKit plugin

### Install

```bash
pip install livekit-plugins-bithuman pillow
```

That line is for **Python 3.11, 3.12 and 3.13**. On **3.10 or 3.14**, name
`bithuman` as well — the plugin's release **1.8.2** only asks for it on
3.11–3.13, so without it the first import fails with
`No module named 'cv2'`:

```bash
pip install livekit-plugins-bithuman pillow bithuman     # Python 3.10 / 3.14
```

`pillow` is needed because the plugin imports it without declaring it. The
plugin pins `bithuman<3`, which resolves the current wheel documented on the
[Python SDK](/sdk/python) page. The plugin is LiveKit's package; a release
after 1.8.2 needs neither extra word.

### Environment

```bash
export BITHUMAN_API_SECRET=...          # https://www.bithuman.ai/developer/api-keys
export BITHUMAN_AGENT_ID="A78WKV4515"   # your agent code
export LIVEKIT_URL="wss://your-project.livekit.cloud"
export LIVEKIT_API_KEY=...
export LIVEKIT_API_SECRET=...
```

The plugin reads the bitHuman secret only from the argument you pass;
`livekit-agents` reads the three LiveKit variables from the environment.

### Wire it into an agent worker

```python
import os
from livekit.agents import JobContext
from livekit.plugins import bithuman

async def entrypoint(ctx: JobContext):
    await ctx.connect()
    await ctx.wait_for_participant()
    avatar = bithuman.AvatarSession(
        avatar_id=os.environ["BITHUMAN_AGENT_ID"],
        api_secret=os.environ["BITHUMAN_API_SECRET"],
    )
    # ...attach the avatar to your AgentSession and start it.
```

`AvatarSession` is the one integration point, for LiveKit Cloud and a
self-hosted LiveKit server alike. Each session bills at the rate on
[pricing](/guides/pricing).

**Choosing a model.** On 1.8.2, `model=` takes only `"essence"` (the default)
and `"expression"`, the first-generation engines. A second-generation agent is
served as that agent's own default model, and naming a model the agent cannot
be served as does not fail — it serves the default. So prepare the agent for
exactly the model you want ([Models](/concepts/models)). A later plugin release
adds `"essence-2"` and `"expression-2"`.

**Several agents in one room.** The avatar lip-syncs for, and sends
`playback_started` / `playback_finished` to, the agent that calls
`AvatarSession.start()`. Other agents' audio is ignored; no configuration is
needed.

Runnable workers, each with `.env.example`, `requirements.txt` and a
`docker-compose.yml` stack:

| Example | Where the avatar runs |
|---|---|
| [`python/cloud-essence`](https://github.com/bithuman-product/bithuman-examples/tree/main/python/cloud-essence) | bitHuman cloud — start here |
| [`python/local-essence`](https://github.com/bithuman-product/bithuman-examples/tree/main/python/local-essence) | your own server's CPU |

## Production video tuning

**If you publish the avatar's video from your own process** — a self-hosted
worker, not a bitHuman-hosted `avatar_id` — LiveKit's default maps a small
avatar track to a low-bitrate VP8 preset with a 20 fps cap and simulcast on.
Under load that decimates the video and produces frozen, black-looking frames.
Publish one H.264 layer with explicit bitrate and frame rate, by applying this
once, before `avatar.start(...)`:

```python
# tuned_publish.py — import this before creating/starting bithuman.AvatarSession
import os
from livekit import rtc
from livekit.agents.voice.avatar import AvatarRunner

async def _tuned_publish_track(self) -> None:
    async with self._lock:
        await self._room_connected_fut
        audio = rtc.LocalAudioTrack.create_audio_track("avatar_audio", self._audio_source)
        self._audio_publication = await self._room.local_participant.publish_track(
            audio, rtc.TrackPublishOptions(source=rtc.TrackSource.SOURCE_MICROPHONE))
        await self._audio_publication.wait_for_subscription()
        video = rtc.LocalVideoTrack.create_video_track("avatar_video", self._video_source)
        self._video_publication = await self._room.local_participant.publish_track(
            video, rtc.TrackPublishOptions(
                source=rtc.TrackSource.SOURCE_CAMERA,
                video_codec=rtc.VideoCodec.H264,
                simulcast=os.getenv("AVATAR_VIDEO_SIMULCAST", "0").lower() in ("1", "true", "yes", "on"),
                video_encoding=rtc.VideoEncoding(
                    max_bitrate=int(os.getenv("AVATAR_VIDEO_MAX_BITRATE", "2000000")),
                    max_framerate=float(os.getenv("AVATAR_VIDEO_MAX_FPS", "25")))))

AvatarRunner._publish_track = _tuned_publish_track  # apply before avatar.start(...)
```

| Env | Default | Purpose |
|---|---|---|
| `AVATAR_VIDEO_MAX_BITRATE` | `2000000` | raise to 3–4 M for portraits larger than 512² |
| `AVATAR_VIDEO_MAX_FPS` | `25` | the engine's frame rate |
| `AVATAR_VIDEO_SIMULCAST` | off | leave off for single-subscriber avatars |

`python/local-essence` ships this as `tuned_publish.py`; `python/cloud-essence`
does not need it, because a bitHuman worker publishes its track. A self-hosted
CPU session renders and encodes on the same cores, so budget dedicated cores
per concurrent session. A short black frame while the engine warms up is
expected; a track that stays black is the publish preset above.

## Apple: LiveKit's Swift client as the viewer

A bitHuman avatar room is a standard LiveKit room, so LiveKit's official
[`client-sdk-swift`](https://github.com/livekit/client-sdk-swift) connects to it
with no bitHuman-specific setup:

```swift
// Package.swift
dependencies: [
    .package(url: "https://github.com/livekit/client-sdk-swift.git",
             .upToNextMajor(from: "2.17.0"))
],
targets: [
    .target(name: "MyApp", dependencies: [
        .product(name: "LiveKit", package: "client-sdk-swift")
    ])
]
```

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
            let token = "your_jwt_token"      // minted by your own server
            try await room.connect(url: url, token: token)
            // Subscribe to the avatar's video track and attach it to
            // remoteVideoView in your Room delegate callbacks.
        }
    }
}
```

The app takes a room token your server mints, never a bitHuman key. The avatar
arrives as a remote participant's video track published by the Python agent.

## When to use which

| Your viewer is… | Use |
|---|---|
| A browser | the Python plugin, with LiveKit's JavaScript client — or skip LiveKit and [embed the hosted page](/sdk/web) |
| A native iOS or macOS app | the Python plugin on your server, `client-sdk-swift` in the app |
| On the device, with no server | the [Apple SDK](/sdk/ios) instead |

## See also

- [Python SDK](/sdk/python) — the runtime the plugin wraps
- [Trigger avatar actions from code](/guides/avatar-actions) — gestures from your agent
- [Embed widget](/api/embedding) — an iframe instead of LiveKit
- [LiveKit Agents docs](https://docs.livekit.io/agents/) — the agent-worker model
