---
title: "Essence 2"
description: "Official guide to essence-2 — bitHuman's standard photoreal avatar model: an efficient renderer served from cloud GPU, Apple Silicon and CPU tiers, on your own Mac or Linux machine with the CLI, from your own CPU servers, and in the browser; train-on-create from a photo, and pricing."
section: concepts
group: "Models"
order: 2
label: "Essence 2"
---

> **Note — Generally available.** **`essence-2`** ("Essence 2") is the
> **standard** second-generation Essence model and the default for
> photorealistic humans — as a developer you simply select `essence-2`, and
> bitHuman serves the right tier for your hardware and quality needs.
> Coming from an earlier model name? See
> [Naming & migration](/concepts/models-v2#naming--migration).

## What it is

**Essence 2** is the standard photoreal model of the second-generation
Essence family: a **compact, efficient** engine that keeps the Essence look — your
identity's footage at its native resolution (a full-HD 1080p identity
video by default), lip-synced live at ~25 frames per second — on a
fraction of the compute a dedicated GPU renderer needs. At creation the
platform packages your identity into a compact bundle, and that one artifact serves
four ways:

- **From bitHuman's cloud** — a **GPU**, **Apple** and **CPU** tier chain,
  routed automatically. The Apple tier runs on **bitHuman's** Apple Silicon
  Macs and is reached over the network like any other cloud tier. Its `?model=` slug is still `essence-2-ane` — a historical name, kept
  so saved links keep working.
- **On your own Mac or Linux machine** — the [CLI](/sdk/cli#what-renders-locally-and-where)
  (2.6.1, macOS Apple Silicon and Linux x86_64) renders the downloaded
  `<code>.imx` offline with `bithuman render` and serves it live with
  `bithuman run`, with the runtime inside the CLI; on Android the
  [`essence2-android`](/sdk/android#troubleshooting)
  AAR, and in your own iOS/macOS app the Swift
  [`Essence2`](/sdk/ios#install) engine.
- **From your own CPU servers** — offline rendering of the downloaded
  artifact, metered, no GPU required ([Python SDK](/sdk/python) 3.x; 2.9.0+
  for the earlier route).
- **In the viewer's browser** — opt-in per session and rolling out per
  identity, with frames that never leave that browser.

Wherever it runs, Essence 2 is **fail-closed**: a model file with a required
member missing is refused rather than played with a substituted mouth. See
[serving tiers](#serving-tiers) below for the cloud chain and
[where each model runs](/concepts/where-models-run) for the full matrix.

It has CPU, Apple, and browser runtimes as well as GPU —
the right default for photorealistic humans, kiosks, high-concurrency
deployments, and privacy-sensitive environments.

## When to choose it

- **It's the default.** For photorealistic humans, start here.
- **Cost-effective at scale.** 4 credits/min cloud (2 self-hosted) with CPU
  and Apple runtimes that don't need a server GPU per session.
- **Efficient Apple Silicon serving.** The Apple tier carries real-time
  sessions on bitHuman's Apple Silicon Macs without a server GPU per session.
  It is a **cloud** tier on bitHuman's hardware; it does not run on *your*
  device — see [Swift SDK](/sdk/ios).
- **Always-on deployments.** Kiosks, lobby displays, and 24/7 assistants where
  per-minute GPU pricing would dominate.

If you want fully generated motion from a single photo, choose
[Expression 2](/concepts/expression-2). For
the family-level decision, start at
[Essence 2 & Expression 2](/concepts/models-v2).

## How creation works

Create the agent with [`POST /v1/agent/generate`](/api/agents#generate-an-agent)
and `model: "essence-2"`. Creation is asynchronous and costs **500 credits**
(one-time, per agent).

> **Tip — the subject gate.** `essence-2` is the
> [photorealistic creation](/api/agents#essence-2--the-photorealistic-creation):
> the input must be a **photorealistic human subject** (else
> [`422 MODEL_SUBJECT_MISMATCH`](/api/errors#model-errors), nothing billed);
> `model: "auto"` routes automatically instead. You can also
> [add `essence-2`](/api/agents#add-a-model-to-an-existing-agent) to an
> existing agent that has a stored identity video.

> **Note** The Python examples below use
> [`requests`](https://pypi.org/project/requests/), which is not in the standard
> library — `pip install requests` first, or use `curl` / `urllib` instead.

```python
import requests

import os

resp = requests.post(
    "https://api.bithuman.ai/v1/agent/generate",
    headers={
        "Content-Type": "application/json",
        "api-secret": os.environ["BITHUMAN_API_SECRET"],
    },
    json={
        "prompt": "You are a helpful retail assistant.",
        "image": "https://example.com/portrait.jpg",
        "model": "essence-2",
    },
)
print(resp.json())
# {"success": true, "message": "Agent generation started",
#  "agent_id": "A66GYD8664", "status": "processing"}
```

> **Note — `image` must be publicly fetchable, and this is not checked at
> submit time.** The `https://example.com/…` URLs above are placeholders.
> Posting one verbatim returns `HTTP 200` with
> `{"success": true, "status": "processing"}`, and the job only fails seconds
> later with `Image processing failed: Failed to download after 3 attempts:
> 404`. The credits are charged at submit and **automatically refunded** on that
> failure (verified 2026-07-28: `-500` then `+500` within 4 s), so nothing is
> lost — but a `200` here is not confirmation that your image was accepted. Poll
> [`GET /v1/agent/status/{agent_id}`](/api/agents#poll-status) before assuming
> the creation started.


**Inputs.** Creation is **image-only**: supply a portrait `image` of the
identity (or let the prompt generate one), and the platform **generates the
identity video for you** as a creation step before training — a 10-second
clip authored to loop seamlessly, so idle playback never shows a seam
(you'll see `current_step: "video"` at ~45% progress). Video input is not
part of the creation contract: a request carrying `video` is rejected with
[`400 VIDEO_INPUT_NOT_SUPPORTED`](/api/errors#agent-operations) before
anything is billed (verified live 2026-08-01). One `aspect_ratio` value
drives **both** the identity image and the driver video (`16:9` default,
`9:16`, `1:1`), and the `framing` / `transparency` knobs shape the generated
identity image — see [the parameter table](/api/agents#generate-an-agent).
A voice is prepared as part of creation (supply `audio` to clone one, or one
is generated).

**What happens.** Poll
[`GET /v1/agent/status/{agent_id}`](/api/agents#poll-status): the run moves
through the standard steps (`payment` → `persona` → `voice_image`), generates
the identity video (`video`), then enters the
training step (reported as `current_step: "lip_sync"`, ~70% progress)
where the trainer builds the compact identity bundle on a cloud GPU. When
status reaches `ready`, the agent is servable on every cloud tier. (The
browser tier is separate: it needs a per-identity web bundle published for
that agent, which is still rolling out — see
[In the browser](#serving-tiers) below.)

**How long.** Creation typically takes **about 45 minutes** end to end.
Some identities take longer — the platform allows a run up to several
hours before flagging it as stuck, so keep polling `status` rather than
applying your own short timeout.

## Serving tiers

A ready agent serves through every delivery surface — the
[embed widget](/guides/deploy-embed), the viewer/share URL, the
[REST API](/api/agents), and the [LiveKit plugin](/guides/deploy-livekit).
By default (`?model=essence-2`, or no override at all) the platform routes
each session down the **serving chain — GPU → Apple → CPU** —
overflowing to the next tier on capacity, so sessions land on the most
cost-efficient runtime that's available.

For benchmarking or placement testing you can **force one runtime tier** with
the `?model=` override on the session URL (a forced tier never overflows and
fails loudly if unavailable):

| `?model=` slug | Runtime | Notes |
|---|---|---|
| `essence-2` | The full chain (default) | GPU → Apple → CPU with automatic overflow — the public name. |
| `essence-2-gpu` | Cloud GPU | Force the GPU tier. |
| `essence-2-ane` | Apple Silicon | Force the Apple tier. The `-ane` spelling is a **historical name** kept as a permanent alias. |
| `essence-2-cpu` | Cloud CPU | Force the CPU tier — no GPU in the path. |

```text
https://bithuman.ai/embed/A66GYD8664?model=essence-2-cpu
```

Tier slugs are an advanced, operational surface. Saved links carrying
pre-rename or retired slugs keep working — see
[Naming & migration](/concepts/models-v2#naming--migration). For production,
omit `?model=` and let the platform choose. See
[tier pinning on the embed widget](/guides/deploy-embed#pin-a-serving-tier).

### On your own device

The Apple serving tier above runs on *bitHuman's* Apple Silicon, reached over
the network like any other cloud tier — it is not the same thing as running on
your Mac. What does run on your hardware:

- **Your own Mac or Linux machine, through the CLI** — `bithuman pull <CODE>
  --model essence-2` hands you `<CODE>.imx`, `bithuman render` turns it and an
  audio file into an MP4 offline, and `bithuman run` serves it from a local
  server. See [the CLI](/sdk/cli#what-renders-locally-and-where).
- **Your own CPU servers** — offline rendering of the downloaded artifact
  through the [Python SDK](/sdk/python), metered, no GPU required.
- **Android** — the [`essence2-android`](/sdk/android#troubleshooting)
  AAR resolves; it does not render for an outside developer yet.
- **iOS and macOS, in your own app** — the [Swift SDK](/sdk/ios#install)'s
  `Essence2` product builds; no per-identity bundle is published for a phone
  yet.

Essence 2 GPU rendering on phones, Macs and in the browser is rolling out; the
frame rate on each platform is on [Performance](/sdk/performance).
To reach Essence 2 from an Apple app today, use the [REST API](/api/overview)
or a [LiveKit](/sdk/livekit) session.

**In the browser.** A browser-local tier is **rolling out**: appending
`?render=local` to a session URL downloads the identity's compact web bundle
and renders Essence 2 **in the browser**, with no server render in the path.
The tier activates per identity as web bundles publish; sessions without a
published bundle fall back to cloud serving. See
[browser rendering](/guides/browser-rendering) and the
[device/runtime matrix](/concepts/models-v2#where-each-model-runs).

## Idle and speaking behavior

Essence 2 animates the identity's footage — the internally generated
identity video: the base video
plays continuously and the engine renders lip-sync and expression over it. As
of **2026-07-02**, the base video loops **forward-only** on every tier — when
the clip reaches its last frame it wraps back to the first, and it never plays
in reverse. This applies both while idle and while speaking, so motion always
reads as natural forward movement.

## Pricing

| Surface | Rate |
|---|---|
| Cloud serving (all runtimes) | **4 credits/min** |
| Self-hosted serving | **2 credits/min** |
| Agent creation | 500 credits (one-time) |
| [Talking-video renders](/api/video) | 4 credits per minute of output (rounded up) |

Per-minute serving is metered for the whole time a session is live and the
engine is rendering — **idle/silent animation included**. Only stopped, paused,
or disconnected sessions stop accruing. Full schedule: [Pricing & credits](/guides/pricing).

## The renderer

Essence 2 animates your identity's own footage, and the **mouth interior — the
teeth especially — is rendered sharply** rather than being averaged out of the
source frames. Renderer improvements roll out **per identity** as bundles are
rebuilt: a new creation gets the current renderer automatically, and an agent
created earlier keeps serving its current build until it is retrained. Nothing
in the API, the session contract, the `?model=` tier slugs or the price changes
with a renderer update. If you self-host and the mouth interior does not look
like your cloud sessions, that is the build of your identity's published
artifact and not your setup — contact support with the agent code.

## Limits and expectations

- **Output is 25 fps on every tier.** How fast each platform can *produce*
  frames is a different number — see [Performance](/sdk/performance).
- **Creation takes about 45 minutes** (see above) — poll status rather than
  assuming the few-minute wall-clock of `essence-1`.
- **The downloadable identity bundle is ~85–105 MB** on the current renderer
  (agents created before 2026-07-27 are larger — up to ~550 MB — until
  retrained). Size varies per identity: read `Content-Length` rather than
  assuming a fixed figure.
- **Identity is fixed at creation.** The bundle bakes the generated identity
  video's look and framing; to change the face, create a new agent.
- **First session on a fresh agent** can take longer to connect while the
  identity bundle is provisioned onto the serving tier; subsequent sessions
  reuse it. See [troubleshooting](/guides/session-troubleshooting).
- **Before training completes**, launch surfaces that request this model
  reject it with [`409 MODEL_NOT_GENERATED`](/api/errors#model-errors). Once
  the agent is ready, this model's family appears in its `supported_models`
  (on [status / get / list](/api/agents#poll-status) and the embed-token
  response). During the rename rollout, server responses may still report
  the family under an earlier name — see
  [Naming & migration](/concepts/models-v2#naming--migration).


## The developer journey

Every path to a live Essence 2 avatar, in order — each step links the page
with runnable, verified examples:

1. **Create** — [`POST /v1/agent/generate`](/api/agents#generate-an-agent)
   with `model: "essence-2"` (equivalently `model: "essence", version: "v2"`).
   Image-only intake, 500 credits, idempotent retries via the
   [`Idempotency-Key` header](/api/agents#idempotent-retries--the-idempotency-key-header).
   Also creatable from any [MCP client](/guides/mcp-server) (`generate_agent`
   with `model`/`version`) or the dashboard.
2. **Poll** — [`GET /v1/agent/status/{agent_id}`](/api/agents#poll-status)
   until `status: "ready"`; the long `lip_sync` step is the training.
   Failures refund automatically.
3. **Inspect** — [`GET /v1/agent/{code}`](/api/agents#get-an-agent) returns
   the persona, voice, media (including the internally generated identity
   video), and `supported_models` (`essence-2` once the creation is ready).
4. **Go live** — [embed widget](/guides/deploy-embed) or share URL for the
   fastest path; [LiveKit plugin](/guides/deploy-livekit) for programmatic
   real-time sessions (`AvatarSession` takes the agent code); tier control
   via [`?model=`](#serving-tiers). Drive a live session with
   [`/speak` and `/add-context`](/api/agents#make-an-agent-speak).
5. **Render offline** — [`POST /v1/video/generate`](/api/video) with
   `model: "essence-2"` for mp4s (4 credits/min of output).
6. **Download the artifact** —
   [`GET /v1/agent/{code}/model/download?model=essence-2`](/api/agents#download-an-agents-model)
   or [`bithuman pull <code> --model essence-2`](/sdk/cli/reference#bithuman-pull)
   → `<code>.imx` (older releases wrote `<code>.lebundle.imx`, a legacy name
   kept for compatibility). Inspect it with
   [`bithuman info`](/sdk/cli/reference#bithuman-info) (full
   member listing as of CLI 2.4.1). **Licensed weights** — render it locally
   with the [CLI](/sdk/cli#what-renders-locally-and-where) (2.6.1,
   macOS and Linux) or the [Python SDK](/sdk/python) (3.x), or serve it
   through the cloud surfaces.

## Next steps

- [Essence 2 & Expression 2](/concepts/models-v2) — the family overview and model chooser.
- [Second-generation gallery](https://bithuman.ai/explore?gallery=v2) — talk to a live launch agent.
- [Agents API](/api/agents) — full create → poll → serve lifecycle.
- [Embed widget](/guides/deploy-embed) — ship a live session in minutes.
- [MCP server](/guides/mcp-server) — create and manage agents from Claude, Cursor, or any MCP client.
- [Session behavior & troubleshooting](/guides/session-troubleshooting) — latency, idle, common errors.
- [Talking video generation](/concepts/talking-video) — render offline mp4s with `model: "essence-2"`.
