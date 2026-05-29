---
title: "Configuration"
description: "Environment variables, cache layout, and cloud-vs-on-device brain selection for the bithuman CLI."
section: cli
group: "Usage"
order: 11
---

## Environment variables

| Variable | What |
| --- | --- |
| `BITHUMAN_API_SECRET` | Avatar-runtime auth (metering). Canonical name on the CLI; `BITHUMAN_API_KEY` is accepted as an alias for cross-SDK parity. Get a free key at [bithuman.ai → Developer](https://www.bithuman.ai/#developer). |
| `OPENAI_API_KEY` | Cloud conversation brain (OpenAI Realtime). Required for `bithuman run` unless `BITHUMAN_LOCAL=1` is set. |
| `BITHUMAN_LOCAL` | `=1` flips the brain to the on-device stack (whisper.cpp + llama.cpp + Supertonic + Silero). Needs the `[local]` extra: `pip install 'bithuman-cli[local]'`. See [Local mode](/cli/local-mode). |
| `BITHUMAN_LOCAL_*` | Per-component tuning (whisper model, LLM, voice, language). See [Local mode tuning](/cli/local-mode). |
| `BITHUMAN_INSTRUCTIONS` | System-prompt override for the conversation brain. |
| `BITHUMAN_UNMETERED` | `=1` skips the avatar-runtime auth heartbeat — dev / parity testing only. |
| `RUST_LOG` | Tracing filter. Default `info,bithuman_serve=info`. |

## Cloud vs on-device brain

The avatar runtime is always the same; only the conversation brain
changes. Selection is driven entirely by environment.

**Cloud (default):** set `OPENAI_API_KEY`. The brain is OpenAI Realtime —
fast warm-up, lowest first-token latency, hosted reliability.

```bash
export BITHUMAN_API_SECRET=your_api_secret
export OPENAI_API_KEY=sk-...
bithuman run avatar.imx
```

**On-device:** install the `[local]` extra and set `BITHUMAN_LOCAL=1`. No
API key, no outbound network. `BITHUMAN_API_SECRET` is still required for
avatar metering (or `BITHUMAN_UNMETERED=1` for dev parity testing).

```bash
pip install 'bithuman-cli[local]'
export BITHUMAN_API_SECRET=your_api_secret
BITHUMAN_LOCAL=1 bithuman run avatar.imx
```

Both modes go through the same `bithuman run` command and produce the
same browser URL. See [Local mode](/cli/local-mode) for the full
on-device stack and tuning variables.

## Cache layout

| Path | Contents |
| --- | --- |
| `~/.cache/bithuman/models` | `.imx` avatar models (pool-mode default `--models-root`) |
| `~/.cache/bithuman/avatars` | Imported avatars staged via `POST /launch` |
| `~/.cache/bithuman/showcase` | Downloads from `bithuman pull` |
| `~/.cache/bithuman/brain-venv` | Auto-bootstrapped venv for the bundled conversation brain (only used when not pip-installed) |
| `~/.cache/huggingface/hub` | Local-mode STT + LLM weights (whisper.cpp `.bin`, llama.cpp `.gguf`) |
| `~/.cache/supertonic` | Local-mode TTS ONNX weights |

`bithuman doctor` shows the current size of each directory. Clear the
whole tree with `rm -rf ~/.cache/bithuman` — it regenerates on the next
run.

## See also

- [Install](/cli/install) — install channels and `doctor`
- [Commands](/cli/commands) — subcommand and flag reference
- [Local mode](/cli/local-mode) — the on-device brain stack
