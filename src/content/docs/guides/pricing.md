---
title: "Pricing & credits"
description: "How bitHuman bills — credits per active minute by model and surface, one-time creation costs, plans and concurrency, offline licensing, and how to check your balance."
section: guides
group: "Pricing"
order: 30
---

## How billing works

bitHuman bills in **credits** consumed per **minute of active talking** — the minutes in which the avatar is actually speaking. **Idle time is free**: a session that is connected but not talking, or a runtime left loaded between utterances, costs nothing. You are billed for output, not for uptime. Audio-only mode (the Swift SDK without an attached avatar) is unmetered. On-device rails — Swift and Android/Kotlin alike — bill at the self-hosted rate; see [on-device surfaces](#on-device-surfaces-swift-and-androidkotlin). Plans top up credits monthly; overage is pay-as-you-go.

This page is the single source for every billing number on the platform — the model guides and API pages link back here.

Grab a free dev key at [bithuman.ai → Developer](https://www.bithuman.ai/developer/api-keys) — it lands in your inbox in seconds with the free tier attached.

## Serving — credits per live minute

| Model | Cloud | Self-hosted |
|---|---|---|
| [Essence 2](/concepts/essence-2) (`essence-2`) | 4 credits/min | 2 credits/min |
| [Expression 2](/concepts/expression-2) (`expression-2`) | 4 credits/min | 2 credits/min |
| [Essence 1](/concepts/essence-1) (`essence-1`) | 2 credits/min | 1 credit/min |
| [Expression 1](/concepts/expression-1) (`expression-1`) | 4 credits/min | 2 credits/min |

Self-hosted serving is half the cloud rate across the board, and on-device serving — the Swift SDK and the Android/Kotlin SDK alike — bills at the self-hosted rate. A "credit minute" is a minute in which the avatar is **actually talking** (on-device, the talking minutes between `chat.start()` and `chat.stop()`). **Idle animation is free** — a connected avatar looping its idle motion accrues nothing, and neither does a runtime left loaded between utterances. An offline `bithuman render` bills the duration of the clip it writes, at the self-hosted rate. The second-generation models [launched July 10, 2026](/concepts/models).

Managed conversational agents bill on top of avatar serving:

| Surface | Rate |
|---|---|
| Managed agent — voice chat | 10 credits/min |
| Managed agent — camera chat (vision on) | 30 credits/min |

One mode is always free: **audio-only** Swift SDK use — no avatar attached, fully offline, no metering.

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

[Talking-video renders](/api/video) bill per minute of finished output, **rounded up** (minimum one minute). A failed render is automatically refunded.


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

Annual plans bill **12× the monthly credits up front** and save up to ~17% (about two months free on Business and Enterprise; ~15% on Creator and Pro) — choose monthly or annual at checkout. **Custom** covers volume, on-prem deployment, and bespoke SLAs beyond Enterprise (running completely off the internet is [offline licensing](#offline-licensing), for Business and Enterprise only): [talk to sales](https://www.bithuman.ai/sales).

**Concurrent sessions** are a plan entitlement — the number of live cloud avatar sessions your account can run at once. Self-hosted and on-device sessions are gated only by credits. Enforcement is rolling out: when limits apply, a session past your plan's cap is refused with [`403 CONCURRENCY_LIMIT_REACHED`](/api/errors) rather than degrading running sessions. Details in [Rate limits & concurrency](/api/rate-limits).

Current pricing and your live balance are in the [bitHuman dashboard](https://www.bithuman.ai/#library) — the credit balance is on the top navigation bar.

## Offline licensing

Offline licensing is available only to **Business and Enterprise** clients who
want to run realtime avatars completely locally, off the internet — kiosks,
trade shows, ATM machines, embedded screens.

- **Credit-based.** It spends the same credits as everything else on this page,
  metered locally by the engine, in compiled code, at the self-hosted rate.
- **From 100,000 credits** per licence.
- **No time limit, and no required reconnection** while the device is offline.
- **Not for phones.** Mobile offline is not offered; the Apple and Android SDKs
  stay on the online path.

Online sessions — every other self-hosted or on-device session — authenticate
over the internet and keep a **5-minute grace** if the connection drops.

Offline licences are arranged through sales, not self-serve:
[contact sales](https://www.bithuman.ai/sales).

## Top-up credits

Need more before your next reset? Top up any time at **$1 = 100 credits**. Top-up credits **never expire** — only plan credits reset at the end of each billing period (unused plan credits don't roll over). Top-ups stack on your plan balance and are spent after plan credits.

## Metered vs unmetered

| Mode | What it means | Auth |
|---|---|---|
| **Metered (default)** | Your `BITHUMAN_API_SECRET` exchanges for a runtime token; a heartbeat fires once per minute while frames are flowing. Both cloud and self-hosted run this way. | your API secret — `BITHUMAN_API_SECRET` on every surface (`be_essence2_set_api_secret` / `Essence2Metering.apiSecret` / `bitHumanKit` `config.apiKey` on device) |
| **Audio-only** | Swift SDK with no avatar config attached. Fully offline, never reaches the auth endpoint. | none |

Every avatar session is metered.

## How metering works

### Server-side surfaces (cloud, self-hosted Python, self-hosted GPU)

The Python SDK and Docker container exchange a `BITHUMAN_API_SECRET` for a short-lived runtime token, then heartbeat back to `api.bithuman.ai` once per minute for as long as the session is live. Usage is counted on the rule in [Serving](#serving--credits-per-live-minute): talking minutes accrue, idle animation does not.

### On-device surfaces (Swift and Android/Kotlin)

Both mobile rails bill a live avatar at the **self-hosted rate** in the table above, on the same rule as every other surface: talking minutes accrue, idle animation does not.

**Swift.** The SDK requests a runtime token once on `chat.start()` (sync — a bad API secret fails fast with `VoiceChatError.authenticationFailed`), then heartbeats once per minute while the avatar is attached. Audio-only mode doesn't authenticate or heartbeat at all. If the device loses connectivity mid-session, the SDK has a **5-minute offline grace period** before it surfaces a billing error and pauses the avatar. On this rail (`bitHumanKit`) your API secret goes in `config.apiKey`; read it from `BITHUMAN_API_SECRET` like every other surface.

**Android / Kotlin.** `ai.bithuman:essence2-android` meters every session: set `Essence2Metering.apiSecret`, or the `BITHUMAN_API_SECRET` environment variable, to the account the session bills to. A metering service that cannot be reached never stops a render; a **rejected** API secret gets a 300-second grace and then ends the session. Details are on the [Android SDK page](/sdk/android#authenticate).

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
- **Idle, silent, stopped, paused or disconnected sessions** — none of them accrue. Only talking does. See [What counts as a billable minute](#how-metering-works).
- **Failed auth** — a bad API secret fails fast and doesn't burn credits.
- **Failed creations and renders** — automatically refunded.
- **Model weights** — `.imx` and Expression weight downloads are free; only active runtime minutes count. Each download is still *recorded*: it writes one usage row at **0 credits** and returns its id in the `X-Bithuman-Meter-Id` response header, so a 0-credit line in [your usage](/api/reference#operation/getUsage) next to a download is the record, not a charge.

## FAQ

### Does the on-device Swift SDK work without an internet connection?

Audio-only mode is fully offline. Avatar mode authenticates once on `chat.start()` and heartbeats once per minute, with a 5-minute grace window after the last successful heartbeat; after that the avatar pauses until connectivity returns. Mobile offline is not offered — see [offline licensing](#offline-licensing).

### What if I run out of credits mid-session?

The current heartbeat finishes, then subsequent heartbeats fail. The Python / Docker engines stop emitting frames; the Swift SDK surfaces a `VoiceChatError.authenticationFailed` and the avatar pauses. Top up credits to resume.

### Can I have multiple concurrent sessions?

Yes. Each session bills its own talking minutes. Your plan sets the cloud concurrent-session entitlement — see the [plans table](#plans) (enforcement is rolling out). Self-hosted sessions are gated only by credits, and bounded by your own hardware.

## Next steps

- [Billing API](/api/billing) — credit summaries over REST.
- [Building avatars](/guides/building-avatars) — create an agent to run.
- [Essence 2 & Expression 2](/concepts/models) — the second-generation models and how to choose.
- [Rate limits & concurrency](/api/rate-limits) — request limits and the concurrency contract.
- [Deploy via LiveKit](/sdk/livekit) — the cloud-metered path.
