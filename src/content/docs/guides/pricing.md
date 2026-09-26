---
title: "Pricing & credits"
description: "Credits pay for talking time; idle time is free. Rates per model and platform, creation costs, plans, offline licensing, and how to check your balance."
section: guides
group: "Pricing"
order: 40
type: guide
label: "Pricing & credits"
---

Credits pay for talking time. Idle time is free. Every platform (cloud, self-hosted and on-device) bills the same way, against your [API secret](/start/api-secret). This page is the one source for every price; other pages link here.

## Serving — credits per live minute

The table and the billing rule under it are generated from [`GET /v1/pricing`](/api/billing#get-the-pricing-schedule) (`data.realtime`).

<!-- PRICING:REALTIME -->
| Model | Cloud | Self-hosted and on-device |
|---|---|---|
| [Essence 2](/concepts/essence-2) (`essence-2`) | 4 credits/min | 2 credits/min |
| [Expression 2](/concepts/expression-2) (`expression-2`) | 4 credits/min | 2 credits/min |
| [Essence 1](/concepts/essence-1) (`essence-1`) | 2 credits/min | 1 credit/min |
| [Expression 1](/concepts/expression-1) (`expression-1`) | 4 credits/min | — |

Managed conversational agents bill on top of avatar serving:

| Surface | Rate |
|---|---|
| Managed agent — voice chat | 10 credits/min |

How talking time is billed (`rounding: seconds_floor_carry`): exact talking seconds x rate / 60 (idle is free), rounded down per session with the remainder carried to your next session; no minimum.
<!-- /PRICING:REALTIME -->

A credit minute is a minute in which the avatar is **actually talking**. **Idle animation is free**: a connected avatar looping its idle motion accrues nothing, and neither does a runtime left loaded between replies. An offline render (`bithuman render`, or `render()` in the Python SDK) bills the duration of the video it writes, at the self-hosted rate.

A managed agent with the camera on (vision) bills 30 credits/min instead of the voice-chat rate.

Expression 1 (`expression-1`) is a cloud model; the legacy self-hosted GPU container bills 2 credits/min.

## Creation — one-time credits

| Action | Credits |
|---|---|
| Create an agent: `essence-1` or `expression-1` | 250 |
| Create an agent: `essence-2` | 500 |
| Create an agent: `expression-2` | 2000 |
| Create an agent: `auto` | the routed model's rate (500 or 2000) |
| [Add a model](/api/agents#add-a-model-to-an-existing-agent) to an agent | the same per-model rates; Expression 1 is free |
| Generate gestures (dynamics) | 250 |

A failed creation is refunded automatically. [`GET /v1/pricing`](/api/billing#get-the-pricing-schedule) returns this schedule as JSON.

## Talking video — per minute of output

[Talking-video renders](/api/video) bill per minute of finished output, rounded up, minimum one minute. A failed render is refunded.

| Model | Per minute of output |
|---|---|
| `essence-2` | 4 credits |
| `expression-2` | 4 credits |
| `essence-1` | 2 credits |
| `expression-1` | 4 credits |

## Free tier

99 credits a month, no card required; unused credits do not roll over. That serves an existing agent for about 24 minutes of cloud Essence 2 or Expression 2, or 49 minutes self-hosted.

### The free tier cannot create an agent

The cheapest creation costs 250 credits, more than a free month. A creation you cannot pay for returns [`402 INSUFFICIENT_BALANCE`](/api/errors) and creates nothing. [Top up](#top-up-credits) or choose a [plan](#plans) first.

## Plans

| Plan | Monthly | Yearly | Credits / month | Concurrent cloud sessions |
|---|---|---|---|---|
| **Free** | $0 | — | 99 | 1 |
| **Creator** | $20 | $204 | 1,800 | 3 |
| **Pro** | $99 | $1,010 | 10,000 | 10 |
| **Business** | $299 | $2,990 | 50,000 | 50 |
| **Enterprise** | $999 | $9,990 | 250,000 | 200 |
| **Custom** | [Contact sales](https://www.bithuman.ai/sales) | — | volume or on-prem | unlimited |

Annual plans bill twelve months of credits up front. Concurrent sessions limit live cloud sessions; a session over the limit is refused with `403 CONCURRENCY_LIMIT_REACHED` ([rate limits](/api/rate-limits)). Self-hosted and on-device sessions are limited only by credits.

Essence 2 Max is available on the Enterprise plan only. [Contact sales](https://www.bithuman.ai/sales) to enable it.

## Offline licensing

Business and Enterprise plans can run realtime avatars fully offline, for kiosks, trade shows, ATMs and embedded screens.

- **Credit-based:** the same credits, metered on the device, at the self-hosted rate.
- **From 100,000 credits** per licence, with no time limit and no required reconnection.
- **Not for phones:** the Apple and Android SDKs stay online.

Offline licences are arranged through sales: [contact sales](https://www.bithuman.ai/sales).

## Top-up credits

Top up any time at **$1 = 100 credits**. Top-up credits never expire and are spent after plan credits.

## Connectivity

| Situation | What happens |
|---|---|
| No API secret, or a rejected one, at the start | the session does not start |
| No network when a session starts | the session does not start; retry when connected |
| The network drops after the session started | the session continues for 5 minutes, then pauses until the connection returns; usage is reported when it does |
| Credits run out | the session stops at the next usage report; top up to continue |

## Check your balance

```bash
curl https://api.bithuman.ai/v2/credit-summaries -H "api-secret: $BITHUMAN_API_SECRET"
```

```json
{
  "success": true,
  "data": {
    "user_id": "00000000-0000-0000-0000-000000000000",
    "balance": 5240,
    "plan_credits": 240,
    "topup_credits": 5000,
    "is_enterprise": false,
    "minutes_estimate": {
      "essence_2_cloud": 1310,
      "essence_2_self_hosted": 2620,
      "expression_2_cloud": 1310,
      "expression_2_self_hosted": 2620,
      "essence_1_cloud": 2620,
      "essence_1_self_hosted": 5240,
      "expression_1_cloud": 1310,
      "expression_1_self_hosted": 2620,
      "voice_chat": 524,
      "camera_chat": 174,
      "essence_cloud": 2620,
      "essence_self_hosted": 5240,
      "expression_cloud": 1310,
      "expression_self_hosted": 2620
    }
  }
}
```

Each `<model>_cloud` and `<model>_self_hosted` value is the balance divided by that rate. The unversioned `essence_*` and `expression_*` keys are the first-generation models; for Essence 2 read `essence_2_*`.

## What is not billed

- Idle, paused, stopped or disconnected sessions.
- API secrets, SDK installs and model downloads (a download writes a 0-credit usage row).
- Failed creations and renders (refunded) and failed authentication.

## Next

- [Billing API](/api/billing) · [Rate limits](/api/rate-limits) · [Create your own avatar](/guides/building-avatars)
