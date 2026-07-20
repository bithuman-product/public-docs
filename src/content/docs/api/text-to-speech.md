---
title: "Text to speech"
description: "Turn text into natural speech with bitHuman's real-time TTS — built-in voices, inline tuning, and shareable voice codes designed in the playground."
section: api
group: "Build"
order: 11
---

bitHuman's text-to-speech runs the same in-house voice engine that powers live
agents. One `POST` turns text into a WAV you can save or stream on the fly. It
supports 30+ languages, ten built-in voices, fine-grained tuning, and **voice
codes** — opaque handles for a voice you've designed in the
[Voice Designer](https://www.bithuman.ai/voice).

## Authentication

Every call uses your bitHuman API secret in the `api-secret` header. Get one at
[Developer → API Keys](https://www.bithuman.ai/developer/api-keys) (free tier, no card),
then export it so the examples below pick it up:

```bash
export BITHUMAN_API_SECRET=your_api_secret
```

## Synthesize speech

`POST https://api.bithuman.ai/v1/tts` returns audio bytes (a WAV by default).

**curl**

```bash
curl -X POST https://api.bithuman.ai/v1/tts \
  -H "api-secret: $BITHUMAN_API_SECRET" \
  -H "content-type: application/json" \
  -d '{"text": "Hello from bitHuman.", "voice": "F1", "language": "en"}' \
  --output voice.wav
```

**Python**

```python
import os, requests

resp = requests.post(
    "https://api.bithuman.ai/v1/tts",
    headers={"api-secret": os.environ["BITHUMAN_API_SECRET"]},
    json={"text": "Hello from bitHuman.", "voice": "F1", "language": "en"},
    timeout=60,
)
resp.raise_for_status()
with open("voice.wav", "wb") as f:
    f.write(resp.content)
```

### Request fields

| Field | Type | Notes |
| --- | --- | --- |
| `text` | string | **Required.** Any length; multi-sentence is supported. |
| `voice` | string | Built-in voice id (`M1`–`M5`, `F1`–`F5`). Defaults to `M1`. |
| `voice_code` | string | A designed-voice handle (see [Voice codes](#voice-codes)). Takes precedence over `voice`. |
| `axes` | object | Inline tuning — see [Tuning a voice](#tuning-a-voice). Ignored when `voice_code` is set. |
| `language` | string | ISO-2 code. 30+ languages supported (call `GET /v1/voices` / the playground for the current list — the advertised count and the live server list don't always match exactly). Defaults to `en`. |
| `total_steps` | integer | Quality vs. speed: `5` fast, `8` balanced (default), `12` highest. |
| `speed` | number | Playback rate, `0.7`–`2.0`. Defaults to `1.05`. |

## List voices

`GET /v1/voices` returns the catalog — ten built-ins (`M1`–`M5`, `F1`–`F5`) plus
any custom voices.

```bash
curl https://api.bithuman.ai/v1/voices -H "api-secret: $BITHUMAN_API_SECRET"
# {"voices":[{"id":"F1","kind":"builtin"}, ... ]}
```

## Tuning a voice

Shape any built-in voice with semantic `axes` — `gender`, `pitch`, `rate`, and
`brightness`. Offsets are small (roughly −0.3…0.3); `0` is neutral. Call
`GET /v1/studio/axes` for each axis's suggested range and per-voice anchors.

```bash
curl -X POST https://api.bithuman.ai/v1/tts \
  -H "api-secret: $BITHUMAN_API_SECRET" \
  -H "content-type: application/json" \
  -d '{
    "text": "Tuned, warm, and a touch brighter.",
    "voice": "F3",
    "axes": {"gender": 0.1, "pitch": 0.05, "rate": -0.1, "brightness": 0.2}
  }' \
  --output voice.wav
```

## Voice codes

Rather than hand-tuning axes, design a voice from a description in the
[Voice Designer](https://www.bithuman.ai/voice) ("a calm meditation guide", "a
gruff old captain"). When you open **Use in your app**, you get a **voice code**
— a single opaque handle that already encodes the base voice and its tuning.
Pass it as `voice_code` and skip `voice`/`axes` entirely:

```bash
curl -X POST https://api.bithuman.ai/v1/tts \
  -H "api-secret: $BITHUMAN_API_SECRET" \
  -H "content-type: application/json" \
  -d '{"text": "Hello from my custom voice.", "voice_code": "YOUR_VOICE_CODE"}' \
  --output voice.wav
```

A voice code is a UUID (e.g. `f8fb5feb-8a19-435c-89e5-a286a03565ec`). The
endpoint expands it to the underlying voice + tuning, so your integration only
ever references the code — re-tune the voice in the playground without touching
your code path. An unknown or revoked `voice_code` returns
`404 VOICE_NOT_FOUND` — handle it rather than assuming a fallback voice.

## Stream and play on the fly

`/v1/tts` returns standard WAV bytes, so you can pipe the response straight into
a player instead of saving a file — handy for quick local testing:

```bash
curl -sN -X POST https://api.bithuman.ai/v1/tts \
  -H "api-secret: $BITHUMAN_API_SECRET" \
  -H "content-type: application/json" \
  -d '{"text": "Playing instantly.", "voice_code": "YOUR_VOICE_CODE"}' \
  | ffplay -autoexit -nodisp -i -
```

For sentence-by-sentence streaming of length-prefixed PCM frames (lowest
latency for long text), set `"stream": true`.

## OpenAI-compatible endpoint

Already calling OpenAI's TTS? Point existing clients at
`POST /v1/audio/speech` — swap the base URL to `https://api.bithuman.ai/v1` and
the auth header to `api-secret`. See the
[API reference](/api/reference#tag/voice) for the full schema.

## Errors

`401` means a missing or invalid `api-secret`; `400` is a malformed body; `404`
(`VOICE_NOT_FOUND`) means the `voice_code` doesn't resolve to a known voice;
`503` means the queue is briefly full — retry with backoff. See
[Errors](/api/errors).
