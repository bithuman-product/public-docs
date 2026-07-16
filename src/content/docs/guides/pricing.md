---
title: "Pricing & credits"
description: "How bitHuman bills — credits per active minute by model and surface, one-time creation costs, plans and concurrency, offline licensing, and how to check your balance."
section: guides
group: "Pricing"
order: 30
---

## How billing works

bitHuman bills in **credits** consumed per **active minute** of avatar runtime. Audio-only mode (the Swift SDK without an attached avatar) is unmetered. Plans top up credits monthly; overage is pay-as-you-go.

This page is the single source for every billing number on the platform — the model guides and API pages link back here.

Grab a free dev key at [bithuman.ai → Developer](https://www.bithuman.ai/#developer) — it lands in your inbox in seconds with the free tier attached.

## Serving — credits per active minute

| Model | Cloud | Self-hosted |
|---|---|---|
| [Essence 2](/concepts/essence-2) (`essence-2`) | 4 credits/min | 2 credits/min |
| [Essence 2 Max](/concepts/essence-2-max) (`essence-2-max`) | 8 credits/min | 4 credits/min |
| [Expression 2](/concepts/expression-2) (`expression-2`) | 4 credits/min | 2 credits/min |
| Essence 1 (`essence-1`) | 2 credits/min | 1 credit/min |
| Expression 1 (`expression-1`) | 4 credits/min | 2 credits/min |

Self-hosted serving is half the cloud rate across the board, and on-device serving (the Swift SDK) bills at the self-hosted rate. A "credit minute" is wall-clock time the engine is actively producing frames (on-device, the wall-clock between `chat.start()` and `chat.stop()` with an avatar attached) — idle, paused, or disconnected time isn't billed. The second-generation models [launched July 10, 2026](/concepts/models-v2).

Managed conversational agents bill on top of avatar serving:

| Surface | Rate |
|---|---|
| Managed agent — voice chat | 10 credits/min |
| Managed agent — camera chat (vision on) | 30 credits/min |

Two modes are always free: **audio-only** Swift SDK use (no avatar attached — fully offline, no metering) and **`BITHUMAN_UNMETERED=1` dev mode** (skips auth and heartbeat — development and parity testing only, not licensed for production).

## Creation & generation — one-time credits

| Action | Credits (one-time) | Notes |
|---|---|---|
| Agent creation — first generation (`essence-1`, `expression-1`) | 250 | Per [`.imx`](/concepts/avatars-imx) built from your portrait image |
| Agent creation — `essence-2` (combined) | 500 | One charge covers [both Essence 2 models](/api/agents#essence-2--the-combined-creation) — Essence 2 **and** Essence 2 Max, trained on-create from your portrait image; pick the model at launch |
| Agent creation — `expression-2` | 2000 | Fully generative engine trained on-create from your portrait image — its per-identity training costs more to run, priced accordingly |
| Agent creation — `auto` | 500 or 2000 | The platform [classifies your input](/api/agents#auto--let-the-platform-pick-the-model) — a photorealistic person routes to `essence-2` (500), a cartoon / animal / creature to `expression-2` (2000); you're billed the routed model's rate |
| Model add ([`POST /v1/agent/{code}/models`](/api/agents#add-a-model-to-an-existing-agent)) | same per-model rates | Add a model to an existing agent; adding Expression 1 is **free** (instant, nothing trained) |
| Dynamics generation | 250 | Per gesture / movement set generated for an agent |
| Book creation | 250 | Per illustrated book generated from a prompt |

## Talking video — per minute of output

[Talking-video renders](/concepts/talking-video) bill per minute of finished output, **rounded up** (minimum one minute). A failed render is automatically refunded.

| Model | Per minute of output |
|---|---|
| `essence-2` | 4 credits |
| `essence-2-max` | 8 credits |
| `expression-2` | 4 credits |
| `essence-1` | 2 credits |
| `expression-1` | 4 credits |

## Free tier

- **99 credits / month** at signup, no credit card required.
- Good for roughly 50 minutes of cloud Essence 1 serving, or about 25 minutes of the second-generation models.
- Resets monthly. Unused credits don't roll over.

## Plans

| Plan | Monthly | Yearly | Credits / month | Concurrent sessions |
|---|---|---|---|---|
| **Free** | $0 | — | 99 | 1 |
| **Creator** | $20 | $204 | 1,800 | 3 |
| **Pro** | $99 | $1,010 | 10,000 | 10 |
| **Business** | $299 | $2,990 | 50,000 | 50 |
| **Enterprise** | $999 | $9,990 | 250,000 | 200 |
| **Custom** | Contact sales | — | Volume / on-prem | Unlimited |

Annual plans bill **12× the monthly credits up front** and save up to ~17% (about two months free on Business and Enterprise; ~15% on Creator and Pro) — choose monthly or annual at checkout. **Custom** covers volume, on-prem / air-gapped deployment, and bespoke SLAs beyond Enterprise: [talk to sales](https://www.bithuman.ai/sales).

**Concurrent sessions** are a plan entitlement — the number of live avatar sessions your account can run at once. Enforcement is rolling out: when limits apply, a session past your plan's cap is refused with [`403 CONCURRENCY_LIMIT_REACHED`](/api/errors) rather than degrading running sessions. Details in [Rate limits & concurrency](/api/rate-limits).

Current pricing and your live balance are in the [bitHuman dashboard](https://www.bithuman.ai/#library) — the credit balance is on the top navigation bar.

## Offline licensing — coming soon

Self-hosted serving today authenticates online (a once-per-minute billing heartbeat). **Offline licensing** — running models fully disconnected, with no heartbeat — is coming soon, unlocked by tier starting at Pro:

| Offline package | Models | Annual commitment | Offline credits included |
|---|---|---|---|
| Pro | Essence 1 + Expression 1 | from 60,000 credits/yr | 60,000 |
| Business | Essence 2 + Expression 2 | $999/yr | 120,000 |
| Enterprise | adds Essence 2 Max | $1,999/yr | 240,000 |

Offline serving consumes the included credits at half the equivalent cloud rate — Essence 1 at 1 credit/min and Expression 1 at 2; Essence 2 and Expression 2 at 2; Essence 2 Max at 4. Entitlements are delivered as **per-device, per-model signed credit bundles**: minted once while the device is online, then valid with no further connectivity until the credits are consumed. These packages are separate from the monthly plans above. [Talk to sales](https://www.bithuman.ai/sales) to get on the early-access list.

## Top-up credits

Need more before your next reset? Top up any time at **$1 = 100 credits**. Top-up credits **never expire** — only plan credits reset at the end of each billing period (unused plan credits don't roll over). Top-ups stack on your plan balance and are spent after plan credits.

## Metered vs unmetered

| Mode | What it means | Auth |
|---|---|---|
| **Metered (default)** | Your `BITHUMAN_API_SECRET` exchanges for a runtime token; a heartbeat fires once per minute while frames are flowing. Both cloud and self-hosted run this way. | `BITHUMAN_API_SECRET` (server) / `BITHUMAN_API_KEY` (Swift) |
| **Unmetered dev mode** | `BITHUMAN_UNMETERED=1` skips auth + heartbeat entirely. For local dev, CI, and parity work — not licensed for production. | none |
| **Audio-only** | Swift SDK with no avatar config attached. Fully offline, never reaches the auth endpoint. | none |

The CLI, Python SDK, and Docker container all honour `BITHUMAN_UNMETERED=1`. The Swift SDK has the same escape hatch via its unmetered initializer.

## How metering works

### Server-side surfaces (cloud, self-hosted Python, self-hosted GPU)

The Python SDK and Docker container exchange a `BITHUMAN_API_SECRET` for a short-lived runtime token, then heartbeat back to `api.bithuman.ai` once per minute while the engine is generating frames. Each heartbeat increments your usage counter.

### On-device surface (Swift SDK)

The Swift SDK requests a runtime token once on `chat.start()` (sync — bad keys fail fast with `VoiceChatError.authenticationFailed`), then heartbeats once per minute while the avatar is attached. Audio-only mode doesn't authenticate or heartbeat at all. If the device loses connectivity mid-session, the SDK has a **5-minute offline grace period** before it surfaces a billing error and pauses the avatar.

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

The `minutes_estimate` keys map directly to the two avatar model families: `essence_*` = **Essence**, `expression_*` = **Expression** (`cloud` = bitHuman-hosted, `self_hosted` = your hardware). `voice_chat` / `camera_chat` are managed cloud conversational-agent estimates, not avatar models.

## What's NOT billed

- **Source code, SDK installs, documentation** — free.
- **Audio-only Swift SDK use** — voice chat with no avatar attached is unmetered and fully offline.
- **Idle time** — the engine has to be actively producing frames. Stopped or paused sessions don't accrue.
- **Failed auth** — bad keys fail fast and don't burn credits.
- **Failed creations and renders** — automatically refunded.
- **Model weights** — `.imx` and Expression weight downloads are free; only active runtime minutes count.

## FAQ

### Does the on-device Swift SDK work without an internet connection?

Audio-only mode is fully offline. Avatar mode authenticates once on `chat.start()` and heartbeats once per minute — with a 5-minute offline grace window after the last successful heartbeat. After that, the avatar pauses until connectivity returns. For fully disconnected deployments, see [Offline licensing](#offline-licensing--coming-soon).

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
