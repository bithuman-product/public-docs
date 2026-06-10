---
title: "AI voice chat"
description: "Talk to an OpenAI Realtime voice agent and watch a bitHuman avatar lip-sync the response in real time."
section: examples
group: "Examples"
order: 15
---

## Prerequisites

- A bitHuman API secret — get one at [Developer → API Keys](https://www.bithuman.ai/#developer); see [Authentication](/api/authentication).
- An `OPENAI_API_KEY` (the brain) — from [openai.com](https://openai.com).
- Python 3.10+ in a virtualenv. The example's `requirements.txt` pulls everything (the SDK ships no OpenCV; the display window needs it):

```bash
git clone https://github.com/bithuman-product/bithuman-sdk-public.git
cd bithuman-sdk-public/Examples/python/local-essence
python3 -m venv .venv && source .venv/bin/activate && pip install -r requirements.txt
```

- An avatar `.imx` model and a working mic. Download one to the cache path the run command below uses — `curl -L https://models.bithuman.ai/showcase/modern-court-jester.imx --create-dirs -o ~/.cache/bithuman/showcase/modern-court-jester.imx` — or, on macOS, `bithuman pull modern-court-jester` (same destination). The CLI's PyPI wheel is macOS-only; on Linux use the direct download or grab one from [Explore](https://www.bithuman.ai/explore).
- Everything runs locally — no LiveKit server, no browser, no server-side WebRTC.

## Run it

1. Set both keys in the same shell (or copy `.env.example` to `.env` and fill it in).

```bash
export BITHUMAN_API_SECRET="your_secret" OPENAI_API_KEY="sk-..."
```

2. Run the conversation, pointing at your model. Speak into your mic; press `Q` in the window to quit.

```bash
python conversation.py --model ~/.cache/bithuman/showcase/modern-court-jester.imx
```

## What you'll see

An OpenCV window opens with the avatar. Your mic streams to the **OpenAI Realtime API**, the AI's spoken reply pipes into the bitHuman runtime, and the avatar lip-syncs the answer in real time while you hear it through your speakers.

## Full code

The pipeline: mic → OpenAI Realtime (24 kHz PCM16) → `push_audio`/`flush` into the runtime → lip-synced frames + audio out. The runnable script (`conversation.py`) wires up the mic, speaker, and OpenCV window; the heart of it is below.

```python
# Configure the OpenAI Realtime session, then bridge its audio into bitHuman.
async with client.beta.realtime.connect(model="gpt-4o-mini-realtime-preview") as conn:
    await conn.session.update(session={
        "instructions": "You are a friendly AI assistant. Keep responses concise.",
        "input_audio_format": "pcm16",
        "output_audio_format": "pcm16",
        "turn_detection": {"type": "server_vad"},
        "voice": "coral",
    })

    async for event in conn:
        if event.type == "response.audio.delta":
            # OpenAI speaks at 24 kHz — push straight into the avatar runtime.
            await runtime.push_audio(base64.b64decode(event.delta), 24000, last_chunk=False)
        elif event.type == "response.audio.done":
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

Customize the personality by editing the `instructions` string — e.g. "You are a patient tech expert who explains things simply." or "You are an enthusiastic product advisor."

Full source: [GitHub](https://github.com/bithuman-product/bithuman-sdk-public/tree/main/Examples/python/local-essence)

> **Note** **Common issues.** Script won't start → both keys set in the same shell? No mic input → grant the terminal mic permission (macOS: System Settings → Privacy & Security → Microphone). Avatar shows but doesn't lip-sync → OpenAI Realtime audio is 24 kHz PCM16; pass `24000` to `push_audio`. **Want it in the browser instead?** Run the [cloud-essence Docker Compose stack](https://github.com/bithuman-product/bithuman-sdk-public/tree/main/Examples/python/cloud-essence) and open `http://localhost:4202`.

## Next steps

- [Python SDK](/sdk/python) — full API surface, LiveKit voice agents, troubleshooting.
- [Audio streaming](/concepts/audio-streaming) — the `push_audio` / `flush` / `run` contract this example is built on.
- [macos-voice example](https://github.com/bithuman-product/bithuman-sdk-public/tree/main/Examples/swift/macos-voice) — fully on-device voice agent: speech never leaves your Mac.
