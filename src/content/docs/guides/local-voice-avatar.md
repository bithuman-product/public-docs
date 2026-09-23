---
title: "Talk to an avatar on your machine"
description: "A voice avatar on your own computer: LiveKit runs locally, OpenAI Realtime listens and speaks on your own key, and the bitHuman avatar renders on your CPU. One CLI command, or a short Python agent."
section: guides
group: "Deploy"
order: 29
type: guide
label: "Local voice avatar"
---

Everything except the voice model runs on your computer. LiveKit is the stock `livekit-server`, OpenAI Realtime listens, thinks and speaks on your own `OPENAI_API_KEY`, and the bitHuman avatar renders on your CPU — no GPU needed.

The avatar name picks the model: `wise-pup` is Expression 2, `sofia-ramirez` is Essence 2, or pass your own agent code or avatar file. You need two secrets: `BITHUMAN_API_SECRET` (both models refuse to render without it) and `OPENAI_API_KEY`.

There are two ways to run it:

| You want | Use | What you write |
|---|---|---|
| A talking avatar now, no code | [the CLI](#with-the-cli) | one command |
| Your own agent code on your own LiveKit server | [Python](#with-python) | a 70-line LiveKit Agents program |

## How it fits together

```text
Your browser  <──WebRTC──>  livekit-server (your machine)  <──>  the agent (your machine)
                                                                  ├─ OpenAI Realtime: your voice in, the reply's voice out
                                                                  └─ bitHuman: renders the face from the reply's voice,
                                                                     publishes the lip-synced video and audio
```

The browser talks to LiveKit on `localhost`. The agent sends your microphone audio to OpenAI Realtime, and the reply's audio drives the bitHuman avatar, which is rendered in the agent's own process on your machine.

## With the CLI

The CLI starts `livekit-server`, the voice agent and the avatar for you, then opens its own page in your browser.

```bash
# macOS (Apple silicon): installs livekit-server too
brew install bithuman-product/bithuman/bithuman-cli
# Linux x86_64 or arm64: the download includes livekit-server
curl -fsSL https://install.bithuman.ai | sh

bithuman login                                   # opens your browser; in CI, export BITHUMAN_API_SECRET instead
export OPENAI_API_KEY="<your OpenAI key>"
bithuman run wise-pup                            # Expression 2; `bithuman run sofia-ramirez` for Essence 2
```

Expected output:

```text
  bithuman is live:
      http://127.0.0.1:8088/WISEPUP
  Opening your browser… (Ctrl-C to stop.)
```

The first run downloads the avatar and prepares the voice agent once, which takes a minute or two. Allow the microphone, say "hi", and the avatar answers, lip-synced; talk over it and it stops to listen. Ctrl-C ends the session.

The voice agent is set from the environment:

| Variable | Default | What it does |
|---|---|---|
| `OPENAI_API_KEY` | — | Your OpenAI key. The conversation runs on it. |
| `BITHUMAN_REALTIME_MODEL` | `gpt-realtime-mini` | The OpenAI Realtime model. |
| `BITHUMAN_VOICE` | `alloy` | Any OpenAI Realtime voice. |
| `BITHUMAN_INSTRUCTIONS` | a short assistant prompt | The agent's system prompt. |

The voice agent needs Python 3.11 or newer on your machine (`brew install python@3.13` on macOS; `sudo apt install python3-venv` on Ubuntu). Full command reference: [CLI](/sdk/cli).

## With Python

The Python example is a plain [LiveKit Agents](https://docs.livekit.io/agents/) program. You run `livekit-server` yourself and the avatar renders inside `agent.py`. Use Python 3.11, 3.12 or 3.13.

```bash
# 1. LiveKit server
brew install livekit python@3.13                  # macOS
curl -sSL https://get.livekit.io | bash           # Linux (Ubuntu 24.04 also: sudo apt install python3.12-venv)

# 2. The example
git clone https://github.com/bithuman-product/bithuman-examples
cd bithuman-examples/python/self-host
python3.13 -m venv .venv && . .venv/bin/activate  # Ubuntu 24.04: python3.12
pip install -r requirements.txt

# 3. Keys: in .env, never on the command line
cp .env.example .env                              # fill BITHUMAN_API_SECRET and OPENAI_API_KEY

# 4. Run, in two terminals
livekit-server --dev                              # terminal 1
python agent.py dev                               # terminal 2
```

Expected output in terminal 2:

```text
Open in Chrome: https://meet.livekit.io/custom?liveKitUrl=ws%3A%2F%2Flocalhost%3A7880&token=…
```

Open that link. LiveKit Meet asks for the microphone and for access to your local network — allow both, then talk.

The heart of `agent.py`:

```python
# excerpt: python/self-host/agent.py
@server.rtc_session()
async def entrypoint(ctx: JobContext):
    await ctx.connect(auto_subscribe=AutoSubscribe.AUDIO_ONLY)
    session = AgentSession(llm=openai.realtime.RealtimeModel(
        model=os.getenv("BITHUMAN_REALTIME_MODEL", "gpt-realtime-mini"),
        voice=os.getenv("BITHUMAN_VOICE", "coral")))
    # The avatar renders in this process and publishes the lip-synced video and audio.
    avatar = bithuman.AvatarSession(model_path=os.environ["BITHUMAN_MODEL_PATH"])
    await avatar.start(session, room=ctx.room)
    await session.start(agent=Agent(instructions="You are a friendly assistant."),
                        room=ctx.room, room_options=RoomOptions(audio_output=False))
```

Because it is a LiveKit Agents program, you can swap the `RealtimeModel` for any speech-to-text, LLM and text-to-speech plugins; the avatar lines stay the same. More on the plugin: [LiveKit](/sdk/livekit).

## Pick the avatar

The CLI takes it as the argument to `bithuman run`; the Python example reads `BITHUMAN_AVATAR` from `.env`.

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
| `BITHUMAN_API_SECRET` | — | Your API secret. Rendering is metered on it. |
| `OPENAI_API_KEY` | — | Your OpenAI key. |
| `BITHUMAN_AVATAR` | `wise-pup` | Which avatar ([table above](#pick-the-avatar)). |
| `BITHUMAN_REALTIME_MODEL` | `gpt-realtime-mini` | The OpenAI Realtime model. |
| `BITHUMAN_VOICE` | `coral` | Any OpenAI Realtime voice. |
| `BITHUMAN_INSTRUCTIONS` | a short assistant prompt | The agent's system prompt. |
| `LIVEKIT_URL`, `LIVEKIT_API_KEY`, `LIVEKIT_API_SECRET` | `ws://localhost:7880`, `devkey`, `secret` | Your LiveKit server (`livekit-server --dev`). |

## What you pay

bitHuman credits for the seconds the avatar is talking; an idle avatar is not billed. OpenAI bills your OpenAI key for the Realtime session. Rates are on [Pricing](/guides/pricing).

## Troubleshooting

| Symptom | Cause | Fix |
|---|---|---|
| `Agent dispatch failed: … no response from servers` | An old `livekit-server` | Use livekit-server 1.13 or newer: `brew upgrade livekit` |
| `livekit-server not found` (exit 69) | LiveKit is not installed | `brew install livekit` (macOS) or `curl -sSL https://get.livekit.io \| bash` (Linux) |
| The avatar never appears | No or invalid `BITHUMAN_API_SECRET` | Sign in with `bithuman login`, or set it in `.env` |
| `This example needs Python 3.11, 3.12 or 3.13` | The plugin installs without `bithuman` on 3.10 and 3.14 | Make the venv with Python 3.11–3.13 |
| LiveKit Meet cannot connect | Chrome blocked local-network access | Site settings → allow local network access, then reload |
| Nothing happens after joining | `livekit-server --dev` or `agent.py` is not running | Start both, `livekit-server` first |
| Another device on your network cannot join | `--dev` listens on `localhost` only | `livekit-server --dev --bind 0.0.0.0 --node-ip <your LAN IP>`; other browsers also need HTTPS for the microphone |
