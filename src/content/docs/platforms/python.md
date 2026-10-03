---
title: "Python"
description: "Render Essence 2 and Expression 2 avatars from your own Python code."
section: platforms
group: "Python"
order: 10
type: platform
llms: platforms
searchTitle: "Python SDK: real-time avatars in your Python code"
renders: ["server", "no-gpu"]
needs: ["API secret"]
artifacts: ["python"]
platforms: ["python"]
models: ["essence-2", "expression-2"]
claims: ["S2", "S3", "S4", "S7", "S10"]
next: ["/platforms/python/app", "/platforms/python/troubleshooting", "/platforms/python/reference"]
moved:
  first-frame: /platforms/python#run-your-first-avatar
  integrate-into-your-app: /platforms/python/app#integrate-into-your-app
  a-voice-agent-on-your-own-livekit-server: /build/voice-agent/python#a-voice-agent-on-your-own-livekit-server
  complete-example: /platforms/python/app#complete-example
  requirements: /platforms/python/app#requirements
  run-it: /platforms/python/app#run-it
  expected-output: /platforms/python/app#expected-output
  make-it-your-own: /platforms/python/app#make-it-your-own
  platform-notes: /platforms/python/app#platform-notes
  reference: /platforms/python/reference
  troubleshooting: /platforms/python/troubleshooting
---

A file in and frames out, or a live stream of audio in and frames out, on your own machine.

## Before you start

To run an avatar without code, use the [CLI](/platforms/cli).

> **Note:** On Linux and Windows, Python renders both models on the CPU alone, no GPU. On macOS it renders on Apple silicon. Windows has its own page: [Windows](/platforms/windows). See [CPU only (no GPU)](/deploy/cpu).

| Detail | Expression 2 | Essence 2 |
|---|---|---|
| **Renders** | [any character from one portrait](/models/expression-2) | [a photoreal person from one portrait](/models/essence-2) |
| **Install** | `pip install "bithuman[expression-2]"` | included in the same install |
| **Frames** | RGB `numpy` arrays, `(height, width, 3)` `uint8` | the same |

| You need | Check |
|---|---|
| Python 3.10–3.14 | `python3 --version` |
| macOS 14+ on Apple silicon, Linux x86_64 or Linux arm64, or [Windows 11 x86_64](/platforms/windows) | `python3 -c "import platform; print(platform.system(), platform.machine())"` |
| An API secret | [Your API secret](/start/api-secret) |
| A paid plan (Creator or higher): usage bills per second while the avatar runs | [Pricing](/pricing) |
| About 1 GB of disk (570 MB package, 118–190 MB per avatar) | `df -h .` |

## Install

```bash
python3 -m venv .venv
source .venv/bin/activate
pip install "bithuman[expression-2]"
```

Install into a virtual environment: Debian and Ubuntu refuse a system-wide `pip install` (`externally-managed-environment`). If `venv` is missing, run `sudo apt install -y python3-venv` first. The package installs no command-line tool.

## Authenticate

Set `BITHUMAN_API_SECRET` in the shell that runs Python (`bithuman.open` reads it), or pass `api_secret=` to `AsyncBithuman.create()`. Downloading a sample avatar needs no account.

## Run your first avatar

```bash
export BITHUMAN_API_SECRET="<your API secret>"
curl -fL -o wise-pup.imx "https://api.bithuman.ai/v1/agent/A23WJF0199/model/download?model=expression-2"
curl -fsSLo speech.wav https://docs.bithuman.ai/samples/speech.wav
```

```python
import bithuman
bithuman.open("wise-pup.imx").render("speech.wav", out_mp4="out.mp4")
# → out.mp4: wise-pup speaking the sample, 416×720, 15 s
```

Open `out.mp4` to watch it talk. `out_mp4=` needs no `ffmpeg`, and `render` returns the number of frames written. It takes a path to an audio file (WAV, MP3 and the other common formats), or already-decoded 16 kHz mono audio (`int16` or `float32` arrays, or raw 16-bit bytes). The same call opens Essence 2 and Essence 1 `.imx` files: for a photoreal person, download the `sofia-ramirez` Essence 2 sample with `curl -fL -o sofia-ramirez.imx "https://api.bithuman.ai/v1/agent/A52DHS2219/model/download?model=essence-2"` and render it the same way (1080×1920).

To process the frames yourself, iterate over `render` without `out_mp4=`:

```python
import bithuman

with bithuman.open("wise-pup.imx") as avatar:
    frames = [image for image in avatar.render("speech.wav")]
print(len(frames), "frames of", frames[0].shape)
# → 300 frames of (720, 416, 3)
```

Frames are RGB; OpenCV expects BGR, so write one with `cv2.imwrite("frame.png", image[:, :, ::-1])`.

<div class="fig-end">

```figure
python-macos
```

</div>

## Performance

```perf
python-linux python-macos
```

A finished `render` logs its own rate on the `bithuman` logger at INFO.
