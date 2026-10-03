---
title: "Pipecat"
searchTitle: "Pipecat: add a talking avatar to a Pipecat voice bot"
description: "Give a Pipecat voice bot a lip-synced avatar with pipecat-bithuman."
section: platforms
group: "Pipecat"
order: 10
type: platform
llms: platforms
renders: ["server", "no-gpu"]
needs: ["API secret"]
platforms: ["pipecat"]
models: ["essence-2", "expression-2"]
claims: ["S3", "S4"]
next: ["/platforms/pipecat/app", "/platforms/pipecat/troubleshooting"]
moved:
  first-frame: /platforms/pipecat#run-your-first-avatar
---

Put `BitHumanVideoService` after your TTS service: the bot's speech goes in, and lip-synced avatar video with the matching audio comes out.

## Before you start

`pipecat-bithuman` is a community integration for Pipecat, maintained by bitHuman, not by the Pipecat team. The avatar renders inside your bot's own process through the [Python SDK](/platforms/python), on your own machine. Your pipeline keeps its own speech-to-text, LLM and TTS services.

| Detail | Expression 2 | Essence 2 |
|---|---|---|
| **Renders** | [any character from one portrait](/models/expression-2) | [a photoreal person from one portrait](/models/essence-2) |
| **Install** | `pip install "pipecat-bithuman[expression-2]"` | included in the same install |
| **Avatar file** | an Expression 2 `.imx` | an Essence 2 `.imx` |

| You need | Check |
|---|---|
| Python 3.11–3.14 | `python3 --version` |
| macOS 14+ on Apple silicon, or Linux x86_64 or arm64 (a PC with no GPU renders both models) | `python3 -c "import platform; print(platform.system(), platform.machine())"` |
| An API secret | [Your API secret](/start/api-secret) |
| A paid plan (Creator or higher): usage bills per second while the avatar runs | [Pricing](/pricing) |
| `ffmpeg` and `git`, for the demo below | `ffmpeg -version`, `git --version` |

## Install

```bash
python3 -m venv .venv
source .venv/bin/activate
pip install "pipecat-bithuman[expression-2]"
```

The package brings Pipecat (`pipecat-ai` 1.12.0 or newer) and the bitHuman Python SDK (`bithuman`) with it.

## Authenticate

Set `BITHUMAN_API_SECRET` in the shell that runs the bot, or pass `api_secret=` to `BitHumanVideoService`. The service never logs the secret and removes it from error text. Name the avatar file with `model_path=`, or set `BITHUMAN_MODEL_PATH`.

The avatar opens on `StartFrame` and closes on `EndFrame`, `CancelFrame` or cleanup.

## Run your first avatar

The package's demo script sends a WAV file through a Pipecat pipeline as `TTSAudioRawFrame` chunks, as a TTS service would, and writes the avatar frames that come out to an MP4. In the virtual environment from Install:

```bash
export BITHUMAN_API_SECRET="<your API secret>"
git clone https://github.com/bithuman-product/pipecat-bithuman
cd pipecat-bithuman
curl -fL -o wise-pup.imx "https://api.bithuman.ai/v1/agent/A23WJF0199/model/download?model=expression-2"
curl -fsSLo speech.wav https://docs.bithuman.ai/samples/speech.wav
BITHUMAN_MODEL_PATH=wise-pup.imx python examples/render_demo.py speech.wav demo.mp4
# → prints the frame count and size, and demo.mp4 shows wise-pup speaking the sample
```

To see barge-in, add `--interrupt-at 10 --repeat 2`: the reply is interrupted after 10 s, and a new one follows. The [37-second demo](https://github.com/bithuman-product/pipecat-bithuman/blob/main/docs/demo.mp4) in the repository is that run with `wise-pup`.

## Performance

The avatar renders through the Python SDK inside your bot's process. The Python SDK's speed on each machine:

```perf
python-linux python-macos
```
