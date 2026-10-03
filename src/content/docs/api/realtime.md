---
title: "Realtime relay"
description: "Open a metered OpenAI-Realtime voice session through bitHuman, over WebSocket or WebRTC."
section: api
group: "Basics"
order: 50
type: endpoint
llms: api
next: ["/api/authentication", "/pricing", "/api/errors"]
moved:
  retired-the-client-secret-mint: /resources/renamed#older-names
---

## Overview

A voice conversation (speech in, speech out) with no OpenAI key of your own: the relay opens an
OpenAI-Realtime voice session **through bitHuman** and bills it in bitHuman credits as the chat
line, 10 credits a minute, all-inclusive ([Limits & billing](#limits--billing)). Your API secret
never leaves your server or app. Pair it with an on-device avatar to give the voice a face, as
the Flutter plugin and the CLI do. There are two ways in:

- **WebSocket relay:** `wss://api.bithuman.ai/v1/realtime`, the OpenAI Realtime WebSocket
  protocol, unchanged.
- **WebRTC:** `POST /v1/realtime/connect` with your SDP offer; bitHuman places the call and
  returns the SDP answer.

Authenticate with the `api-secret` header (or `Authorization: Bearer <api-secret>`).

## WebSocket relay

`wss://api.bithuman.ai/v1/realtime?model=gpt-realtime-mini`

Speak the [OpenAI Realtime events](https://platform.openai.com/docs/api-reference/realtime)
exactly as you would to OpenAI: `session.update`, `input_audio_buffer.append`,
`response.create`, and so on. The model is fixed when you connect: a `session.update` that
repeats it is accepted, and one that changes it is answered with an `error` event whose
code is `MODEL_LOCKED`.

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

The Flutter plugin (2.6.20+) and the CLI (2.8.1+) connect this way for you.

## WebRTC

`POST /v1/realtime/connect?model=gpt-realtime-mini`, with the SDP offer as the request body
(`Content-Type: application/sdp`). A `201` carries the SDP answer; set it as the remote
description on your peer connection. The `X-Bithuman-Call` response header names the call.

**End the call when you are done.** Billing stops the moment you hang up:

```bash
curl -X POST https://api.bithuman.ai/v1/realtime/connect \
  -H "api-secret: $BITHUMAN_API_SECRET" -H "content-type: application/json" \
  -d '{"action": "hangup", "call": "<X-Bithuman-Call>"}'
```

```js
// browser: start the call from your server (it holds the api-secret), then on close:
pc.close();
await fetch("/your-server/hangup", { method: "POST", body: JSON.stringify({ call }) });
// your server: POST https://api.bithuman.ai/v1/realtime/connect
//   {"action": "hangup", "call": call}  with the same api-secret that started it
```

If a client only closes its peer connection without hanging up, the call ends when the
connection times out, usually 8–10 seconds later, and those seconds are billed.

## Limits & billing

- **Billing:** the chat line, **10 credits per minute, all-inclusive**, for every active
  second of the session (talking or idle). A self-hosted avatar rendering the same session
  is included: it is not billed on top.
- **Balance:** a session needs a positive balance to start (`402 INSUFFICIENT_BALANCE`) and
  is closed when the balance runs out.
- **Models:** a standard API secret uses `gpt-realtime-mini`; `gpt-realtime` needs an
  entitlement on your account (`403 PLAN_REQUIRED` otherwise; contact sales).
- **Length:** one session lasts at most one hour.
- **How a session ends on an error:** an `error` event with `type: bithuman_relay` names the
  code, then the socket closes with code 1008: `INSUFFICIENT_BALANCE` (the credits ran out),
  `FORBIDDEN` (bitHuman stopped the session) or `SESSION_DURATION_LIMIT` (the hour is up). Build a
  new session; a retry of the same one does not help. The Flutter plugin reports these codes on
  `errorStream` ([Flutter errors](/platforms/flutter/errors#voice-session)).
- **`PAYWALL`:** bitHuman Live's refusal (HTTP 402) when an account has no minutes left: its
  plan's credits, its free trial and its top-ups are spent. An API secret that runs out gets
  `INSUFFICIENT_BALANCE` instead ([Errors](/api/errors#plan-and-credit-refusals)).
- Other errors: `401` missing or invalid key · `503` the relay is at capacity (retry after the
  `Retry-After` seconds).
