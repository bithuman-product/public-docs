---
title: "AI voice chat"
description: "Talk to an OpenAI Realtime voice agent and watch a bitHuman avatar lip-sync the response in real time."
section: examples
group: "Examples"
order: 21
type: example
label: "Python: voice conversation"
---


Talk to an avatar in a desktop window: your microphone goes to OpenAI Realtime, and the reply's voice drives a bitHuman avatar rendered on your machine. No LiveKit server and no browser; for the same conversation in a browser, see [Talk to an avatar on your machine](/guides/local-voice-avatar).

## Requirements

- A bitHuman API secret ([Developer → API Secrets](https://www.bithuman.ai/developer/api-keys)) and an `OPENAI_API_KEY`.
- Python 3.10–3.14 in a virtualenv, a microphone and speakers.
- On Linux, the PortAudio library: `sudo apt install libportaudio2`.

## Get the code

```bash
git clone https://github.com/bithuman-product/bithuman-examples.git
cd bithuman-examples/python/quickstart
python3 -m venv .venv && . .venv/bin/activate
pip install -r requirements.txt
bithuman pull sofia-ramirez 2>/dev/null || curl -fsSL --create-dirs -o ~/.cache/bithuman/showcase/sofia-ramirez.imx \
  "https://api.bithuman.ai/v1/agent/A52DHS2219/model/download?model=essence-2"
```

`sofia-ramirez` is a free sample avatar (Essence 2, about 148 MB); downloading it needs no credential.

## Set your API secret

```bash
export BITHUMAN_API_SECRET="<your API secret>" OPENAI_API_KEY="<your OpenAI key>"
```

## Run it

```bash
python conversation.py --model ~/.cache/bithuman/showcase/sofia-ramirez.imx
```

Speak into your microphone; press `Q` in the window to quit.

## Expected output

A window opens with the avatar at rest. When you stop speaking, the avatar answers, lip-synced, and you hear the reply through your speakers.

## How it works

The pipeline: microphone → OpenAI Realtime (24 kHz PCM16) → `push_audio`/`flush` into the runtime → lip-synced frames and audio out. The heart of `conversation.py`:

```python
# excerpt: python/quickstart/conversation.py
# Configure the OpenAI Realtime session, then bridge its audio into bitHuman.
async with client.realtime.connect(model="gpt-realtime-mini") as conn:
    await conn.session.update(session={
        "type": "realtime",
        "instructions": "You are a friendly AI assistant. Keep responses concise.",
        "output_modalities": ["audio"],
        "audio": {
            "input": {"format": {"type": "audio/pcm", "rate": 24000},
                      "turn_detection": {"type": "server_vad"}},
            "output": {"format": {"type": "audio/pcm", "rate": 24000}, "voice": "coral"},
        },
    })

    async for event in conn:
        if event.type == "response.output_audio.delta":
            # OpenAI speaks at 24 kHz — push straight into the avatar runtime.
            await runtime.push_audio(base64.b64decode(event.delta), 24000, last_chunk=False)
        elif event.type == "response.output_audio.done":
            await runtime.flush()

# Meanwhile, the render loop draws every frame and plays its synced audio:
async for frame in runtime.run():
    if frame.has_image:
        cv2.imshow("bitHuman", frame.bgr_image)
        if cv2.waitKey(1) & 0xFF == ord("q"):
            break
    if frame.audio_chunk:
        speaker_buf.extend(frame.audio_chunk.array.tobytes())
```

## Make it your own

- **Personality:** edit the `instructions` string.
- **Voice:** pass `--voice` with any OpenAI Realtime voice.
- **Another avatar:** `bithuman list` prints every sample slug; pass the file with `--model`.

## Troubleshooting

| Symptom | Cause | Fix |
|---|---|---|
| `OSError: PortAudio library not found` | the system library is missing | `sudo apt install libportaudio2` (Debian, Ubuntu) |
| `cv2.error: … The function is not implemented` | the headless OpenCV build won the install | `pip install --force-reinstall --no-deps opencv-python` |
| `error: externally-managed-environment` | outside the virtualenv | `. .venv/bin/activate` |
| No microphone input on macOS | the terminal has no microphone permission | System Settings → Privacy & Security → Microphone |

## Next

- [Talk to an avatar on your machine](/guides/local-voice-avatar) — the same conversation in a browser, on your own LiveKit server.
- [Python SDK](/sdk/python) — the full `AsyncBithuman` surface.
- [Audio streaming](/concepts/audio-streaming) — the `push_audio` / `flush` / `run` contract this example uses.
