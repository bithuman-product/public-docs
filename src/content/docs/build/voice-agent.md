---
title: "Voice agent"
description: "A voice avatar on your own computer: LiveKit runs locally, OpenAI Realtime listens and speaks on your own key, and the bitHuman avatar renders on your CPU. One CLI command, or a short Python agent."
section: build
group: "Conversations"
order: 10
type: guide
llms: build
next: ["/platforms/cli", "/platforms/python", "/build/voices"]
artifacts: ["cli", "python"]
moved:
  with-python: /build/voice-agent/python#with-python
  python-voice-conversation: /build/voice-agent/python#python-voice-conversation
  requirements: /build/voice-agent/python#requirements
  get-the-code: /build/voice-agent/python#get-the-code
  run-it: /build/voice-agent/python#run-it
  how-it-works: /build/voice-agent/python#how-it-works
  barge-in: /build/barge-in
  what-you-pay: /pricing
  troubleshooting: /resources/troubleshooting#voice-agent
---

Everything except the voice model runs on your computer. LiveKit is the stock `livekit-server`, OpenAI Realtime listens, thinks and speaks on your own `OPENAI_API_KEY`, and the bitHuman avatar renders on your CPU — no GPU needed.

The avatar name picks the model: `wise-pup` is Expression 2, `sofia-ramirez` is Essence 2, or pass your own agent code or avatar file. You need two secrets: your bitHuman API secret (both models refuse to render without it) and `OPENAI_API_KEY`.

```diagram
livekit-local
```

Use [the CLI](#with-the-cli) for a talking avatar with no code, [Python](/build/voice-agent/python#with-python) for your own agent code, or the [Python voice conversation](/build/voice-agent/python#python-voice-conversation) for a desktop window with no LiveKit server.

## With the CLI

The CLI starts `livekit-server`, the voice agent and the avatar, then opens its page in your browser.

```bash
# macOS (Apple silicon): installs livekit-server too
brew install bithuman-product/bithuman/bithuman-cli
# Linux x86_64 or arm64: the download includes livekit-server
sudo apt install -y ffmpeg python3-venv            # Ubuntu/Debian; macOS gets both from brew
curl -fsSL https://install.bithuman.ai | sh

bithuman login                                   # opens your browser; in CI, export BITHUMAN_API_SECRET instead
export OPENAI_API_KEY="<your OpenAI key>"
bithuman run wise-pup                            # Expression 2; `bithuman run sofia-ramirez` for Essence 2
```

Expected output:

```text
      http://127.0.0.1:8088/WISEPUP
  Opening your browser… (Ctrl-C to stop.)
```

The first run downloads the avatar and sets up the voice agent, which takes a minute or two and needs Python 3.11 or newer. Allow the microphone and say "hi": the avatar answers, lip-synced, and stops when you talk over it. The voice settings are on [CLI](/platforms/cli/voice#voice-settings).

## Pick the avatar

`bithuman run <value>`, or `BITHUMAN_AVATAR=<value>` in the Python example's `.env`:

| Value | You get |
|---|---|
| `wise-pup` | Expression 2, a sample avatar |
| `sofia-ramirez` | Essence 2, a sample avatar |
| your agent code, e.g. `A24EKJ8433` | your own avatar, downloaded with your API secret |
| a path to an avatar file | a file you already have |

## Configuration

The Python example reads these from `.env`:

| Variable | Default | What it does |
|---|---|---|
| `BITHUMAN_MASTER_SECRET` | — | Your API secret, passed to the plugin explicitly. Rendering is metered on it. In a LiveKit worker, name the secret `BITHUMAN_MASTER_SECRET`, never `BITHUMAN_API_SECRET`; `agent.py` refuses to start while `BITHUMAN_API_SECRET` is set. |
| `OPENAI_API_KEY` | — | Your OpenAI key. |
| `BITHUMAN_AVATAR` | `wise-pup` | Which avatar ([table above](#pick-the-avatar)). |
| `BITHUMAN_REALTIME_MODEL` | `gpt-realtime-2.1-mini` | The OpenAI Realtime model. |
| `BITHUMAN_VOICE` | `coral` | Any OpenAI Realtime voice. |
| `BITHUMAN_INSTRUCTIONS` | a short assistant prompt | The agent's system prompt. |
| `LIVEKIT_URL`, `LIVEKIT_API_KEY`, `LIVEKIT_API_SECRET` | `ws://localhost:7880`, `devkey`, `secret` | Your LiveKit server (`livekit-server --dev`). |

Cost: session time, talking or idle, bills bitHuman credits; OpenAI bills your own key ([Pricing](/pricing)). Stops mid-sentence when you talk over it: [Barge-in](/build/barge-in). Something wrong: [Troubleshooting](/resources/troubleshooting#voice-agent).
