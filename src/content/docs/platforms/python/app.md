---
title: "Build a Python app"
description: "Stream audio into an avatar from Python and take its frames live."
section: platforms
group: "Python"
order: 30
type: platform-app
llms: platforms
claims: ["S2", "S3", "S4", "S7", "S10"]
next: ["/platforms/python/troubleshooting", "/platforms/python/reference", "/platforms/python"]
moved:
  a-voice-agent-on-your-own-livekit-server: /build/voice-agent/python#a-voice-agent-on-your-own-livekit-server
---

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

A voice agent on your own LiveKit server: [Voice agent in Python](/build/voice-agent/python).

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
git clone https://gitlab.com/bithuman/sdk/bithuman-examples.git
cd bithuman-examples/python/quickstart
python3 -m venv .venv && source .venv/bin/activate && pip install -r requirements.txt
export BITHUMAN_API_SECRET="<your API secret>"
python local-avatar.py
```

### Expected output

A window titled **bitHuman avatar** opens and the avatar speaks the bundled `speech.wav`. The first run downloads the sample avatar (about 150 MB). To write an MP4 instead of opening a window, run `python -m bithuman render sofia-ramirez speech.wav`: it downloads the `sofia-ramirez` sample and writes `sofia-ramirez.mp4`.

### Make it your own

- **Your own avatar:** pass `--model` with your agent's `.imx`, downloaded with the [Agents API](/api/agents#download-an-agents-model) or `bithuman pull <AGENT_CODE>`.
- **Your own audio:** pass any audio file; or stream microphone audio with `AsyncBithuman` ([Integrate into your app](/platforms/python/app#integrate-into-your-app)).
- **A conversation:** `cloud-avatar.py` in the same folder connects the avatar to an OpenAI voice agent over LiveKit ([LiveKit](/platforms/livekit)).
- **A desktop companion:** `conversation.py` in the same folder talks with you through OpenAI Realtime, with your OpenAI key ([Companion app](/build/companion-app)).
- **A web app:** send the frames from `render()` to your own video stream, or use the [web embed](/platforms/web).

## Platform notes

- The first Essence 2 render downloads a shared audio encoder (about 66 MB) to `~/.bithuman/deps`, once.
- `BITHUMAN_CACHE_DIR` moves the download cache from `~/.cache/bithuman`.
- `python -m bithuman render <AGENT_CODE> <audio>` downloads your own agent's model by code and renders it.
- A process with no API secret, or with a rejected one, refuses at `open` with `NotAuthorised`.

## Reference

- [Python API reference](/platforms/python/reference): every public class and function.
- [Python examples](https://gitlab.com/bithuman/sdk/bithuman-examples/-/tree/main/python): quickstart, local conversation, cloud with LiveKit.
- [Changelog](/changelog) and [Downloads & versions](/downloads).
