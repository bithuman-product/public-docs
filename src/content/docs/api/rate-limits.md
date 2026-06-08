---
title: "Rate limits & quotas"
description: "Per-key request limits by endpoint class, concurrency notes, credit rates, and a recommended retry strategy."
section: api
group: "Reference"
order: 51
---

## Request limits

API endpoints are rate-limited **per API secret** by endpoint class (a token
bucket — a burst capacity that refills at a steady rate). The same limits apply
on every plan; what your plan changes is your **credit balance**, not your
request rate.

| Endpoint class | Burst | Refill | Examples |
|---|---|---|---|
| **Read** (GET) | 240 | 240 / min | `GET /v1/agent/status/*`, `GET /v2/credit-summaries` |
| **Write** (POST / PUT) | 60 | 60 / min | prompt / context / speak / file uploads |
| **Generate** (heavy) | 10 | 10 / min | `POST /v1/agent/generate`, `POST /v1/dynamics/generate` |

Exceeding a bucket returns `429` with a `Retry-After` header (see [Response
headers](#response-headers)). Check your balance and keys at
[Developer → API Keys](https://www.bithuman.ai/#developer).

## Concurrency

| Resource | Limit | Notes |
|---|---|---|
| Cloud avatar sessions | Bounded by credits | Each active session bills per minute; run as many as your balance supports. |
| Agent generation | Queued | Heavy jobs queue and run as capacity frees up. |
| Dynamics generation | Queued | Heavy jobs queue and run as capacity frees up. |

Self-hosted deployments are bounded only by your own hardware.

## Credit rates

Live sessions bill per minute by model and host; some operations are one-time.

| Feature | Credits/min |
|---|---|
| Voice chat (managed agent, no avatar) | 10 |
| Camera chat (managed agent, camera on) | 30 |
| Essence — cloud | 2 |
| Essence — self-hosted | 1 |
| Expression — cloud | 4 |
| Expression — self-hosted | 2 |

| One-time operation | Credits |
|---|---|
| Agent generation | 250 |
| Dynamics generation | 250 |

Check your balance with `GET /v2/credit-summaries` — see [Billing](/api/billing).

## Endpoint guidelines

| Endpoint | Guidance |
|---|---|
| `POST /v1/validate` | Lightweight — use for health checks. |
| `POST /v1/agent/generate` | Heavy — a 2–5 min async operation. |
| `GET /v1/agent/status/*` | Poll at 5 s intervals; avoid sub-second polling. |
| `POST /v1/agent/*/speak` | Per active session — agent must be in a room. |
| `POST /v1/files/upload` | 10 MB image, 100 MB video; size limits enforced. |
| `POST /v1/dynamics/generate` | Heavy — triggers video generation. |

## Handling limits

If you exceed limits or run out of credits, the API returns an error:

```json
{
  "error": {
    "code": "INSUFFICIENT_BALANCE",
    "message": "Insufficient credits",
    "httpStatus": 402
  },
  "status": "error",
  "status_code": 402
}
```

Common status codes: `402` (no credits), `429` (rate limited), `503` (workers
busy). See the full [error reference](/api/errors).

### Response headers

**Metered** endpoints carry your current rate-limit state, so you can throttle
proactively instead of waiting for a `429`:

| Header | Meaning |
|--------|---------|
| `X-RateLimit-Limit` | Burst capacity for the endpoint class this request uses. |
| `X-RateLimit-Remaining` | Whole tokens left right now. |
| `X-RateLimit-Reset` | Unix time when the bucket is fully refilled. |
| `Retry-After` | (On `429` only) seconds to wait before retrying. |
| `X-Request-Id` | Correlation id for the request — include it in support reports. |

> **Note** The `X-RateLimit-*` headers appear on metered endpoints. Proxied or
> streaming endpoints — for example raw TTS audio from `POST /v1/tts` — may omit
> them, since the response body is a passthrough audio stream. Don't assume every
> `/v1` response includes them; read them defensively.

## Recommended retry strategy

Use exponential backoff with jitter for `429` and `503`:

```python
import time, random, requests

def api_request_with_retry(url, headers, max_retries=3):
    for attempt in range(max_retries):
        resp = requests.post(url, headers=headers)
        if resp.status_code not in (429, 503):
            return resp
        wait = (2 ** attempt) + random.uniform(0, 1)
        time.sleep(wait)
    return resp  # last response if all retries exhausted
```

## Best practices

### Use webhooks instead of polling

Rather than polling `/v1/agent/status/{id}` in a loop, register a
[webhook](/api/webhooks) and get a signed `agent.ready` / `agent.failed` event
the moment generation finishes.

### Cache agent details

Agent data rarely changes. Cache `GET /v1/agent/{code}` responses locally and
refresh only when needed.

### Reuse sessions

Keep avatar sessions alive between conversations instead of creating new ones —
session creation is the most expensive operation.

### Check credits before heavy operations

Call `GET /v2/credit-summaries` before agent generation (250 credits) or
dynamics creation (250 credits) to avoid calls that fail with `402`.

## Need more capacity?

More credits mean more usage — upgrade your plan (Creator → Pro → Business →
Enterprise) on the [pricing page](https://www.bithuman.ai/pricing), or top up at
$1 = 100 credits from the dashboard. For volume, on-prem / air-gapped, or bespoke
SLAs beyond Enterprise, [talk to sales](https://www.bithuman.ai/sales) or reach us
via [Discord](https://discord.gg/ES953n7bPA) or [hello@bithuman.ai](mailto:hello@bithuman.ai).
