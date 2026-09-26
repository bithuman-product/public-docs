---
title: "Webhooks"
description: "Receive signed event notifications when async work finishes — register an endpoint, verify the HMAC signature, and inspect delivery attempts."
section: api
group: "Deliver"
order: 21
type: endpoint
label: "Webhooks"
---

Agent generation and talking-video renders are asynchronous — agent creation takes
minutes for the first-generation models and about 2 to 2.5 hours for either
second-generation one. Instead of polling `GET /v1/agent/status/{id}` or
`GET /v1/video/{job_id}`, register a **webhook** and bitHuman will POST a
signed event to your endpoint the moment the work finishes.

## Events

| Event | Fires when |
|-------|------------|
| `agent.ready` | An agent finished generating and is ready to use. |
| `agent.failed` | Agent generation failed (`data.error` has the reason). |
| `video.completed` | A `POST /v1/video/generate` render finished. `data` has the same shape as `GET /v1/video/{job_id}`: `job_id`, `status`, `model`, `video_url`, `duration_seconds`, `credits_charged`. |
| `video.failed` | A render failed. `data.error.message` has the reason, and the charge is refunded. |
| `ping` | Sent only by `POST /v1/webhooks/{id}/test`. |

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

Keep the id for the calls below: `export WEBHOOK_ID=<data.id from the response>`.

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

{"id":"evt_a1b2c3…","event":"agent.ready","created":1780417371,"data":{"agent_id":"A80HVD8577","code":"A80HVD8577"}}
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
- Each delivery is attempted up to 3 times (immediately, then after 2 s and 5 s); each attempt times out after 10 s.
- Every attempt is logged. Inspect recent attempts:

```bash
curl https://api.bithuman.ai/v1/webhooks/$WEBHOOK_ID/deliveries \
  -H "api-secret: $BITHUMAN_API_SECRET"
```

## Session events

Separately from the account webhooks above, an agent can POST its live
conversation events to a URL of yours. You set this per agent, in the agent's
settings on the dashboard: the URL, any headers to send, and which events to
turn on.

**`room.join`** — once, when a user connects:

```json
{ "agent_code": "A80HVD8577", "event_type": "room.join",
  "data": { "room_name": "support", "participant_count": 1,
            "session_id": "session_xyz" }, "timestamp": 1705312200.0 }
```

**`chat.push`** — once per message, from the user and from the agent:

```json
{ "agent_code": "A80HVD8577", "event_type": "chat.push",
  "data": { "role": "user", "message": "help with order #12345",
            "session_id": "session_xyz" }, "timestamp": 1705312285.0 }
```

These carry no signature: add a secret header in the agent's settings and check
it in your handler. Return `200` quickly and do the work on a queue.

## Manage webhooks

```bash
# Send a test ping to confirm reachability
curl -X POST https://api.bithuman.ai/v1/webhooks/$WEBHOOK_ID/test -H "api-secret: $BITHUMAN_API_SECRET"

# List
curl https://api.bithuman.ai/v1/webhooks -H "api-secret: $BITHUMAN_API_SECRET"

# Delete
curl -X DELETE https://api.bithuman.ai/v1/webhooks/$WEBHOOK_ID -H "api-secret: $BITHUMAN_API_SECRET"
```

See the [API reference](/api/reference#tag/webhooks) for the full schema.
