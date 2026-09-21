---
title: "Pricing & credits"
description: "How bitHuman bills — credits per active minute by model and surface, one-time creation costs, plans and concurrency, offline licensing, and how to check your balance."
section: guides
group: "Pricing"
order: 30
---

## How billing works

bitHuman bills in **credits** consumed per **live minute** of avatar runtime — every minute a session is connected and the engine is rendering, whether the avatar is speaking or idling. Audio-only mode (the Swift SDK without an attached avatar) is unmetered. On-device rails — Swift and Android/Kotlin alike — bill at the self-hosted rate; see [on-device surfaces](#on-device-surfaces-swift-and-androidkotlin). Plans top up credits monthly; overage is pay-as-you-go.

This page is the single source for every billing number on the platform — the model guides and API pages link back here.

Grab a free dev key at [bithuman.ai → Developer](https://www.bithuman.ai/developer/api-keys) — it lands in your inbox in seconds with the free tier attached.

## Serving — credits per live minute

| Model | Cloud | Self-hosted |
|---|---|---|
| [Essence 2](/concepts/essence-2) (`essence-2`) | 4 credits/min | 2 credits/min |
| [Expression 2](/concepts/expression-2) (`expression-2`) | 4 credits/min | 2 credits/min |
| [Essence 1](/concepts/essence-1) (`essence-1`) | 2 credits/min | 1 credit/min |
| [Expression 1](/concepts/expression-1) (`expression-1`) | 4 credits/min | 2 credits/min |

Self-hosted serving is half the cloud rate across the board, and on-device serving — the Swift SDK and the Android/Kotlin SDK alike — bills at the self-hosted rate. A "credit minute" is wall-clock time a session is live and the engine is rendering (on-device, the wall-clock between `chat.start()` and `chat.stop()` with an avatar attached). **That includes idle/silent animation** — a connected avatar looping its idle motion is rendering, and accrues. Only stopped, paused, or disconnected sessions stop accruing. An offline `bithuman render` bills the duration of the clip it writes, at the self-hosted rate. The second-generation models [launched July 10, 2026](/concepts/models-v2).

Managed conversational agents bill on top of avatar serving:

| Surface | Rate |
|---|---|
| Managed agent — voice chat | 10 credits/min |
| Managed agent — camera chat (vision on) | 30 credits/min |

One mode is always free: **audio-only** Swift SDK use — no avatar attached, fully offline, no metering. `BITHUMAN_UNMETERED=1` is a development-only variable, never licensed for production, and it is now gone from the shipping surfaces: the CLI ignores it entirely from 2.6.20, the public Python wheels refuse a render with no credential whether or not it is set, and the Android Essence 2 SDK no longer carries the name at all from 0.5.7.

## Creation & generation — one-time credits

| Action | Credits (one-time) | Notes |
|---|---|---|
| Agent creation — first generation (`essence-1`, `expression-1`) | 250 | Per [`.imx`](/concepts/avatars-imx) built from your portrait image |
| Agent creation — `essence-2` | 500 | Trained on-create from your portrait image — see [the Essence 2 creation](/api/agents#essence-2--the-photorealistic-creation) |
| Agent creation — `expression-2` | 2000 | Fully generative engine trained on-create from your portrait image — its per-identity training costs more to run, priced accordingly |
| Agent creation — `auto` | 500 or 2000 | The platform [classifies your input](/api/agents#auto--let-the-platform-pick-the-model) — a photorealistic person routes to `essence-2` (500), a cartoon / animal / creature to `expression-2` (2000); you're billed the routed model's rate |
| Model add ([`POST /v1/agent/{code}/models`](/api/agents#add-a-model-to-an-existing-agent)) | same per-model rates | Add a model to an existing agent; adding Expression 1 is **free** (instant, nothing trained) |
| Dynamics generation | 250 | Per gesture / movement set generated for an agent |
| Book creation | 250 | Per illustrated book generated from a prompt |

Every number in this table is larger than a whole free month — a free account
cannot create an agent of any model. See
[the free tier](#the-free-tier-cannot-create-an-agent) for the arithmetic and
the two ways past it.

Reading this schedule from code? [`GET /v1/pricing`](/api/billing#get-the-pricing-schedule)
returns the same per-model map as `data.agent_generation.by_model`, and
advertises `auto` at its **2000**-credit ceiling so an estimate is never lower
than the debit (the charge is still the routed model's rate, 500 or 2000).

## Talking video — per minute of output

[Talking-video renders](/concepts/talking-video) bill per minute of finished output, **rounded up** (minimum one minute). A failed render is automatically refunded.


| Model | Per minute of output |
|---|---|
| `essence-2` | 4 credits |
| `expression-2` | 4 credits |
| `essence-1` | 2 credits |
| `expression-1` | 4 credits |

## Free tier

- **99 credits / month** at signup, no credit card required.
- Resets monthly. Unused credits don't roll over.

### The free tier cannot create an agent

99 credits is less than the cheapest creation, so **no creation fits inside a
free month** — the arithmetic, against the
[creation table above](#creation--generation--one-time-credits):

| Create this | One-time cost | Against 99 free credits |
|---|---|---|
| Essence 1 / Expression 1 agent | 250 credits | 151 credits short |
| `essence-2` agent | 500 credits | 401 credits short |
| `expression-2` agent | 2000 credits | 1,901 credits short |
| `auto` (platform picks the model) | 500 or 2000 credits | 401 or 1,901 credits short |

A creation you cannot pay for is refused with
[`402 INSUFFICIENT_BALANCE`](/api/errors) and no agent is made. Two ways past
it, and nothing else: [top up](#top-up-credits) at **$1 = 100 credits**, or move
to a paid [plan](#plans) — the smallest, Creator at $20/month, carries 1,800
credits, which covers one `essence-2` creation with 1,300 credits left to serve
it.

### What 99 credits does cover

Serving an agent that already exists, at the
[rates above](#serving--credits-per-live-minute):

- **49 minutes** of cloud Essence 1 (99 ÷ 2 credits/min), or **24 minutes** of
  cloud Essence 2 / Expression 2 (99 ÷ 4 credits/min).
- **99 minutes** of self-hosted or on-device Essence 1 (99 ÷ 1), or **49
  minutes** of self-hosted Essence 2 / Expression 2 (99 ÷ 2).

Free API secrets themselves, SDK installs and model downloads cost nothing —
see [What's NOT billed](#whats-not-billed).

## Plans

| Plan | Monthly | Yearly | Credits / month | Concurrent sessions |
|---|---|---|---|---|
| **Free** | $0 | — | 99 | 1 |
| **Creator** | $20 | $204 | 1,800 | 3 |
| **Pro** | $99 | $1,010 | 10,000 | 10 |
| **Business** | $299 | $2,990 | 50,000 | 50 |
| **Enterprise** | $999 | $9,990 | 250,000 | 200 |
| **Custom** | Contact sales | — | Volume / on-prem | Unlimited |

Annual plans bill **12× the monthly credits up front** and save up to ~17% (about two months free on Business and Enterprise; ~15% on Creator and Pro) — choose monthly or annual at checkout. **Custom** covers volume, on-prem deployment, and bespoke SLAs beyond Enterprise (running with no billing heartbeat is [offline licensing — coming soon](#offline-licensing--coming-soon), for Business and Enterprise only): [talk to sales](https://www.bithuman.ai/sales).

**Concurrent sessions** are a plan entitlement — the number of live avatar sessions your account can run at once. Enforcement is rolling out: when limits apply, a session past your plan's cap is refused with [`403 CONCURRENCY_LIMIT_REACHED`](/api/errors) rather than degrading running sessions. Details in [Rate limits & concurrency](/api/rate-limits).

Current pricing and your live balance are in the [bitHuman dashboard](https://www.bithuman.ai/#library) — the credit balance is on the top navigation bar.

## Offline licensing — coming soon

Self-hosted serving today authenticates online (a once-per-minute billing heartbeat). **Offline licensing** — running a model without that heartbeat, for trade-show stands and venues with poor connectivity — is coming soon, and it is **for Business and Enterprise customers only**. No other plan qualifies: Free, Creator and Pro cannot buy it.

It stays **credit-based**. An offline licence is not a separate subscription with its own price list — it spends the same credits as everything else on this page, metered by the engine on your own machine instead of over the internet.

| | |
|---|---|
| **Who can buy** | **Business and Enterprise only** |
| **Models covered** | The same families your plan entitles online — Essence 1, Expression 1, Essence 2 and Expression 2 |
| **Minimum per licence** | **100,000 credits** — a smaller bundle is refused |
| **Maximum per licence** | **No upper limit** — there is no maximum bundle size |
| **Rate while offline** | The self-hosted rate above: Essence 1 at 1 credit/min; Expression 1, Essence 2 and Expression 2 at 2 |
| **Term** | **One year** from the day the licence is minted, plus a short grace period |
| **What ends a licence** | Its credits running out, or its year running out — whichever comes first |
| **Unspent credits** | **Not returned.** Credits still on a licence when its year ends are forfeited, so size the bundle to what you will actually render in a year |
| **Scope** | One device, one model per licence |

Licences are delivered as **per-device, per-model signed credit bundles**: minted once while the device is online, then valid with no further connectivity until the credits are consumed. A self-serve licence carries a required periodic check-in that reports what it has spent — every 6 hours on a device identified by fingerprint, every 3 days on one with a verified hardware key — so it is *heartbeat-free*, not *air-gapped*. Fully air-gapped licences, which never check in at all, are arranged directly with us. [Talk to sales](https://www.bithuman.ai/sales) to get on the early-access list.

## Top-up credits

Need more before your next reset? Top up any time at **$1 = 100 credits**. Top-up credits **never expire** — only plan credits reset at the end of each billing period (unused plan credits don't roll over). Top-ups stack on your plan balance and are spent after plan credits.

## Metered vs unmetered

| Mode | What it means | Auth |
|---|---|---|
| **Metered (default)** | Your `BITHUMAN_API_SECRET` exchanges for a runtime token; a heartbeat fires once per minute while frames are flowing. Both cloud and self-hosted run this way. | `BITHUMAN_API_SECRET` (server, Android, CLI, REST) / `BITHUMAN_API_KEY` (Swift only) |
| **Unmetered dev mode** | `BITHUMAN_UNMETERED=1` is a development-only variable that no shipping surface honours: the CLI ignores it from 2.6.20, the public Python wheels refuse a credential-less render with it set, and the Android Essence 2 SDK no longer contains the name at all from 0.5.7 | none, where it still applies |
| **Audio-only** | Swift SDK with no avatar config attached. Fully offline, never reaches the auth endpoint. | none |

Do not build on `BITHUMAN_UNMETERED=1`: every render is billed to an account, and a key is free to obtain.

## How metering works

### Server-side surfaces (cloud, self-hosted Python, self-hosted GPU)

The Python SDK and Docker container exchange a `BITHUMAN_API_SECRET` for a short-lived runtime token, then heartbeat back to `api.bithuman.ai` once per minute for as long as the session is live. Each heartbeat increments your usage counter. **Silence does not pause the meter** — an idling avatar is still rendering frames, and is billed at the same rate as a speaking one.

### On-device surfaces (Swift and Android/Kotlin)

Both mobile rails bill a live avatar at the **self-hosted rate** in the table above, on the same wall-clock rule: a session that is rendering accrues, idle animation included.

**Swift.** The SDK requests a runtime token once on `chat.start()` (sync — bad keys fail fast with `VoiceChatError.authenticationFailed`), then heartbeats once per minute while the avatar is attached. Audio-only mode doesn't authenticate or heartbeat at all. If the device loses connectivity mid-session, the SDK has a **5-minute offline grace period** before it surfaces a billing error and pauses the avatar. The env var on this rail is `BITHUMAN_API_KEY`, not `BITHUMAN_API_SECRET`.

**Android / Kotlin.** `ai.bithuman:essence2-android` meters from **0.5.1** and no earlier version — 0.4.0 does not meter at all, and 0.5.0 renders a rejected key for ever. Set `Essence2Metering.apiSecret`, or the `BITHUMAN_API_SECRET` environment variable, to the account the session bills to. Through **0.5.6** a session with no credential still rendered, logging `★ UNMETERED RENDER`; **0.5.7 removes that banner and the `BITHUMAN_UNMETERED` variable with it** — read from the published AAR, both appear twice in 0.5.6 and not at all in 0.5.7. `ai.bithuman:sdk` (essence-1) is stricter — `Avatar.load` throws without a secret. Both follow the same failure rule as every other runtime: a metering service that cannot be reached never stops a render, while a **rejected** key gets a 300-second grace and then ends the session. The measured detail is on the [Android SDK page](/sdk/android#troubleshooting).

Which SDK pulls the model onto the handset, and which handsets are supported at all, is on [getting an avatar model onto a phone](/sdk).

## Check your balance

```bash
curl https://api.bithuman.ai/v2/credit-summaries \
  -H "api-secret: $BITHUMAN_API_SECRET"
```

Response:

```json
{
  "success": true,
  "data": {
    "user_id": "1f09e2f0-bffd-4201-a3e7-e98a9e432e67",
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

There is one key per **model and hosting mode** — `<model>_cloud` and
`<model>_self_hosted`, each the balance divided by that mode's rate from the
[serving table above](#serving--credits-per-live-minute). `voice_chat` /
`camera_chat` are managed cloud conversational-agent estimates, not avatar
models.

> **`essence_*` / `expression_*` without a version are the **first-generation** models**
>
> `essence_cloud`, `essence_self_hosted`, `expression_cloud` and
> `expression_self_hosted` predate the second-generation launch and are kept as
> aliases for Essence 1 / Expression 1. **They are not the Essence 2 rate.** If
> you serve Essence 2 and read `essence_cloud`, you will over-estimate your
> remaining minutes by 2x — read `essence_2_cloud` instead.

## What's NOT billed

- **Source code, SDK installs, documentation** — free.
- **Audio-only Swift SDK use** — voice chat with no avatar attached is unmetered and fully offline.
- **Stopped, paused, or disconnected sessions** — accrual stops as soon as the session ends. (Note: a *live* session that is silent still accrues — idle animation is rendering. See [What counts as a billable minute](#how-metering-works).)
- **Failed auth** — bad keys fail fast and don't burn credits.
- **Failed creations and renders** — automatically refunded.
- **Model weights** — `.imx` and Expression weight downloads are free; only active runtime minutes count. Each download is still *recorded*: it writes one usage row at **0 credits** and returns its id in the `X-Bithuman-Meter-Id` response header, so a 0-credit line in [your usage](/api/reference#operation/getUsage) next to a download is the record, not a charge.

## FAQ

### Does the on-device Swift SDK work without an internet connection?

Audio-only mode is fully offline. Avatar mode authenticates once on `chat.start()` and heartbeats once per minute — with a 5-minute offline grace window after the last successful heartbeat. After that, the avatar pauses until connectivity returns. For deployments that cannot hold a per-minute connection, see [Offline licensing](#offline-licensing--coming-soon) — Business and Enterprise only, from 100,000 credits.

### What if I run out of credits mid-session?

The current heartbeat finishes, then subsequent heartbeats fail. The Python / Docker engines stop emitting frames; the Swift SDK surfaces a `VoiceChatError.authenticationFailed` and the avatar pauses. Top up credits to resume.

### Can I have multiple concurrent sessions?

Yes. Each session bills independently while it's actively generating frames. Your plan sets the concurrent-session entitlement — see the [plans table](#plans) (enforcement is rolling out). Self-hosted deployments are additionally bounded by your own hardware.

## Next steps

- [Billing API](/api/billing) — credit summaries over REST.
- [Building avatars](/guides/building-avatars) — create an agent to run.
- [Essence 2 & Expression 2](/concepts/models-v2) — the second-generation models and how to choose.
- [Rate limits & concurrency](/api/rate-limits) — request limits and the concurrency contract.
- [Deploy via LiveKit](/guides/deploy-livekit) — the cloud-metered path.
