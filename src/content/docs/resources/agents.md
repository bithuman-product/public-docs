---
title: "For AI agents"
description: "Everything an AI agent needs to read these docs and build with bitHuman: llms.txt, markdown for every page, the docs MCP server, an installable skill, OpenAPI and the data files."
section: overview
group: "Resources"
order: 40
type: reference
llms: linked
searchTitle: "For AI agents: llms.txt, docs MCP server and agent skill"
next: ["/build/mcp", "/start", "/api/reference"]
---

Everything on this site is available in a form an agent can read without parsing HTML.

## Markdown for every page

- Add `.md` to any page's URL: [/platforms/python.md](/platforms/python.md). Each HTML page links its twin with `rel="alternate"`.
- Or ask for markdown: a request with `Accept: text/markdown` gets the same text at the page's own URL.

```bash
curl -H "Accept: text/markdown" https://docs.bithuman.ai/platforms/python
```

## Files

| File | What it holds |
|---|---|
| [/llms.txt](/llms.txt) | The index: rules for agents, where each model runs, key facts, one command per platform, speed, and links |
| [/llms-full.txt](/llms-full.txt) | Getting started, the Python, CLI, Windows, LiveKit and REST platform pages, and the REST API in one file |
| [/llms/start.txt](/llms/start.txt), [/llms/platforms.txt](/llms/platforms.txt), [/llms/apps.txt](/llms/apps.txt) (iOS & iPadOS, macOS, Android, Flutter, Web), [/llms/deploy.txt](/llms/deploy.txt), [/llms/models.txt](/llms/models.txt), [/llms/build.txt](/llms/build.txt), [/llms/api.txt](/llms/api.txt) | The same text one section at a time |
| [/api/openapi.yaml](/api/openapi.yaml) | The REST API as OpenAPI 3 |
| [/versions.json](/versions.json) | The current version and install line of every artifact |
| [/platforms.json](/platforms.json) | Every way to run bitHuman, with its first command and docs |
| [/performance.json](/performance.json) | The speed of every published configuration (× real time), with hardware, release and date |
| [/changelog.xml](/changelog.xml) | Every release as an RSS feed, tagged by platform |
| [Showcase](https://api.bithuman.ai/v1/models/showcase) | Sample avatars anyone can use: slug, agent code, model |

## Docs MCP

The docs are also an MCP server with two read-only tools: `search` finds pages, and `fetch` returns one as markdown. It needs no account and no key.

| Client | Add it |
|---|---|
| Claude Code | `claude mcp add --transport http bithuman-docs https://docs.bithuman.ai/docs-mcp` |
| Cursor, VS Code and other clients | a remote (Streamable HTTP) server at `https://docs.bithuman.ai/docs-mcp` |

```json
{ "mcpServers": { "bithuman-docs": { "url": "https://docs.bithuman.ai/docs-mcp" } } }
```

To drive bitHuman itself (create agents, render videos) from an MCP client, use the CLI's own server instead: [MCP server](/build/mcp).

## Agent skill

[`bithuman-integrate`](/skills/bithuman-integrate/SKILL.md) is a skill an agent loads before it adds an avatar to a project: it picks the path, installs, wires 16 kHz speech to frames and handles the API secret. Save it as `.claude/skills/bithuman-integrate/SKILL.md` in a project, or `~/.claude/skills/bithuman-integrate/SKILL.md` for every project:

```bash
mkdir -p .claude/skills/bithuman-integrate
curl -fsSL https://docs.bithuman.ai/skills/bithuman-integrate/SKILL.md -o .claude/skills/bithuman-integrate/SKILL.md
```

## Rules for agents

1. Send `model` (`"essence-2"` or `"expression-2"`) on every agent you create, and poll until `status` is `ready` or `failed`.
2. API and SDK use requires the Creator plan or higher.
3. Read the API secret from the environment (`BITHUMAN_API_SECRET`); never write it into code or a command line. In a LiveKit worker, name it `BITHUMAN_MASTER_SECRET` and pass a minted token.
4. Say where things happen: the avatar renders (device, browser, server, cloud); the conversation runs (your stack, the CLI's local conversation brain, or bitHuman's servers).
5. Take versions from [/versions.json](/versions.json), speed from [/performance.json](/performance.json) and prices from `GET https://api.bithuman.ai/v1/pricing` (send the `api-secret` header; without it the call returns `401`), not from memory or an older sample.

## Next

- [MCP server (the CLI)](/build/mcp) · [Quickstart](/start) · [API reference](/api/reference)
