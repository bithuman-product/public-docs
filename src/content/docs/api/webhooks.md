---
title: "Webhooks"
description: "Receive signed event notifications when async work finishes — register an endpoint, verify the HMAC signature, and inspect delivery attempts."
section: api
group: "Platform"
order: 42
---

Agent generation is asynchronous (2–5 minutes). Instead of polling
`GET /v1/agent/status/{id}`, register a **webhook** and bitHuman will POST a
signed event to your endpoint the moment the work finishes.

## Events

| Event | Fires when |
|-------|------------|
| `agent.ready` | An agent finished generating and is ready to use. |
| `agent.failed` | Agent generation failed (`data.error` has the reason). |

More event types will be added over time. Subscribe to a subset, or omit
`events` (or pass `[]`) to receive all of them.

## Register an endpoint

```bash
curl -X POST https://api.bithuman.ai/v1/webhooks \
  -H "api-secret: $BITHUMAN_API_SECRET" \
  -H "Content-Type: application/json" \
  -d '{
        "url": "https://example.com/bithuman/webhook",
        "events": ["agent.ready", "agent.failed"],
        "description": "prod"
      }'
```

```json
{
  "success": true,
  "data": {
    "id": "f2cd30a2-…",
    "url": "https://example.com/bithuman/webhook",
    "events": ["agent.ready", "agent.failed"],
    "active": true,
    "secret": "whsec_60fe3d…"
  }
}
```

> The `secret` is returned **only once**. Store it — it signs every delivery and
> is redacted from all later responses.

## What a delivery looks like

```http
POST /bithuman/webhook HTTP/1.1
Content-Type: application/json
X-BitHuman-Event: agent.ready
X-BitHuman-Delivery: evt_a1b2c3…
X-BitHuman-Timestamp: 1780417371
X-BitHuman-Signature: sha256=9f86d081…

{"id":"evt_a1b2c3…","event":"agent.ready","created":1780417371,"data":{"agent_id":"A91XMB7113","code":"A91XMB7113"}}
```

## Verify the signature

Compute `HMAC-SHA256` over `"{timestamp}.{raw_body}"` using your secret and
compare it — in constant time — to the hex digest in `X-BitHuman-Signature`.
Reject anything older than a few minutes to prevent replays.

```python
import hashlib, hmac, time

def verify(secret: str, headers, raw_body: bytes) -> bool:
    ts = headers["X-BitHuman-Timestamp"]
    if abs(time.time() - int(ts)) > 300:          # 5-minute replay window
        return False
    sent = headers["X-BitHuman-Signature"].removeprefix("sha256=")
    expected = hmac.new(
        secret.encode(), f"{ts}.".encode() + raw_body, hashlib.sha256
    ).hexdigest()
    return hmac.compare_digest(sent, expected)
```

Always verify against the **raw** request body — re-serializing the JSON will
change the bytes and break the signature.

## Delivery & retries

- Respond `2xx` quickly (within 10s). Do heavy work asynchronously.
- Failed deliveries are retried up to **3 times** with backoff.
- Every attempt is logged. Inspect recent attempts:

```bash
curl https://api.bithuman.ai/v1/webhooks/{id}/deliveries \
  -H "api-secret: $BITHUMAN_API_SECRET"
```

## Manage webhooks

```bash
# Send a test ping to confirm reachability
curl -X POST https://api.bithuman.ai/v1/webhooks/{id}/test -H "api-secret: $BITHUMAN_API_SECRET"

# List
curl https://api.bithuman.ai/v1/webhooks -H "api-secret: $BITHUMAN_API_SECRET"

# Delete
curl -X DELETE https://api.bithuman.ai/v1/webhooks/{id} -H "api-secret: $BITHUMAN_API_SECRET"
```

See the [API reference](/api/reference#tag/webhooks) for the full schema.
