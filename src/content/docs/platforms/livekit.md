---
title: "LiveKit"
description: "Give a LiveKit voice agent a face with the bitHuman Python plugin: a cloud-rendered avatar in your room, or an avatar rendered on your own server."
section: platforms
group: "Agents & APIs"
order: 10
type: platform
renders: ["cloud", "server"]
needs: ["API secret"]
artifacts: ["livekit_plugin"]
platforms: ["livekit"]
models: ["essence-2", "expression-2"]
claims: ["S4", "S14", "S17", "S31"]
next: ["/build/voice-agent", "/api/cloud-avatar", "/deploy/self-hosted"]
---

`livekit-plugins-bithuman` adds a bitHuman avatar to any LiveKit Agents worker, on LiveKit Cloud or your own LiveKit server. It is a Python plugin; there is no Node.js plugin. The avatar joins the room as a participant, in one of two ways:

| | A bitHuman cloud avatar | The avatar on your server |
|---|---|---|
| **You pass** | `avatar_id=` (an agent code) | `model_path=` (an avatar file) |
| **The avatar renders** | in the bitHuman cloud, in the US | inside your worker's process |
| **Its audio and video** | are published into your room by bitHuman | stay on your machine until your worker publishes them |
| **Price** | the cloud rate ([pricing](/pricing)) | the self-hosted rate |
| **Guide** | this page | [Voice agent](/build/voice-agent#with-python) |

Either way, the plugin serves the agent's own model, Essence 2 or Expression 2.

## Before you start

- Python 3.10–3.14 and a LiveKit project (its URL and credentials).
- A bitHuman agent code: `A23WJF0199` (the `wise-pup` sample) or your own from [Agents](/api/agents).
- An [API secret](/start/api-secret), and an OpenAI key for the voice model in the example.

## Install

```bash
pip install "livekit-agents[openai,silero]" livekit-plugins-bithuman python-dotenv
```

## Authenticate

In a LiveKit worker, name the secret `BITHUMAN_MASTER_SECRET` and pass a minted token. For a cloud avatar, the worker mints a one-hour token that can start only this agent's avatar in this room (`POST /v1/runtime-tokens/mint` with `"scope": "livekit-cloud"`), as in the worker below.

```bash
export BITHUMAN_MASTER_SECRET="<your API secret>"
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

## Integrate into your app

- **Your own client.** The avatar is a normal LiveKit participant: any LiveKit client SDK (JavaScript, Swift, Kotlin) subscribes to its video and audio tracks. The app takes a room token from your server, never a bitHuman secret.
- **Choosing a model.** The plugin serves the agent's own model. Do not pass `model=`; create the agent with the model you want ([Models](/models)).
- **A photo instead of an agent.** `avatar_image=` with no `avatar_id` animates the photo on Expression 1 only. On every other model the launch is refused with `400 VALIDATION_ERROR` before anything is billed: [create an agent](/api/agents#generate-an-agent) from the photo and pass its code as `avatar_id`.
- **Rendering on your own machine.** Pass `model_path=` (an avatar file) instead of `avatar_id=`, and the secret explicitly: `api_secret=os.environ["BITHUMAN_MASTER_SECRET"]`. The avatar renders inside the worker's process, and the secret stays in that process. Runnable example: [Voice agent](/build/voice-agent#with-python).
- **Without the plugin.** If your voice pipeline is not a LiveKit Agents worker, start the avatar with one REST call and stream it your audio: [Cloud avatar without the plugin](/api/cloud-avatar).
- **Several agents in one room.** The avatar lip-syncs the agent that calls `AvatarSession.start()` and ignores other agents' audio.
- **Gestures.** Trigger avatar actions from your agent: [Gestures](/build/gestures).

The [cloud example](https://github.com/bithuman-product/bithuman-examples/tree/main/python/cloud-essence) packages this worker with a web UI and Docker Compose.

## Platform notes

- The mint call is one per session. The token starts that session only; it expires after an hour, and a session that runs longer continues.
- `livekit_url` in the mint call must be the URL the plugin connects to (`LIVEKIT_URL`, unless you pass `livekit_url=` to `AvatarSession.start()`).
- If you run your own LiveKit server, use `livekit-server` 1.9.12 or newer. With older servers, browsers leave and rejoin the room every 15 s, and the video stalls each time.

## Performance

A cloud avatar renders in the bitHuman cloud; with `model_path=` the avatar renders where your worker runs, as Python does:

```perf
cloud-gpu python-linux python-macos
```

## Troubleshooting

| Symptom | Cause | Fix |
|---|---|---|
| The mint call returns `403` | the token was minted for another agent, room or LiveKit URL | mint with the same `agent_code`, `room_name` and `livekit_url` the plugin uses |
| The mint call returns `401` | a missing or invalid API secret | check `BITHUMAN_MASTER_SECRET` |
| The avatar speaks with the wrong model | the plugin serves the agent's own model | create an agent with the model you want |
| The video stalls for 1–2 s every 15 s, or a LiveKit Meet tile goes black | `livekit-server` older than 1.9.12: the browser leaves and rejoins the room every 15 s | `brew upgrade livekit` (macOS) or `curl -sSL https://get.livekit.io \| bash` (Linux), then restart `livekit-server` |
| Two voices play | the agent session also publishes audio | set `room_options=RoomOptions(audio_output=False)` |

## Reference

- [Runtime tokens](/api/reference): `POST /v1/runtime-tokens/mint`.
- [LiveKit Agents docs](https://docs.livekit.io/agents/).
- [Python](/platforms/python): the runtime the plugin builds on.
