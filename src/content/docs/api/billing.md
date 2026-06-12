---
title: "Billing API"
description: "Read a user's live credit balance and per-mode minute estimates, and understand how credits are consumed."
section: api
group: "Platform"
order: 41
---

## The credits model

bitHuman bills in **credits**. The free tier includes 99 credits per month (no
credit card); paid plans range from $20/month (Creator) to $999/month
(Enterprise), plus contact-sales Custom for on-prem / volume. Top-up credits are
$1 = 100 credits and never expire. Some operations are one-time costs; live
sessions bill per minute.

| Action | Cost |
|---|---|
| Agent generation (one-time, per avatar) | 250 credits |
| Dynamics generation (one-time, per avatar) | 250 credits |
| Book creation (one-time, per book) | 250 credits |
| Live session — Essence, self-hosted | 1 credit/min |
| Live session — Essence, cloud | 2 credits/min |
| Live session — Expression, self-hosted | 2 credits/min |
| Live session — Expression, cloud | 4 credits/min |
| Voice chat (managed agent, no avatar) | 10 credits/min |
| Camera chat (managed agent, camera on) | 30 credits/min |

See the [Pricing guide](/guides/pricing) for the full plan ladder (Free, Creator,
Pro, Business, Enterprise, Custom) and annual pricing.

## Check credit balance

`GET /v2/credit-summaries` — returns the live balance for a user, broken down by
plan vs. topup credits, plus an estimate of how many minutes of each session type
they can afford at current rates. Safe to call frequently (cached read-through,
no side effects).

| Query param | Type | Required | Default | Description |
|---|---|---|---|---|
| `user_id` | string | no | the key's owner | User UUID to look up. Omit it to get the balance for the account that owns the API secret. |
| `app` | string | no | `imaginex` | App identifier for multi-app subscription support. |
| `app_key` | string | no | same as `app` | Explicit subscription key for collection-scoped apps. |

```bash
# Your own balance — just the key:
curl https://api.bithuman.ai/v2/credit-summaries \
  -H "api-secret: $BITHUMAN_API_SECRET"
```

```json
{
  "success": true,
  "data": {
    "user_id": "229be55d-1c1e-42b9-8517-a22c742668ef",
    "balance": 1842,
    "plan_credits": 99,
    "topup_credits": 1743,
    "is_enterprise": false,
    "minutes_estimate": {
      "voice_chat": 184,
      "camera_chat": 61,
      "essence_cloud": 921,
      "essence_self_hosted": 1842,
      "expression_cloud": 460,
      "expression_self_hosted": 921
    },
    "isEnterprisePlanUser": false
  }
}
```

### Response fields

| Field | Type | Notes |
|---|---|---|
| `balance` | number | Sum of plan + topup + reward credits. Can go negative down to `-11` (grace window before suspension). |
| `plan_credits` | number | Remaining credits from the active subscription; resets at billing-period end. |
| `topup_credits` | number | Credits from one-time top-ups; do not reset. |
| `is_enterprise` | boolean | `true` for org-pooled (enterprise) billing. |
| `isEnterprisePlanUser` | boolean | Backward-compat alias for `is_enterprise` — prefer the snake_case field. |
| `minutes_estimate` | object | Floor-division of `balance` by each mode's credits/min rate. |

The `minutes_estimate` keys map to the two avatar models and the managed
conversational agent:

| Key | Meaning | Rate |
|---|---|---|
| `essence_self_hosted` | Essence on your hardware | balance ÷ 1 |
| `essence_cloud` | Essence on bitHuman cloud | balance ÷ 2 |
| `expression_self_hosted` | Expression on your hardware | balance ÷ 2 |
| `expression_cloud` | Expression on bitHuman cloud | balance ÷ 4 |
| `voice_chat` | Managed cloud agent, no avatar | balance ÷ 10 |
| `camera_chat` | Managed cloud agent, camera on | balance ÷ 30 |

## Usage history

`GET /v1/usage` returns your account's metered events, newest first. Paginate
with `limit` (default 50, max 200) and `offset`; narrow with `start` / `end`
(ISO-8601 timestamps) and `agent_code`.

```python
import requests

resp = requests.get(
    "https://api.bithuman.ai/v1/usage",
    headers={"api-secret": "YOUR_API_SECRET"},
    params={"limit": 50, "start": "2026-06-01T00:00:00Z"},
).json()

for ev in resp["data"]:
    print(ev["created_at"], ev["pricing_code"], ev["credits_change"])
print(resp["pagination"])   # {limit, offset, total, has_more}
```

Each row carries `activity_type`, `pricing_code`, `agent_code`, `created_at`,
and `credits_change` — the signed credit delta (usage events are recorded as
**positive** credits consumed). This is an audit trail; for an authoritative
balance use `GET /v2/credit-summaries` above.

## Notes

- **Balance is the source of truth**, not the sum of activity rows. The activity
  ledger is a best-effort audit trail; sub-cent rounding and historical drift
  mean it can differ from `balance` by small amounts. Quote `balance` to users.
- The minute estimates use floor-division on the integer balance and treat the
  suspension grace window (`-11..0`) as zero minutes.
- For suspension-status UI, compare `balance` to the documented threshold `-11`
  rather than relying on a separate flag.
- Check your balance before heavy operations (250-credit generation or dynamics)
  to avoid wasted calls that fail with `402`.

## Errors

| HTTP | Code | When |
|---|---|---|
| `401` | `UNAUTHORIZED` / `MISSING_AUTH` | Missing or invalid `api-secret`. |
| `402` | `INSUFFICIENT_BALANCE` | Balance too low for the requested operation. |
| `404` | `USER_NOT_FOUND` | `user_id` does not exist. |
| `500` | `INTERNAL_ERROR` | Upstream database error. |

See [Rate limits](/api/rate-limits) for the plan-tiered request limits and the
full [error reference](/api/errors).
