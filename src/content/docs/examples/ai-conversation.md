---
title: "AI voice chat"
description: "Talk to an OpenAI Realtime voice agent and watch a bitHuman avatar lip-sync the response in real time."
section: examples
group: "Examples"
order: 15
---

## Overview

A full voice-driven conversation: your mic feeds OpenAI Realtime, the AI's spoken reply drives a bitHuman avatar that lip-syncs in real time. Runs locally — no LiveKit server, no browser, no extra infrastructure.

## Quick start

1. **Get accounts.**
   - **bitHuman** — [www.bithuman.ai](https://www.bithuman.ai)
   - **OpenAI** — [openai.com](https://openai.com)
2. **Set environment.**
   ```bash
   export BITHUMAN_API_SECRET="your_secret"
   export OPENAI_API_KEY="your_openai_key"
   ```
3. **Get the code and install deps.** Use a virtualenv — the example's `requirements.txt` pulls everything it needs (the SDK itself ships no OpenCV; the display window does).
   ```bash
   git clone https://github.com/bithuman-product/bithuman-sdk-public.git
   cd bithuman-sdk-public/Examples/python/local-essence
   python3 -m venv .venv && source .venv/bin/activate
   pip install -r requirements.txt        # bithuman, openai, opencv, …
   ```
4. **Run.** You need an avatar `.imx`. Easiest: run `bithuman pull modern-court-jester` once (caches to `~/.cache/bithuman/showcase/modern-court-jester.imx`), or download one from [Explore](https://www.bithuman.ai/#explore).
   ```bash
   python conversation.py --model ~/.cache/bithuman/showcase/modern-court-jester.imx
   ```
   Speak into your mic. The AI responds, the avatar lip-syncs in real time. Press `Q` to quit. [View source on GitHub](https://github.com/bithuman-product/bithuman-sdk-public/blob/main/Examples/python/local-essence/conversation.py).

## What it does

1. Captures audio from your microphone via `sounddevice`.
2. Streams it to the **OpenAI Realtime API** for AI conversation.
3. Pipes the AI's spoken reply into the bitHuman runtime.
4. Avatar lip-syncs and appears in an OpenCV window.

No LiveKit, no browser, no server-side WebRTC — everything runs on your machine. The audio path under the hood is the standard [push_audio / flush / run streaming contract](/concepts/audio-streaming).

## Customize the personality

```python
agent = Agent(
    instructions=(
        "You are a helpful customer-service assistant. "
        "Be friendly, professional, and solve problems quickly."
    )
)
```

Suggestions:

- **Tech support** — "You are a patient tech expert who explains things simply."
- **Sales** — "You are an enthusiastic product advisor."
- **Teacher** — "You are an encouraging tutor who makes learning fun."

## Common issues

| Problem | Fix |
|---|---|
| Script won't start | Check `BITHUMAN_API_SECRET` and `OPENAI_API_KEY` are both set in the same shell. |
| No mic input | Grant the terminal mic permission in System Settings → Privacy & Security → Microphone. |
| Avatar shows but doesn't lip-sync | Check the WAV / mic format — `conversation.py` expects 24 kHz PCM from OpenAI Realtime. |
| OpenAI rate limit | Your OpenAI account is throttled. Wait, retry, or upgrade your tier. |

## Want it in the browser?

For a full web-based setup with LiveKit + a browser UI, run the [Docker Compose stack](https://github.com/bithuman-product/bithuman-sdk-public/tree/main/Examples/python/cloud-essence) and open `http://localhost:4202`.

## Next steps

- [Python SDK](/sdk/python) — full API surface, LiveKit voice agents, troubleshooting.
- [macos-voice project](https://github.com/bithuman-product/bithuman-sdk-public/tree/main/Examples/swift/macos-voice) — fully on-device voice agent: speech never leaves your Mac.
- [Audio streaming](/concepts/audio-streaming) — the streaming contract this example is built on.
