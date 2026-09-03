---
title: "MCP server"
description: "Drive bitHuman from any AI agent. The bitHuman MCP server is built into the CLI (`bithuman mcp`) and exposes the platform as Model Context Protocol tools for Claude Desktop, Claude Code, Cursor, and other MCP clients."
section: guides
group: "Integrate"
order: 20
---

The **bitHuman MCP server** lets any [Model Context Protocol](https://modelcontextprotocol.io)
client — Claude Desktop, Claude Code, Cursor, and others — call bitHuman
directly as tools. Ask your agent to "make an avatar that explains our pricing
and have it speak this script," and it can generate the agent, synthesize the
speech, and mint an embed token without you writing any glue code.

It's **built into the [bitHuman CLI](https://github.com/bithuman-product/homebrew-bithuman)** —
just run `bithuman mcp`. The cloud tools are a thin wrapper over the
[REST API](/api/overview) — each tool maps to one documented endpoint — plus a
few local tools that inspect your install and model files. Not every endpoint
has a tool yet: [talking video](/api/video) (`POST /v1/video/generate`),
[model add](/api/agents#add-a-model-to-an-existing-agent)
(`POST /v1/agent/{code}/models`), and the [knowledge API](/api/knowledge)
(`/v1/knowledge`) are HTTP-only for now.

> **Note — two servers, same cloud tools.** The CLI's built-in `bithuman mcp`
> is the recommended server: it adds the local tools and (as of CLI **2.4.1**)
> carries the hardened `generate_agent` schema. The standalone
> [`bithuman-mcp` PyPI package](https://pypi.org/project/bithuman-mcp/)
> (`pip install bithuman-mcp`, currently **0.3.5**, Python 3.10–3.14) remains
> available for pip-only environments — same cloud tool names, no local tools.
> Since 0.3.4 it also accepts `model` / `version` on `generate_agent`, so
> `essence-2` is reachable from either server.

## Tools

**Cloud tools** — wrap the [REST API](/api/overview) (and platform status):

| Tool | Endpoint | What it does |
|------|----------|--------------|
| `get_platform_status` | `status.bithuman.ai` | Live operational status of the platform + each public API. |
| `validate_api_secret` | `POST /v1/validate` | Check the API secret (free). |
| `get_credit_balance` | `GET /v2/credit-summaries` | Credits, plan, minutes estimate. |
| `get_usage` | `GET /v1/usage` | Usage/metering history (paginated). |
| `list_voices` | `GET /v1/voices` | Built-in + custom TTS voices. |
| `text_to_speech` | `POST /v1/tts` | Synthesize speech → a WAV file. |
| `generate_agent` | `POST /v1/agent/generate` | Create an avatar agent. Takes `prompt` / `image` / `audio` plus **`model` and `version`** — `model: "essence", version: "v2"` (or `model: "essence-2"`) creates an [Essence 2](/concepts/essence-2) agent; omitted, the platform default (`expression-1`, 250 credits) applies, never a silent upgrade. Needs CLI **2.4.1+** (or `bithuman-mcp` **0.3.4+**) — earlier servers had no `model` parameter and every creation fell to the default model. |
| `get_agent_status` | `GET /v1/agent/status/{id}` | Poll generation progress. |
| `get_agent` | `GET /v1/agent/{code}` | Fetch agent details. |
| `list_agents` | `GET /v1/agents` | List your agents (paginated). |
| `update_agent_prompt` | `POST /v1/agent/{code}` | Change an agent's prompt. |
| `delete_agent` | `DELETE /v1/agent/{code}` | Delete an agent you own. |
| `agent_speak` | `POST /v1/agent/{code}/speak` | Make a live agent speak. |
| `add_agent_context` | `POST /v1/agent/{code}/add-context` | Inject silent knowledge. |
| `get_dynamics` | `GET /v1/dynamics/{id}` | List gesture animations. |
| `generate_dynamics` | `POST /v1/dynamics/generate` | Generate gestures. |
| `create_embed_token` | `POST /v1/embed-tokens/request` | Mint a website embed JWT. |
| `upload_file` | `POST /v1/files/upload` | Upload an asset → CDN URL. |
| `create_webhook` · `list_webhooks` · `delete_webhook` · `test_webhook` | `…/v1/webhooks` | Manage signed event webhooks. |

**Local tools** — no network; inspect your install and local files:

| Tool | What it does |
|------|--------------|
| `version` | CLI + libessence engine version and ABI. |
| `doctor` | Install health; `ready` is true iff this machine can serve an avatar. |
| `inspect_model` | Inspect a local `.imx` model file's metadata. |
| `list_showcase` | List downloadable showcase avatars. |

## Setup

Install the bitHuman CLI:

```bash
brew install bithuman-product/bithuman/bithuman-cli                  # macOS (Apple Silicon)
curl -fsSL https://raw.githubusercontent.com/bithuman-product/homebrew-bithuman/main/install.sh | sh   # macOS (Apple Silicon) + Linux
pip install bithuman-cli                                             # macOS arm64 (pip)
```

> **Version check for `model` / `version` support:** `bithuman --version` must
> report CLI **2.4.1 or newer**. The current Homebrew/installer release is
> **2.5.1** (macOS arm64 and Linux x86_64), so a fresh install is already there
> — but an install still on
> **2.4.0** has no `model` parameter on `generate_agent`, and every creation
> uses the platform default model. Until your install reports 2.4.1+, upgrade
> (`brew upgrade bithuman-cli`) or use the pip server for Essence 2 creations:
> `pip install bithuman-mcp` (0.3.5) and register command `bithuman-mcp`
> instead of `bithuman mcp`.

Authenticate once with `bithuman login` (or export `BITHUMAN_API_SECRET` from the
[Developer Dashboard](https://www.bithuman.ai/developer/api-keys)). The server resolves
your credential automatically — env → OS keychain → `~/.bithuman/config` — so you
usually don't pass it per-client. Then register `bithuman mcp`:

### Claude Code

```bash
claude mcp add bithuman -- bithuman mcp
```

If you haven't run `bithuman login`, pass the secret inline:
`claude mcp add bithuman -e BITHUMAN_API_SECRET=sk_your_secret -- bithuman mcp`.

### Claude Desktop / generic JSON config

```json
{
  "mcpServers": {
    "bithuman": {
      "command": "bithuman",
      "args": ["mcp"]
    }
  }
}
```

### Cursor

In **Settings → MCP → Add new MCP server**, or in `~/.cursor/mcp.json`:

```json
{
  "mcpServers": {
    "bithuman": {
      "command": "bithuman",
      "args": ["mcp"]
    }
  }
}
```

If you haven't signed in with `bithuman login`, add an
`"env": { "BITHUMAN_API_SECRET": "sk_your_secret" }` block to the config.

## Verify the connection

After adding the server, your client should list a **bithuman** tool group. The
quickest confirmation is to ask the agent:

> Use the bithuman tools to validate my API secret.

It calls `validate_api_secret` and should reply with `{"valid": true}`. If you
get `valid: false`, re-check your credential (`bithuman whoami`); if no bithuman
tools appear at all, confirm `bithuman` is on your PATH and restart the client.

## Using it

You drive everything in natural language — the agent picks the right tools and
chains them. A few worked examples:

**Stand up a talking avatar and embed it**

> Generate an avatar of a friendly fitness coach, wait until it's ready, then
> give me an embed token for it.

The agent calls `generate_agent`, polls `get_agent_status` until `ready` (a
few minutes for first-generation models; roughly 45 minutes to 1.5 hours for the
second generation), then `create_embed_token` and hands you the JWT for the
[embed widget](/guides/deploy-embed).

**Create a photoreal Essence 2 agent** (CLI 2.4.1+ / `bithuman-mcp` 0.3.4+)

> Create an essence-2 avatar from this photo: https://…/portrait.jpg — a
> helpful retail assistant. Tell me the agent id and poll until it's ready.

The agent calls `generate_agent` with `model: "essence-2"` (equivalently
`model: "essence", version: "v2"`) — 500 credits, and the input must be a
photorealistic human subject (else the API rejects it 422 **before billing**,
see [the subject gate](/api/agents#the-essence-2-subject-gate-422)) — then
polls `get_agent_status`. Expect the `lip_sync` step to run ~25–40 minutes
while the identity trains. Creation is **image-only**: never pass `video`. The
`bithuman-mcp` 0.3.4 schema still listed a legacy `video` field — the API
rejects it with `400 VIDEO_INPUT_NOT_SUPPORTED` — and `bithuman-mcp` 0.3.5 and
the CLI 2.4.1+ server have both dropped it.

**Turn a script into speech**

> List the female voices, then read this with F1: "Welcome to the demo."

→ `list_voices`, then `text_to_speech` (saved as a WAV you can play).

**Audit the account**

> How many agents do I have, what's my credit balance, and what did I spend in
> the last week?

→ `list_agents` (paginated), `get_credit_balance`, and `get_usage` with a
`start` date.

**Get notified instead of polling**

> Register a webhook at `https://example.com/hooks/bithuman` for agent.ready and
> send it a test event.

→ `create_webhook` (returns the one-time signing secret), then `test_webhook`.
See [Webhooks](/api/webhooks) for verifying the `X-BitHuman-Signature` header.

## Configuration

| Env var | Default | Purpose |
|---------|---------|---------|
| `BITHUMAN_API_SECRET` | _(auto-resolved)_ | Your API secret. Resolved from env → OS keychain → `~/.bithuman/config` (set by `bithuman login`). Never logged. |
| `BITHUMAN_API_BASE` | `https://api.bithuman.ai` | API origin. |

The built-in server speaks the standard MCP **stdio** transport, so there's
nothing else to configure.

## Notes

- **Async work.** `generate_agent` and `generate_dynamics` return immediately
  with `processing`. Have the agent poll `get_agent_status` / `get_dynamics`
  until `ready` (a few minutes for first-generation models; roughly 45 minutes
  to 1.5 hours for the [second generation](/concepts/models-v2), which trains a
  real per-identity model).
- **Credits.** `generate_agent` (250 credits for the default first-generation
  model; 500 for `essence-2`, 2000 for `expression-2` — see
  [Pricing](/guides/pricing)) and `text_to_speech`
  consume credits — check `get_credit_balance` first if cost matters.
- **Errors** come back as a structured object with the HTTP status and a link to
  the [error catalog](/api/errors); the agent can read and act on them.
