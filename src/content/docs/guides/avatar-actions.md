---
title: "Trigger gestures from code"
description: "Play a named gesture (wave, nod, clap) on an avatar exactly when your code asks, on a cloud avatar or a self-hosted one."
section: guides
group: "Build"
order: 22
type: guide
label: "Gestures"
---

Gestures are named clips baked into an avatar, such as `mini_wave_hello` or `clap_cheer`. Your code plays one by name, when it chooses: on an app event, a timer, or an allow-listed tool call. Nothing plays at random.

Gestures are an Essence 1 feature; Essence 2 and Expression 2 avatars have no gesture clips.

## Before you start

- An Essence 1 agent of yours with gestures generated ([Gestures API](/api/dynamics)).
- A LiveKit agent worker with the bitHuman plugin ([LiveKit](/sdk/livekit)).

## 1. List the gesture names

```bash
curl -s https://api.bithuman.ai/v1/dynamics/$AGENT_CODE -H "api-secret: $BITHUMAN_API_SECRET"
# → {"success": true, "data": {"status": "ready", "gestures": {"mini_wave_hello": "…", "clap_cheer": "…"}}}
```

The keys of `gestures` are the names you play, for example `mini_wave_hello` or `clap_cheer`.

## 2. Play one

Cloud avatar (`AvatarSession(avatar_id=…)`): send the avatar participant a `trigger_dynamics` call.

```python
import json

resp = await ctx.room.local_participant.perform_rpc(
    destination_identity=avatar.avatar_identity,
    method="trigger_dynamics",
    payload=json.dumps({"action": "mini_wave_hello"}),
)
# → {"action": "mini_wave_hello", "animation_triggered": true, "status": "success"}
```

Self-hosted avatar (`AvatarSession(model_path="avatar.imx")`): push a `VideoControl` to the runtime.

```python
from bithuman import VideoControl

await avatar.runtime.push(VideoControl(action="mini_wave_hello"))
```

## 3. Wire it to your events

As an allow-listed tool, so the language model can ask for a gesture only from your set. This tool is for a self-hosted avatar (`AvatarSession(model_path=…)`). For a cloud avatar, put the `perform_rpc` call from step 2 in the tool body instead.

```python
from livekit.agents import function_tool, RunContext

ALLOWED = {"mini_wave_hello", "clap_cheer", "thumbs_up_pulse"}

@function_tool()
async def play_gesture(context: RunContext, gesture: str) -> str:
    if gesture not in ALLOWED:
        return f"Unknown gesture. Options: {sorted(ALLOWED)}"
    await avatar.runtime.push(VideoControl(action=gesture, force_action=True))
    return f"Played {gesture}"
```

Other triggers work the same way: a LiveKit data message, a participant event or a timer calls the same line.

## Check it worked

The cloud call returns `animation_triggered: true`; the avatar plays the clip, then returns to idle or speech.

## Variations

| `VideoControl` field | Effect |
|---|---|
| `force_action=True` | play even if another gesture is running |
| `stop_on_user_speech=True` | stop the gesture when the user starts talking |
| `stop_on_agent_speech=True` | stop the gesture when the agent starts talking |
| `target_video="<clip>"` | switch the idle loop to another base clip |

`avatar.runtime.interrupt()` stops a gesture at once.

## Troubleshooting

| Symptom | Cause | Fix |
|---|---|---|
| `animation_triggered: false` | the name is not one of the avatar's gestures, or it has none | list the names (step 1); generate gestures with the [Gestures API](/api/dynamics) |
| Nothing plays on a self-hosted avatar | the `.imx` was downloaded before gestures were generated | download the model again after generation |

## Next

- [Gestures API](/api/dynamics) · [LiveKit](/sdk/livekit) · [Python](/sdk/python)
