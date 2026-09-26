---
title: "LiveKit"
description: "Give a LiveKit voice agent a face: the bitHuman plugin renders the avatar in the cloud and publishes it into your room."
section: sdk
group: "Integrations"
order: 60
type: platform
label: "LiveKit agents"
---

`livekit-plugins-bithuman` adds a bitHuman avatar to any LiveKit agent worker, on LiveKit Cloud or your own LiveKit server. bitHuman renders the avatar and publishes its video and audio into the room; you provision no GPU.

| Detail | Expression 2 | Essence 2 |
|---|---|---|
| **Works with the plugin** | yes | yes |
| **Which model is served** | the agent's own model | the agent's own model |

## Before you start

- Python 3.10–3.14 and a LiveKit project (its URL and credentials).
- A bitHuman agent code: `A23WJF0199` (the `wise-pup` sample) or your own from [Agents](/api/agents).
- An [API secret](/start/api-secret), and an OpenAI key for the voice model in the example.

## Install

```bash
pip install "livekit-agents[openai,silero]" livekit-plugins-bithuman pillow bithuman python-dotenv
```

## Authenticate

Keep your API secret in the worker's environment as `BITHUMAN_MASTER_SECRET`, and use it only to mint a one-hour token that can start this agent's avatar in this room (`POST /v1/runtime-tokens/mint` with `"scope": "livekit-cloud"`). Pass that token to the plugin, never the secret.

> **Warning** Never set `BITHUMAN_API_SECRET` in a LiveKit worker's environment (plugin 1.8.4 and older). The plugin reads it by itself whenever `api_secret=` is omitted and copies it into the avatar's participant attributes, which everyone in the room can read.

```bash
export BITHUMAN_MASTER_SECRET="<your API secret>"   # not BITHUMAN_API_SECRET: the plugin reads that one itself
export BITHUMAN_AGENT_ID=A23WJF0199
export LIVEKIT_URL=wss://your-project.livekit.cloud
export LIVEKIT_API_KEY=… LIVEKIT_API_SECRET=…
export OPENAI_API_KEY=…
```

## First frame

A complete worker (`agent.py`):

```python
import os

import aiohttp
from dotenv import load_dotenv
from livekit.agents import Agent, AgentSession, JobContext, WorkerOptions, cli
from livekit.agents.voice.room_io import RoomOptions
from livekit.plugins import bithuman, openai, silero
from openai.types.realtime.realtime_audio_input_turn_detection import ServerVad

load_dotenv()


async def livekit_cloud_token(agent_code: str, room_name: str) -> str:
    """A one-hour token that can only start this agent's avatar in this room."""
    async with aiohttp.ClientSession() as http:
        async with http.post(
            "https://api.bithuman.ai/v1/runtime-tokens/mint",
            headers={"api-secret": os.environ["BITHUMAN_MASTER_SECRET"]},
            json={"agent_code": agent_code, "scope": "livekit-cloud",
                  "room_name": room_name, "livekit_url": os.environ["LIVEKIT_URL"]},
        ) as resp:
            resp.raise_for_status()
            return (await resp.json())["scoped_token"]


async def entrypoint(ctx: JobContext):
    await ctx.connect()
    await ctx.wait_for_participant()
    agent_code = os.environ["BITHUMAN_AGENT_ID"]

    session = AgentSession(
        llm=openai.realtime.RealtimeModel(
            voice="coral",
            # reply 0.5 s after the user stops (the plugin default waits up to ~4 s)
            turn_detection=ServerVad(type="server_vad", silence_duration_ms=500, create_response=True, interrupt_response=True),
        ),
        vad=silero.VAD.load(),
    )
    avatar = bithuman.AvatarSession(
        avatar_id=agent_code,
        api_secret=await livekit_cloud_token(agent_code, ctx.room.name),
    )
    await avatar.start(session, room=ctx.room)
    await session.start(
        agent=Agent(instructions="You are a friendly assistant. Keep answers short."),
        room=ctx.room,
        room_options=RoomOptions(audio_output=False),   # the avatar publishes the audio
    )


if __name__ == "__main__":
    cli.run_app(WorkerOptions(entrypoint_fnc=entrypoint))
```

```bash
python agent.py dev
# → join the room from the LiveKit Agents Playground; the avatar appears and answers
```

## Integrate into your app

- **Your own client.** The avatar is a normal LiveKit participant: any LiveKit client SDK (JavaScript, Swift, Kotlin) subscribes to its video and audio tracks. The app takes a room token from your server, never a bitHuman secret.
- **Choosing a model.** The plugin serves the agent's own model. Do not pass `model=`; create the agent with the model you want ([Models](/concepts/models)).
- **A photo instead of an agent.** `avatar_image=` with no `avatar_id` animates the photo on Expression 1 only. On every other model the launch is refused with `400 VALIDATION_ERROR` before anything is billed: [create an agent](/api/agents#generate-an-agent) from the photo and pass its code as `avatar_id`.
- **Rendering on your own machine.** Pass `model_path=` (an avatar file) instead of `avatar_id=`, and the secret explicitly: `api_secret=os.environ["BITHUMAN_MASTER_SECRET"]`. The avatar renders inside the worker's process on its CPU, and the secret stays in that process. Runnable example: [Talk to an avatar on your machine](/guides/local-voice-avatar#with-python).
- **Several agents in one room.** The avatar lip-syncs the agent that calls `AvatarSession.start()` and ignores other agents' audio.
- **Gestures.** Trigger avatar actions from your agent: [Gestures](/guides/avatar-actions).

The [cloud example](https://github.com/bithuman-product/bithuman-examples/tree/main/python/cloud-essence) packages this worker with a web UI and Docker Compose.

## Platform notes

- The mint call is one per session. The token starts that session only; it expires after an hour, and a session that runs longer continues.
- `livekit_url` in the mint call must be the URL the plugin connects to (`LIVEKIT_URL`, unless you pass `livekit_url=` to `AvatarSession.start()`).
- If you run your own LiveKit server, use `livekit-server` 1.9.12 or newer. With older servers, browsers leave and rejoin the room every 15 s, and the video stalls each time.
- To render the avatar on your own machine instead of the cloud, pass `model_path=` — see [Talk to an avatar on your machine](/guides/local-voice-avatar).
- When the avatar renders on your own machine (`model_path=`) with Expression 2, the mouth can move about 0.1 s before the voice. LiveKit's avatar runner holds up to 100 ms of audio before playing it, and the plugin publishes each picture as soon as it is rendered. A fix is proposed upstream in [livekit/agents#7492](https://github.com/livekit/agents/pull/7492). Avatars rendered in the cloud (`avatar_id=`) are not affected.

## Performance

Cloud frame rates are on [Cloud API performance](/performance/cloud).

## Troubleshooting

| Symptom | Cause | Fix |
|---|---|---|
| `No module named 'PIL'` | the plugin needs Pillow | install `pillow` |
| The mint call returns `403` | the token was minted for another agent, room or LiveKit URL | mint with the same `agent_code`, `room_name` and `livekit_url` the plugin uses |
| The mint call returns `401` | a missing or invalid API secret | check `BITHUMAN_MASTER_SECRET` |
| The avatar speaks with the wrong model | the plugin serves the agent's own model | create an agent with the model you want |
| The video stalls for 1–2 s every 15 s, or a LiveKit Meet tile goes black | `livekit-server` older than 1.9.12: the browser leaves and rejoins the room every 15 s | `brew upgrade livekit` (macOS) or `curl -sSL https://get.livekit.io \| bash` (Linux), then restart `livekit-server` |
| Two voices play | the agent session also publishes audio | set `room_options=RoomOptions(audio_output=False)` |

## Reference

- [Runtime tokens](/api/reference): `POST /v1/runtime-tokens/mint`.
- [LiveKit Agents docs](https://docs.livekit.io/agents/).
- [Python](/sdk/python): the runtime the plugin builds on.
