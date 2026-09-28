---
title: "Talking video"
description: "Turn one audio file into an MP4 of your avatar speaking it: with the CLI or Python on your own machine, CPU only on Linux, or with one REST call to the bitHuman cloud."
section: build
group: "Recipes"
order: 30
type: recipe
time: "5 min"
availability: "creator"
renders: ["no-gpu", "server", "cloud"]
needs: ["API secret"]
platforms: ["cli", "python", "rest"]
models: ["essence-2", "expression-2"]
claims: ["S3", "S4", "S14"]
next: ["/api/video", "/platforms/cli", "/platforms/python"]
---

## What you'll build

<div class="lead">
<div class="lead-text">

An MP4 of an avatar saying the words in an audio file, with the lips in sync. Nobody watches it live, so it suits greetings, lessons and product videos.

You need:

- an audio file of speech, or a script for the REST API;
- an [API secret](/start/api-secret) on the Creator plan or higher;
- for the CLI or Python: Linux (x86_64 or arm64) or a Mac with Apple silicon, and `ffmpeg`.

</div>

```figure
talking-video-linux eager
```

</div>

## Steps

### Get the speech

Any audio file `ffmpeg` reads works on your machine; the REST API takes a file at a public URL, or text in the agent's voice. This sample is 15 seconds of speech:

```bash
curl -fsSLo speech.wav https://docs.bithuman.ai/samples/speech.wav
```

```expected
`speech.wav` in the current directory.
```

### Render the video

Pick where it renders. The CLI and Python render on your own machine, and on Linux they need no GPU. The REST API renders in the bitHuman cloud.

```bash tab="CLI"
curl -fsSL https://install.bithuman.ai | sh
export BITHUMAN_API_SECRET="<your API secret>"
bithuman render kwame-warm-museum-guide speech.wav -o kwame.mp4
```

```python tab="Python"
# Needs the bithuman package, ffmpeg on PATH and BITHUMAN_API_SECRET in the environment.
# The avatar file comes from `bithuman pull sofia-ramirez`, or the download URL on /platforms/python.
from bithuman.offline import render_offline
render_offline("sofia-ramirez.imx", "speech.wav", out_mp4="out.mp4")
```

```bash tab="REST"
curl -X POST https://api.bithuman.ai/v1/video/generate \
  -H "api-secret: $BITHUMAN_API_SECRET" -H "Content-Type: application/json" \
  -d '{"model": "essence-2", "agent_code": "'"$BITHUMAN_AGENT_CODE"'", "input": {"type": "audio", "audio_url": "https://docs.bithuman.ai/samples/speech.wav"}, "wait": true}'
```

```expected
An MP4 as long as the speech: `kwame.mp4` or `out.mp4` on your machine, or a `video_url` in the REST response (`"status": "completed"`). A render that takes longer than the wait returns a `job_id` to [poll](/api/video#get-talking-video-status).
```

### Check the file

```bash
ffprobe -v error -show_entries stream=width,height -show_entries format=duration -of compact kwame.mp4
```

```expected
An Essence 2 video is up to 1080×1920 or 1920×1080, following the portrait; an Expression 2 video is 416×720. The duration matches the speech, and the file has one video and one audio track.
```

## How it works

```diagram
engine
```

The same engine renders a live conversation and a file: speech goes in and lip-synced frames come out, then `ffmpeg` writes them with the audio into an MP4. A file rendered on your machine keeps its audio and video there; the CLI and Python sign in online when the render starts. Through the REST API, the render runs in the bitHuman cloud, in the US.

## Make it your own

- **Your avatar:** [create one](/build/create-avatar) from a portrait, then pass its agent code to `bithuman render`, or to the REST call as `agent_code`.
- **Text instead of audio:** the REST API speaks a script in the agent's voice: `"input": {"type": "text", "text": "…"}` ([Talking video API](/api/video#text-input)).
- **A batch:** loop over files with `bithuman render`; every run reuses the downloaded avatar.
- **What it costs:** on your machine, file rendering bills the length of the video it writes at the self-hosted rate; the REST API bills per minute of output, rounded up ([Pricing](/pricing#talking-video--per-minute-of-output)).

## Troubleshooting

| Symptom | Fix |
|---|---|
| `bithuman render` exits with code 77 | No API secret: export `BITHUMAN_API_SECRET`, or run `bithuman login` once. |
| An MP4 with sound and no picture | The render was refused: set the secret, delete the file, render again. |
| `402 INSUFFICIENT_BALANCE` from the REST API | Your balance must cover the longest render up front; the difference is refunded when it finishes ([Talking video API](/api/video)). |
| `409 MODEL_NOT_GENERATED` | The agent has no model of that kind yet: check its `supported_models`, or [add the model](/api/agents#add-a-model-to-an-existing-agent). |
