---
title: "Rate limits & quotas"
description: "Plan-tiered request limits by endpoint cost tier, the 429 / Retry-After contract, session concurrency, and a recommended retry strategy."
section: api
group: "Reference"
order: 41
type: reference
label: "Rate limits"
---

## Request limits

Requests are limited **per account** (every API secret on the account shares the same buckets), by endpoint cost tier and plan. Each cell is requests per minute; a bucket also allows a burst of that size and refills continuously.

| Cost tier | Free | Creator | Pro | Business | Enterprise* |
|---|---|---|---|---|---|
| **Generate** | 4 | 10 | 30 | 60 | 120 |
| **Write** | 30 | 60 | 180 | 360 | 720 |
| **Read** | 120 | 240 | 720 | 1440 | 2880 |

\* Enterprise defaults; custom limits are available from [sales](https://www.bithuman.ai/sales).

| Cost tier | Covers |
|---|---|
| **Generate** | heavy jobs: `POST /v1/agent/generate`, `POST /v1/dynamics/generate`, video generation |
| **Write** | every other `POST`, `PUT`, `PATCH`, `DELETE`, including `POST /v1/tts` |
| **Read** | `GET` requests, such as `GET /v1/agent/status/*` and `GET /v2/credit-summaries` |

A plan change reaches the limiter within about a minute; no new secret is needed. Over the limit, the API returns `429 RATE_LIMITED` with a `Retry-After` header and the standard [error envelope](/api/errors).

**Never limited:** webhook deliveries, and the runtime-token routes (`/v1/runtime-tokens*`, `/v1/runtime/*`) that keep a live session authenticated. A live session is never cut off with a `429`.

**Failed authentication** is throttled per client IP at 30 failures per minute. Anonymous endpoints (token mints, `/v1/me`, CLI login) allow 120 requests per minute per IP.

## Session concurrency

| Plan | Concurrent cloud avatar sessions |
|---|---|
| Free | 1 |
| Creator | 3 |
| Pro | 10 |
| Business | 50 |
| Enterprise | 200 |
| Custom (contact sales) | Unlimited |

A session over the allowance is refused at start with `403 CONCURRENCY_LIMIT_REACHED`; a live session is never cut off by this limit. Agent and dynamics generation jobs queue and run as capacity frees up. Sessions you render on your own hardware are limited only by your credits ([self-hosting](/guides/self-hosting)). Credits pay for session time, talking or idle, by the exact second ([pricing](/guides/pricing)).

## Response headers

Metered endpoints return your current state, so you can slow down before a `429`:

| Header | Meaning |
|---|---|
| `X-RateLimit-Limit` | your plan's limit for this request's cost tier |
| `X-RateLimit-Remaining` | whole requests left right now |
| `X-RateLimit-Reset` | Unix time when the bucket is full again |
| `Retry-After` | on `429` only: seconds to wait |
| `X-Request-Id` | include it when you contact support |

Not every response carries them (`POST /v1/validate` has none); fall back to backoff.

## Recommended retry strategy

Retry `429` and `503` with exponential backoff and jitter, honouring `Retry-After`:

```python
import time, random, requests

def api_request_with_retry(url, headers, max_retries=3):
    for attempt in range(max_retries):
        resp = requests.post(url, headers=headers)
        if resp.status_code not in (429, 503):
            return resp
        wait = float(resp.headers.get("Retry-After", 2 ** attempt))
        time.sleep(wait + random.uniform(0, 1))
    return resp
```

## Best practices

- **Use [webhooks](/api/webhooks), not polling,** for `agent.ready` and `agent.failed`. If you poll status, poll every 5 seconds or slower.
- **Cache agent details** from `GET /v1/agent/{code}`; they rarely change.
- **Reuse a session** for back-to-back conversations rather than starting a new one; note that an open session bills its time, talking or idle.
- **Check your balance** with `GET /v2/credit-summaries` before creating an agent ([creation costs](/guides/pricing#creation--one-time-credits)), to avoid a `402`.

More capacity comes with a higher [plan](/guides/pricing#plans); for more than Enterprise, [talk to sales](https://www.bithuman.ai/sales).
