---
title: "Your servers (self-hosted)"
description: "Run the CLI, the Python SDK or the LiveKit plugin on your own Mac or Linux machines. When the avatar renders on your hardware, its audio and video stay there."
section: deploy
group: "Where it renders"
order: 20
type: deploy
llms: deploy
searchTitle: "Your servers (self-hosted): self-host bitHuman on your own machines"
availability: "creator"
renders: ["server", "no-gpu"]
models: ["essence-2", "expression-2", "essence-1"]
claims: ["S2", "S3", "S4", "S5", "S6", "S7", "S9", "S10", "S26", "S31"]
next: ["/platforms/cli", "/platforms/python", "/platforms/livekit"]
moved:
  models-available-here: /deploy#compare
  choosing-between-modes: /deploy#compare
---

## What it is

The avatar renders on machines you run: a Mac with Apple silicon, or a Linux PC or server on x86_64 or arm64, including one with no GPU. You choose where the conversation runs. There is no license to buy for online self-hosting: it needs the Creator plan or higher and bills credits at the self-hosted rate.

| You want | Use | Models |
|---|---|---|
| A talking avatar or an MP4, no code | [CLI](/platforms/cli) | Essence 2 and Expression 2 (`run`, `render`); Essence 1 (`run`) |
| Frames or MP4 clips from your own code | [Python SDK](/platforms/python) | Essence 2, Expression 2, Essence 1 |
| A voice agent in your own LiveKit rooms, rendered on your machine | [LiveKit plugin](/platforms/livekit) with `model_path=` ([guide](/build/voice-agent)) | Essence 2, Expression 2 |

Compare every mode: [Deployment options](/deploy#compare).

## Where it renders

```dataflow
servers
```

```diagram
topology servers
```

When the avatar renders on your hardware, its audio and video stay there. For the conversation, the CLI's [local conversation brain](/platforms/cli/local-brain) keeps speech recognition, the language model and the voice on the machine, or you bring any OpenAI-compatible language model, including one in your own network ([Providers](/api/providers)). Self-hosted sessions store no transcript at bitHuman.

## Speed

```perf
linux-cpu python-linux macos-m4 python-macos
```

## Price

```price
servers
```

Rendering an MP4 (`bithuman render`, or `render()` in Python) bills the length of the video it writes, at the same rate.

## Limits

- **Credential:** rendering needs a credential. Sign in with `bithuman login`, or set `BITHUMAN_API_SECRET` ([Your API secret](/start/api-secret)).
- **Network:** a session checks your credential when it starts and keeps rendering through a network drop of up to 5 minutes. Usage reports carry no audio, video, images or conversation text.
- **Sessions:** self-hosted sessions are limited by credits.
- **Operating systems:** macOS on Apple silicon; Linux on x86_64 or arm64; Windows 11 on x86_64 with [Python](/platforms/windows).
- **Off the internet:** see [Fully offline](/deploy/offline).

## First command

```bash tab="CLI"
curl -fsSL https://install.bithuman.ai | sh
bithuman login                    # in CI, export BITHUMAN_API_SECRET instead
curl -fsSLo speech.wav https://docs.bithuman.ai/samples/speech.wav
bithuman render wise-pup speech.wav -o out.mp4
```

```bash tab="Python"
python3 -m venv .venv && source .venv/bin/activate
pip install "bithuman[expression-2]"
export BITHUMAN_API_SECRET="<your API secret>"
curl -fL -o wise-pup.imx "https://api.bithuman.ai/v1/agent/A23WJF0199/model/download?model=expression-2"
```

```bash tab="LiveKit"
pip install "livekit-agents[openai,silero]" livekit-plugins-bithuman python-dotenv
# pass model_path="wise-pup.imx" to bithuman.AvatarSession: /build/voice-agent
```

`out.mp4` is the `wise-pup` sample avatar speaking the 15-second sample. The CLI's `ffmpeg` and live-session setup is on [CLI](/platforms/cli#before-you-start).

