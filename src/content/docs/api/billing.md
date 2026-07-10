---
title: "Billing API"
description: "Read a user's live credit balance and per-mode minute estimates, and understand how credits are consumed."
section: api
group: "Operate & reference"
order: 30
---

## The credits model

bitHuman bills in **credits**. The free tier includes 99 credits per month (no
credit card); paid plans range from $20/month (Creator) to $999/month
(Enterprise), plus contact-sales Custom for on-prem / volume. Top-up credits are
$1 = 100 credits and never expire. Some operations are one-time costs; live
sessions bill per minute.

| Action | Cost |
|---|---|
| Agent generation — v1 models (`essence-1`, `expression-1`) | 250 credits (one-time, per avatar) |
| Agent generation — Essence 2 (`essence-2` combined; Max included) | 500 credits (one-time, per avatar) |
| Agent generation — Expression 2 (`expression-2`) | 2000 credits (one-time, per avatar) |
| Agent generation — `auto` | The routed model's rate (500 or 2000) |
| [Add a model to an existing agent](/api/agents#add-a-model-to-an-existing-agent) | Same per-model rates (250 / 500 / 2000); adding `expression-1` is **free** (instant enablement, no training) |
| Dynamics generation (one-time, per avatar) | 250 credits |
| Book creation (one-time, per book) | 250 credits |
| Talking video — Essence 1 | 8 credits/min (rounded up) |
| Talking video — Expression 1, Expression 2, Essence 2 | 4 credits/min (rounded up) |
| Talking video — Essence 2 Max | 8 credits/min (rounded up) |
| Live session — Essence 1, self-hosted | 1 credit/min |
| Live session — Essence 1, cloud | 2 credits/min |
| Live session — Expression 1 / Expression 2 / Essence 2, self-hosted | 2 credits/min |
| Live session — Expression 1 / Expression 2 / Essence 2, cloud | 4 credits/min |
| Live session — Essence 2 Max, self-hosted | 4 credits/min |
| Live session — Essence 2 Max, cloud | 8 credits/min |
| Voice chat (managed agent, no avatar) | 10 credits/min |
| Camera chat (managed agent, camera on) | 30 credits/min |

See the [Pricing guide](/guides/pricing) for the full plan ladder (Free, Creator,
Pro, Business, Enterprise, Custom) and annual pricing.

## Get the pricing schedule

`GET /v1/pricing` — the machine-readable credit schedule, so you can estimate
cost before a billable call. Agent creation is priced **per model** — read
`agent_generation.by_model` (there is no flat creation rate):

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
        "essence-2-max": 500,
        "expression-2": 2000,
        "essence-2": 500,
        "auto": 2000
      },
      "note": "One-time charge per agent created via POST /v1/agent/generate, PER MODEL …"
    },
    "talking_video": {
      "unit": "credits_per_minute",
      "billing": "ceil(minutes) * rate, minimum 1 minute",
      "rates": { "essence-1": 8, "expression-1": 4, "essence-2": 4, "essence-2-max": 8, "expression-2": 4 }
    },
    "dynamics_generation": { "flat": 250, "note": "…" },
    "notes": "Authoritative charges are enforced server-side at request time. …"
  }
}
```

`by_model` keys are the **canonical** `model` values `POST /v1/agent/generate`
accepts — since the 2026-07-10 platform-side rename flip the premium model is
keyed `essence-2-max` (the pre-rename `essence-2-quality` spelling is still
*accepted* as a deprecated alias at the same 500, but no longer advertised —
in `by_model` or `talking_video.rates`).
`essence-2` is the [combined Essence 2 creation](/api/agents#essence-2--the-combined-creation)
(one 500-credit charge covers both models) and `auto`
[classifies and routes](/api/agents#auto--let-the-platform-pick-the-model),
charging the routed model's rate — 500 for `essence-2`, 2000 for
`expression-2` (the `auto` entry in `by_model` shows the worst case).
[Post-generation model adds](/api/agents#add-a-model-to-an-existing-agent)
charge the same per-model rates (adding `expression-1` is free). Authoritative
charges are always enforced server-side — treat this endpoint as an estimate
and reference.

## Check credit balance

`GET /v2/credit-summaries` — returns the live balance for the **authenticated
account** (the owner of the `api-secret`), broken down by plan vs. topup credits,
plus an estimate of how many minutes of each session type it can afford at current
rates. Safe to call frequently (cached read-through, no side effects).

The endpoint always returns the caller's own balance; there is no way to look up
another user. (A `user_id` query param is silently ignored — it does not switch
accounts and never returns `404`.)

| Query param | Type | Required | Default | Description |
|---|---|---|---|---|
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
    "balance": 1842.0,
    "plan_credits": 99.0,
    "topup_credits": 1743.0,
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
| `balance` | number (float) | Sum of plan + topup + reward credits, returned as a float (e.g. `5910592.0`). Can go negative down to `-11` (grace window before suspension). |
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
- The minute estimates use floor-division on the balance and treat the
  suspension grace window (`-11..0`) as zero minutes.
- For suspension-status UI, compare `balance` to the documented threshold `-11`
  rather than relying on a separate flag.
- Check your balance before heavy operations (agent generation at 250–2000
  credits per model, or dynamics at 250) to avoid wasted calls that fail with
  `402` — [`GET /v1/pricing`](#get-the-pricing-schedule) gives the exact
  per-model rates.

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
