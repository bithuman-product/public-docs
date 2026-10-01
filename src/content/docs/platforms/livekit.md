---
title: "LiveKit"
searchTitle: "LiveKit: add a talking avatar to a LiveKit voice agent"
description: "Give a LiveKit voice agent a face with the bitHuman Python plugin."
section: platforms
group: "LiveKit"
order: 10
type: platform
llms: platforms
renders: ["cloud", "server"]
needs: ["API secret"]
artifacts: ["livekit_plugin"]
platforms: ["livekit"]
models: ["essence-2", "expression-2"]
claims: ["S4", "S14", "S17", "S31"]
next: ["/platforms/livekit/app", "/platforms/livekit/troubleshooting"]
moved:
  integrate-into-your-app: /platforms/livekit/app#integrate-into-your-app
  platform-notes: /platforms/livekit/app#platform-notes
  reference: /platforms/livekit/app#reference
  troubleshooting: /platforms/livekit/troubleshooting
---

To add a talking avatar to a LiveKit voice agent, install the `livekit-plugins-bithuman` Python plugin and start a `bithuman.AvatarSession` beside your agent's session. Pass `avatar_id=` to render the avatar in the bitHuman cloud, or `model_path=` to render it inside your worker; either way the avatar speaks the agent's replies with its lips in sync.

`livekit-plugins-bithuman` works on LiveKit Cloud or your own LiveKit server; the avatar joins the room as a participant.

## Before you start

It is a Python plugin; there is no Node.js plugin. The avatar renders in one of two ways:

| | A bitHuman cloud avatar | The avatar on your server |
|---|---|---|
| **You pass** | `avatar_id=` (an agent code) | `model_path=` (an avatar file) |
| **The avatar renders** | in the bitHuman cloud, in the US | inside your worker's process |
| **Its audio and video** | are published into your room by bitHuman | stay on your machine until your worker publishes them |
| **Price** | the cloud rate ([pricing](/pricing)) | the self-hosted rate |
| **Guide** | this page | [Voice agent](/build/voice-agent/python#with-python) |

Either way, the plugin serves the agent's own model, Essence 2 or Expression 2.

- Python 3.10–3.14 and a LiveKit project (its URL and credentials).
- A bitHuman agent code: `A23WJF0199` (the `wise-pup` sample) or your own from [Agents](/api/agents).
- An [API secret](/start/api-secret), and an OpenAI key for the voice model in the example.

## Install

```bash
pip install "livekit-agents[openai,silero]" livekit-plugins-bithuman "bithuman[expression-2]" python-dotenv
```

`bithuman[expression-2]` lets the worker open Expression 2 files with `model_path=`; a cloud avatar does not need it.

## Authenticate

In a LiveKit worker, name the secret `BITHUMAN_MASTER_SECRET` and pass a minted token. For a cloud avatar, the worker mints a one-hour token that can start only this agent's avatar in this room (`POST /v1/runtime-tokens/mint` with `"scope": "livekit-cloud"`), as in the worker below. Pass the minted token as `api_secret=`: for a cloud avatar the plugin requires `api_secret` (`api_token=` is not used for cloud avatars).

> **Warning:** Without `api_secret=`, the plugin reads `BITHUMAN_API_SECRET` from the environment and copies it into the avatar's participant attributes, which everyone in the room can read. Keep `BITHUMAN_API_SECRET` unset in the worker, whatever the plugin's PyPI page says.

```bash
export BITHUMAN_MASTER_SECRET="<your API secret>"
export BITHUMAN_AGENT_ID=A23WJF0199
export LIVEKIT_URL=wss://your-project.livekit.cloud
export LIVEKIT_API_KEY=… LIVEKIT_API_SECRET=…
export OPENAI_API_KEY=…
```

```diagram
livekit
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
            # end the user's turn after 0.5 s of silence (the default waits longer)
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

## Performance

A cloud avatar renders in the bitHuman cloud; with `model_path=` the avatar renders where your worker runs, as Python does:

```perf
cloud-gpu python-linux python-macos
```
