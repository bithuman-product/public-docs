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

```text
Your browser  <──>  livekit-server  <──>  the agent: OpenAI Realtime hears you and replies;
(localhost)         (your machine)        bitHuman renders the face from the reply's voice
```

Use [the CLI](#with-the-cli) for a talking avatar with no code, or [Python](#with-python) for your own agent code.

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

The first run downloads the avatar and sets up the voice agent, which takes a minute or two and needs Python 3.11 or newer. Allow the microphone and say "hi": the avatar answers, lip-synced, and stops when you talk over it. The voice settings are on [CLI](/sdk/cli#voice-settings).

## With Python

A plain [LiveKit Agents](https://docs.livekit.io/agents/) program: you run `livekit-server` (1.9.12 or newer; check with `livekit-server --version`), and the avatar renders inside `agent.py`. Use Python 3.11–3.13. The CLI checks its `livekit-server` version for you.

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
Open in Chrome: http://localhost:8089/?liveKitUrl=ws%3A%2F%2Flocalhost%3A7880&token=…
```

Open that link, click **Start** and allow the microphone. The heart of `agent.py`:

```python
# excerpt: python/self-host/agent.py
@server.rtc_session()
async def entrypoint(ctx: JobContext):
    await ctx.connect(auto_subscribe=AutoSubscribe.AUDIO_ONLY)
    session = AgentSession(llm=openai.realtime.RealtimeModel(
        model=os.getenv("BITHUMAN_REALTIME_MODEL", "gpt-realtime-2.1-mini"),
        voice=os.getenv("BITHUMAN_VOICE", "coral"),
        turn_detection=ServerVad(type="server_vad", silence_duration_ms=500)))  # reply 0.5 s after you stop
    # The avatar renders in this process and publishes the lip-synced video and audio.
    avatar = bithuman.AvatarSession(model_path=os.environ["BITHUMAN_MODEL_PATH"])
    await avatar.start(session, room=ctx.room)
    await session.start(agent=Agent(instructions="You are a friendly assistant."),
                        room=ctx.room, room_options=RoomOptions(audio_output=False))
```

Swap the `RealtimeModel` for any LiveKit speech-to-text, LLM and text-to-speech plugins; the avatar lines stay the same.

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
| `BITHUMAN_API_SECRET` | — | Your API secret. Rendering is metered on it. |
| `OPENAI_API_KEY` | — | Your OpenAI key. |
| `BITHUMAN_AVATAR` | `wise-pup` | Which avatar ([table above](#pick-the-avatar)). |
| `BITHUMAN_REALTIME_MODEL` | `gpt-realtime-2.1-mini` | The OpenAI Realtime model. |
| `BITHUMAN_VOICE` | `coral` | Any OpenAI Realtime voice. |
| `BITHUMAN_INSTRUCTIONS` | a short assistant prompt | The agent's system prompt. |
| `LIVEKIT_URL`, `LIVEKIT_API_KEY`, `LIVEKIT_API_SECRET` | `ws://localhost:7880`, `devkey`, `secret` | Your LiveKit server (`livekit-server --dev`). |

## What you pay

Talking time bills bitHuman credits and idle is free; OpenAI bills your own key. See [Pricing](/guides/pricing).

## Troubleshooting

| Symptom | Cause | Fix |
|---|---|---|
| `bithuman run` exits 69: `livekit-server 1.8.0 at …/livekit-server is too old for `bithuman run`` | The CLI needs livekit-server 1.13 or newer | `brew upgrade livekit` (macOS), or reinstall the CLI (Linux: its download includes one) |
| The video stalls for 1–2 s every 15 s, or a LiveKit Meet tile goes black | `livekit-server` older than 1.9.12: the browser leaves and rejoins the room every 15 s | `brew upgrade livekit` (macOS) or `curl -sSL https://get.livekit.io \| bash` (Linux), then restart `livekit-server` |
| `livekit-server not found` (exit 69) | LiveKit is not installed | `brew install livekit` (macOS) or `curl -sSL https://get.livekit.io \| bash` (Linux) |
| The avatar never appears | No or invalid `BITHUMAN_API_SECRET` | Sign in with `bithuman login`, or set it in `.env` |
| The avatar never appears; the terminal shows `essence-2: ffmpeg not found` | Essence 2 unpacks its avatar with `ffmpeg` | `sudo apt install -y ffmpeg`, then run again |
| `This example needs Python 3.11, 3.12 or 3.13` | The plugin installs without `bithuman` on 3.10 and 3.14 | Make the venv with Python 3.11–3.13 |
| The page says it could not connect | `livekit-server --dev` is not running | Start it, then click **Start** again |
| Nothing happens after joining | `livekit-server --dev` or `agent.py` is not running | Start both, `livekit-server` first |
| Another device on your network cannot join | `--dev` listens on `localhost` only | `livekit-server --dev --bind 0.0.0.0 --node-ip <your LAN IP>`; other browsers also need HTTPS for the microphone |
