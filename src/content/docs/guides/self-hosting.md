---
title: "Self-hosting"
description: "Run bitHuman models on your own hardware: which surface runs which model, a first MP4 in four commands, how self-hosting is billed, and offline licensing."
section: guides
group: "Deploy"
order: 30
type: guide
label: "Self-hosting"
---

Self-hosting means the render happens on your hardware — a Mac, a Linux box, a
phone or a browser tab. It is billed in credits at the
self-hosted rate, and **credits are the only gate**: there is no separate
licence to buy and no time limit. Downloading a model is free.

## Pick your surface

Each page below is the one place its install, model download and code live.

| You want | Use | Models |
|---|---|---|
| A talking avatar or an MP4 on a Mac or Linux box, no code | [CLI](/sdk/cli) | Essence 2 and Expression 2 (`run`, `render`); Essence 1 (`run`) |
| A voice agent on your own LiveKit server, rendered on your machine | [Talk to an avatar on your machine](/guides/local-voice-avatar) | Essence 2, Expression 2 |
| Frames or MP4 clips from your own code | [Python SDK](/sdk/python) | Essence 2, Expression 2, Essence 1 |
| An iPhone, iPad or Mac app | [Apple SDK](/sdk/apple) | Essence 2, Expression 2 |
| An Android app | [Android SDK](/sdk/android) | Essence 2, Expression 2 |
| Rendering in your visitor's browser tab | [Web](/sdk/web) (`?render=local`) | Essence 2, Expression 2, Essence 1 |

The full model-by-surface matrix is on [Models](/concepts/models#where-each-model-runs).

For a live session on one machine, use `bithuman run`. For a live session in your own LiveKit rooms, use the [LiveKit plugin](/sdk/livekit): with `model_path` the avatar renders on your machine ([guide](/guides/local-voice-avatar)), with `avatar_id` in the cloud. Expression 1 uses the container below.

## A first MP4 on macOS or Linux

Four commands on macOS Apple Silicon or Linux (x86_64 or arm64), with `ffmpeg` on `PATH`:

```bash
curl -fsSL https://install.bithuman.ai | sh
bithuman login                    # opens your browser; in CI, export BITHUMAN_API_SECRET instead
curl -fsSLo speech.wav https://docs.bithuman.ai/samples/speech.wav
bithuman render wise-pup speech.wav -o out.mp4
```

`out.mp4` is the free Wise Pup avatar speaking the 15-second sample. The rest of
the CLI — live sessions, your own agents, every flag — is on [the CLI page](/sdk/cli).

## How self-hosting is billed

- **At the self-hosted rate** on [pricing](/guides/pricing#serving--credits-per-live-minute),
  from your credit balance. A live session bills its session time, talking or idle; an MP4
  render bills the length of the clip it writes.
- **A credential is required to render.** Sign in with `bithuman login`, or set
  `BITHUMAN_API_SECRET` — get one at
  [Developer → API Secrets](https://www.bithuman.ai/developer/api-keys).
- **Rendering authenticates online** and reports usage as it runs. If the
  connection drops, a session keeps a 5-minute grace.
- **To run completely off the internet**, see [offline licensing](/guides/pricing#offline-licensing).

## Troubleshooting

| Symptom | Cause | Fix |
|---|---|---|
| `bithuman render` refuses with `NOT_SIGNED_IN` | a render is billed, so it needs a credential | `bithuman login`, or `export BITHUMAN_API_SECRET=…` |
| `ffmpeg: command not found` | the MP4 is written through ffmpeg | `brew install ffmpeg` / `sudo apt install -y ffmpeg` |
| `pip install bithuman` finds no wheel | wheels exist for macOS (Apple silicon) and Linux x86_64 / arm64 only | use one of those, or WSL2 on Windows |
| `java.lang.UnsatisfiedLinkError` on an Android emulator | the libraries are `arm64-v8a` only | a physical device, or an `arm64-v8a` emulator image |

## Next steps

- [Pricing](/guides/pricing) — the self-hosted rate and offline licensing
- [Models](/concepts/models) — which model runs where
- [Performance](/performance) — measured frame rates per platform
