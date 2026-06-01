---
title: "API Platform"
description: "REST API for generating avatars, synthesizing voice, driving live sessions, and embedding agents — from any language."
section: api
group: "Get started"
order: 0
label: "Overview"
---

## What the API does

The bitHuman API lets you create, manage, and drive avatar agents from any
programming language. Reach for it when you don't need a native SDK — backends,
CI scripts, or platforms where Python, Swift, or Kotlin aren't a fit.

Everything is plain HTTPS + JSON. One header authenticates every request.

## Base URL

```text
https://api.bithuman.ai
```

All endpoints are relative to this URL and require an `api-secret` header.
[Get a free API secret →](https://www.bithuman.ai/#developer)

## Authentication

Pass your API secret in the `api-secret` header on every request:

```http
api-secret: YOUR_API_SECRET
```

Treat the secret like a password — never commit it to source control and never
embed it in client apps. For browser-side embeds, mint a short-lived token with
the [embed token flow](/api/embedding) instead. See
[Authentication](/api/authentication) for the full model.

## What you can build

- **Generate avatars** — turn a prompt, portrait, and voice sample into a new
  agent. See [Agents](/api/agents).
- **Synthesize voice** — text-to-speech in 31 languages with 10 built-in
  voices, plus an OpenAI-compatible drop-in. See [Text to Speech](/api/text-to-speech).
- **Drive live sessions** — make a hosted agent speak or inject silent
  knowledge into an active room. See [Agents](/api/agents).
- **Add gestures** — generate and toggle conversational animations. See
  [Dynamics](/api/dynamics).
- **Embed in any page** — mint a token and drop an iframe. See
  [Embedding](/api/embedding).
- **Track credits** — read balance and per-mode minute estimates. See
  [Billing](/api/billing).

## How agents are identified

Every endpoint identifies an agent by its **agent code** — a short string like
`A91XMB7113`. You receive one when you [generate an agent](/api/agents), or find
it in your [Library](https://www.bithuman.ai/#library) (click an agent to reveal
the code).

> **Note** Different endpoint paths use slightly different parameter names for
> the same value: `{code}`, `{agent_code}`, or `{agent_id}`. They all expect the
> same string — the agent code shown in your Library.

## Next steps

- [Quickstart](/api/quickstart) — your first call in two minutes.
- [API reference](/api/reference) — the interactive Scalar reference for every
  endpoint, with a live request console.
- [Authentication](/api/authentication) — keys, runtime tokens, and rotation.
- [Errors](/api/errors) and [Rate limits](/api/rate-limits) — the operational
  contract.

## Status and versioning

`v1` endpoints are generally available. Breaking changes ship under new path
prefixes (`/v2/...`); new endpoints land additively without forcing migrations.
Live API status is at [status.bithuman.ai](https://status.bithuman.ai).
