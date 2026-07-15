---
title: "Realtime API"
description: "Mint a short-lived client secret to open an OpenAI-Realtime voice session directly from the browser."
section: api
group: "Build"
order: 15
label: "Realtime voice"
---

## Overview

The Realtime API mints a **short-lived client secret** your browser (or client app) uses to
open an OpenAI-Realtime voice session directly — without exposing your bitHuman API key or an
OpenAI key to the client. Your server calls this endpoint with its `api-secret`, hands the
returned `value` to the client, and the client connects to OpenAI Realtime with it.

Base URL `https://api.bithuman.ai`. Authenticate with the `api-secret` header.

## Mint an ephemeral token

`POST /v1/realtime/ephemeral-token`

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `model` | string | no | OpenAI Realtime model to request. Defaults to the current bitHuman default (`gpt-realtime-mini`). |

```bash
curl -X POST https://api.bithuman.ai/v1/realtime/ephemeral-token \
  -H "api-secret: $BITHUMAN_API_SECRET" -H "content-type: application/json" \
  -d '{}'
```

**`200 OK`**

```json
{
  "data": {
    "value": "ek_68f0c2…",
    "expires_at": 1751500000,
    "model": "gpt-realtime-mini"
  },
  "status": "success",
  "status_code": 200
}
```

- `value` — the OpenAI client secret (`ek_…`). Pass it to the client to open the realtime session.
- `expires_at` — epoch seconds when the secret expires. Mint a fresh one per session.

## Limits & billing

- **Balance-gated:** you must have a positive credit balance to mint (`402 INSUFFICIENT_BALANCE`
  otherwise). No credits are deducted at mint time — realtime voice is metered per active minute
  (10 credits/min) once the session runs. See [Pricing](/guides/pricing).
- **Rate limit:** up to 20 mints per minute per account (`429 RATE_LIMITED`).
- Other errors: `401` missing/invalid key · `404` account not found · `502` if OpenAI is
  unreachable or rejects the request.

> Mint on the **server** and pass only the `value` to the client. Never ship your `api-secret`
> to a browser.
