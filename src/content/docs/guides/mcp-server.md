---
title: "MCP server"
description: "Let Claude, Cursor and other MCP clients drive bitHuman as tools: create agents, speak, embed, render. The server is built into the CLI (bithuman mcp)."
section: sdk
group: "Integrations"
order: 70
type: platform
slug: sdk/mcp
label: "MCP server"
---

`bithuman mcp` is a [Model Context Protocol](https://modelcontextprotocol.io) server built into the [CLI](/sdk/cli). An MCP client such as Claude Code, Claude Desktop or Cursor can then call bitHuman as tools: "make an avatar that explains our pricing, then give me an embed token" becomes a chain of tool calls.

| Detail | Expression 2 | Essence 2 |
|---|---|---|
| **Create agents** | `generate_agent` with `model: "expression-2"` | `generate_agent` with `model: "essence-2"` |
| **Render locally** | `render` tool | `render` tool |

## Before you start

- The [CLI](/sdk/cli#install) on macOS (Apple silicon) or Linux. On Windows or in a hosted agent, call the [REST API](/api) directly.
- An MCP client.

## Install

The server is the CLI; there is nothing else to install.

```bash
curl -fsSL https://install.bithuman.ai | sh
bithuman mcp tools      # prints the tool list and exits
```

## Authenticate

Run `bithuman login` once, or set `BITHUMAN_API_SECRET` in the client's configuration. The server reads the same credential as the CLI and never logs it.

## First frame

Register the server with your client.

Claude Code:

```bash
claude mcp add bithuman -- bithuman mcp
```

Claude Desktop, Cursor (`~/.cursor/mcp.json`) and other clients:

```json
{"mcpServers": {"bithuman": {"command": "bithuman", "args": ["mcp"]}}}
```

If you have not run `bithuman login`, add `"env": {"BITHUMAN_API_SECRET": "<your API secret>"}` to that entry.

Then ask: *"Use the bithuman tools to validate my API secret."* The client calls `validate_api_secret` and reports `{"valid": true}`.

## Integrate into your app

Ask in plain language; the client chooses and chains the tools.

| Ask | Tools it calls |
|---|---|
| "Create an Expression 2 avatar from this image, wait until it is ready, and give me an embed token." | `generate_agent`, `get_agent_status`, `create_embed_token` |
| "List the female voices and read this with F1." | `list_voices`, `text_to_speech` |
| "What is my credit balance, and what did I spend this week?" | `get_credit_balance`, `get_usage` |
| "Register a webhook at https://example.com/hooks and send it a test event." | `create_webhook`, `test_webhook` |
| "Download wise-pup and render this WAV to an MP4." | `pull`, `render` |

### Tools

| Tool | What it does |
|---|---|
| `version`, `doctor` | CLI version and install health (local) |
| `inspect_model`, `list_showcase`, `pull`, `render` | Inspect, list, download and render avatars on this machine (local) |
| `validate_api_secret` | Check the API secret (free) |
| `get_platform_status` | Service status from status.bithuman.ai |
| `get_credit_balance`, `get_usage` | Balance, plan and usage history |
| `list_voices`, `text_to_speech` | Voices, and speech saved as a WAV (spends credits) |
| `generate_agent`, `get_agent_status` | Create an agent from an image (spends credits; always pass `model`), then poll until `ready` or `failed` |
| `get_agent`, `list_agents`, `update_agent_prompt`, `delete_agent` | Manage your agents |
| `agent_speak`, `add_agent_context` | Make a live agent speak, or give it background knowledge |
| `get_dynamics`, `generate_dynamics` | List or create gestures (spends credits) |
| `create_embed_token` | A one-hour token to embed an agent on a website |
| `upload_file` | Upload an asset and get a URL |
| `create_webhook`, `list_webhooks`, `delete_webhook`, `test_webhook` | Webhooks |

Talking video, adding a model to an agent and knowledge bases have no tool; use the [REST API](/api).

## Platform notes

- Agent creation is asynchronous: a second-generation agent takes about 2–2.5 hours. Prices are on [pricing](/guides/pricing).
- `BITHUMAN_API_BASE` changes the API origin (default `https://api.bithuman.ai`).
- Errors come back as structured objects with the HTTP status and a link to [Errors](/api/errors).

## Troubleshooting

| Symptom | Cause | Fix |
|---|---|---|
| No bithuman tools in the client | `bithuman` is not on the client's `PATH` | use the full path to the binary in the config, then restart the client |
| `validate_api_secret` returns `valid: false` | no or wrong credential | `bithuman login`, or set `BITHUMAN_API_SECRET` in the config |
| A created agent uses a first-generation model | `model` was not passed | ask for `essence-2` or `expression-2` explicitly |
| `422` when creating an Essence 2 agent | the image is not a photoreal person | use a photo, or choose Expression 2 |

## Reference

- [CLI reference](/sdk/cli/reference#mcp-server)
- [REST API](/api) and the [OpenAPI spec](/api/openapi.yaml)
- [For AI agents](/resources/agents)
