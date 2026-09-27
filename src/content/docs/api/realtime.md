---
title: "Realtime API"
description: "Open an OpenAI-Realtime voice session through bitHuman's relay with your API secret; the conversation is billed to your bitHuman account."
section: api
group: "Build"
order: 16
type: endpoint
label: "Realtime"
---

## Overview

The Realtime API is a **relay**: your client opens one WebSocket to bitHuman with its bitHuman API
secret, and the relay pipes the [OpenAI Realtime protocol](https://platform.openai.com/docs/guides/realtime)
through unchanged. You need no OpenAI key, and the conversation is billed to your bitHuman account.
The Flutter plugin (from 2.6.20) and the CLI (from 2.8.1) connect this way.

## Connect

`wss://api.bithuman.ai/v1/realtime?model=gpt-realtime-mini`

Authenticate with the `api-secret: <your API secret>` header, or `Authorization: Bearer <your API secret>`.

```python
import asyncio, json, os, websockets

async def main():
    async with websockets.connect(
        "wss://api.bithuman.ai/v1/realtime?model=gpt-realtime-mini",
        additional_headers={"api-secret": os.environ["BITHUMAN_API_SECRET"]},
    ) as ws:
        print(json.loads(await ws.recv())["type"])   # session.created
        await ws.send(json.dumps({"type": "session.update", "session": {
            "type": "realtime", "instructions": "Answer in one sentence.",
            "output_modalities": ["audio"]}}))
        print(json.loads(await ws.recv())["type"])   # session.updated

asyncio.run(main())
```

After the handshake, every event is the OpenAI Realtime event, both ways. The model is fixed when you
connect: a `session.update` may repeat the same `model`, and naming a different one is refused with an
`error` event (`MODEL_LOCKED`).

## Refusals

At the handshake (HTTP, the WebSocket does not open):

| Status | Code | Meaning |
|---|---|---|
| `401` | `UNAUTHORIZED` | missing or rejected API secret |
| `402` | `INSUFFICIENT_BALANCE` | the account has no credits |
| `403` | `PLAN_REQUIRED` | the plan does not include this model or realtime sessions |
| `400` | | a malformed request |
| `503` | | temporarily unavailable; retry after `Retry-After` seconds |

During a session, the relay sends an `error` event and then closes the socket: close code `1008` with
`INSUFFICIENT_BALANCE`, `SESSION_DURATION_LIMIT` (3,600 seconds) or `FORBIDDEN`, or `1011` with
`UPSTREAM_ERROR`. Only `503` and `1011` are worth retrying.

## Billing

10 credits per minute of active session time, billed by the relay; an avatar in the same
conversation is included. Your client sends no usage report of its own.

## The ephemeral-token mint is retired

`POST /v1/realtime/ephemeral-token` (an OpenAI `ek_…` client secret) is retired and answers `410`.
Connect through the relay instead.
