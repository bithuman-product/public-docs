---
title: "Rate limits & quotas"
description: "Plan-tiered request limits by endpoint cost tier, the 429 / Retry-After contract, credit rates, and a recommended retry strategy."
section: api
group: "Reference"
order: 51
---

## Request limits

API requests are rate-limited **per account** (every API secret on the same
account shares the same buckets) by endpoint **cost tier**, and the limits
scale with your plan. Each cell below is requests per minute, implemented as a
token bucket — the per-minute number is also the burst capacity, and it refills
continuously at that rate.

| Cost tier | Free | Creator | Pro | Business | Enterprise* |
|---|---|---|---|---|---|
| **Generate** | 4 | 10 | 30 | 60 | 120 |
| **Write** | 30 | 60 | 180 | 360 | 720 |
| **Read** | 120 | 240 | 720 | 1440 | 2880 |

\* Enterprise defaults shown — custom limits are available;
[talk to sales](https://www.bithuman.ai/sales).

What each cost tier covers:

| Cost tier | Covers | Examples |
|---|---|---|
| **Generate** | Heavy generation jobs | `POST /v1/agent/generate`, `POST /v1/dynamics/generate`, video and book generation |
| **Write** | Every other `POST` / `PUT` / `PATCH` / `DELETE`, including TTS synthesis | prompt / context / speak / file uploads, `POST /v1/tts` |
| **Read** | `GET` requests | `GET /v1/agent/status/*`, voice lists, `GET /v2/credit-summaries` |

Your column is determined by your subscription; accounts without one get the
Free limits. Plan changes reach the limiter within about a minute — no key
rotation needed. Check your plan and keys at
[Developer → API Keys](https://www.bithuman.ai/#developer).

Exceeding a bucket returns `429` with a `Retry-After` header (see [Response
headers](#response-headers)) and the standard [error envelope](/api/errors):

```json
{
  "error": {
    "code": "RATE_LIMITED",
    "message": "Too many generate requests for this api-secret. Retry in ~6s.",
    "httpStatus": 429
  },
  "status": "error",
  "status_code": 429
}
```

### Never rate-limited

Two surfaces are deliberately exempt from the request limiter:

- **Webhooks** — webhook traffic is never rate-limited, so signed event
  deliveries and their retries always go through.
- **Live-session heartbeats** — the runtime-token routes (`/v1/runtime-tokens*`,
  `/v1/runtime/*`) that keep a live avatar session authenticated and billing.
  An active session is never cut off with a `429`; live usage is bounded by
  your credit balance and spend caps instead.

### Failed authentication

Repeated failed authentication on key-authenticated endpoints is throttled
**per client IP** at 30 failures per minute — once exceeded, further attempts
return `429` until the window clears. Requests with a valid secret are never
affected by this throttle. Anonymous, self-authenticating endpoints (token
mints, `/v1/me`, CLI login) carry an additional per-IP limit of 120
requests/minute.

## Session concurrency

Concurrency is governed by **credits and spend caps**, not the request
limiter — there is no per-plan cap on simultaneous sessions.

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
| `X-RateLimit-Limit` | Your plan's limit for the cost tier this request uses. |
| `X-RateLimit-Remaining` | Whole tokens left right now. |
| `X-RateLimit-Reset` | Unix time when the bucket is fully refilled. |
| `Retry-After` | (On `429` only) seconds to wait before retrying. |
| `X-Request-Id` | Correlation id for the request — include it in support reports. |

> **Note** The `X-RateLimit-*` headers appear on metered endpoints. Proxied or
> streaming endpoints — for example raw TTS audio from `POST /v1/tts` — may omit
> them, since the response body is a passthrough audio stream. Don't assume every
> `/v1` response includes them; read them defensively.

## Recommended retry strategy

Use exponential backoff with jitter for `429` and `503`, honoring
`Retry-After` when present:

```python
import time, random, requests

def api_request_with_retry(url, headers, max_retries=3):
    for attempt in range(max_retries):
        resp = requests.post(url, headers=headers)
        if resp.status_code not in (429, 503):
            return resp
        wait = float(resp.headers.get("Retry-After", 2 ** attempt))
        time.sleep(wait + random.uniform(0, 1))
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

Higher plans raise your request limits (see the matrix above) and come with
more credits — upgrade (Creator → Pro → Business → Enterprise) on the
[pricing page](https://www.bithuman.ai/pricing), or top up at
$1 = 100 credits from the dashboard. For volume, on-prem / air-gapped, or bespoke
SLAs beyond Enterprise, [talk to sales](https://www.bithuman.ai/sales) or reach us
via [Discord](https://discord.gg/ES953n7bPA) or [hello@bithuman.ai](mailto:hello@bithuman.ai).
