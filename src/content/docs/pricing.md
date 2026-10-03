---
title: "Pricing and credits"
description: "Every rate per model and platform, creation costs, plans and offline licensing."
section: overview
group: "Pricing"
order: 10
type: guide
llms: deploy
moved:
  estimate-a-month: /pricing/estimate#estimate-a-month
  budget-an-app: /pricing/estimate#budget-an-app
  check-your-balance: /api/billing#check-credit-balance
---

Prices are in credits: **100 credits = $1**, so 4 credits a minute is about $0.04 a minute. Credits pay for the time an avatar [session](/models/how-it-works#key-terms) is running, talking or idle, billed by the exact second. Cloud, self-hosted and on-device all bill the same way, against your [API secret](/start/api-secret). To estimate a month or an app, use the [estimate](/pricing/estimate); your balance is on the [Billing API](/api/billing#check-credit-balance).

## Serving — credits per live minute

The first table is the avatar-only rate per model; the second is the all-inclusive managed-agent rate (both defined below the tables).

<!-- PRICING:REALTIME -->
| Model | Cloud | Self-hosted and on-device |
|---|---|---|
| [Essence 2](/models/essence-2) (`essence-2`) | 4 credits/min | 2 credits/min |
| [Expression 2](/models/expression-2) (`expression-2`) | 4 credits/min | 2 credits/min |
| [Essence 1](/models/first-generation#essence-1) (`essence-1`) | 2 credits/min | 1 credit/min |
| [Expression 1](/models/first-generation#expression-1) (`expression-1`) | 4 credits/min | — |

A managed conversational agent bills one all-inclusive rate: it covers the avatar, whether it renders in the bitHuman cloud or in the viewer's browser.

| Surface | Rate |
|---|---|
| Managed agent — voice chat (all-inclusive) | 10 credits/min |
| Managed agent — camera on (vision chat; replaces the chat rate) | 30 credits/min |

An avatar-only session (your own agent through the plugin or the API) that renders in the viewer's browser bills the model's **self-hosted** rate above. Inside a managed agent's chat the all-inclusive rate covers it.

How live sessions are billed: active session time, talking or idle: exact seconds x rate / 60, rounded down per session with the remainder carried to your next session; no minimum.
<!-- /PRICING:REALTIME -->

Two ways to pay for a live avatar:

- **Avatar only:** you bring the conversation (your own speech-to-text, language model and voice, through an SDK, the plugin or the API) and pay only the model's rate in the first table.
- **Managed agent:** bitHuman runs the whole conversation (listening, the replies, the voice) and the avatar, as in the web embed, for one all-inclusive rate in the second table.

A session bills while it is **running**, whether the avatar is talking or idle, to the exact second. A stopped or disconnected session accrues nothing. File rendering (`bithuman render`, or `render()` in the Python SDK) bills the duration of the video it writes, at the self-hosted rate.

Expression 1 (`expression-1`) runs in the bitHuman cloud only.

```diagram
lifecycle
```

## Creation — one-time credits

| Action | Credits |
|---|---|
| Create an agent: `essence-1` or `expression-1` | 250 |
| Create an agent: `essence-2` | 500 |
| Create an agent: `expression-2` | 2000 |
| Create an agent: `auto` | the routed model's rate (500 or 2000) |
| [Add a model](/api/agents#add-a-model-to-an-existing-agent) to an agent | the same per-model rates; 0 for Expression 1 |
| Generate gestures for an Essence 1 agent ([Gestures](/build/gestures)) | 250 |

A failed creation is refunded automatically. [`GET /v1/pricing`](/api/billing#get-the-pricing-schedule) returns this schedule as JSON; send your API secret in the `api-secret` header.

## Talking video — per minute of output

[Talking-video renders](/api/video) bill per minute of finished output, rounded up, minimum one minute. A failed render is refunded.

| Model | Per minute of output |
|---|---|
| `essence-2` | 4 credits |
| `expression-2` | 4 credits |
| `essence-1` | 2 credits |
| `expression-1` | 4 credits |

## Plans

API and SDK use needs the Creator plan or higher: from **2026-10-12** (00:00 UTC) a Free account's API secret is refused with `403 PLAN_REQUIRED`. A Free account can try the sample avatars on bithuman.ai, but cannot create agents or buy credit top-ups. Every refusal and its fix: [Plan and credit refusals](/api/errors#plan-and-credit-refusals). [Choose a plan](https://www.bithuman.ai/pricing?from=docs).

| Plan | Monthly | Yearly | Credits / month | Agents | Concurrent cloud sessions |
|---|---|---|---|---|---|
| **Creator** | $20 | $204 | 2,000 | 7 | 3 |
| **Pro** | $99 | $1,010 | 10,000 | 40 | 10 |
| **Business** | $299 | $2,990 | 50,000 | 200 | 50 |
| **Enterprise** | $999 | $9,990 | 250,000 | unlimited | 200 |
| **Custom** | [Contact sales](https://www.bithuman.ai/enterprise?topic=pricing#contact) | — | by agreement | by agreement | by agreement |

Annual plans bill twelve months of credits up front. When you switch to a cheaper plan, credits you've already paid for stay in your balance.

- **Agents:** a creation over your plan's limit returns `403 AGENT_LIMIT_REACHED`, with an `upgrade_url`. Existing agents keep working.
- **Concurrent sessions** limit live cloud sessions; a session over the limit is refused with `403 CONCURRENCY_LIMIT_REACHED`, with an `upgrade_url` ([rate limits](/api/rate-limits#session-concurrency)). Self-hosted and on-device sessions are limited only by credits.
- **Creation costs credits:** a creation you cannot pay for returns [`402 INSUFFICIENT_BALANCE`](/api/errors#plan-and-credit-refusals), with a `topup_url`, and creates nothing.

### Top-up credits

On the Creator plan or higher, [top up](https://www.bithuman.ai/billing#credits) any time at **$1 = 100 credits**. Top-up credits never expire and are spent after plan credits.

### Connectivity

| Situation | What happens |
|---|---|
| No API secret, or a rejected one, at the start | the session does not start |
| No network when a session starts | the session does not start; retry when connected |
| The network drops after the session started | the session continues for 5 minutes, then pauses until the connection returns; usage is reported when it does |
| Credits run out | the session stops at the next usage report; [top up](https://www.bithuman.ai/billing#credits) to continue |

## Offline licensing

Offline license is only available to Business and Enterprise clients who want to run realtime avatars completely locally, off the internet — e.g. kiosks, trade shows, ATM machines, embedded screens. Linux and macOS computers (Apple silicon); bought in the console or through sales.

Packs start at 100,000 credits, metered on the machine at the self-hosted rate, with no required reconnection. Which models run offline on which computers, and the setup: [Fully offline](/deploy/offline).

[Contact sales](https://www.bithuman.ai/enterprise?topic=offline#contact) to arrange an offline license.

## What is not billed

- Stopped or disconnected sessions.
- API secrets, SDK installs and model downloads.
- Failed creations and renders (refunded) and failed authentication.

## Next

- [Billing API](/api/billing) · [Rate limits](/api/rate-limits) · [Create your own avatar](/build/create-avatar)
