---
title: "Text to speech"
description: "Turn text into speech with built-in voices, inline tuning and shareable voice codes."
section: api
group: "Media"
order: 20
type: endpoint
llms: api
---

bitHuman's text-to-speech runs the same in-house voice engine that powers live
agents. One `POST` turns text into a WAV you can save or stream on the fly. It
supports 30+ languages, ten built-in voices, fine-grained tuning, and **voice
codes** — opaque handles for a voice you've designed in the
[Voice Designer](https://www.bithuman.ai/voice).

## Authentication

Every call uses your bitHuman API secret in the `api-secret` header. Get one at
[Developer → API Secrets](https://www.bithuman.ai/developer/api-keys) (the Creator plan or higher),
then export it so the examples below pick it up:

```bash
export BITHUMAN_API_SECRET="<your API secret>"
```

## Synthesize speech

Returns a 16-bit mono WAV at 44.1 kHz. The Swift and Android SDKs take 16 kHz audio: resample before you feed it to them.

```bash
curl -X POST https://api.bithuman.ai/v1/tts \
  -H "api-secret: $BITHUMAN_API_SECRET" \
  -H "content-type: application/json" \
  -d '{"text": "Hello from bitHuman.", "voice": "F1", "language": "en"}' \
  --output voice.wav
```

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
| `language` | string | ISO-2 code: `en`, `ko`, `ja`, `ar`, `bg`, `cs`, `da`, `de`, `el`, `es`, `et`, `fi`, `fr`, `hi`, `hr`, `hu`, `id`, `it`, `lt`, `lv`, `nl`, `pl`, `pt`, `ro`, `ru`, `sk`, `sl`, `sv`, `tr`, `uk` or `vi`. Another value returns `400 VALIDATION_ERROR` listing the codes. Defaults to `en`. |
| `total_steps` | integer | Quality vs. speed: `5` fast, `8` balanced (default), `12` highest. |
| `speed` | number | Playback rate, `0.7`–`2.0`. Defaults to `1.05`. |

## List voices

Returns the catalog — ten built-ins (`M1`–`M5`, `F1`–`F5`) plus
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

```endpoint
listVoiceAxes
```

```endpoint
previewTunedVoice
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

A voice code is a UUID (e.g. `00000000-0000-4000-8000-000000000000`). The
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
  -d '{"text": "Playing right away.", "voice_code": "YOUR_VOICE_CODE"}' \
  | ffplay -autoexit -nodisp -i -
```

For sentence-by-sentence streaming (lowest latency for long text), set
`"stream": true`. The response is `audio/pcm; rate=44100; framing=len32be`:
each frame is a 4-byte big-endian length followed by that many bytes of 16-bit
mono PCM at 44.1 kHz, and a zero-length frame ends the stream.

## OpenAI-compatible endpoint

`POST /v1/audio/speech` accepts OpenAI's speech request body: `model`,
`input` and `voice`, where `voice` is a bitHuman voice (`M1`–`M5`, `F1`–`F5`),
not an OpenAI voice name such as `alloy`. Authenticate with the `api-secret`
header; `Authorization: Bearer` returns `401`. The output is WAV only: a
`response_format` of `mp3` returns `400`. With an OpenAI SDK, set the base URL
to `https://api.bithuman.ai/v1` and send the secret as a default
`api-secret` header.

```bash
curl -X POST https://api.bithuman.ai/v1/audio/speech \
  -H "api-secret: $BITHUMAN_API_SECRET" -H "Content-Type: application/json" \
  -d '{"model": "tts-1", "input": "Hello from bitHuman.", "voice": "M1"}' -o speech.wav
```

## Errors

`401` means a missing or invalid `api-secret`; `400` is a malformed body or an
unsupported `language`; `404 VOICE_NOT_FOUND` means the `voice_code` doesn't
resolve to a known voice, and `404 NOT_FOUND` means the built-in `voice` isn't
one of `M1`–`M5`, `F1`–`F5`;
`503` means the queue is briefly full — retry with backoff. See
[Errors](/api/errors).
