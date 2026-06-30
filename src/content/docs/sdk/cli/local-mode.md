---
title: "Local mode — zero-cloud conversation"
description: "Run a fully on-device avatar brain — whisper.cpp + llama.cpp + Supertonic + Silero VAD — with one env-var flip. No API key, no outbound network, ~1.5 GB RAM."
section: sdk
group: "Command line"
order: 34
label: "Local mode"
---

## The on-device brain

`bithuman-cli[local]` is an opt-in extra that swaps the cloud
conversation brain (OpenAI Realtime) for an entirely in-process,
on-device stack — whisper.cpp + llama.cpp + Supertonic + Silero VAD. No
API key, no outbound network, no separate servers. Same `bithuman run`
command, same browser URL, same avatar.

```bash
pip install 'bithuman-cli[local]'
export BITHUMAN_API_SECRET=your_api_secret
bithuman pull modern-court-jester
BITHUMAN_LOCAL=1 bithuman run ~/.cache/bithuman/showcase/modern-court-jester.imx
# → open the printed http://127.0.0.1:8088/<CODE> URL in a browser
```

The `[local]` extra is published on the `bithuman-cli` package, whose PyPI
wheel is **macOS Apple Silicon (arm64) only** today (Python 3.10–3.14) — so
`pip install 'bithuman-cli[local]'` is a macOS-arm64 path. On Linux, install
the CLI with the universal installer (see [CLI install](/sdk/cli/install)); the
`[local]` brain bundle is not yet packaged for Linux. (The `bithuman-cli`
wheel bundles the Rust CLI binary and depends on the `bithuman` Python SDK.)

> **Note** `bithuman run` still pings `api.bithuman.ai` for avatar credit
> accounting even in local mode — `BITHUMAN_API_SECRET` is required. Only
> the conversation brain goes offline.

## When to reach for it

- **Privacy-bound deployments** — kiosks, healthcare, finance, classroom.
  Audio never leaves the device.
- **Offline / air-gapped** — conference demos on shaky WiFi, edge boxes
  in stores, field engineers.
- **Eliminate per-minute LLM/TTS spend** — pay once for the wheel;
  conversations are free thereafter.
- **Latency floor below network RTT** — when the speed of light to the
  nearest cloud region is itself the bottleneck.
- **Mobile portability ramp** — the same C++ cores (whisper.cpp,
  llama.cpp, ONNX Runtime) have first-party iOS builds, and
  run the exact same model files.

## The stack

| Slot | Backend (mobile-portable C++ core) | Default model | Disk | RAM |
| --- | --- | --- | --- | --- |
| STT | `pywhispercpp` → whisper.cpp | `tiny.en` | 77 MB | ~150 MB |
| LLM | `llama-cpp-python` → llama.cpp | Qwen 2.5 0.5B-Instruct Q4_K_M | 400 MB | ~600 MB |
| TTS | `supertonic` → ONNX Runtime | Supertonic 3 (31 languages, voice M1) | 380 MB | ~600 MB |
| VAD | `livekit-plugins-silero` | Silero | 5 MB | ~50 MB |
| Avatar | `libessence` | `.imx` | varies | ~300 MB |

**Total:** ~860 MB on disk for the brain plus your avatar file; ~1.5 GB
RAM peak. The first run downloads the brain models from HuggingFace into
`~/.cache/{huggingface,supertonic}` — about 90 seconds, once. Subsequent
runs warm-load in under a second.

## How it fits together

The local-mode brain is the same `livekit-agents` worker as the cloud
brain — only the `stt` / `llm` / `tts` plugins differ. The avatar
transport (`AvatarSession`), the embedded `livekit-server`, the browser
player, and the lifecycle are all unchanged.

```text
bithuman run avatar.imx                  (Rust CLI, same as cloud)
├─ embedded livekit-server               (same)
├─ libessence avatar runtime             (same)
└─ bithuman.agent                        (Python livekit-agents worker)
   if BITHUMAN_LOCAL=1:                  (← the only branch)
     stt = WhisperSTT(...)
     llm = LlamaCppLLM(...)
     tts = SupertonicTTS(...)
     vad = silero.VAD.load()
   else:
     llm = openai.realtime.RealtimeModel(...)
```

The plugin classes live in the same namespace as the avatar plugin —
`livekit.plugins.bithuman.{WhisperSTT, LlamaCppLLM, SupertonicTTS}` — so
you can also use them in your own custom brain without going through
`bithuman run`. See [audio streaming](/concepts/audio-streaming) and the
[Python SDK](/sdk/python) for the integration pattern.

## Tuning

All optional. Defaults are tuned for the smallest models that produce
fluent English on a laptop CPU.

| Env var | Default | What |
| --- | --- | --- |
| `BITHUMAN_LOCAL` | _unset_ | `=1` flips the brain to the local stack. |
| `BITHUMAN_LOCAL_WHISPER` | `tiny.en` | whisper.cpp model size — `tiny.en` / `base.en` (multilingual: `tiny`, `base`, `small`, `medium`, `large-v3-turbo`). Larger = more accurate, more RAM, slower. |
| `BITHUMAN_LOCAL_LLM` | `Qwen/Qwen2.5-0.5B-Instruct-GGUF` | HuggingFace repo id of any GGUF chat LLM. |
| `BITHUMAN_LOCAL_LLM_FILE` | `qwen2.5-0.5b-instruct-q4_k_m.gguf` | GGUF file within the repo. |
| `BITHUMAN_LOCAL_VOICE` | `M1` | Supertonic preset (`M1`–`M5` male, `F1`–`F5` female). |
| `BITHUMAN_LOCAL_LANG` | `en` | Supertonic language. 31 supported: `en`, `ko`, `ja`, `es`, `de`, `fr`, `it`, `pt`, `ru`, `zh`, `hi`, `ar`, `nl`, `pl`, `tr`, `vi`, `id`, `th`, … |
| `BITHUMAN_INSTRUCTIONS` | short default | Override the system prompt. |

### Upgrading the LLM for quality

The 0.5B default keeps the entire stack under 1.5 GB RAM. For better
reasoning, swap to a bigger GGUF — any HuggingFace `*-GGUF` repo works:

```bash
# 1.5B (~1 GB on disk, ~1.5 GB RAM):
export BITHUMAN_LOCAL_LLM="Qwen/Qwen2.5-1.5B-Instruct-GGUF"
export BITHUMAN_LOCAL_LLM_FILE="qwen2.5-1.5b-instruct-q4_k_m.gguf"

# Llama 3.2 3B (~2 GB on disk, ~3 GB RAM):
export BITHUMAN_LOCAL_LLM="bartowski/Llama-3.2-3B-Instruct-GGUF"
export BITHUMAN_LOCAL_LLM_FILE="Llama-3.2-3B-Instruct-Q4_K_M.gguf"

BITHUMAN_LOCAL=1 bithuman run avatar.imx
```

### Multilingual setup

```bash
# Korean: bigger whisper + Korean Supertonic voice
export BITHUMAN_LOCAL_WHISPER=small        # multilingual
export BITHUMAN_LOCAL_LANG=ko
export BITHUMAN_LOCAL_VOICE=F1

BITHUMAN_LOCAL=1 bithuman run avatar.imx
```

The default LLM (Qwen 2.5) is multilingual; for production multilingual
deployments, size it up too (1.5B+ recommended for non-English fluency).

## Cloud vs local — side by side

| | **Cloud (default)** | **Local (`BITHUMAN_LOCAL=1`)** |
| --- | --- | --- |
| Setup | `export OPENAI_API_KEY=...` | First run downloads ~860 MB once |
| Per-conversation cost | OpenAI Realtime pricing | $0 (one-time wheel install) |
| Network | OpenAI Realtime + LiveKit signal | LiveKit signal only (localhost) |
| Privacy | Audio + transcripts go to OpenAI | Audio stays on box |
| Languages | OpenAI-supported | 31 (Supertonic) for TTS; Whisper coverage for STT |
| RAM | ~300 MB (just the avatar) | ~1.5 GB |
| Latency floor | ~400–600 ms (network) | ~800 ms first-audio (compute-bound) |
| Mobile path | not applicable | iOS via the same `.gguf` / `.bin` / `.onnx` |

Both modes use the same Rust CLI, the same brain entrypoint
(`bithuman.agent`), and the same `AvatarSession` plugin. One env var is
the only difference.

## Performance (M5 MacBook Pro)

| Stage | Latency (warm) |
| --- | --- |
| Pipeline warm load (all four models from cache) | 717 ms |
| Whisper STT (4.6 s utterance, `tiny.en`) | 131 ms |
| Qwen 2.5 0.5B (first token / 30-token reply at 96 tok/s) | 114 ms / 894 ms |
| Supertonic TTS (10.7 s of speech, RTF 0.16) | 1,729 ms |
| End-to-end (STT + LLM + TTS, sentence-blocking) | 2,754 ms |
| First audible word (streamed token-by-token + sentence-chunked TTS) | ~800 ms |

Cold start (every-model first download, first run only) is ~90 s. Process
warm-up after that is under a second.

## What's NOT in `bithuman-cli[local]`

- **Avatar generation** — you still need an `.imx` file. Generate one on
  [bithuman.ai](https://www.bithuman.ai/explore) (free tier) via
  `POST /v1/agent/generate`, or pull one from the showcase
  (`bithuman pull <slug>` → `~/.cache/bithuman/showcase/`).
- **Avatar metering** — `bithuman run` still pings `api.bithuman.ai` for
  credit accounting; deployments still need `BITHUMAN_API_SECRET`.
- **Voice cloning** — Supertonic ships voice presets. Custom voice
  cloning is a hosted service that produces JSON style files; once you
  have the JSON, inference is local but the cloning step is not.
- **Tool / function calling** — the default 0.5B LLM is too small for
  reliable JSON tool calls. Swap to ≥3B for that.

## Troubleshooting

### Is local mode actually wired up?

Run `bithuman doctor` — it verifies the `[local]` extras are importable
and lists the resolved backend versions.

### First run feels stuck

It is downloading ~860 MB from HuggingFace. Watch network activity;
subsequent runs start in under a second.

### `BITHUMAN_LOCAL=1` errors with "required the local extras"

You installed the brain bundle without the `[local]` extra. Re-install:
`pip install 'bithuman-cli[local]'`.

### LLM is too dumb

Bump to a bigger GGUF — see the tuning table above.

### TTS pronounces the wrong language

Set `BITHUMAN_LOCAL_LANG` to match your transcript language. Default `en`.

### Browser shows the avatar but no audio

Check the brain logs in the terminal — there is structured tracing
(`stt:transcribe duration_ms=…`, `llm:first_token`, `tts:synthesize`). If
`stt:transcribe` shows empty text, your mic or VAD is the issue; if
`llm:first_token` never fires, the LLM did not load (usually the GGUF
file name in `BITHUMAN_LOCAL_LLM_FILE` is wrong).

## See also

- [CLI overview](/sdk/cli/overview) — one binary, the same engine as the language SDKs
- [Configuration](/sdk/cli/configuration) — environment variables and cache layout
- [Audio streaming](/concepts/audio-streaming) — the push-audio / drain-frames loop
- [Python SDK](/sdk/python) — programmatic access to the same runtime
