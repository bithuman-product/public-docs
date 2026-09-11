---
title: "CLI reference"
description: "Every bithuman subcommand, flag, environment variable, exit code and --json shape, in one page. The happy path is on /sdk/cli."
section: sdk
group: "Reference"
order: 70
label: "CLI reference"
---

The two-command quickstart is on [the CLI page](/sdk/cli). This page is
everything else: the subcommands, the flags, the environment, the cache, the
exit codes and the machine-readable contract.

Anything here can be re-derived from the binary itself — `bithuman <cmd> --help`
for one command, `bithuman __schema` for the whole command / flag / exit-code
tree as JSON, generated from the binary so it cannot drift from your install.

## Version

```text
$ bithuman --version
libessence 3.1.2 ABI 7
bithuman    2.6.6
```

**`cli-v2.6.6` is the current release**, the same version on macOS arm64 and
Linux x86_64. The first line names the engine version — a separate axis from
the CLI's own number, printed under the engine's legacy spelling because it is
the string you have to grep for; the product name is
[essence-2](/concepts/essence-2). Do not pin a CLI version unless you have a
reason: the installer takes the newest release, and that is the tested one.

## Subcommands

| Command | What it does |
| --- | --- |
| `bithuman run [avatar]` | Live avatar. No argument fetches and renders the free Wise Pup `expression-2` avatar; pass a file or an agent code to run your own |
| `bithuman render <file> -a <audio>` | Offline render: model + audio → MP4 |
| `bithuman pull <slug \| AGENT_CODE>` | Download a showcase avatar, or your own agent's model by code |
| `bithuman list` | Browse the showcase catalogue (aliases: `avatars`, `ls`, `browse`) |
| `bithuman info <file>` | Model metadata: format, engine, family, and the container's full table of contents (alias: `inspect`) |
| `bithuman login` / `logout` | Sign in through the browser and mint a per-device key / revoke it |
| `bithuman auth status` | Who you are signed in as and where the credential lives (alias: `whoami`) |
| `bithuman account` | Plan, credit balance, account status (alias: `credits`) |
| `bithuman usage` | Recent credit usage and metering history |
| `bithuman init` | Interactive wizard: save a secret, pick a brain, pull a starter avatar |
| `bithuman engine list \| install \| update` | Inspect or fetch the per-platform Expression 2 render engine |
| `bithuman doctor` | Host, credential, brain and cache check |
| `bithuman mcp` | The built-in MCP server over stdio; `bithuman mcp tools` lists its 26 tools |
| `bithuman completion <shell>` | Completions for bash, zsh, fish, elvish, powershell |

Every subcommand takes `--help`, and each `--help` ends in a copy-pasteable
`EXAMPLES:` block.

## Signing in

```bash
bithuman login              # opens a browser, mints a per-device key
bithuman login --device     # SSH / headless: prints a short code to enter elsewhere
bithuman auth status        # who am I, and where is the credential read from
bithuman logout             # revokes this device's key on the server
```

The key is stored in your OS keychain (macOS Keychain, Linux Secret Service),
aliased `cli@<hostname>` so you can recognise and revoke it from
[Developer → API Keys](https://www.bithuman.ai/developer/api-keys). With no
keychain it falls back to `~/.bithuman/config`, a dotenv file at mode `0600`.
Each device gets its own key, so revoking one laptop leaves the others alone.

In CI, skip `login` entirely and export `BITHUMAN_API_SECRET`, or pipe it:
`printf %s "$KEY" | bithuman login --with-token`.

### Credential resolution order

First match wins, so an exported key always beats a logged-in one:

1. `BITHUMAN_API_SECRET` in the environment
2. the OS keychain (what `bithuman login` writes)
3. `~/.bithuman/config` (the dotenv fallback, loaded at every startup)

`~/.bithuman/embedded-key` is **not** read, and a `.env` in the working
directory is **not** auto-loaded.

## `bithuman run`

| Flag | Default | What |
| --- | --- | --- |
| `--host` | `127.0.0.1` | Bind address. `0.0.0.0` also needs `--allow-public-bind` |
| `--port` | `8088` | Launcher HTTP port |
| `--max-sessions` | CPU count | Pool cap; launches over the cap are rejected, not degraded |
| `--embedded-livekit` | on with a model argument | Spawn a self-contained `livekit-server` child |
| `--embedded-livekit-port` | — | Move that child's port when the default collides |
| `--cloud` | off | Force a cloud-rendered session instead of rendering locally. Needs an agent code |

`run` sniffs the model family before it launches, so every bitHuman artifact
gets an honest answer instead of a deep engine error.


Every self-hosted `run` and `render` is metered. The line to grep for, printed once when the meter attaches — it names the avatar, the product and the endpoint that will be billed:

```text
[selfhost-meter] metering armed for identity=/home/you/.cache/bithuman/showcase/wise-pup.imx product=expression-2 endpoint=https://api.bithuman.ai/v1/
```

If instead you see `★ UNMETERED RENDER`, the service could not be reached and a live `run` keeps rendering; a `render` refuses (exit 77) with no key at all.

### Which model files run locally

| Family | The file | What `run` does |
|---|---|---|
| `expression-2` | `<code>.avatar` | Renders locally on macOS Apple Silicon and Linux x86_64. The default Wise Pup avatar is this family |
| `essence-2` | `<code>.imx` (releases before 2.6.0 wrote `<code>.lebundle.imx`, [a legacy name kept for compatibility](/concepts/avatars-imx)) | Renders locally on both platforms since **2.6.1**. The first play fetches the shared audio encoder and checks the licence with the cloud, so it needs your sign-in. A file missing a required member is refused, exit 69 |
| `essence-1` | `<code>.imx` | Renders locally |
| `expression-1` | usually none | Cloud-served. The exception is an agent that went through the lip step, which owns a baked `<code>.imx` that runs like `essence-1` |

Passing a bare **agent code** rather than a path is different: an `essence-2`
or `expression-2` code opens a live cloud session, and `--cloud` forces that
for an `essence-1` code too.

### Where the local render happens

On macOS (Apple Silicon) and Linux x86_64, both Expression 2 and Essence 2
render locally, with the runtime inside the tarball — nothing else to install.

### The conversation brain

`run` renders on its own. To make the avatar answer, it launches a Python
worker. Signing in gives you the managed brain and the first `run` bootstraps
`~/.cache/bithuman/brain-venv` (a one-time ~200 MB download). The two
alternatives are `OPENAI_API_KEY` for OpenAI Realtime, and `BITHUMAN_LOCAL=1`
for the fully on-device stack — [local mode](/sdk/cli/local-mode) is the one
writer for what that stack needs.

## `bithuman render`

| Flag | Default | What |
| --- | --- | --- |
| `-a`, `--audio <PATH>` | required | Any format `ffmpeg` reads for the second-generation engines; `essence-1` wants a 16 kHz mono PCM WAV |
| `-o`, `--output <PATH>` | `output.mp4` | Output path |
| `--quality <PRESET>` | `MEDIUM` | `LOW`, `MEDIUM`, `HIGH` |
| `--target-size <SIZE>` | `1280` | `N` (longest side) or `WxH`. **`essence-1` only** — the second-generation engines emit their native size |
| `--limit <N>` | none | Cap at N frames; the audio is trimmed to `N/fps` |

Writing the MP4 needs `ffmpeg` on `PATH` (or `$BITHUMAN_FFMPEG`).

| Family | Result | rc |
| --- | --- | --- |
| `expression-2` | A real MP4 at 20 fps — an *s*-second clip yields `ceil(s × 20)` frames | `0` |
| `essence-2` | A real MP4 at 25 fps — `ceil(s × 25)` frames. New in 2.6.1 | `0` |
| `essence-1` | The engine runs, the mux fails, no file is written. Use the [Video API](/api/video) | `70` |

**`render` refuses without a credential — exit 77, before any model is
opened.** Re-measured 2026-09-10 on 2.6.5: *"bithuman render: not signed in, or
the credential is not valid."* That gate fires for every family and says nothing
about whether the family would have rendered.

**2.6.5 removed a five-minute ceiling on `essence-2` renders.** Until then the
render's budget was a *start-up* timeout of 300 s that was never moved, so the
longest clip the command could finish was whatever your machine rendered in five
minutes; it failed with *"engine produced N frames but the audio needs M —
refusing to write a truncated render"*. If you are on 2.6.4 or earlier and a
long clip fails that way, upgrade rather than splitting the audio.

A refused render leaves **no file** at `--output`. Count the frames anyway —
it is the only check that tells a complete clip from a partial one:

```bash
ffprobe -v error -count_frames -select_streams v:0 \
  -show_entries stream=nb_read_frames -of csv=p=0 out.mp4
```

## `bithuman pull`

```bash
bithuman pull modern-court-jester           # a showcase slug → ~/.cache/bithuman/showcase/
bithuman pull A17ZTB0222                    # your agent → ~/.cache/bithuman/agents/<code>/
bithuman pull A31BSK9325 --model essence-2  # a specific family
```

`pull` prints the cached path — and only the path — on stdout, so
`MODEL=$(bithuman pull …)` captures it. A showcase slug needs no credential;
an agent code goes through the authenticated
[download endpoint](/api/agents#download-an-agents-model) and exits 77 without
a sign-in, or 66 carrying the API's error (including the poll-able
`MODEL_ARTIFACT_NOT_READY`).

**One agent can own more than one downloadable model.** [Adding a
model](/api/agents#add-a-model-to-an-existing-agent) gives the same code a
second trained family, and a bare `pull` hands back the family the agent was
*created* with — not the newest. There is no warning. Name the family with
`--model` (`essence-1`, `essence-2`, `expression-2`), or read
`other_models` from `bithuman pull <CODE> --json`.

### What you get, per family

| Family | File | What runs it |
|---|---|---|
| `essence-1` | `<code>.imx` | This CLI, the [Python SDK](/sdk/python), the [Android AAR](/sdk/android), the cloud |
| `essence-2` | `<code>.imx` | This CLI (2.6.1+), the [Python SDK](/sdk/python), the cloud. **Licensed weights — keep the file** |
| `expression-2` | `<code>.avatar` | This CLI, the [Python SDK](/sdk/python), the browser via [`?render=local`](/guides/browser-rendering), the [Apple `Expression2` product](/sdk/ios#minimal-code), the cloud |
| `expression-1` | usually nothing (`400 MODEL_NOT_DOWNLOADABLE`) | The cloud |

All but a minority of these are `IMX\0` v2 containers — including the
`expression-2` one, despite its `.avatar` name. A few `expression-2` identities
trained before 2026-07-12 are still an older zip format and will not be re-published.
`bithuman info <file>` reads either, so run it rather than trusting the
extension.

## `bithuman info`

Prints format, engine, family, and every member of the container with its byte
size. The `engine` field carries a **legacy name kept for compatibility** — an
Essence 2 bundle reports `essence2-light` — and is never a valid `model`
value; see
[the `engine` value is a legacy name](/concepts/avatars-imx#the-engine-value-is-a-legacy-name).

Run 2026-09-10 against the public showcase identity `A08CCD3871.avatar`, with
no credential anywhere in the environment:

```text
  Format:         IMX v2
  Engine:         expression2
  Family:         expression-2 (Expression 2)
  Members (17):
    canon.bin  (299520 bytes)
    combined_litert.tflite  (158524428 bytes)
    idle.mp4  (1154851 bytes)
    …
```

## `bithuman engine`

The Expression 2 render engine ships inside the CLI, so a fresh install needs
nothing extra. This subcommand is the manual channel — for a cross-platform
build, or when a newer avatar needs a newer engine.

```bash
bithuman engine list           # what exists and which one this host uses
bithuman engine install        # this platform
bithuman engine install linux  # the other one, for a cross-build
bithuman engine update
```

The platform argument is **`mac` or `linux`** and nothing else; a target triple
exits 2. Essence 2 has no `engine` subcommand and needs none — its runtime is
in the tarball, and the one thing it fetches is the shared audio encoder.

## `bithuman doctor`

Checks versions, host, RAM, credential, brain and cache sizes, and **exits 0
only when both a credential and a brain resolve** — signed out it exits 1, and
that is the check working. Rendering and pulling need neither.

## Environment variables

| Variable | What |
| --- | --- |
| `BITHUMAN_API_SECRET` | The credential. `BITHUMAN_API_KEY` is accepted as an alias for cross-SDK parity |
| `OPENAI_API_KEY` | Selects the OpenAI Realtime conversation brain |
| `BITHUMAN_LOCAL` | `=1` selects the on-device brain — [local mode](/sdk/cli/local-mode) |
| `BITHUMAN_LOCAL_*`, `BITHUMAN_INSTRUCTIONS` | Brain-side tuning, read by the Python worker rather than the binary — [local mode](/sdk/cli/local-mode#tuning) |
| `BITHUMAN_METER_ENFORCE` | `=1` turns a missing or rejected key into a refusal before the first frame instead of a warning |
| `BITHUMAN_FFMPEG` | Path to `ffmpeg` when it is not on `PATH` |
| `BITHUMAN_VERSION` | Pins the release the installer fetches (`cli-v2.6.6`) |
| `BITHUMAN_INSTALL_DIR` | Where the installer puts the binary (default `~/.local/bin`, or `/usr/local/bin` as root) |
| `BITHUMAN_JSON`, `BITHUMAN_QUIET`, `BITHUMAN_NO_COLOR` | Flip the matching global flag's default; an explicit flag still wins |
| `RUST_LOG` | Tracing filter. Default `bithuman_serve=info,warn` |

## Cache layout

| Path | Contents |
| --- | --- |
| `~/.cache/bithuman/showcase` | Showcase avatars from `bithuman pull <slug>` |
| `~/.cache/bithuman/agents/<code>` | Your own agents' models |
| `~/.cache/bithuman/run` | Per-run scratch: session state and logs |
| `~/.cache/bithuman/brain-venv` | The auto-bootstrapped conversation-brain venv |
| `~/.bithuman/avatars/<code>` | An unpacked avatar lane, staged on first play |
| `~/.bithuman/engines` | Expression 2 engines (`bithuman engine install`) |
| `~/.bithuman/engines/essence-2` | The shared Essence 2 audio encoder, ~377 MB, fetched once by content digest |
| `~/.cache/huggingface`, `~/.cache/supertonic` | Local-mode brain weights |

`bithuman doctor` prints the current size of each. `rm -rf ~/.cache/bithuman`
is safe — it regenerates.

## Platforms with no binary

The installer builds a target triple from `uname` and asks the release for that
tarball. Exactly two targets carry one: `aarch64-apple-darwin` and
`x86_64-unknown-linux-gnu`. On anything else it reads the release's asset list,
names the two it does carry, and exits **1** before downloading a byte:

```text
install: error: the bithuman CLI is NOT published for aarch64-unknown-linux-gnu.
install: error:   release carries:
install: error:     bithuman-aarch64-apple-darwin.tar.gz
install: error:     bithuman-x86_64-unknown-linux-gnu.tar.gz
rc=1
```

So an **Intel Mac** and a **Linux ARM box** cannot install the CLI: there is no
flag, no fallback and no Rosetta path. `BITHUMAN_VERSION=cli-v2.3.27` still
resolves a published Linux-ARM tarball whose sha256 verifies, but it is months
of render work behind and **whether that binary still runs on a current ARM
distribution was never tested** — treat it as a stopgap. On an Intel Mac, use
the [cloud API](/api/reference) or run the Linux binary in a container.

There is no PyPI route to the CLI: the `bithuman-cli` wheel is no longer
published, and `pip install bithuman-cli` finds no distribution. The separate
`bithuman` PyPI package is the [Python library](/sdk/python), not the CLI.

## The machine-readable contract

Pass `--json` to any command and get **exactly one JSON object on stdout**, and
nothing else on stdout — no logs, no progress. Every success object carries
`"schema_version"` (currently `1`); pin it.

A failure prints one object to **stderr** and leaves stdout empty:

```json
{"error":{"code":"SLUG_NOT_FOUND","message":"slug 'x' not found in manifest. Try `bithuman list`.","command":"pull"}}
```

Colour is emitted only to an interactive TTY, so `--json`, `NO_COLOR`, `CI`,
`TERM=dumb` and any pipe all silence it.

### Exit codes

A stable sysexits subset. Branch on these rather than parsing text.

| code | name | meaning |
|------|------|---------|
| 0 | success | |
| 1 | GENERIC | unclassified runtime error (also `doctor` when not ready) |
| 2 | usage | bad arguments |
| 66 | NOINPUT | input, file, slug or model not found |
| 69 | UNAVAILABLE | network, engine or service unavailable; an incomplete model file |
| 70 | SOFTWARE | internal error (`essence-1` `render`) |
| 77 | NOPERM | not signed in, out of credits, or forbidden |

### The shapes

```json
// bithuman version --json
{"abi":7,"cli":"2.6.6","libessence":"3.1.2",
 "build":{"commit_short":"…","target":"x86_64-unknown-linux-gnu","built_at":"…","profile":"release"},
 "engine":{"platform":"linux","runtime":"litert","version":"1.0.1","sha256":"…","size":92473490},
 "schema_version":1}

// bithuman whoami --json      exit 0 signed in, 1 signed out
{"logged_in":true,"user":"you@example.com","alias":"cli@host-…","source":"env BITHUMAN_API_SECRET"}

// bithuman account --json     exit 77 with no credential
{"email":"…","plan":"creator","credit_balance":5986130,"account_status":"active","out_of_credits":false}

// bithuman list --json     the gallery; every row carries the CODE you can pull
{"version":2,"models":[{"agent_code":"A02HCY0444","slug":"shelly-tidewater","name":"…",
                       "model":"expression-2","size":198632867,"description":"…"}],
 "schema_version":1}

// bithuman pull <CODE> --json      a gallery CODE needs no key and costs nothing
{"code":"A02HCY0444","path":"/…/A02HCY0444.imx","cached":false,"family":"expression-2",
 "model":"expression-2","model_source":"birth","other_models":[],"runnable_locally":true,
 "schema_version":1}

// bithuman info <file> --json
{"path":"…","format_version":2,"size_bytes":82583342,"engine":"essence1","family":"essence-1",
 "manifest":{…},"members":[{"name":"manifest.json","size_bytes":1030},…],"schema_version":1}

// bithuman render … --json     frames is read back from the finished file
{"output":"out.mp4","bytes":1234567,"seconds":3.4,"width":1280,"height":720,"frames":125,
 "fps":25,"lead_in_frames_dropped":10}

// bithuman doctor --json      exit 0 iff "ready":true
{"ready":false,"versions":{…},"host":{…},"auth":{…},"brain":{…},"runtime_assets":{…}}

// bithuman run … --json       one event on stdout when the session is live
{"event":"session_started","url":"http://127.0.0.1:8088/","host":"127.0.0.1","port":8088}
```

The `version --json`, `list --json`, `pull --json` and `info --json` objects
above were read from CLI 2.6.6 on Linux x86_64 on 2026-09-11.

### Introspection

```sh
bithuman __schema      # the whole command / flag / exit-code tree as JSON
bithuman __man [DIR]   # roff man pages
bithuman __agents      # this contract, printed offline
bithuman auth token    # the resolved secret on stdout (exit 77 if none)
```

### MCP server

```json
{ "mcpServers": { "bithuman": { "command": "bithuman", "args": ["mcp"] } } }
```

`bithuman mcp` speaks Model Context Protocol over stdio and exposes **26 tools**
(confirmed on 2.6.5 with `bithuman mcp tools`): thin wrappers over
`api.bithuman.ai` — `validate_api_secret`, `get_credit_balance`, `get_usage`,
`list_voices`, `text_to_speech`, `generate_agent`, `get_agent_status`,
`get_agent`, `update_agent_prompt`, `delete_agent`, `list_agents`,
`agent_speak`, `add_agent_context`, `get_dynamics`, `generate_dynamics`,
`create_embed_token`, `upload_file`, and the webhook set — plus four local tools
that re-exec the CLI with no network: `version`, `doctor`, `inspect_model`,
`list_showcase`.

It is the built-in successor to the standalone `bithuman-mcp` Python package:
one tool to install, the same tool names. Auth comes from the resolved secret
and is never logged. `delete_agent` and `delete_webhook` are flagged
destructive; `generate_agent`, `text_to_speech` and `generate_dynamics`
**consume credits**, so check `get_credit_balance` first. `generate_agent`
refuses an empty request and is image-only — `video` is not a creation input,
and the API rejects any request carrying it with
[`400 VIDEO_INPUT_NOT_SUPPORTED`](/api/errors#agent-operations).

### Recipes

```sh
# Is this install ready to serve an avatar? (exit 0 = yes)
bithuman doctor --json | jq -e .ready >/dev/null

# Pick the top showcase avatar, fetch it, render a clip — all by exit code.
SLUG=$(bithuman list --json | jq -r '.models[0].slug')
MODEL=$(bithuman pull "$SLUG") || exit $?
bithuman render "$MODEL" -a in.wav -o out.mp4 --json | jq -r .output

# Confirm a credential without a browser.
bithuman whoami --json | jq -e .logged_in >/dev/null
```

## See also

- [CLI](/sdk/cli) — the two-command quickstart
- [Local mode](/sdk/cli/local-mode) — the on-device conversation brain
