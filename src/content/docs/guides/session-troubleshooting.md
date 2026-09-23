---
title: "Session behavior & troubleshooting"
description: "What to expect from a live avatar session — connect latency, warm vs overflow capacity, idle vs speaking behavior — and how to diagnose the common errors."
section: guides
group: "Deploy"
order: 31
type: guide
label: "Sessions & troubleshooting"
---

## Connect latency: what's normal

When a session starts, the platform routes it to the best available serving
capacity for the agent's [model](/concepts/models). Two things determine
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

During silence a second-generation avatar keeps moving: Expression 2 plays its
idle clip, and Essence 2 keeps playing its identity video. Both loop
forward-only, never in reverse, and idle animation is not billed. When speech
starts, Expression 2's first talking frame lands roughly 1.6 seconds after the
audio begins, covered by the idle clip. Details are on each model's page:
[Expression 2](/concepts/expression-2#idle-and-speaking-behavior) ·
[Essence 2](/concepts/essence-2#idle-and-speaking-behavior).

What you should *not* see is frozen frames or reversed-looking motion; if you
do, report it with the agent code and timestamp.

## Common errors

### Creation

Creation errors — `400 VALIDATION_ERROR`, `402 INSUFFICIENT_BALANCE`,
`422 MODEL_SUBJECT_MISMATCH`, `400 VIDEO_INPUT_NOT_SUPPORTED` and a `failed`
status — are listed with their fixes under
[creation failure modes](/api/agents#errors). A poll that sits
at `current_step: "lip_sync"` for Essence 2 or Expression 2 is the training
step, which takes about 2 to 2.5 hours: keep polling.

### Live sessions

| Symptom | Cause | Fix |
|---|---|---|
| Agent won't launch right after creation | Status isn't `ready` yet, or the identity artifact is still provisioning to serving capacity. | Poll [`GET /v1/agent/status/{agent_id}`](/api/agents#poll-status) until `ready`; on the very first session, retry after a short wait. |
| `409 MODEL_NOT_GENERATED` — `agent <code>'s <model> model hasn't been generated yet` | You requested a model family the agent can't be launched as (via the embed-token `model` field, [talking video](/api/video), or a [model download](/api/agents#download-an-agents-model)) — a trained per-identity model that doesn't exist, `expression-1` not yet enabled on this agent (its message reads `isn't enabled on this agent yet`). | The message names the fix — follow it. Otherwise: check the agent's `supported_models` (returned on status / get / list and the embed-token response), [add the model](/api/agents#add-a-model-to-an-existing-agent), or create the agent with it. Enabling `expression-1` is [instant and free](/api/agents#add-a-model-to-an-existing-agent). |
| Session ends immediately with `avatar_error: "model_not_generated"` | A `?model=` URL override targeted a not-yet-generated v2 model — the session disconnects cleanly instead of hanging through dispatch retries. | Same fix as the 409 above; prefer validating via the embed-token `model` field, which rejects up front. |
| `404 NOT_FOUND` — `No active rooms found for agent <code>` on `/speak` or `/add-context` | These endpoints target an agent with an **active session**. | Start a session first (embed, viewer, or LiveKit), then call them. |
| `?model=` tier pin appears ignored | Unrecognized tier slugs **fall back silently** to the agent's default routing — the session plays normally, so nothing looks broken. | Check the spelling against the slug table on [pin a serving tier](/concepts/models#advanced-pin-a-serving-tier); for production, omit `?model=`. |
| No microphone prompt in the embed | The parent page's `Permissions-Policy` or a missing `allow` attribute blocks the mic. | Set `allow="microphone *; camera *; autoplay *"` on the iframe and allowlist the embed origin. See [Embed widget](/api/embedding). |
| Long connect on `essence-2-gpu` / `-cpu` (or their [legacy slugs](/concepts/models#naming--migration)) or `expression-2-cpu` | These forced tiers are fully elastic (scale from zero) — no always-warm first line. | Expect a cold start on the first session; keep the session URL identical to reuse warm capacity, or use the model's default route. |
| In a **multi-agent room** the avatar is silent for one agent / never sends `playback_started`/`playback_finished` (its audio is dropped) | The avatar bound its audio to a different agent in the room. | The avatar pins to the agent that starts `AvatarSession`, so make sure the intended agent is the one that calls `AvatarSession.start()`. No client change is needed beyond that. See [LiveKit → Multiple agents](/sdk/livekit#first-frame). |

## Billing expectations

A session bills its talking minutes at the model's rate; idle animation is free,
and a stopped or disconnected session accrues nothing. The rule and every rate
are on [pricing](/guides/pricing).

## Next steps

- [Models](/concepts/models) — the four models and which to pick.
- [Expression 2](/concepts/expression-2) · [Essence 2](/concepts/essence-2) — per-model guides.
- [Agents API](/api/agents) — creation, polling, and error codes.
- [Error reference](/api/errors) — the full error envelope.
