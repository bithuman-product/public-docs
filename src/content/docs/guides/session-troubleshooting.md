---
title: "Session behavior & troubleshooting"
description: "What to expect from a live avatar session — connect latency, warm vs overflow capacity, idle vs speaking behavior — and how to diagnose the common errors."
section: guides
group: "Deploy"
order: 13
label: "Sessions & troubleshooting"
---

## Connect latency: what's normal

When a session starts, the platform routes it to the best available serving
capacity for the agent's [model](/concepts/models-v2). Two things determine
how fast the avatar appears:

**1. Warm first line vs elastic overflow.** Every cloud model tier has an
always-warm **first line** of dedicated capacity; when it is full (or a direct
elastic tier is requested), sessions land on **cloud GPU workers that scale
from zero**. A scale-from-zero worker has to cold-start for the first session
it serves — expect a noticeably longer connect (tens of seconds) in that case,
and normal connects once capacity is warm. The platform pre-warms overflow
capacity while a session connects to soften this edge.

**2. First session on a fresh agent.** A newly created agent's identity
artifact (its per-identity model or bundle) is provisioned onto serving
capacity **on demand at first dispatch**. The first session after creation can
therefore take extra time while the artifact downloads to the worker;
subsequent sessions reuse it. If a launch fails on a brand-new agent, wait a
moment and retry — provisioning completes in the background.

If sessions consistently fail to connect, check the live platform status at
[status.bithuman.ai](https://status.bithuman.ai).

## Idle vs speaking: what you should see

The second-generation models separate **idle** (no speech) from **speaking**
behavior deliberately:

- **Expression 2** — during silence the avatar plays a **real-footage idle
  clip** derived from the identity (as of 2026-07-02, baked into every
  creation). The clip loops **forward-only** — never in reverse. When the
  agent speaks, generated frames take over on the first rendered frame; the
  first talking frame lands roughly **1.6 seconds** after speech audio begins
  (the engine renders in fixed audio chunks), which the moving idle footage
  masks. Brief pauses inside a sentence do **not** flip the avatar back to
  idle. See [Expression 2 › idle](/concepts/expression-2#idle-and-speaking-behavior).
- **Essence 2 Light / Quality** — the avatar animates the identity's real
  source footage; for Light, the base video loops **forward-only on every
  tier** (as of 2026-07-02), wrapping from last frame to first, while idle
  *and* while speaking. See [Essence 2 Light › idle](/concepts/essence-2-light#idle-and-speaking-behavior).

So: an avatar that keeps gently moving during silence is **working as
designed** — that is the idle loop, and it is not billed differently. What you
should *not* see is frozen frames or reversed-looking motion; if you do,
report it with the agent code and timestamp.

## Common errors

### Creation (`POST /v1/agent/generate`)

| Symptom | Cause | Fix |
|---|---|---|
| `400 VALIDATION_ERROR` — `Invalid model '<x>'; must be one of: …` | Unknown or retired `model` value. The error lists the accepted names. | Use one of `essence-1`, `essence-2-quality`, `essence-2-light`, `expression-1`, `expression-2` (or the bare `essence` / `expression` shorthands). No credits are charged. |
| `402 INSUFFICIENT_BALANCE` | Creation costs 250 credits. | Top up, then retry. |
| Status `failed` with `error_message` | A pipeline step failed — the message names it (e.g. a voice or image step failure). | Failed creations are terminal for that `agent_id` and the 250 creation credits are **automatically refunded**; fix the input and create again. |
| `essence-2-quality` creation fails at the model step | The tier prepares its identity from **real footage**, and no source video was available. | Provide `video` in the generate request. See [Essence 2 Quality](/concepts/essence-2-quality#how-creation-works). |
| Polling seems stuck at `current_step: "lip_sync"` | For `expression-2` and `essence-2-light` this is the **model training/distillation step** — the longest part of creation (tens of minutes; see each model's guide). | Keep polling. Don't apply a 5-minute client timeout to v2 model creation. |

### Live sessions

| Symptom | Cause | Fix |
|---|---|---|
| Agent won't launch right after creation | Status isn't `ready` yet, or the identity artifact is still provisioning to serving capacity. | Poll [`GET /v1/agent/status/{agent_id}`](/api/agents#poll-status) until `ready`; on the very first session, retry after a short wait. |
| `409 MODEL_NOT_GENERATED` — `agent <code>'s <model> model hasn't been generated yet` | You requested `expression-2` / `essence-2-light` (via the embed-token `model` field or [talking video](/api/video)) for an agent whose trained per-identity model doesn't exist. | Check the agent's `supported_models` (returned on status / get / list and the embed-token response), or create the agent with that model. `essence-2-quality` is never gated — it prepares on demand. |
| Session ends immediately with `avatar_error: "model_not_generated"` | A `?model=` URL override targeted a not-yet-generated v2 model — the session disconnects cleanly instead of hanging through dispatch retries. | Same fix as the 409 above; prefer validating via the embed-token `model` field, which rejects up front. |
| `404 NOT_FOUND` — `No active rooms found for agent <code>` on `/speak` or `/add-context` | These endpoints target an agent with an **active session**. | Start a session first (embed, viewer, or LiveKit), then call them. |
| `?model=` tier pin appears ignored | Unrecognized tier slugs **fall back silently** to the agent's default routing. | Check the slug against the model's guide ([Expression 2](/concepts/expression-2#serving-tiers), [Essence 2 Light](/concepts/essence-2-light#serving-tiers)); for production, omit `?model=`. |
| No microphone prompt in the embed | The parent page's `Permissions-Policy` or a missing `allow` attribute blocks the mic. | Set `allow="microphone *; camera *; autoplay *"` on the iframe and allowlist the embed origin. See [Embed widget](/guides/deploy-embed). |
| Long connect on `essence-2-light-gpu` / `-cpu` or `expression-2-cpu` | These direct tiers are fully elastic (scale from zero) — no always-warm first line. | Expect a cold start on the first session; keep the session URL identical to reuse warm capacity, or use the model's default route. |

## Billing expectations

Cloud avatar serving is metered **per active minute**, per the model's rate
([pricing](/guides/pricing)). Idle, paused, or disconnected time isn't billed,
and the idle loop does not run a session by itself — a session exists only
while a client is connected.

## Next steps

- [Essence 2 & Expression 2](/concepts/models-v2) — model chooser and family overview.
- [Expression 2](/concepts/expression-2) · [Essence 2 Quality](/concepts/essence-2-quality) · [Essence 2 Light](/concepts/essence-2-light) — per-model guides.
- [Agents API](/api/agents) — creation, polling, and error codes.
- [Error reference](/api/errors) — the full error envelope.
