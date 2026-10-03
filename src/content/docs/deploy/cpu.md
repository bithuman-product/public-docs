---
title: "CPU only (no GPU)"
description: "Both models run live on a standard Linux PC with no GPU."
section: deploy
group: "Where it renders"
order: 30
type: deploy
llms: deploy
searchTitle: "CPU only (no GPU): Linux PCs without a graphics card"
availability: "creator"
renders: ["no-gpu", "server"]
needs: ["Linux x86_64 / arm64"]
models: ["essence-2", "expression-2", "essence-1"]
claims: ["S2", "S3", "S4", "S5", "S10", "S26"]
next: ["/platforms/cli", "/platforms/python", "/deploy/offline"]
moved:
  models-available-here: /deploy#compare
  choosing-between-modes: /deploy#compare
---

## What it is

Essence 2 and Expression 2 render live on the processor of an ordinary Linux PC, with no graphics card: with the [CLI](/platforms/cli) or the [Python SDK](/platforms/python), on Linux x86_64 or arm64. It suits screens that run all day where a GPU is not practical: kiosks, lobby screens, and servers without GPUs. It is not a fifth mode: it is [Your servers](/deploy/self-hosted) on a PC with no GPU.

Compare every mode: [Deployment options](/deploy#compare).

## Where it renders

```dataflow
cpu
```

```diagram
topology cpu
```

When the avatar renders on your hardware, its audio and video stay there. With the CLI's [local conversation brain](/platforms/cli/local-brain), speech recognition, the language model and the voice run on the machine too; the session still reports usage online.

## Speed

Measured on a desktop CPU with no GPU:

```perf
linux-cpu python-linux
```

## Price

```price
cpu
```

## Limits

- **Network:** a session checks your credential when it starts and keeps rendering through a network drop of up to 5 minutes. Usage reports carry no audio, video, images or conversation text.
- **Operating system:** Linux on x86_64 or arm64, or Windows 11 on x86_64 with [Python](/platforms/windows); Intel Macs are not supported.
- **Sessions:** self-hosted sessions are limited by credits.

## First command

```bash tab="CLI"
curl -fsSL https://install.bithuman.ai | sh
bithuman login
curl -fsSLo speech.wav https://docs.bithuman.ai/samples/speech.wav
bithuman render wise-pup speech.wav -o out.mp4
```

```bash tab="Python"
python3 -m venv .venv && source .venv/bin/activate
pip install "bithuman[expression-2]"
export BITHUMAN_API_SECRET="<your API secret>"
curl -fL -o wise-pup.imx "https://api.bithuman.ai/v1/agent/A23WJF0199/model/download?model=expression-2"
curl -fsSLo speech.wav https://docs.bithuman.ai/samples/speech.wav
python -c 'import bithuman
with bithuman.open("wise-pup.imx") as a: print(sum(1 for _ in a.render("speech.wav")), "frames")'
# → 300 frames
```

`bithuman run wise-pup` opens a live conversation instead of a file ([CLI](/platforms/cli#run-your-first-avatar)).

