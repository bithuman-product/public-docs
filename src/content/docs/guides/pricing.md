---
title: "Pricing & credits"
description: "How bitHuman bills — credits per active minute by model and surface, the free tier, plans, and how to check your balance."
section: guides
group: "Pricing"
order: 30
---

## How billing works

bitHuman bills in **credits** consumed per **active minute** of avatar runtime. Audio-only mode (the Swift SDK without an attached avatar) is unmetered. Plans top up credits monthly; overage is pay-as-you-go.

Grab a free dev key at [bithuman.ai → Developer](https://www.bithuman.ai/#developer) — it lands in your inbox in seconds with the free tier attached.

## Credits per minute by surface and model

| Surface | Model | Cost | Notes |
|---|---|---|---|
| **bitHuman Cloud** | Essence 1 | 2 cr/min | CPU rendering on bitHuman's servers |
| **bitHuman Cloud** | Essence 2 Quality | 8 cr/min | Highest-fidelity GPU rendering |
| **bitHuman Cloud** | Essence 2 Light | 4 cr/min | Cost-effective tier (gpu / cpu / ane) |
| **bitHuman Cloud** | Expression 1 | 4 cr/min | GPU rendering on bitHuman's servers |
| **bitHuman Cloud** | Expression 2 | 4 cr/min | Generative engine (gpu / cpu / ane) |
| **Self-hosted (Python SDK / CLI)** | Essence 1 | 1 cr/min | CPU on your hardware |
| **Self-hosted** | Essence 2 Quality | 4 cr/min | GPU on your hardware |
| **Self-hosted** | Essence 2 Light | 2 cr/min | GPU / CPU / Apple Neural Engine, incl. on-device |
| **Self-hosted (GPU container)** | Expression 1 | 2 cr/min | NVIDIA GPU on your hardware |
| **Self-hosted** | Expression 2 | 2 cr/min | GPU / CPU / Apple Neural Engine |
| **Self-hosted (GPU container)** | Flash | 4 cr/min | NVIDIA GPU rendering tier on your hardware |
| **On-device (Swift SDK)** | Expression | 2 cr/min | Active avatar minutes only |
| **Managed agent — voice chat** | — | 10 cr/min | Cloud conversational agent, no avatar attached |
| **Managed agent — camera chat** | — | 30 cr/min | Cloud conversational agent with camera/vision on |
| **Audio-only (Swift SDK, no avatar)** | — | **Free** | No avatar attached → fully offline, no metering |
| **`BITHUMAN_UNMETERED=1` dev mode** | either | **Free** | Skips auth + heartbeat — dev / parity testing only |
| **Agent generation** | — | 250 cr (one-time) | Per [`.imx`](/concepts/avatars-imx) built from your photo / video |
| **Dynamics generation** | — | 250 cr (one-time) | Per gesture / movement set generated for an agent |
| **Book creation** | — | 250 cr (one-time) | Per illustrated book generated from a prompt |

A "credit minute" is wall-clock time the engine is actively producing frames (on-device, the wall-clock between `chat.start()` and `chat.stop()` with an avatar attached). Idle, paused, or disconnected time isn't billed.

## Free tier

- **99 credits / month** at signup, no credit card required.
- Generates ~50 minutes of cloud Essence or ~25 minutes of cloud Expression.
- Resets monthly. Unused credits don't roll over.

## Plans

| Plan | Monthly | Yearly | Credits / month |
|---|---|---|---|
| **Free** | $0 | — | 99 |
| **Creator** | $20 | $204 | 1,800 |
| **Pro** | $99 | $1,010 | 10,000 |
| **Business** | $299 | $2,990 | 50,000 |
| **Enterprise** | $999 | $9,990 | 250,000 |
| **Custom** | Contact sales | — | Volume / on-prem |

Annual plans bill **12× the monthly credits up front** and save up to ~17% (about two months free on Business and Enterprise; ~15% on Creator and Pro) — choose monthly or annual at checkout. **Custom** covers volume, on-prem / air-gapped deployment, and bespoke SLAs beyond Enterprise: [talk to sales](https://www.bithuman.ai/sales).

Current pricing and your live balance are in the [bitHuman dashboard](https://www.bithuman.ai/#library) — the credit balance is on the top navigation bar.

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

The `minutes_estimate` keys map directly to the two avatar models: `essence_*` = **Essence**, `expression_*` = **Expression** (`cloud` = bitHuman-hosted, `self_hosted` = your hardware). `voice_chat` / `camera_chat` are managed cloud conversational-agent estimates, not avatar models.

## What's NOT billed

- **Source code, SDK installs, documentation** — free.
- **Audio-only Swift SDK use** — voice chat with no avatar attached is unmetered and fully offline.
- **Idle time** — the engine has to be actively producing frames. Stopped or paused sessions don't accrue.
- **Failed auth** — bad keys fail fast and don't burn credits.
- **Model weights** — `.imx` and Expression weight downloads are free; only active runtime minutes count.

## FAQ

### Does the on-device Swift SDK work without an internet connection?

Audio-only mode is fully offline. Avatar mode authenticates once on `chat.start()` and heartbeats once per minute — with a 5-minute offline grace window after the last successful heartbeat. After that, the avatar pauses until connectivity returns.

### What if I run out of credits mid-session?

The current heartbeat finishes, then subsequent heartbeats fail. The Python / Docker engines stop emitting frames; the Swift SDK surfaces a `VoiceChatError.authenticationFailed` and the avatar pauses. Top up credits to resume.

### Can I have multiple concurrent sessions?

Yes. Each session bills independently while it's actively generating frames, and you can run as many as your credit balance supports. Self-hosted deployments are bounded only by your own hardware.

## Next steps

- [Billing API](/api/billing) — credit summaries over REST.
- [Building avatars](/guides/building-avatars) — create an agent to run.
- [Models](/concepts/models) — Essence vs Expression.
- [Essence 2 & Expression 2](/concepts/models-v2) — the second-generation models and their rates.
- [Deploy via LiveKit](/guides/deploy-livekit) — the cloud-metered path.
