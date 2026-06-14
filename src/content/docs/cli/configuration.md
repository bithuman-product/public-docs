---
title: "Configuration"
description: "Environment variables, cache layout, and cloud-vs-on-device brain selection for the bitHuman CLI."
section: cli
group: "Usage"
order: 11
---

## Environment variables

| Variable | What |
| --- | --- |
| `BITHUMAN_API_SECRET` | Avatar-runtime auth (metering). Canonical name on the CLI; `BITHUMAN_API_KEY` is accepted as an alias for cross-SDK parity. The easiest way to set this is `bithuman login` (stores it in the OS keychain); set it manually for CI / automation. Get a free key at [bithuman.ai → Developer](https://www.bithuman.ai/#developer). |
| `OPENAI_API_KEY` | Cloud conversation brain (OpenAI Realtime). Required for `bithuman run` unless `BITHUMAN_LOCAL=1` is set. |
| `BITHUMAN_LOCAL` | `=1` flips the brain to the on-device stack (whisper.cpp + llama.cpp + Supertonic + Silero). Needs the `[local]` extra: `pip install 'bithuman-cli[local]'`. See [Local mode](/cli/local-mode). |
| `BITHUMAN_LOCAL_*` | Per-component tuning (whisper model, LLM, voice, language). Brain-side — read by the Python agent, not the CLI binary. See [Local mode tuning](/cli/local-mode). |
| `BITHUMAN_INSTRUCTIONS` | System-prompt override for the conversation brain. Brain-side — read by the Python agent, not the CLI binary. |
| `RUST_LOG` | Tracing filter. Default `bithuman_serve=info,warn`. |

## Where the credential comes from

Every command resolves `BITHUMAN_API_SECRET` in this order — first match
wins:

1. **`BITHUMAN_API_SECRET`** in the environment (explicit; CI / automation)
2. **OS keychain** — what `bithuman login` writes (macOS Keychain / Linux
   Secret Service)
3. **`~/.bithuman/config`** — the dotenv fallback (written by
   `bithuman init`, or by `login` when no keychain is available)

`bithuman login` is the recommended way to set this up for interactive use:
it mints a per-device key and stores it in the keychain so commands just
work across sessions. The manual env path stays fully supported for CI,
containers, and headless automation — `export BITHUMAN_API_SECRET=…` (it
takes priority over a logged-in key, which is handy for testing a specific
secret). See [Commands → Signing in](/cli/commands#signing-in).

### Startup config file

At every startup the CLI loads `~/.bithuman/config` — a dotenv file
(mode `0600`) — and merges its keys into the environment. This is how a
secret persists across sessions without re-exporting it.

Note: `~/.bithuman/embedded-key` is **not** read by the CLI, and a `.env`
file in the current directory is **not** auto-loaded — only
`~/.bithuman/config` and the process environment are consulted.

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
avatar metering.

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
| `~/.cache/bithuman/run` | Per-`run` scratch (session state, logs) |
| `~/.cache/bithuman/examples` | Cached example assets |
| `~/.cache/bithuman/brain-venv` | Auto-bootstrapped venv for the bundled conversation brain (only used when not pip-installed) |
| `~/.cache/huggingface` | Local-mode STT + LLM weights (whisper.cpp `.bin`, llama.cpp `.gguf`) |
| `~/.cache/supertonic` | Local-mode TTS ONNX weights |

`bithuman doctor` shows the current size of each directory. Clear the
whole tree with `rm -rf ~/.cache/bithuman` — it regenerates on the next
run.

## Embedded LiveKit port

`--embedded-livekit-port` sets the port for the embedded `livekit-server`
child that `bithuman run` spawns. Override it when the default collides
with another process.

## See also

- [Install](/cli/install) — install channels and `doctor`
- [Commands](/cli/commands) — subcommand and flag reference
- [Local mode](/cli/local-mode) — the on-device brain stack
