---
title: "On-device brain"
description: "Run the avatar's conversation brain on your own machine (speech recognition, language model, speech) with one environment variable. Audio and transcripts stay on the box."
section: sdk
group: "Platforms"
order: 11
type: guide
label: "CLI: on-device brain"
---

`BITHUMAN_LOCAL=1 bithuman run` replaces the cloud conversation brain with one that runs on your machine: whisper.cpp for speech recognition, llama.cpp for the language model, Supertonic for speech, and Silero for voice detection. The command, the browser URL and the avatar stay the same.

Audio, transcripts and generated speech never leave the machine. The avatar session is still reported to your account, so `run` needs a sign-in and a network connection. Running with no network at all is the [offline licence](/guides/pricing#offline-licensing) (Business and Enterprise).

## Before you start

- The [CLI](/sdk/cli#install), signed in (`bithuman login`, or `BITHUMAN_API_SECRET`).
- About 1 GB of disk and 1.5 GB of free memory.
- `cmake` and a C++ compiler, where `llama-cpp-python` has no prebuilt wheel for your Python.

## 1. Download an avatar and start the brain once

```bash
bithuman pull sofia-ramirez
bithuman run sofia-ramirez      # press Ctrl-C once the URL prints
```

The first `run` creates the brain's Python environment at `~/.cache/bithuman/brain-venv`.

## 2. Install the on-device brain into that environment

```bash
~/.cache/bithuman/brain-venv/bin/python -m pip install \
  'livekit-agents[silero]~=1.5' supertonic pywhispercpp llama-cpp-python soxr
```

Install into that interpreter, not your system Python: the brain runs from it, and Debian and Ubuntu refuse a system-wide `pip install`.

## 3. Run it

```bash
BITHUMAN_LOCAL=1 bithuman run sofia-ramirez
# → open the printed http://127.0.0.1:8088/<CODE> and talk
```

## Check it worked

`bithuman doctor` lists the brain packages and their versions once they import. The first local run downloads the brain models (about 860 MB) into `~/.cache/huggingface` and `~/.cache/supertonic`, once; later runs start in about a second.

## Tuning

| Variable | Default | Effect |
|---|---|---|
| `BITHUMAN_LOCAL` | unset | `1` uses the on-device brain |
| `BITHUMAN_LOCAL_WHISPER` | `tiny.en` | Speech-recognition model: `tiny.en`, `base.en`, or multilingual `tiny`, `base`, `small`, `medium`, `large-v3-turbo` |
| `BITHUMAN_LOCAL_LLM` | `Qwen/Qwen2.5-0.5B-Instruct-GGUF` | Any Hugging Face GGUF chat model |
| `BITHUMAN_LOCAL_LLM_FILE` | `qwen2.5-0.5b-instruct-q4_k_m.gguf` | The GGUF file in that repository |
| `BITHUMAN_LOCAL_VOICE` | `M1` | Voice preset: `M1`–`M5`, `F1`–`F5` |
| `BITHUMAN_LOCAL_LANG` | `en` | Speech language; 31 are supported (`en`, `ko`, `ja`, `es`, `de`, `fr`, `zh`, `hi`, `ar` and others) |
| `BITHUMAN_INSTRUCTIONS` | a short default | The system prompt |

A larger language model answers better and uses more memory. For example, Qwen 2.5 1.5B (about 1.5 GB of memory):

```bash
export BITHUMAN_LOCAL_LLM="Qwen/Qwen2.5-1.5B-Instruct-GGUF"
export BITHUMAN_LOCAL_LLM_FILE="qwen2.5-1.5b-instruct-q4_k_m.gguf"
BITHUMAN_LOCAL=1 bithuman run sofia-ramirez
```

For another language, pair a multilingual speech model with a voice in that language:

```bash
export BITHUMAN_LOCAL_WHISPER=small BITHUMAN_LOCAL_LANG=ko BITHUMAN_LOCAL_VOICE=F1
BITHUMAN_LOCAL=1 bithuman run sofia-ramirez
```

## Cloud brain or on-device brain

| Detail | Cloud brain (default) | On-device brain |
|---|---|---|
| Setup | sign in (or set `OPENAI_API_KEY`) | three steps above |
| Where audio goes | to the speech and language service | stays on the machine |
| Memory | about 300 MB (the avatar) | about 1.5 GB |
| Languages | the service's | 31 for speech output |
| Tool calling | yes | needs a 3B or larger model |

The on-device classes are also importable for your own agent: `livekit.plugins.bithuman.WhisperSTT`, `LlamaCppLLM` and `SupertonicTTS`.

## Troubleshooting

| Symptom | Cause | Fix |
|---|---|---|
| `BITHUMAN_LOCAL=1` fails asking for local extras | the packages are not in the brain's environment | repeat step 2 with that interpreter |
| `error: externally-managed-environment` | `pip` targeted the system Python | use `~/.cache/bithuman/brain-venv/bin/python -m pip` |
| `bithuman doctor` says the brain venv is not bootstrapped | step 1 has not run | run `bithuman run` once |
| The first run seems stuck | it is downloading about 860 MB of brain models | wait; later runs are fast |
| Replies are low quality | the default model is small | set a larger `BITHUMAN_LOCAL_LLM` |
| Speech is in the wrong language | the voice and language settings differ | set `BITHUMAN_LOCAL_LANG` and a matching voice |

## Next

- [CLI reference](/sdk/cli/reference)
- [Self-hosting](/guides/self-hosting)
- [Pricing](/guides/pricing)
