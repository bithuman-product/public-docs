---
title: "CLI reference"
description: "Every bithuman command, flag, environment variable, exit code and --json shape."
section: sdk
group: "Reference"
order: 80
type: reference
label: "CLI reference"
---

Covers the CLI at the version on [Downloads & versions](/downloads). The binary describes itself too: `bithuman <command> --help`, and `bithuman __schema` prints the full command, flag and exit-code tree as JSON. The quickstart is on [CLI](/sdk/cli).

## Commands

| Command | Purpose |
|---|---|
| `bithuman run [avatar]` | Live avatar in your browser. No argument runs `wise-pup` |
| `bithuman render <avatar> <audio>` | Audio in, MP4 out |
| `bithuman pull <avatar>` | Download a sample avatar, or your own agent's model, ahead of time |
| `bithuman list [--mine]` | List the sample avatars, or yours |
| `bithuman open <avatar>` | Check that an avatar opens here, and list its contents |
| `bithuman login` / `logout` | Sign in and store a per-device API secret / revoke it |
| `bithuman account` | Your account, plan, credit balance and recent usage |
| `bithuman engine list \| install [mac\|linux]` | Inspect or fetch the Expression 2 render engine |
| `bithuman doctor` | Check the install, credential, brain and cache |
| `bithuman version` | CLI, engine and build versions |
| `bithuman mcp` | MCP server over stdio; `bithuman mcp tools` lists its tools |
| `bithuman completion <shell>` | Completions for bash, zsh, fish, elvish, powershell |

A command outside this list exits 2 with `unrecognized subcommand`. Everywhere, `<avatar>` is an agent code (`A24EKJ8433`), a sample avatar's name (`wise-pup`), or a file (`wise-pup.imx`); `run`, `render` and `open` download a code or name on first use. `--json`, `-h` and `-V` (root only) work on every command.

## Sign in

```bash
bithuman login                 # browser sign-in; stores a per-device API secret
bithuman login --device        # over SSH: prints a code to enter elsewhere
printf %s "$BITHUMAN_API_SECRET" | bithuman login --with-token   # CI: checks the secret, then stores it
bithuman logout                # revokes the secret login stored on this device
```

The secret is stored in `~/.bithuman/config` (mode `0600`) and named `cli@<hostname>` under [API Secrets](https://www.bithuman.ai/developer/api-keys), so each device can be revoked alone. `--with-token` exits 77 (`TOKEN_REJECTED`) for a secret the service refuses and 69 (`TOKEN_UNVERIFIED`) when the service cannot be reached; neither stores anything.

### Credential resolution order

1. `BITHUMAN_API_SECRET` in the environment
2. `BITHUMAN_API_KEY` in the environment (a deprecated alias)
3. A `.env` file in the working directory: its `BITHUMAN_API_SECRET` line, else its `BITHUMAN_API_KEY` line. No other line of the file is read.
4. `~/.bithuman/config`, written by `bithuman login`

`bithuman account --json` reports which of these supplied the secret.

`bithuman logout` revokes only the secret in `~/.bithuman/config`, then deletes it. A secret from the environment or a `.env` file is never revoked; logout names where it comes from instead.

## bithuman run

| Flag | Default | Purpose |
|---|---|---|
| `--host` | `127.0.0.1` | Bind address. `0.0.0.0` also needs `BITHUMAN_ALLOW_PUBLIC_BIND=1` |
| `--port` | `8088` | HTTP port |

`run` starts everything a session needs: a local `livekit-server` (it must be on `PATH`) and the conversation brain. A file runs locally: Expression 2 (`.avatar` or `.imx`), Essence 2 and Essence 1 (`.imx`). An Essence 2 or Expression 2 agent code opens a cloud session. Expression 1 is cloud-only.

The conversation brain: signed in, `run` uses the managed brain and installs it into `~/.cache/bithuman/brain-venv` on first use (about 350 MB on disk). `OPENAI_API_KEY` selects OpenAI Realtime instead, and `BITHUMAN_LOCAL=1` runs it on your hardware ([on-device brain](/sdk/cli/local-mode)).

## bithuman render

| Flag | Default | Purpose |
|---|---|---|
| `<audio>` | required | The second argument: any format `ffmpeg` reads |
| `-o`, `--output <PATH>` | `<avatar>.mp4` | Output file |
| `--limit <N>` | none | Stop after N frames |

| Model | Output |
|---|---|
| Expression 2 | MP4 at 20 fps: `ceil(seconds × 20)` frames |
| Essence 2 | MP4 at 25 fps: `ceil(seconds × 25)` frames |
| Essence 1 | refused (exit 70); use the [video API](/api/video) |

`render` needs `ffmpeg` on `PATH` (or `BITHUMAN_FFMPEG`). A refused render writes no file.

## bithuman pull

```bash
bithuman pull wise-pup                          # a sample avatar: no account → ~/.cache/bithuman/showcase/
bithuman pull "$AGENT_CODE"                     # your agent: needs sign-in → ~/.cache/bithuman/agents/<code>/
bithuman pull "$AGENT_CODE" --model essence-2   # when the agent has more than one model
```

`pull` prints only the cached path on stdout, so `MODEL=$(bithuman pull wise-pup)` captures it. A second `pull` downloads again when the published file changed; `--force` always does. An agent with several models returns the one it was created with unless you pass `--model`; `--json` lists the others in `other_models`. A slug not in `bithuman list` exits 66 (`SLUG_NOT_FOUND`). `--model essence-1 | essence-2 | expression-2` picks which of the agent's models to download.

## bithuman open

Succeeds, or refuses with one of four kinds: `InvalidAvatar`, `NotSupported`, `NotAuthorised`, `Failed`. On success it prints the engine, the model and every member with its size. The `engine` value is a legacy identifier ([the engine value](/concepts/avatars-imx#the-engine-value-is-a-legacy-name)), not a `model` value.

## bithuman engine

The Expression 2 engine ships with the CLI. `bithuman engine install` fetches it again (idempotent); `bithuman engine install linux` fetches the other platform's for a cross-build. The argument is `mac` or `linux`.

## bithuman doctor

Checks versions, host, memory, credential, brain and cache sizes. Exits 0 only when a credential, a brain, the agent worker, the audio encoder and `ffmpeg` are all available. The first `bithuman run` sets up the worker, so a fresh install reports not ready until then.

## Environment variables

| Variable | Effect |
|---|---|
| `BITHUMAN_API_SECRET` | Your API secret (`BITHUMAN_API_KEY` is a deprecated alias) |
| `BITHUMAN_API_BASE` | API base URL: `https://api.bithuman.ai` (the default) or another `https://*.bithuman.ai` address; any other value is ignored with a notice |
| `BITHUMAN_CACHE_DIR` | Cache root (default `~/.cache/bithuman`) |
| `BITHUMAN_ALLOW_PUBLIC_BIND` | `1` lets `run --host 0.0.0.0` listen on every interface |
| `OPENAI_API_KEY` | Use OpenAI Realtime as the conversation brain |
| `BITHUMAN_LOCAL` | `1` runs the brain on this machine ([on-device brain](/sdk/cli/local-mode)) |
| `BITHUMAN_LOCAL_*`, `BITHUMAN_INSTRUCTIONS` | On-device brain settings ([tuning](/sdk/cli/local-mode#tuning)) |
| `BITHUMAN_FFMPEG` | Path to `ffmpeg` |
| `BITHUMAN_VERSION` | Release tag for the installer, set on the `sh` side of the pipe: `curl -fsSL https://install.bithuman.ai \| BITHUMAN_VERSION=cli-v2.7.8 sh` |
| `BITHUMAN_INSTALL_DIR` | Where the installer puts the binary (default `~/.local/bin`) |
| `NO_COLOR` | Turn colour off |
| `BITHUMAN_LICENSE_FILE` | Path to a signed offline licence (Business and Enterprise, [offline licensing](/guides/pricing#offline-licensing)) |
| `BITHUMAN_THREADS` | Render threads (default: one per CPU the process may use, up to 16) |
| `BITHUMAN_INSTALL_ID` | This install's id in usage reports (default: a random id kept in `~/.bithuman/install_id`) |

## Cache

| Path | Contents |
|---|---|
| `~/.cache/bithuman/showcase` | Sample avatars |
| `~/.cache/bithuman/agents/<code>` | Your agents' models |
| `~/.cache/bithuman/run` | Session state and logs |
| `~/.cache/bithuman/brain-venv` | The conversation brain |
| `~/.cache/bithuman/bundles` | Unpacked avatars (about the size of each avatar again) |
| `~/.bithuman/engines` | Render engines, including the Essence 2 audio encoder (about 66 MB) |
| `~/.cache/huggingface`, `~/.cache/supertonic` | On-device brain weights |

`bithuman doctor` prints each size. Deleting `~/.cache/bithuman` is safe.

## Platforms

Binaries: `aarch64-apple-darwin`, `x86_64-unknown-linux-gnu`, `aarch64-unknown-linux-gnu`. On any other platform the installer names the platform, says what is supported, and exits 1 without downloading. There is no Intel Mac or native Windows binary; use WSL2, a Linux container, or the [cloud API](/api).

## JSON output

With `--json`, a command prints exactly one JSON object on stdout and nothing else. Success objects carry `"schema_version": 1`. A failure prints one object to stderr, with a `hint` when there is a next step:

```json
{"error": {"code": "NOT_AUTHENTICATED", "kind": "NotAuthorised", "command": "account", "message": "not signed in", "hint": "run `bithuman login` (free, one tap) — or set BITHUMAN_API_SECRET"}}
```

Colour appears only on an interactive terminal.

### Shapes

`bithuman version --json`:

```json
{"abi":7,"cli":"2.7.8","libessence":"2.11.12","build":{"target":"x86_64-unknown-linux-gnu","profile":"release"},"engine":{"platform":"linux","runtime":"litert","version":"1.0.1"},"schema_version":1}
```

`bithuman account --json` (exit 77 with no credential; `--limit <N>`, default 10, sets how many recent charges to show):

```json
{"logged_in": true, "source": "env BITHUMAN_API_SECRET", "email": "you@example.com", "plan": "creator", "credit_balance": 1000, "account_status": "active", "out_of_credits": false, "usage": {"data": [], "pagination": {"total": 0}}}
```

`bithuman list --json`:

```json
{"schema_version": 1, "version": 2, "models": [{"slug": "wise-pup", "agent_code": "A23WJF0199", "name": "Wise Pup", "model": "expression-2", "size": 198632867}]}
```

`bithuman pull <slug or code> --json`:

```json
{"schema_version": 1, "code": "A23WJF0199", "path": "/home/you/.cache/bithuman/showcase/wise-pup.imx", "cached": false, "family": "expression-2", "model": "expression-2", "other_models": [], "runnable_locally": true}
```

`bithuman render … --json` also carries `render_seconds` and `render_fps`, how long the engine took and how fast it produced frames (`fps` is the file's playback rate). `frames / fps` is the clip length; `seconds` is the wall time of the whole command:

```json
{"schema_version": 1, "output": "out.mp4", "bytes": 1234567, "seconds": 21.4, "width": 416, "height": 720, "frames": 300, "fps": 20, "render_seconds": 6.2, "render_fps": 48.4}
```

`bithuman login --json` (both routes; the code box goes to stderr):

```json
{"schema_version": 1, "logged_in": true, "email": "you@example.com", "alias": "cli@your-host", "stored": "~/.bithuman/config"}
```

`alias` is null with `--with-token`.

`bithuman run … --json` prints one event when the session is live:

```json
{"schema_version": 1, "event": "session_started", "url": "http://127.0.0.1:8088/WISEPUP", "code": "WISEPUP", "host": "127.0.0.1", "port": 8088, "cost_per_min": 10, "credit_balance": 99}
```

`bithuman doctor --json` exits 0 when `"ready": true`. The values above are examples; the shapes are stable, and `schema_version` changes when they are not.

### Exit codes

| Code | Name | Meaning |
|---|---|---|
| 0 | success | |
| 1 | GENERIC | runtime error; `doctor` not ready; a browser or device sign-in that failed or timed out |
| 2 | USAGE | bad arguments; `--host 0.0.0.0` without `BITHUMAN_ALLOW_PUBLIC_BIND=1` |
| 66 | NOINPUT | file, slug or model not found; not an avatar file |
| 69 | UNAVAILABLE | network, engine or service unavailable; incomplete model file; `ffmpeg` missing |
| 70 | SOFTWARE | internal error (Essence 1 `render`) |
| 77 | NOPERM | not signed in, a rejected or revoked secret (including `login --with-token`), out of credits, or forbidden |
| 130 | — | interrupted with Ctrl-C (a live Expression 2 session exits 0 after draining) |

### Introspection

```bash
bithuman __schema    # command, flag and exit-code tree as JSON
bithuman __agents    # this contract, offline
bithuman token       # the resolved secret on stdout (exit 77 if none)
```

## MCP server

```json
{"mcpServers": {"bithuman": {"command": "bithuman", "args": ["mcp"]}}}
```

`bithuman mcp` speaks the Model Context Protocol over stdio. `bithuman mcp tools --json` lists the tools: local ones (`version`, `doctor`, `inspect_model`, `list_showcase`, `pull`, `render`) and ones that call the bitHuman API. Tools that create agents, speech or gestures spend credits. The full list is on [MCP server](/sdk/mcp#tools).

## Recipes

```bash
# First render on a new machine: check the credential first, then render.
set -e
bithuman account --json >/dev/null          # exit 77: run `bithuman login`
curl -fsSLo speech.wav https://docs.bithuman.ai/samples/speech.wav
bithuman render wise-pup speech.wav -o out.mp4 --json | jq -r .output

# Is this install ready to serve? (exit 0 = yes)
bithuman doctor --json | jq -e .ready >/dev/null
```

## Renamed in 2.7.3

The old spellings still work for now. Each prints one line on stderr naming what to use instead, and `--json` output is unchanged.

| Was | Now |
|---|---|
| `render X -a in.wav` | `render X in.wav` |
| `render` writing `output.mp4` | `render` writes `<avatar>.mp4` unless you pass `-o` |
| `render --quality`, `--target-size` | one preset, each avatar's default size |
| `run --allow-public-bind` | `BITHUMAN_ALLOW_PUBLIC_BIND=1` |
| `run --cloud`, `--offscreen`, `--frames`, `--embedded-livekit`, `--livekit-*` | not needed: `run <avatar>` picks and starts what it needs; frames without a window come from `render --limit N` |
| `chat`, `info`, `avatars`, `list --agents` | `run`, `open`, `list`, `list --mine` |
| `list --limit/--offset/--status`, `account --start/--end/--agent` | the full list; filter the `--json` output |
| `--api-base`, `--dest` | `BITHUMAN_API_BASE`, `BITHUMAN_CACHE_DIR` |
| `--quiet`, `--no-color`, `BITHUMAN_JSON/QUIET/NO_COLOR` | `--json`, `NO_COLOR=1` |
