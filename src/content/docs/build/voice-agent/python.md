---
title: "Voice agent in Python"
description: "Run the voice avatar from your own Python agent code."
section: build
group: "Conversations"
order: 11
type: guide
llms: build
parent: /build/voice-agent
next: ["/platforms/python", "/platforms/livekit", "/build/barge-in"]
artifacts: ["python"]
---

The [voice agent](/build/voice-agent) from your own Python code: a LiveKit Agents worker, or a desktop window with no LiveKit server.

## A voice agent on your own LiveKit server

The [LiveKit plugin](/platforms/livekit) runs `AsyncBithuman` inside a LiveKit Agents worker: pass `model_path` and the avatar renders in the worker's own process, next to an OpenAI Realtime voice.

```python
# excerpt: python/self-host/agent.py (bithuman-examples)
session = AgentSession(llm=openai.realtime.RealtimeModel(model="gpt-realtime-2.1-mini", voice="coral",
    turn_detection=ServerVad(type="server_vad", silence_duration_ms=500)))   # end of turn after 0.5 s of silence
avatar = bithuman.AvatarSession(model_path="wise-pup.imx",    # renders here
                                api_secret=os.environ["BITHUMAN_MASTER_SECRET"])
await avatar.start(session, room=ctx.room)
await session.start(agent=Agent(instructions="You are a friendly assistant."),
                    room=ctx.room, room_options=RoomOptions(audio_output=False))
```

In a LiveKit worker, name the secret `BITHUMAN_MASTER_SECRET` and pass it explicitly ([LiveKit](/platforms/livekit#authenticate)). The runnable example with `livekit-server --dev` and a browser link: [Talk to an avatar on your machine](#with-python).

## With Python

A plain [LiveKit Agents](https://docs.livekit.io/agents/) program: you run `livekit-server` (1.9.12 or newer for this worker; check with `livekit-server --version`), and the avatar renders inside `agent.py`. Use Python 3.10–3.14. The CLI checks its `livekit-server` version for you.

```bash
# 1. LiveKit server
brew install livekit python@3.13                  # macOS
curl -sSL https://get.livekit.io | bash           # Linux (Ubuntu 24.04 also: sudo apt install python3.12-venv)

# 2. The example
git clone https://gitlab.com/bithuman/sdk/bithuman-examples
cd bithuman-examples/python/self-host
python3 --version                                 # needs 3.10–3.14
python3 -m venv .venv && . .venv/bin/activate
pip install -r requirements.txt

# 3. Keys: in .env, never on the command line
cp .env.example .env                              # fill BITHUMAN_MASTER_SECRET and OPENAI_API_KEY

# 4. Run, in two terminals
livekit-server --dev --config livekit.yaml        # terminal 1
python agent.py dev                               # terminal 2
```

Expected output in terminal 2:

```text
Open in Chrome: http://localhost:8089/?liveKitUrl=ws%3A%2F%2Flocalhost%3A7880&token=…
```

Open that link, click **Start** and allow the microphone. The heart of `agent.py`:

```python
# excerpt: python/self-host/agent.py
@server.rtc_session()
async def entrypoint(ctx: JobContext):
    await ctx.connect(auto_subscribe=AutoSubscribe.AUDIO_ONLY)  # the agent listens; it never needs your camera
    session = AgentSession(llm=openai.realtime.RealtimeModel(
        model=os.getenv("BITHUMAN_REALTIME_MODEL", "gpt-realtime-2.1-mini"),
        voice=os.getenv("BITHUMAN_VOICE", "coral"),
        # reply 0.5 s after you stop (the plugin's default semantic VAD can wait ~4 s)
        turn_detection=ServerVad(type="server_vad", silence_duration_ms=500, create_response=True,
                                 interrupt_response=True)))
    # Local mode: the avatar renders in this process and publishes the lip-synced video AND audio.
    avatar = bithuman.AvatarSession(model_path=os.environ["BITHUMAN_MODEL_PATH"],
                                    api_secret=os.environ["BITHUMAN_MASTER_SECRET"])
    await avatar.start(session, room=ctx.room)
    await session.start(
        agent=Agent(instructions=os.getenv("BITHUMAN_INSTRUCTIONS", "You are a friendly assistant. Keep answers short.")),
        room=ctx.room, room_options=RoomOptions(audio_output=False, close_on_disconnect=False))
```

`BITHUMAN_AVATAR` in `.env` picks the avatar (a sample name such as `wise-pup`, an agent code or a file; default `wise-pup`); `agent.py` downloads it and sets `BITHUMAN_MODEL_PATH`.

Swap the `RealtimeModel` for any LiveKit speech-to-text, LLM and text-to-speech plugins; the avatar lines stay the same.

## Python voice conversation

The same conversation in a desktop window, with no LiveKit server and no browser: your microphone goes to OpenAI Realtime, and the reply's voice drives a bitHuman avatar rendered on your machine.

### Requirements

- A bitHuman API secret ([Developer → API Secrets](https://www.bithuman.ai/developer/api-keys)) and an `OPENAI_API_KEY`.
- Python 3.10–3.14 in a virtualenv, a microphone and speakers.
- On Linux, the PortAudio library: `sudo apt install libportaudio2`.

### Get the code

```bash
git clone https://gitlab.com/bithuman/sdk/bithuman-examples.git
cd bithuman-examples/python/quickstart
python3 -m venv .venv && . .venv/bin/activate
pip install -r requirements.txt
bithuman pull sofia-ramirez 2>/dev/null || curl -fsSL --create-dirs -o ~/.cache/bithuman/showcase/sofia-ramirez.imx \
  "https://api.bithuman.ai/v1/agent/A52DHS2219/model/download?model=essence-2"
```

`sofia-ramirez` is a sample avatar (Essence 2, about 148 MB); downloading it needs no credential.

```bash
export BITHUMAN_API_SECRET="<your API secret>" OPENAI_API_KEY="<your OpenAI key>"
```

### Run it

```bash
python conversation.py --model ~/.cache/bithuman/showcase/sofia-ramirez.imx
```

Speak into your microphone; press `Q` in the window to quit.

A window opens with the avatar at rest. When you stop speaking, the avatar answers, lip-synced, and you hear the reply through your speakers.

### How it works

The pipeline: microphone → OpenAI Realtime (24 kHz PCM16) → `push_audio`/`flush` into the runtime → lip-synced frames and audio out. The heart of `conversation.py`:

```python
# excerpt: python/quickstart/conversation.py
async with client.realtime.connect(model="gpt-realtime-2.1-mini") as conn:
    await conn.session.update(session={
        "type": "realtime",
        "instructions": "You are a friendly AI assistant. Keep responses concise.",
        "output_modalities": ["audio"],
        "audio": {
            "input": {"format": {"type": "audio/pcm", "rate": OPENAI_SAMPLE_RATE},
                      "turn_detection": {"type": "server_vad"}},
            "output": {"format": {"type": "audio/pcm", "rate": OPENAI_SAMPLE_RATE},
                       "voice": args.voice},
        },
    })
# …
async for event in conn:
    if event.type == "response.output_audio.delta":
        await ai_audio_queue.put(base64.b64decode(event.delta))
    elif event.type == "response.output_audio.done":
        await ai_audio_queue.put(None)
# …
async def push_to_bithuman():
    while True:
        data = await ai_audio_queue.get()
        if data is None:
            await runtime.flush()
        else:
            await runtime.push_audio(data, OPENAI_SAMPLE_RATE, last_chunk=False)
# …
async for frame in runtime.run():
    if frame.has_image:
        cv2.imshow(WINDOW, frame.bgr_image)
        if cv2.waitKey(1) & 0xFF == ord("q"):
            break

    if frame.audio_chunk:
        with speaker_lock:
            speaker_buf.extend(frame.audio_chunk.array.tobytes())
```

- **Personality:** edit the `instructions` string.
- **Voice:** pass `--voice` with any OpenAI Realtime voice.
- **Another avatar:** `bithuman list` prints every sample slug; pass the file with `--model`.
