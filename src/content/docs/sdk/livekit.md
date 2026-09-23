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

| | Expression 2 | Essence 2 |
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

Keep your API secret in the worker's environment, and never pass it to the plugin. The plugin copies whatever you pass as `api_secret` into the avatar participant's attributes, which every participant in the room can read. Instead, exchange the secret for a one-hour token that can only start this agent's avatar in this room (`POST /v1/runtime-tokens/mint` with `"scope": "livekit-cloud"`), and pass that token.

```bash
export BITHUMAN_API_SECRET="<your API secret>"
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
from livekit.agents import Agent, AgentSession, JobContext, RoomOutputOptions, WorkerOptions, cli
from livekit.plugins import bithuman, openai, silero

load_dotenv()


async def livekit_cloud_token(agent_code: str, room_name: str) -> str:
    """A one-hour token that can only start this agent's avatar in this room."""
    async with aiohttp.ClientSession() as http:
        async with http.post(
            "https://api.bithuman.ai/v1/runtime-tokens/mint",
            headers={"api-secret": os.environ["BITHUMAN_API_SECRET"]},
            json={"agent_code": agent_code, "scope": "livekit-cloud",
                  "room_name": room_name, "livekit_url": os.environ["LIVEKIT_URL"]},
        ) as resp:
            resp.raise_for_status()
            return (await resp.json())["scoped_token"]


async def entrypoint(ctx: JobContext):
    await ctx.connect()
    await ctx.wait_for_participant()
    agent_code = os.environ["BITHUMAN_AGENT_ID"]

    session = AgentSession(llm=openai.realtime.RealtimeModel(voice="coral"), vad=silero.VAD.load())
    avatar = bithuman.AvatarSession(
        avatar_id=agent_code,
        api_secret=await livekit_cloud_token(agent_code, ctx.room.name),
    )
    await avatar.start(session, room=ctx.room)
    await session.start(
        agent=Agent(instructions="You are a friendly assistant. Keep answers short."),
        room=ctx.room,
        room_output_options=RoomOutputOptions(audio_enabled=False),   # the avatar publishes the audio
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
- **Several agents in one room.** The avatar lip-syncs the agent that calls `AvatarSession.start()` and ignores other agents' audio.
- **Gestures.** Trigger avatar actions from your agent: [Gestures](/guides/avatar-actions).

The [cloud example](https://github.com/bithuman-product/bithuman-examples/tree/main/python/cloud-essence) packages this worker with a web UI and Docker Compose.

## Platform notes

- The mint call is one per session. The token starts that session only; it expires after an hour, and a session that runs longer continues.
- `livekit_url` in the mint call must be the URL the plugin connects to (`LIVEKIT_URL`, unless you pass `livekit_url=` to `AvatarSession.start()`).
- To render the avatar on your own server instead of the cloud, see [Self-hosting](/guides/self-hosting).

## Performance

Cloud frame rates are on the [performance page](/performance).

## Troubleshooting

| Symptom | Cause | Fix |
|---|---|---|
| `No module named 'cv2'` on import | on Python 3.10 or 3.14 the plugin does not pull `bithuman` | install `bithuman` too, as in the install line |
| `No module named 'PIL'` | the plugin needs Pillow | install `pillow` |
| The mint call returns `403` | the token was minted for another agent, room or LiveKit URL | mint with the same `agent_code`, `room_name` and `livekit_url` the plugin uses |
| The mint call returns `401` | a missing or invalid API secret | check `BITHUMAN_API_SECRET` |
| The avatar speaks with the wrong model | the plugin serves the agent's own model | create an agent with the model you want |
| Two voices play | the agent session also publishes audio | set `RoomOutputOptions(audio_enabled=False)` |

## Reference

- [Runtime tokens](/api/reference): `POST /v1/runtime-tokens/mint`.
- [LiveKit Agents docs](https://docs.livekit.io/agents/).
- [Python](/sdk/python): the runtime the plugin builds on.
