---
title: "API overview"
description: "REST API for avatars, voice, live sessions and embedding, from any language."
section: api
group: "Basics"
order: 0
type: hub
llms: api
moved:
  authentication: /api/authentication
  next-steps: /platforms/rest
---

## What the API does

Plain HTTPS and JSON from any language, for backends and scripts where a native SDK does not fit. Every request carries your API secret in the `api-secret` header ([Authentication](/api/authentication)).

## Base URL

Every path on these pages is relative to `https://api.bithuman.ai`. First call: [REST API](/platforms/rest#run-your-first-avatar). Every endpoint: [API reference](/api/reference).

## What you can build

```cards
Agents | /api/agents | Generate avatars, make them speak and ground them in your documents.
Media | /api/video | Talking videos from your audio, gestures and files.
Embed and realtime | /api/embedding | An agent in any web page, or a Realtime voice session.
Account | /api/billing | Credits, API secrets, organizations and your own provider keys.
```

## How agents are identified

An agent is named by its code (`A80HVD8577`). Request bodies call it `agent_id` (creation, embed tokens, gestures) or `agent_code` (video, runtime tokens), never both.

## Status and versioning

Endpoints change additively. `/v1` and `/v2` are part of each path, not a version switch. Live status: [status.bithuman.ai](https://status.bithuman.ai).
