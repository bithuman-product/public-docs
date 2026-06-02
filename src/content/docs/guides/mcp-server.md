---
title: "MCP server"
description: "Drive bitHuman from any AI agent. The bitHuman MCP server exposes the REST API as Model Context Protocol tools for Claude Desktop, Claude Code, Cursor, and other MCP clients."
section: guides
group: "AI agents"
order: 30
---

The **bitHuman MCP server** lets any [Model Context Protocol](https://modelcontextprotocol.io)
client — Claude Desktop, Claude Code, Cursor, and others — call bitHuman
directly as tools. Ask your agent to "make an avatar that explains our pricing
and have it speak this script," and it can generate the agent, synthesize the
speech, and mint an embed token without you writing any glue code.

It's a thin wrapper over the [REST API](/api/overview): every tool maps to one
documented endpoint, so anything you can do over HTTP, an agent can do through
the server. Source lives in the public SDK repo under
[`mcp/`](https://github.com/bithuman-product/bithuman-sdk-public/tree/main/mcp).

## Tools

| Tool | Endpoint | What it does |
|------|----------|--------------|
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

## Setup

You need an API secret from the [Developer Dashboard](https://www.bithuman.ai/#developer).
The server is published on PyPI as [`bithuman-mcp`](https://pypi.org/project/bithuman-mcp/)
and runs over stdio (the default MCP transport), so any client launches it the
same way — the recommended launcher is [`uvx`](https://docs.astral.sh/uv/).

### Claude Code

```bash
claude mcp add bithuman \
  -e BITHUMAN_API_SECRET=sk_your_secret \
  -- uvx bithuman-mcp
```

### Claude Desktop / generic JSON config

```json
{
  "mcpServers": {
    "bithuman": {
      "command": "uvx",
      "args": ["bithuman-mcp"],
      "env": { "BITHUMAN_API_SECRET": "sk_your_secret" }
    }
  }
}
```

Or install it directly with `pip install bithuman-mcp` and run the
`bithuman-mcp` command.

## Configuration

| Env var | Default | Purpose |
|---------|---------|---------|
| `BITHUMAN_API_SECRET` | _(required)_ | Your API secret. Never logged. |
| `BITHUMAN_API_BASE` | `https://api.bithuman.ai` | API origin. |
| `BITHUMAN_MCP_TRANSPORT` | `stdio` | `stdio` or `streamable-http`. |
| `BITHUMAN_MCP_TIMEOUT` | `120` | Per-request timeout (seconds). |

## Notes

- **Async work.** `generate_agent` and `generate_dynamics` return immediately
  with `processing`. Have the agent poll `get_agent_status` / `get_dynamics`
  until `ready` (generation takes 2–5 minutes).
- **Credits.** `generate_agent` (~250 credits) and `text_to_speech` consume
  credits — check `get_credit_balance` first if cost matters.
- **Errors** come back as a structured object with the HTTP status and a link to
  the [error catalog](/api/errors); the agent can read and act on them.
