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
[REST API](/api/overview) (every tool maps to one documented endpoint, so
anything you can do over HTTP an agent can do here), plus a few local tools that
inspect your install and model files.

:::note
The standalone `bithuman-mcp` PyPI package is **deprecated** — its tools are now
built into the CLI. Install the CLI once (below) and you get the same tools,
identical names, plus local ones — with no separate Python dependency.
:::

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
| `generate_agent` | `POST /v1/agent/generate` | Create an avatar agent. |
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
brew install bithuman                                                # macOS (Apple Silicon)
curl -fsSL https://raw.githubusercontent.com/bithuman-product/homebrew-bithuman/main/install.sh | sh   # macOS (Apple Silicon) + Linux
pip install bithuman-cli                                             # macOS arm64 (pip)
```

Authenticate once with `bithuman login` (or export `BITHUMAN_API_SECRET` from the
[Developer Dashboard](https://www.bithuman.ai/#developer)). The server resolves
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

The agent calls `generate_agent`, polls `get_agent_status` until `ready` (2–5
min), then `create_embed_token` and hands you the JWT for the
[embed widget](/guides/deploy-embed).

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
  until `ready` (generation takes 2–5 minutes).
- **Credits.** `generate_agent` (250 credits for the default v1 model; 500 for
  the [second-generation models](/concepts/models-v2)) and `text_to_speech`
  consume credits — check `get_credit_balance` first if cost matters.
- **Errors** come back as a structured object with the HTTP status and a link to
  the [error catalog](/api/errors); the agent can read and act on them.
