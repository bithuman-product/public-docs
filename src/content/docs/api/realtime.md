---
title: "Realtime API"
description: "Open a metered OpenAI-Realtime voice session through bitHuman: a WebSocket relay or a server-brokered WebRTC call."
section: api
group: "Build"
order: 16
type: endpoint
label: "Realtime"
---

## Overview

The Realtime API opens an OpenAI-Realtime voice session **through bitHuman**. Your API secret
never leaves your server or app, no OpenAI key is involved, and the session is billed on your
bitHuman balance as the chat line (see [Limits & billing](#limits--billing)). There are two
ways in:

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

```bash
wscat -c "wss://api.bithuman.ai/v1/realtime?model=gpt-realtime-mini" \
  -H "api-secret: $BITHUMAN_API_SECRET"
```

## WebRTC

`POST /v1/realtime/connect?model=gpt-realtime-mini`, with the SDP offer as the request body
(`Content-Type: application/sdp`). A `201` carries the SDP answer; set it as the remote
description on your peer connection.

## Limits & billing

- **Billing:** the chat line, **10 credits per minute, all-inclusive**, for every active
  second of the session (talking or idle). A self-hosted avatar rendering the same session
  is included: it is not billed on top.
- **Balance:** a session needs a positive balance to start (`402 INSUFFICIENT_BALANCE`) and
  is closed when the balance runs out.
- **Models:** a standard API secret uses `gpt-realtime-mini`; `gpt-realtime` needs an
  entitlement on your account (`403 PLAN_REQUIRED` otherwise; contact sales).
- **Length:** one session lasts at most one hour.
- Other errors: `401` missing or invalid key · `503` the relay is at capacity (retry after the
  `Retry-After` seconds).

## Retired: the ephemeral-token mint

`POST /v1/realtime/ephemeral-token` is **retired** and answers `410 ENDPOINT_RETIRED`. It
handed the client a raw OpenAI client secret (`ek_…`). Connect through the relay or
`/v1/realtime/connect` instead; CLI 2.8.1 and later already do.
