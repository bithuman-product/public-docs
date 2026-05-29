---
title: "Voice API"
description: "Text-to-speech in 31 languages with 10 built-in voices, streaming, an OpenAI-compatible drop-in, and a voice-tuning surface."
section: api
group: "Voice"
order: 10
---

## Overview

bitHuman's in-house TTS engine: 10 built-in voices, 31 languages, streaming and
non-streaming output, plus a voice-tuning surface. All endpoints live at
`https://api.bithuman.ai` and require the `api-secret` header.

- **Try it live** — [www.bithuman.ai/voice](https://www.bithuman.ai/voice) (the
  Voice Playground).
- **LiveKit plugin** — drop-in for `cartesia.TTS()` / `openai.TTS()`, see
  [bithuman-product/bithuman-tts](https://github.com/bithuman-product/bithuman-tts).

## Synthesize speech

`POST /v1/tts` — generate audio (WAV or PCM) from a text prompt. Default is
non-streaming WAV; pass `stream: true` for sentence-chunked PCM frames.

| Field | Type | Default | Description |
|---|---|---|---|
| `text` | string | *(required)* | Text to synthesize. Any length; multi-sentence supported. |
| `voice` | string | `M1` | Voice ID. `M1`–`M5` (male), `F1`–`F5` (female). |
| `language` | string | `en` | ISO-2 language code. 31 languages supported. |
| `total_steps` | integer | `8` | Denoise step count: `5` fast/lower quality, `8` balanced, `12` highest. Range 1–100. |
| `speed` | number | `1.05` | Playback rate. Range `0.7`–`2.0`. |
| `format` | string | `wav` | Response format: `wav` or `pcm_s16le`. |
| `stream` | boolean | `false` | If true, returns sentence-chunked length-prefixed PCM frames. |

**curl**

```bash
curl -X POST https://api.bithuman.ai/v1/tts \
  -H "api-secret: $BITHUMAN_API_SECRET" \
  -H "Content-Type: application/json" \
  -d '{"text": "Hello from bitHuman.", "voice": "F1"}' \
  --output hello.wav
```

**Python**

```python
import requests

r = requests.post(
    "https://api.bithuman.ai/v1/tts",
    headers={"api-secret": "YOUR_API_SECRET"},
    json={"text": "Hello from bitHuman.", "voice": "F1"},
)
open("hello.wav", "wb").write(r.content)
```

**Node**

```javascript
const res = await fetch("https://api.bithuman.ai/v1/tts", {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
    "api-secret": process.env.BITHUMAN_API_SECRET,
  },
  body: JSON.stringify({ text: "Hello from bitHuman.", voice: "F1" }),
});
require("fs").writeFileSync("hello.wav", Buffer.from(await res.arrayBuffer()));
```

The non-streaming response is 44.1 kHz, 16-bit mono WAV. Median first-byte is
~120 ms.

### Streaming framing

With `stream: true`, the body is a sequence of length-prefixed PCM frames, one
per sentence:

```text
[uint32 BE size][PCM int16 LE mono 44.1kHz]   # per sentence
[uint32 BE = 0]                                # terminator
```

The response carries `Content-Type: audio/pcm; rate=44100; framing=len32be`.
Server-side first-byte is ~22 ms.

## List voices

`GET /v1/voices` — returns the catalog of built-in and custom voices.

```bash
curl https://api.bithuman.ai/v1/voices \
  -H "api-secret: $BITHUMAN_API_SECRET"
```

```json
{
  "voices": [
    {"id": "F1", "kind": "builtin"},
    {"id": "F2", "kind": "builtin"},
    {"id": "M1", "kind": "builtin"}
  ]
}
```

## OpenAI-compatible speech

`POST /v1/audio/speech` — drop-in compatible with OpenAI's
[`POST /v1/audio/speech`](https://platform.openai.com/docs/api-reference/audio/createSpeech).
Migrate an existing OpenAI client by swapping the base URL to
`https://api.bithuman.ai/v1` and the auth header to `api-secret`.

| Field | Type | Default | Description |
|---|---|---|---|
| `input` | string | *(required)* | Text to synthesize. |
| `model` | string | — | Ignored — bitHuman uses its own model. Pass `"tts-1"` for client compatibility. |
| `voice` | string | `M1` | bitHuman voice ID (`M1`–`F5`). |
| `response_format` | string | `wav` | Output format. |
| `speed` | number | `1.05` | Playback rate, `0.7`–`2.0`. |

```python
from openai import OpenAI

client = OpenAI(
    base_url="https://api.bithuman.ai/v1",
    api_key="not-used",
    default_headers={"api-secret": "YOUR_API_SECRET"},
)
audio = client.audio.speech.create(
    model="tts-1",
    input="Hello, served as if it were OpenAI.",
    voice="F1",
)
audio.stream_to_file("hello.wav")
```

## Voice tuning (Studio)

Two endpoints power the **Tune** popover at
[www.bithuman.ai/voice](https://www.bithuman.ai/voice).

### List tuning axes

`GET /v1/studio/axes` — discover the semantic axes (gender, pitch, rate,
brightness) used by the preview endpoint. Each axis has a suggested slider range
and per-voice projections.

```bash
curl https://api.bithuman.ai/v1/studio/axes \
  -H "api-secret: $BITHUMAN_API_SECRET"
```

```json
{
  "axes": [
    {
      "name": "pitch",
      "description": "Pitch: − lower, + higher",
      "suggested_min": -0.28,
      "suggested_max": 0.28,
      "anchor_projections": {"F1": 0.087, "M1": -0.092}
    }
  ]
}
```

### Preview a tuned voice

`POST /v1/studio/preview` — synthesize a one-off clip using a built-in voice
edited along the semantic axes. The edited voice is **ephemeral** — it is not
persisted to the catalog.

| Field | Type | Default | Description |
|---|---|---|---|
| `text` | string | *(required)* | Text to synthesize. |
| `base_voice` | string | *(required)* | Built-in voice ID (`M1`–`F5`) to edit. |
| `axes` | object | *(required)* | Map of axis-name → float value. |
| `language` | string | `en` | ISO-2 language code. |

```bash
curl -X POST https://api.bithuman.ai/v1/studio/preview \
  -H "api-secret: $BITHUMAN_API_SECRET" \
  -H "Content-Type: application/json" \
  -d '{
    "text": "Tuned voice preview.",
    "base_voice": "F1",
    "axes": {"pitch": 0.15, "brightness": -0.10}
  }' \
  --output tuned.wav
```

## Built-in voices

| ID | Name | Gender | | ID | Name | Gender |
|---|---|---|---|---|---|---|
| `F1` | Aria | feminine | | `M1` | Alex | masculine |
| `F2` | Sophie | feminine | | `M2` | Leo | masculine |
| `F3` | Maya | feminine | | `M3` | Theo | masculine |
| `F4` | Luna | feminine | | `M4` | Kai | masculine |
| `F5` | Zoe | feminine | | `M5` | Max | masculine |

## Languages

31 supported. Pass the ISO-2 code in `language`:

`en` `es` `fr` `de` `it` `pt` `nl` `pl` `sv` `da` `fi` `cs` `sk` `sl` `hu` `ro`
`bg` `el` `tr` `uk` `ru` `lv` `lt` `et` `ar` `hi` `id` `vi` `ja` `ko` `zh`

## Errors

| Status | Cause |
|---|---|
| `400` | Missing `text`, unsupported voice/language, or out-of-range params. |
| `401` | Missing or invalid `api-secret`. |
| `429` | Rate limit exceeded. |
| `503` | Queue full; retry with backoff. |

See the full [error reference](/api/errors) and the interactive
[API reference](/api/reference).
