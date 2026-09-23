---
title: "For AI agents"
description: "Machine-readable entry points to the bitHuman docs: llms.txt, markdown for every page, OpenAPI, versions, performance and the MCP server."
section: resources
group: "Resources"
order: 5
type: reference
label: "For AI agents"
---

Everything on this site is available in a form an agent can read without parsing HTML.

## Files

| File | What it holds |
|---|---|
| [/llms.txt](/llms.txt) | A short index: key facts, one command per platform, performance, and links |
| [/llms-full.txt](/llms-full.txt) | Getting started, the API, every platform page and the guides in one file |
| `<any page>.md` | Every page as markdown, for example [/sdk/python.md](/sdk/python.md). Each HTML page links its twin with `rel="alternate"` |
| [/api/openapi.yaml](/api/openapi.yaml) | The REST API as OpenAPI 3 |
| [/versions.json](/versions.json) | The current version and install line of every artifact |
| [/platforms.json](/platforms.json) | Every way to run bitHuman, with its first command and docs |
| [/performance.json](/performance.json) | Frame rates and memory for every platform, with release and date |
| [Showcase](https://api.bithuman.ai/v1/models/showcase) | Sample avatars anyone can use: slug, agent code, model |

## MCP server

The CLI includes an MCP server, so Claude, Cursor and other MCP clients can drive bitHuman as tools:

```bash
claude mcp add bithuman -- bithuman mcp
```

Setup for other clients is on [MCP server](/sdk/mcp).

## Rules for agents

1. Read the API secret from the environment (`BITHUMAN_API_SECRET`); never write it into code or a command line.
2. Send `model` on every agent you create (`"essence-2"` or `"expression-2"`).
3. Take versions from [/versions.json](/versions.json), not from memory or an older sample.
