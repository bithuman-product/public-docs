---
title: "Python"
description: "Render Essence 2 and Expression 2 avatars from Python: open an avatar, push audio, get frames, on macOS (Apple silicon) and Linux."
section: sdk
group: "Platforms"
order: 20
type: platform
label: "Python"
---

The `bithuman` package renders avatars in your own Python code: file in, frames out, or a live stream of audio in and frames out. To run an avatar without code, use the [CLI](/sdk/cli).

| Detail | Expression 2 | Essence 2 |
|---|---|---|
| **What renders** | [any character from one portrait](/concepts/expression-2), 416×720 at 20 fps | [a photoreal person from one portrait](/concepts/essence-2), up to 1920×1080 at 25 fps |
| **Install** | `pip install "bithuman[expression-2]"` | included in the same install |
| **Frames** | RGB `numpy` arrays, `(height, width, 3)` `uint8` | the same |

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

Set `BITHUMAN_API_SECRET` in the shell that runs Python, or pass `api_secret=`. See [Your API secret](/start/api-secret). Credits pay for session time, talking or idle, by the exact second ([pricing](/guides/pricing)). Downloading a sample avatar needs no account.

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

To write an MP4 instead, use the offline route (Essence 2, needs `ffmpeg`). Download the `sofia-ramirez` Essence 2 sample first:

```bash
curl -fL -o sofia-ramirez.imx "https://api.bithuman.ai/v1/agent/A52DHS2219/model/download?model=essence-2"
```

```python
from bithuman.offline import render_offline
render_offline("sofia-ramirez.imx", "speech.wav", out_mp4="out.mp4")
# → out.mp4: 1080×1920 with the speech, 15.2 s
```

## Integrate into your app

For a live conversation, `AsyncBithuman` takes audio as it arrives and yields frames and audio at the model's rate:

```python
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
        async for frame in avatar.run():                              # paced at 20 or 25 fps
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

The [LiveKit plugin](/sdk/livekit) runs `AsyncBithuman` inside a LiveKit Agents worker: pass `model_path` and the avatar renders in the worker's own process, next to an OpenAI Realtime voice.

```python
# excerpt: python/self-host/agent.py (bithuman-examples)
session = AgentSession(llm=openai.realtime.RealtimeModel(model="gpt-realtime-2.1-mini", voice="coral",
    turn_detection=ServerVad(type="server_vad", silence_duration_ms=500)))   # reply 0.5 s after you stop
avatar = bithuman.AvatarSession(model_path="wise-pup.imx",    # renders here
                                api_secret=os.environ["BITHUMAN_MASTER_SECRET"])
await avatar.start(session, room=ctx.room)
await session.start(agent=Agent(instructions="You are a friendly assistant."),
                    room=ctx.room, room_options=RoomOptions(audio_output=False))
```

In a LiveKit worker, keep your API secret as `BITHUMAN_MASTER_SECRET` and pass it explicitly: the plugin reads `BITHUMAN_API_SECRET` by itself and, for a cloud avatar, copies it into the room ([LiveKit](/sdk/livekit#authenticate)). The runnable example with `livekit-server --dev` and a browser link: [Talk to an avatar on your machine](/guides/local-voice-avatar#with-python).

## Platform notes

- The first Essence 2 render downloads a shared audio encoder (about 377 MB, plus about 70 MB for streaming) to `~/.bithuman/deps`, once.
- `BITHUMAN_CACHE_DIR` moves the download cache from `~/.cache/bithuman`.
- `python -m bithuman render <AGENT_CODE> <audio>` downloads your own agent's model by code and renders it.
- A process with no API secret opens the file and refuses at the first frame; a rejected secret refuses at `open`.

## Performance

Frame rates for Python on macOS and Linux are on [Desktop performance](/performance/desktop). A finished `render` logs its own rate on the `bithuman` logger at INFO.

## Troubleshooting

| Symptom | Cause | Fix |
|---|---|---|
| `error: externally-managed-environment` | `pip` targeted the system Python | create and activate a venv |
| `ModuleNotFoundError: No module named 'bithuman'` | the venv is not active in this terminal | `source .venv/bin/activate` |
| `pip` finds no wheel | Intel Mac, Windows, musl, or Python outside 3.10–3.14 | use a supported platform (WSL2 on Windows) |
| `NotSupported` opening an Expression 2 file | the extra is missing | `pip install "bithuman[expression-2]"` |
| `NotAuthorised` at the first frame: *no credential was supplied* | no secret in this shell | `export BITHUMAN_API_SECRET=…` |
| `NotAuthorised` at `open`: *that key was not accepted (401)* | the secret was rejected | create a new one under [API secrets](https://www.bithuman.ai/developer/api-keys) |
| `MeteringNotArmedError` from `render_offline` | no secret | set `BITHUMAN_API_SECRET`, or pass `api_secret=` |
| An MP4 with sound and no picture | a refused `render_offline` leaves the audio track | set the secret, delete the file, render again; check the frame count, not the file |
| Frames look blue | frames are RGB and your display wants BGR | `image[:, :, ::-1]` |
| Raw audio plays slow and long | decoded audio must be 16 kHz mono | pass a file path, or resample to 16 kHz |
| `404 NOT_FOUND` downloading a model | not your agent and not a sample avatar | check the code under [your agents](/api/agents) |

## Reference

- [Python API reference](/sdk/python-api): every public class and function.
- [Python examples](https://github.com/bithuman-product/bithuman-examples/tree/main/python): quickstart, local conversation, cloud with LiveKit.
- [Changelog](/changelog) and [Downloads & versions](/downloads).
