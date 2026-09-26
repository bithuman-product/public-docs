---
title: "Billing API"
description: "Read a user's live credit balance and per-mode minute estimates, and understand how credits are consumed."
section: api
group: "Account"
order: 33
type: endpoint
label: "Billing & usage"
---

## The credits model

bitHuman bills in **credits**: talking time in a live session bills per minute (idle time is free), and creating an agent or rendering a talking video is a one-time charge. Every rate is on [Pricing & credits](/guides/pricing). These endpoints read your balance, your usage and the rate schedule.

## Account status

`GET /v1/me` returns your identity, plan and balance in one call: a good pre-flight check, and where to find your `user_id`.

```bash
curl https://api.bithuman.ai/v1/me -H "api-secret: $BITHUMAN_API_SECRET"
```

```json
{
  "data": {
    "user_id": "3f9a…-uuid",
    "email": "user@example.com",
    "plan": "pro",
    "plan_code": "membership_pro",
    "credit_balance": 1240,
    "plan_credits_remaining": 1000,
    "topup_credits_remaining": 240,
    "account_status": "active"
  },
  "status": "success",
  "status_code": 200
}
```

`credit_balance` is plan plus top-up credits. Use `user_id` in the `/v2/{user_id}/…` account endpoints ([API secrets](/api/api-keys), [Runtime sessions](/api/runtime-sessions), [Providers](/api/providers)).

## Get the pricing schedule

`GET /v1/pricing` returns the credit schedule, so you can estimate a cost before a billable call. Creation is priced per model in `agent_generation.by_model`; live sessions per model in `realtime`, for the cloud (`hosted`) and for self-hosted and on-device (`self_hosted`), each with the `rounding` rule and `basis` in force. [Pricing & credits](/guides/pricing) is generated from this response.

```bash
curl https://api.bithuman.ai/v1/pricing \
  -H "api-secret: $BITHUMAN_API_SECRET"
```

```json
{
  "success": true,
  "data": {
    "unit": "credits",
    "agent_generation": {
      "unit": "credits",
      "by_model": {
        "essence-1": 250,
        "expression-1": 250,
        "expression-2": 2000,
        "essence-2": 500,
        "auto": 2000
      },
      "note": "One-time charge per agent created via POST /v1/agent/generate, PER MODEL …"
    },
    "talking_video": {
      "unit": "credits_per_minute",
      "billing": "ceil(minutes) * rate, minimum 1 minute",
      "rates": { "essence-1": 2, "expression-1": 4, "essence-2": 4, "expression-2": 4 }
    },
    "dynamics_generation": { "flat": 250, "note": "…" },
    "realtime": {
      "unit": "credits_per_minute",
      "hosted": {
        "by_model": { "essence-2": { "rate": 4, "rounding": "minutes_min1", "basis": "…" }, "…": {} },
        "chat_line": { "rate": 10, "rounding": "minutes_min1", "basis": "…" }
      },
      "self_hosted": { "by_model": { "essence-2": { "rate": 2, "rounding": "minutes_min1", "basis": "…" }, "…": {} } }
    },
    "notes": "Authoritative charges are enforced server-side at request time. …"
  }
}
```

`by_model` keys are the `model` values `POST /v1/agent/generate` accepts. `auto` is charged at the rate of the model it routes to (500 or 2000); the `auto` entry shows the higher one. [Adding a model](/api/agents#add-a-model-to-an-existing-agent) to an existing agent costs the same (adding `expression-1` is free). The server enforces the actual charge; treat this schedule as an estimate.

## Check credit balance

`GET /v2/credit-summaries` returns the live balance of the account that owns the `api-secret`, split into plan and top-up credits, with an estimate of the minutes each session type can afford. It is safe to call often. It only ever returns your own balance; a `user_id` parameter is ignored.

```bash
# Your own balance — just your API secret:
curl https://api.bithuman.ai/v2/credit-summaries \
  -H "api-secret: $BITHUMAN_API_SECRET"
```

```json
{
  "success": true,
  "data": {
    "user_id": "229be55d-1c1e-42b9-8517-a22c742668ef",
    "balance": 1842.0,
    "plan_credits": 99.0,
    "topup_credits": 1743.0,
    "is_enterprise": false,
    "minutes_estimate": {
      "essence_2_cloud": 460,
      "essence_2_self_hosted": 921,
      "expression_2_cloud": 460,
      "expression_2_self_hosted": 921,
      "essence_1_cloud": 921,
      "essence_1_self_hosted": 1842,
      "expression_1_cloud": 460,
      "expression_1_self_hosted": 921,
      "voice_chat": 184,
      "camera_chat": 61,
      "essence_cloud": 921,
      "essence_self_hosted": 1842,
      "expression_cloud": 460,
      "expression_self_hosted": 921
    }
  }
}
```

### Response fields

| Field | Type | Notes |
|---|---|---|
| `balance` | number | plan + top-up + reward credits; can go down to `-11` (the grace window before suspension) |
| `plan_credits` | number | Remaining credits from the active subscription; resets at billing-period end. |
| `topup_credits` | number | Credits from one-time top-ups; do not reset. |
| `is_enterprise` | boolean | `true` for org-pooled (enterprise) billing. |
| `minutes_estimate` | object | Floor-division of `balance` by each mode's credits/min rate. |

There is one `minutes_estimate` key per serving mode. **The rate differs by
model** — read the key for the model you actually run:

| Key | Meaning | Rate |
|---|---|---|
| `essence_2_cloud` | Essence 2 on bitHuman cloud | balance ÷ 4 |
| `essence_2_self_hosted` | Essence 2 on your hardware | balance ÷ 2 |
| `expression_2_cloud` | Expression 2 on bitHuman cloud | balance ÷ 4 |
| `expression_2_self_hosted` | Expression 2 on your hardware | balance ÷ 2 |
| `essence_1_cloud` | Essence 1 on bitHuman cloud | balance ÷ 2 |
| `essence_1_self_hosted` | Essence 1 on your hardware | balance ÷ 1 |
| `expression_1_cloud` | Expression 1 on bitHuman cloud | balance ÷ 4 |
| `expression_1_self_hosted` | Expression 1 on your hardware | balance ÷ 2 |
| `voice_chat` | Managed cloud agent, no avatar | balance ÷ 10 |
| `camera_chat` | Managed cloud agent, camera on | balance ÷ 30 |

`essence_cloud`, `essence_self_hosted`, `expression_cloud` and `expression_self_hosted` are older aliases of the `essence_1_*` and `expression_1_*` keys, **not** Essence 2 or Expression 2. The estimates are advisory; the server computes the actual charge.

## Usage history

`GET /v1/usage` returns your account's metered events, newest first. Paginate
with `limit` (default 50, max 200) and `offset`; narrow with `start` / `end`
(ISO-8601 timestamps) and `agent_code`.

```python
import os
import requests

resp = requests.get(
    "https://api.bithuman.ai/v1/usage",
    headers={"api-secret": os.environ["BITHUMAN_API_SECRET"]},
    params={"limit": 50, "start": "2026-06-01T00:00:00Z"},
).json()

for ev in resp["data"]:
    print(ev["created_at"], ev["pricing_code"], ev["credits_change"])
print(resp["pagination"])   # {limit, offset, total, has_more}
```

Each row carries `activity_type`, `pricing_code`, `agent_code`, `created_at` and `credits_change` (usage is recorded as positive credits consumed).

A [talking-video render](/api/video) charges its maximum up front and refunds the difference, so every render, successful or not, writes a charge row and a `credit_refund_…` row. Only a refund equal to the whole charge means the render failed.

## Notes

- **Quote `balance` to users.** The usage history is an audit trail and can differ from the balance by rounding.
- A balance between `-11` and `0` is the grace window before suspension; the minute estimates count it as zero.

## Errors

| HTTP | Code | When |
|---|---|---|
| `401` | `UNAUTHORIZED` / `MISSING_AUTH` | Missing or invalid `api-secret`. |
| `402` | `INSUFFICIENT_BALANCE` | Balance too low for the requested operation. |
| `500` | `INTERNAL_ERROR` | Upstream database error. |

See [Rate limits](/api/rate-limits) for the plan-tiered request limits and the
full [error reference](/api/errors).

## Next steps

- [Pricing & credits](/guides/pricing) — how credits and per-minute rates work
- [Rate limits](/api/rate-limits) — quotas and limits per endpoint
