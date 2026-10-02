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

Credits pay for the time an avatar session is running, talking or idle, billed by the exact second. Every platform (cloud, self-hosted and on-device) bills the same way, against your [API secret](/start/api-secret). This page is the one source for every price; other pages link here. To estimate a month or an app, use the [estimate](/pricing/estimate); your balance is on the [Billing API](/api/billing#check-credit-balance).

## Serving — credits per live minute

The table and the billing rule under it are generated from [`GET /v1/pricing`](/api/billing#get-the-pricing-schedule) (`data.realtime`).

<!-- PRICING:REALTIME -->
| Model | Cloud | Self-hosted and on-device |
|---|---|---|
| [Essence 2](/models/essence-2) (`essence-2`) | 4 credits/min | 2 credits/min |
| [Expression 2](/models/expression-2) (`expression-2`) | 4 credits/min | 2 credits/min |
| [Essence 1](/models/first-generation#essence-1) (`essence-1`) | 2 credits/min | 1 credit/min |
| [Expression 1](/models/first-generation#expression-1) (`expression-1`) | 4 credits/min | — |

A managed conversational agent bills ONE all-inclusive rate: it covers the avatar, whether it renders in the bitHuman cloud or in the viewer's browser.

| Surface | Rate |
|---|---|
| Managed agent — voice chat (all-inclusive) | 10 credits/min |
| Managed agent — camera on (vision chat; replaces the chat rate) | 30 credits/min |

An avatar-only session (your own agent through the plugin or the API) that renders in the viewer's browser bills the model's **self-hosted** rate above. Inside a managed agent's chat the all-inclusive rate covers it.

How live sessions are billed: active session time, talking or idle: exact seconds x rate / 60, rounded down per session with the remainder carried to your next session; no minimum.
<!-- /PRICING:REALTIME -->

A session bills while it is **running**, whether the avatar is talking or idle, to the exact second: seconds × rate ÷ 60, rounded down per session, with the fraction carried to your next session. A stopped or disconnected session accrues nothing. File rendering (`bithuman render`, or `render()` in the Python SDK) bills the duration of the video it writes, at the self-hosted rate.

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
| Generate gestures (dynamics) | 250 |

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

From **2026-10-12** (00:00 UTC), API and SDK use requires the Creator plan or higher; a Free account's API secret is then refused with `403 PLAN_REQUIRED`. Free accounts cannot create agents or buy credit top-ups.

A Free account with top-up credits bought before 2026-09-27 keeps API and SDK access until those credits are spent; until the cutoff its `plan_notice` reads: "Free-plan API and SDK access ends on 2026-10-12; this account keeps it until the top-up credits it bought before 2026-09-27 are spent. Upgrade at https://www.bithuman.ai/pricing to keep it after that." Every response and its fix: [Plan and credit refusals](/api/errors#plan-and-credit-refusals). [Choose a plan](https://www.bithuman.ai/pricing?from=docs).

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

- **Models:** Essence 1 on Linux (x86_64 and ARM64, bitHuman 2.11.16 or later) and on macOS with Apple silicon (2.11.17 or later); Essence 2 and Expression 2 on Linux x86_64 (2.11.17 or later), through the Python package, and on Linux through the bitHuman CLI (2.8.4 or later) too, available now: buy a pack in the console, then run `python -m bithuman pack redeem` once on the machine ([how](/deploy/offline#first-command)). Essence 2 and Expression 2 on other platforms come later.
- **Credit-based:** from 100,000 credits, metered on the machine at the self-hosted rate, with no required reconnection.
- **Creation is online:** you create the avatar from a portrait in the bitHuman cloud; the finished avatar model then runs on your machines.
- **Not for phones:** the Swift package and the Android SDK stay online.
- **File rendering:** `bithuman render` signs in online and needs no offline license; with an installed pack that covers the avatar, it renders with no network and spends the pack.

[Contact sales](https://www.bithuman.ai/enterprise?topic=offline#contact) to arrange an offline license. Where it runs and what it covers: [Fully offline](/deploy/offline).

## What is not billed

- Stopped or disconnected sessions.
- API secrets, SDK installs and model downloads.
- Failed creations and renders (refunded) and failed authentication.

## Next

- [Billing API](/api/billing) · [Rate limits](/api/rate-limits) · [Create your own avatar](/build/create-avatar)
