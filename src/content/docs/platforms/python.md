---
title: "Python"
description: "Render Essence 2 and Expression 2 avatars from Python: open an avatar, push audio, get frames, on macOS (Apple silicon) and Linux, where it needs no GPU."
section: platforms
group: "Code & terminal"
order: 10
type: platform
renders: ["server", "no-gpu"]
needs: ["API secret"]
artifacts: ["python"]
platforms: ["python"]
models: ["essence-2", "expression-2"]
claims: ["S2", "S3", "S4", "S7", "S10"]
next: ["/build/voice-agent", "/platforms/python/reference", "/deploy/cpu"]
---

<div class="lead">
<div class="lead-text">

The `bithuman` package renders avatars in your own Python code on your own machine: a file in and frames out, or a live stream of audio in and frames out. To run an avatar without code, use the [CLI](/platforms/cli).

> **Note:** On Linux, Python renders both models on the CPU alone, no GPU. On macOS it renders on Apple silicon. See [CPU only (no GPU)](/deploy/cpu).

| Detail | Expression 2 | Essence 2 |
|---|---|---|
| **Renders** | [any character from one portrait](/models/expression-2) | [a photoreal person from one portrait](/models/essence-2) |
| **Install** | `pip install "bithuman[expression-2]"` | included in the same install |
| **Frames** | RGB `numpy` arrays, `(height, width, 3)` `uint8` | the same |

</div>

```figure
python-macos eager
```

</div>


## Before you start

| You need | Check |
|---|---|
| Python 3.10–3.14 | `python3 --version` |
| macOS 14+ on Apple silicon, Linux x86_64 or Linux arm64 | `python3 -c "import platform; print(platform.system(), platform.machine())"` |
| An API secret | [Your API secret](/start/api-secret) |
| About 1 GB of disk (570 MB package, 118–190 MB per avatar) | `df -h .` |
| `ffmpeg` on `PATH`, for MP4 output only | `ffmpeg -version` |

## Install

```bash
python3 -m venv .venv
source .venv/bin/activate
pip install "bithuman[expression-2]"
```

Install into a virtual environment: Debian and Ubuntu refuse a system-wide `pip install` (`externally-managed-environment`). If `venv` is missing, run `sudo apt install -y python3-venv` first. The package installs no command-line tool.

## Authenticate

Set `BITHUMAN_API_SECRET` in the shell that runs Python (`bithuman.open` reads it), or pass `api_secret=` to `AsyncBithuman.create()`. See [Your API secret](/start/api-secret). Credits pay for session time, talking or idle, by the exact second ([pricing](/pricing)). Downloading a sample avatar needs no account.

## First frame

```bash
export BITHUMAN_API_SECRET="<your API secret>"
curl -fL -o wise-pup.imx "https://api.bithuman.ai/v1/agent/A23WJF0199/model/download?model=expression-2"
curl -fsSLo speech.wav https://docs.bithuman.ai/samples/speech.wav
```

```python
import bithuman

with bithuman.open("wise-pup.imx") as avatar:
    frames = [image for image in avatar.render("speech.wav")]
print(len(frames), "frames of", frames[0].shape)
# → 300 frames of (720, 416, 3)
```

`render` takes a path to any audio file `ffmpeg` reads, or already-decoded 16 kHz mono audio (`int16` or `float32` arrays, or raw 16-bit bytes). Frames are RGB; OpenCV expects BGR, so write one with `cv2.imwrite("frame.png", image[:, :, ::-1])`. The same call opens Essence 2 and Essence 1 `.imx` files.

To write an MP4 instead, pass `out_mp4=` to the same `render` (any model, needs `ffmpeg`); it returns the number of frames written. Download the `sofia-ramirez` Essence 2 sample first:

```bash
curl -fL -o sofia-ramirez.imx "https://api.bithuman.ai/v1/agent/A52DHS2219/model/download?model=essence-2"
```

```python
import bithuman
bithuman.open("sofia-ramirez.imx").render("speech.wav", out_mp4="out.mp4")
# → out.mp4: 1080×1920 with the speech, 15.2 s
```

## Complete example

The quickstart from the examples repository: open an avatar and watch it speak in a window.

### Requirements

| You need | Notes |
|---|---|
| Python 3.10–3.14 | on macOS (Apple silicon) or Linux (x86_64, arm64) |
| An [API secret](/start/api-secret) | |
| A desktop session | the example opens a window |

### Run it

```bash
git clone https://github.com/bithuman-product/bithuman-examples.git
cd bithuman-examples/python/quickstart
python3 -m venv .venv && source .venv/bin/activate && pip install -r requirements.txt
export BITHUMAN_API_SECRET="<your API secret>"
python local-avatar.py
```

### Expected output

A window titled **bitHuman avatar** opens and the avatar speaks the bundled `speech.wav`. The first run downloads the sample avatar (about 150 MB). To write an MP4 instead of opening a window, run `python -m bithuman ~/.cache/bithuman/models/A52DHS2219.imx speech.wav`.

### Make it your own

- **Your own avatar:** pass `--model` with your agent's `.imx`, downloaded with the [Agents API](/api/agents#download-an-agents-model) or `bithuman pull <AGENT_CODE>`.
- **Your own audio:** pass any audio file; or stream microphone audio with `AsyncBithuman` ([Integrate into your app](/platforms/python#integrate-into-your-app)).
- **A conversation:** `cloud-avatar.py` in the same folder connects the avatar to an OpenAI voice agent over LiveKit ([LiveKit](/platforms/livekit)).
- **A web app:** send the frames from `render()` to your own video stream, or use the [web embed](/platforms/web).

## Integrate into your app

For a live conversation, `AsyncBithuman` takes audio as it arrives and yields frames and audio at the model's rate:

```python
# excerpt: show() and play() are your own display and audio output
import asyncio, soundfile as sf
from bithuman import AsyncBithuman

async def main():
    avatar = await AsyncBithuman.create(model_path="wise-pup.imx")   # reads BITHUMAN_API_SECRET
    pcm, rate = sf.read("speech.wav", dtype="int16")

    async def speak():
        for i in range(0, len(pcm), rate // 10):                     # 100 ms chunks, as they arrive
            await avatar.push_audio(pcm[i:i + rate // 10].tobytes(), rate, last_chunk=False)
        await avatar.flush()                                          # end of the reply

    task = asyncio.create_task(speak())
    try:
        async for frame in avatar.run():                              # paced at the model's play rate
            if frame.has_image:
                show(frame.bgr_image)                                 # BGR numpy array
            if frame.audio_chunk:
                play(frame.audio_chunk.array)                         # audio in sync with the frame
    finally:
        task.cancel()
        await avatar.shutdown()                                       # frees the model and the credential

asyncio.run(main())
```

| Job | Call |
|---|---|
| Stream audio | `await avatar.push_audio(int16_bytes, sample_rate, last_chunk=False)` |
| End of a reply | `await avatar.flush()` |
| Interrupt the reply | `avatar.interrupt()` |
| Idle between replies | keep reading `run()`: it yields idle frames when there is no speech |
| Stop | `await avatar.shutdown()` in a `finally` (`stop()` keeps the model loaded) |

### A voice agent on your own LiveKit server

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

In a LiveKit worker, name the secret `BITHUMAN_MASTER_SECRET` and pass it explicitly ([LiveKit](/platforms/livekit#authenticate)). The runnable example with `livekit-server --dev` and a browser link: [Talk to an avatar on your machine](/build/voice-agent#with-python).

## Platform notes

- The first Essence 2 render downloads a shared audio encoder (about 377 MB, plus about 70 MB for streaming) to `~/.bithuman/deps`, once.
- `BITHUMAN_CACHE_DIR` moves the download cache from `~/.cache/bithuman`.
- `python -m bithuman render <AGENT_CODE> <audio>` downloads your own agent's model by code and renders it.
- A process with no API secret opens the file and refuses at the first frame; a rejected secret refuses at `open`.

## Performance

```perf
python-linux python-macos
```

A finished `render` logs its own rate on the `bithuman` logger at INFO.

## Troubleshooting

| Symptom | Cause | Fix |
|---|---|---|
| `error: externally-managed-environment` | `pip` targeted the system Python | create and activate a venv |
| `ModuleNotFoundError: No module named 'bithuman'` | the venv is not active in this terminal | `source .venv/bin/activate` |
| `pip` finds no wheel | Intel Mac, Windows, musl, or Python outside 3.10–3.14 | use a supported platform (WSL2 on Windows) |
| `NotSupported` opening an Expression 2 file | the extra is missing | `pip install "bithuman[expression-2]"` |
| `NotAuthorised` at the first frame: *no credential was supplied* | no secret in this shell | `export BITHUMAN_API_SECRET=…` |
| `NotAuthorised` at `open`: *that key was not accepted (401)* | the secret was rejected | create a new one under [API secrets](https://www.bithuman.ai/developer/api-keys) |
| `NotAuthorised: no API secret was found` from `bithuman.open` | no secret | set `BITHUMAN_API_SECRET`; nothing is rendered or written |
| An MP4 with sound and no picture | a refused render through the deprecated `render_offline` leaves the audio track | render with `bithuman.open(path).render(audio, out_mp4=...)`, which refuses before it writes anything; check the frame count it returns |
| Frames look blue | frames are RGB and your display wants BGR | `image[:, :, ::-1]` |
| Raw audio plays slow and long | decoded audio must be 16 kHz mono | pass a file path, or resample to 16 kHz |
| `404 NOT_FOUND` downloading a model | not your agent and not a sample avatar | check the code under [your agents](/api/agents) |
| The example window never opens (`GUI: NONE`) | the headless OpenCV build won the install | `pip install --force-reinstall --no-deps opencv-python` |

## Reference

- [Python API reference](/platforms/python/reference): every public class and function.
- [Python examples](https://github.com/bithuman-product/bithuman-examples/tree/main/python): quickstart, local conversation, cloud with LiveKit.
- [Changelog](/changelog) and [Downloads & versions](/downloads).
