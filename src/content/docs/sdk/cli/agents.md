---
title: "Driving the CLI from an AI agent"
description: "The stable, machine-facing contract for the bitHuman CLI: global --json with schema_version, sysexits exit codes, structured errors, and the built-in MCP server. Read once and drive every command without scraping help text."
section: sdk
group: "Command line"
order: 35
label: "For agents"
---


This file is the **stable, machine-facing contract** for the `bithuman`
command-line tool. If you are an autonomous agent (or a script) calling
`bithuman`, read this once and you can drive every command without scraping
human help text.

The fastest path: run **`bithuman __schema`** — it dumps the entire
command / flag / exit-code tree as one JSON object, generated from the binary
itself, so it never drifts from the installed version.

---

## The contract

1. **`--json` is global.** Pass `--json` to any command to get exactly **one
   JSON object on stdout** on success. It is the only thing on stdout — no
   logs, no progress, no decoration.

2. **Every `--json` success object carries `"schema_version"`** (currently
   `1`). Pin it; a breaking change to any command's shape bumps it.

3. **Failures are structured.** Under `--json`, a failure prints one object to
   **stderr** and nothing to stdout:

   ```json
   {"error":{"code":"SLUG_NOT_FOUND","message":"slug 'x' not found in manifest. Try `bithuman list`.","command":"pull"}}
   ```

   Without `--json`, the same failure prints `bithuman <command>: <message>`
   to stderr. Either way stdout stays empty on failure.

4. **stdout is data; stderr is chatter.** Even in human mode, commands that
   produce a result path (`pull`, `render`) print **only that path** on
   stdout, so `MODEL=$(bithuman pull modern-court-jester)` captures exactly the path.
   Progress, prompts, and nudges go to stderr.

5. **Exit codes are a stable sysexits subset** — branch on them instead of
   parsing text:

   | code | name        | meaning |
   |------|-------------|---------|
   | 0    | success     | |
   | 1    | GENERIC     | unclassified runtime error |
   | 2    | usage       | bad arguments (clap) |
   | 66   | NOINPUT     | input / file / slug / model not found |
   | 69   | UNAVAILABLE | network / engine / service unavailable |
   | 70   | SOFTWARE    | internal error |
   | 77   | NOPERM      | not signed in / out of credits / forbidden |

6. **Color is auto-off** for machines. ANSI is emitted only to an interactive
   TTY; `--json`, `--no-color`, `NO_COLOR`, `CI`, `TERM=dumb`, and any piped
   (non-TTY) stdout all silence it. You never need to strip escape codes.

7. **Auth without a browser:** export `BITHUMAN_API_SECRET=…` (per-device key
   from the dashboard), or pipe it in: `printf %s "$KEY" | bithuman login
   --with-token`. No interactive `bithuman login` needed in CI / headless /
   agent contexts. Verify with `bithuman whoami --json`.

8. **Env-driven flags:** `BITHUMAN_JSON=1`, `BITHUMAN_QUIET=1`, and
   `BITHUMAN_NO_COLOR=1` flip the matching global flag's default, so you can set
   the mode once instead of threading `--json` through every call (an explicit
   flag still wins).

---

## Command reference (JSON shapes)

All shapes below also include `"schema_version"`. Run `bithuman <cmd> --help`
for flags and copy-pasteable `EXAMPLES:`.

### `bithuman version --json`
```json
{"cli":"2.4.0","libessence":"2.3.6","abi":7}
```
`"wheel"` is added when installed via the pip shim.

### `bithuman whoami --json`  ·  `bithuman auth status --json`
```json
{"logged_in":true,"user":"you@example.com","alias":"cli@host-…","source":"env BITHUMAN_API_SECRET"}
```
Exit **0** when signed in, **1** when signed out (`"logged_in":false`).

### `bithuman account --json`  (alias: `credits`)
```json
{"email":"you@example.com","plan":"creator","plan_label":"Creator",
 "credit_balance":5986130,"account_status":"active","out_of_credits":false,
 "upgrade_url":"https://www.bithuman.ai/billing"}
```
Exit **77** (`NOT_AUTHENTICATED`) if no credential resolves.

### `bithuman list --json`  (aliases: `avatars`, `ls`, `browse`)
The showcase manifest passthrough — every avatar you can `pull`/`run`:
```json
{"version":2,"updated":"…","source":"…","models":[{"slug":"modern-court-jester","name":"…","description":"…"}]}
```
Get every downloadable slug: `bithuman list --json | jq -r '.models[].slug'`

### `bithuman pull <slug> --json`  (aliases: `download`, `get`)
```json
{"slug":"modern-court-jester","path":"/…/modern-court-jester.imx","cached":true,"sha256":"…"}
```
Human mode prints the bare `.imx` path on stdout. Exit **66**
(`SLUG_NOT_FOUND`) for an unknown slug; **69** on download failure; **70**
(`SHA256_MISMATCH`) on a corrupt download.

### `bithuman info <model.imx> --json`  (alias: `inspect`)
```json
{"path":"/…/modern-court-jester.imx","format_version":2,"size_bytes":98359972,"manifest":{…}}
```
Error codes: `FILE_NOT_FOUND`, `NOT_IMX`, `UNSUPPORTED_IMX_VERSION`,
`MISSING_MANIFEST` (all exit **66**); `INTERNAL` (**70**).

### `bithuman render <model.imx> -a in.wav -o out.mp4 --json`
```json
{"output":"out.mp4","bytes":1234567,"seconds":3.4,"width":1280,"height":720}
```
Human mode prints the bare MP4 path on stdout. Error codes:
`MODEL_NOT_FOUND` / `AUDIO_NOT_FOUND` (**66**), `NOT_AUTHENTICATED` /
out-of-credits (**77**), `INTERNAL` (**70**).
**Note:** the H.264 encoder is **Linux-only** in the published build; on
macOS `render` exits **70** with a workaround message.

### `bithuman doctor --json`
```json
{"ready":false,
 "versions":{"libessence":"2.3.6","abi":7,"cli":"2.4.0","wheel":null,"agent_python":null},
 "host":{"os":"macos","arch":"aarch64","ram_gb":24.0},
 "auth":{"signed_in":true,"email":"…","source":"…","plan":"creator","credit_balance":…,"out_of_credits":false},
 "brain":{"cloud":false,"local_installed":false,"local_flag":false,"selected":"none"},
 "runtime_assets":{"agent_worker":null,"audio_encoder":"/…/audio_encoder.onnx"}}
```
Exit **0** iff `"ready":true` (avatar auth + a brain + agent worker + audio
encoder all resolvable), else **1**. `bithuman doctor --json | jq .ready` is a
one-line readiness gate.

### `bithuman run <slug-or-path>`  (aliases: `chat`, `talk`)
Opens a browser to a live, talking avatar; a slug auto-downloads on first use.
Long-running (serves until Ctrl-C). Under `--json` it emits one
`session_started` event on stdout when live, so a script can capture the URL:
```json
{"event":"session_started","url":"http://127.0.0.1:8088/MODERN-COURT-JESTER","code":"MODERN-COURT-JESTER","host":"127.0.0.1","port":8088}
```
All logs (livekit NDJSON, progress) go to stderr; browser auto-open is
suppressed under `--json`. Failures emit the structured `{error:{…}}` too.

---

## Introspection & setup, for agents

```sh
bithuman __schema                 # full command/flag/exit-code tree as JSON
bithuman completion bash|zsh|fish|elvish|powershell   # shell completions
bithuman <cmd> --help             # per-command flags + EXAMPLES block
bithuman auth token               # print the resolved api-secret on stdout (exit 77 if none)
bithuman __man [DIR]              # roff man pages — stdout, or one per command into DIR
bithuman __agents                 # print this contract (AGENTS.md) to stdout, offline
```

`auth login` / `auth logout` / `auth status` are noun-verb aliases of the
top-level `login` / `logout` / `whoami`.

## MCP server (for MCP clients)

`bithuman mcp` runs the bitHuman Model Context Protocol server over stdio
(newline-delimited JSON-RPC 2.0). Register it in an MCP client (Claude Desktop,
Claude Code, Cursor, agent runtimes) as command `bithuman`, args `["mcp"]`:

```json
{ "mcpServers": { "bithuman": { "command": "bithuman", "args": ["mcp"] } } }
```

This is the built-in successor to the standalone `bithuman-mcp` Python package
— **one tool to install**, same cloud tools with identical names. Auth comes
from the resolved api-secret (env `BITHUMAN_API_SECRET` → keychain →
`~/.bithuman/config`); the secret is never logged or echoed.

**Cloud tools** (thin wrappers over `api.bithuman.ai`, one per documented
endpoint): `validate_api_secret`, `get_credit_balance`, `get_usage`,
`list_voices`, `text_to_speech`, `generate_agent`, `get_agent_status`,
`get_agent`, `update_agent_prompt`, `delete_agent`, `list_agents`,
`agent_speak`, `add_agent_context`, `get_dynamics`, `generate_dynamics`,
`create_embed_token`, `upload_file`, `create_webhook`, `list_webhooks`,
`delete_webhook`, `test_webhook`.

**Local tools** (re-exec the CLI, no network): `version`, `doctor`,
`inspect_model` (a local `.imx`), `list_showcase`.

`isError` keys off whether the call produced data; `doctor`'s `ready:false` is
a successful result. Errors are normalized to one shape for both local and
cloud tools — `{"error":{"code","message","http_status?","hint?"}}` — so an
agent has a single error-parsing path. Tool `annotations` carry `readOnlyHint`
/ `destructiveHint` / `idempotentHint`; `delete_agent` and `delete_webhook` are
flagged destructive so a runtime can require approval. `generate_agent`,
`text_to_speech`, and `generate_dynamics` **consume credits** — check
`get_credit_balance` first. `generate_agent` refuses an empty request (it needs
at least one of `prompt`/`image`/`audio`) so it can't silently spend. Agent
creation is **image-only** — `video` is not a creation input (the 10-second
identity video is generated internally); older CLI builds still list
`video` in the tool schema — never use it: as the image-only rollout
completes, the API rejects it with
[`400 VIDEO_INPUT_NOT_SUPPORTED`](/api/errors#agent-operations).

Discover the surface without speaking JSON-RPC: `bithuman mcp tools` (or
`bithuman mcp tools --json`), and the catalog is also under `mcp_tools` in
`bithuman __schema`.

## Recipes

```sh
# Is this install ready to serve an avatar? (exit 0 = yes)
bithuman doctor --json | jq -e .ready >/dev/null

# Pick the top showcase avatar, fetch it, render a clip — all by exit code.
SLUG=$(bithuman list --json | jq -r '.models[0].slug')
MODEL=$(bithuman pull "$SLUG") || exit $?      # bare path on stdout
bithuman render "$MODEL" -a in.wav -o out.mp4 --json | jq -r .output

# Confirm credentials without a browser.
export BITHUMAN_API_SECRET=sk-…
bithuman whoami --json | jq -e .logged_in >/dev/null
```
