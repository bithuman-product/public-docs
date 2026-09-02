---
title: "Essence 2"
description: "Official guide to essence-2 — bitHuman's standard photoreal avatar model: an efficient renderer served from cloud GPU, Apple Silicon and CPU tiers, from your own CPU servers, and in-browser (WebGPU/WASM); train-on-create from a photo, and pricing."
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
video by default), lip-synced live at ~25 frames per second — at a
fraction of the compute of [Essence 2 Max](/concepts/essence-2-max), the
highest-fidelity renderer in the family. At creation the platform
packages your identity into a compact bundle, and that one artifact serves
three ways:

- **From bitHuman's cloud** — a **GPU**, **Apple** and **CPU** tier chain,
  routed automatically. The Apple tier runs on **bitHuman's** Apple Silicon
  Macs through **CoreML**, and is reached over the network like any other cloud
  tier. Its `?model=` slug is still `essence-2-ane` — a historical name, kept
  so saved links keep working.
- **From your own CPU servers** — offline rendering of the downloaded
  artifact, metered, no GPU required (Python SDK 2.9.0+).
- **In the viewer's browser** — WebGPU/WASM, opt-in per session and rolling
  out per identity, with frames that never leave that browser.

What it does **not** do today is run on a customer's own device. There is
**no installable Essence 2 build for a Mac, iPhone, iPad or Android device**,
and the [Swift SDK](/sdk/swift) carries no Essence 2 engine — see
[serving tiers](#serving-tiers) below.

It is half the cloud price of [Essence 2 Max](/concepts/essence-2-max)
and the only Essence 2 model with CPU, Apple, and browser runtimes —
the right default for photorealistic humans, kiosks, high-concurrency
deployments, and privacy-sensitive environments.

## When to choose it

- **It's the default.** For photorealistic humans, start here — pick
  [Essence 2 Max](/concepts/essence-2-max) only when maximum fidelity is the
  whole point.
- **Cost-effective at scale.** 4 credits/min cloud (2 self-hosted) with CPU
  and Apple runtimes that don't need a server GPU per session.
- **Efficient Apple Silicon serving.** The Apple tier carries real-time
  sessions on bitHuman's Apple Silicon Macs without a server GPU per session.
  It is a **cloud** tier on bitHuman's hardware; it does not run on *your*
  device — see [Swift SDK](/sdk/swift). No per-frame throughput figure is
  published for this tier; see
  [Which Apple compute unit runs Essence 2](#which-apple-compute-unit-runs-essence-2).
- **Always-on deployments.** Kiosks, lobby displays, and 24/7 assistants where
  per-minute GPU pricing would dominate.

If maximum image fidelity is the whole point, choose
[Essence 2 Max](/concepts/essence-2-max) — the highest-fidelity renderer,
served on dedicated cloud GPUs. If you want fully generated
motion from a single photo, choose [Expression 2](/concepts/expression-2). For
the family-level decision, start at
[Essence 2 & Expression 2](/concepts/models-v2).

## How creation works

Create the agent with [`POST /v1/agent/generate`](/api/agents#generate-an-agent)
and `model: "essence-2"`. Creation is asynchronous and costs **500 credits**
(one-time, per agent).

> **Tip — one creation, both Essence 2 models.** `essence-2` is the
> [combined creation](/api/agents#essence-2--the-combined-creation): the one
> 500-credit charge trains the standard Essence 2 **and** makes
> [Essence 2 Max](/concepts/essence-2-max) available from the same
> internally generated identity video — pick the model at launch. Like every Essence 2 creation,
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
| `essence-2-ane` | Apple Silicon (CoreML) | Force the Apple tier. The `-ane` spelling is a **historical name** kept as a permanent alias — see [below](#which-apple-compute-unit-runs-essence-2). |
| `essence-2-cpu` | Cloud CPU | Force the CPU tier — no GPU in the path. |

```text
https://bithuman.ai/embed/A66GYD8664?model=essence-2-cpu
```

Tier slugs are an advanced, operational surface. Saved links carrying
pre-rename or retired slugs keep working — see
[Naming & migration](/concepts/models-v2#naming--migration). For production,
omit `?model=` and let the platform choose. See
[tier pinning on the embed widget](/guides/deploy-embed#pin-a-serving-tier).

### Which Apple compute unit runs Essence 2

Apple Silicon has three compute units CoreML can place work on — the **CPU**,
the **GPU**, and the **Neural Engine**. Which one a model gets is decided by
CoreML from the model's precision and the configuration it is loaded with; it
is not fixed by the name of a tier. The `essence-2-ane` slug predates that
distinction and asserted a hardware fact it did not have.

**Essence 2's Apple tier runs on the Mac GPU.** Every serving worker on the
Apple hosts binds the `cpuAndGPU` compute unit, verified on the production
hosts on 2026-09-02. The Neural Engine is not off-limits — for a minority of
identities the renderer resolves to a half-precision graph the Neural Engine
will accept, and it runs there — but measured head to head on the same
identity and the same frames, the Neural Engine was **about 2.2× slower** than
the Metal GPU **and** slightly further from the reference picture. So the GPU
is not a fallback: it is the fastest *and* the most faithful unit available on
that machine, which is why production binds it.

Two things follow. First, **"Essence 2 runs on the Neural Engine" is false**,
and so is "it can never touch the Neural Engine" — the honest statement is that
the Neural Engine is available on some identities and is not the better unit.
Second, this answer is **specific to Essence 2's renderer**. It does not carry
over to [Expression 2](/concepts/expression-2#which-apple-compute-units-run-expression-2),
whose Apple members are exported at half precision and are measured running
predominantly *on* the Neural Engine, and it says nothing about iOS.

**No per-frame number is published for the Apple or GPU tiers.** Until
2026-09-02 this page carried a per-frame throughput figure for this tier,
attributed to every operation in the graph running on the Neural Engine. That
attribution was wrong, the operation count did not describe this model, and the
figure was a model-in-isolation reading that a live session — which also pays
audio conditioning, paste-back and the mouth-interior compose — never sees. It
has been **withdrawn rather than replaced**: the per-model, per-compute-unit
protocol used for the [CPU table](#rendering-throughput-measured) below has not
been run for the Apple or GPU tiers, and picking one of the several figures in
circulation is what produced the error in the first place. If you need a
throughput commitment for a specific identity and tier, ask us for a measured
one rather than reading a number off this page.

**On-device: not available yet.** The Essence 2 engine does run on Apple
Silicon — that is how the **Apple serving tier** above works — but that
hardware is *bitHuman's*, reached over the network like any other cloud tier.
There is **no published way to run Essence 2 on your own Mac or iPhone today**:

- The [Swift SDK](/sdk/swift) does not carry it. Naming an Essence 2 type there
  will not compile: measured against the shipped `bitHumanKit.xcframework`, the
  binary contains zero occurrences of the string `essence` and its public
  interface declares no Essence 2 type. (That package *does* now vend an
  on-device [`expression-2`](/concepts/expression-2) engine, as of 2.5.0 — but
  that is the other second-generation model, not this one.)
- **Flutter is a reference app, not a published SDK.** An Essence 2 engine does
  exist for `ios-arm64` and `macos-arm64`, and the Flutter plugin's CocoaPods
  podspec can vendor it — but that engine is staged from a **private** internal
  release, the plugin is not on pub.dev and its pod is not published, so the
  path is not open to you. See
  [SDK overview](/sdk/overview#a-note-on-flutter).

To reach Essence 2 from an Apple app today, use the [REST API](/api/overview) or
a [LiveKit](/sdk/livekit) session. (Essence 2 Max is cloud-only by design.)

**In the browser.** A browser-local tier is **rolling out**: appending
`?render=local` to a session URL downloads the identity's compact web bundle
and renders Essence 2 **in the browser** — WebGPU on Apple Silicon and
desktop-class GPUs (real-time with headroom), WASM fallback elsewhere — with
no server render in the path. It activates per identity as web bundles
publish; sessions without a published bundle fall back to cloud serving. See
[browser rendering](/guides/browser-rendering) and the
[device/runtime matrix](/concepts/models-v2#where-each-model-runs) for
current status.

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

## The renderer (updated 2026-08-29)

Essence 2 renders through a **unified renderer**: the face is animated from your
identity's own footage, and the **mouth interior — the teeth especially — is
rendered sharply** rather than being averaged out of the source frames. Teeth
are barely present in a closed-mouth portrait, so the mouth interior is the
hardest region to get right; that is the part that most visibly improved.
Measured
against each identity's own previous build, mouth-region fidelity improved
**roughly 2× to 4.7×** across the launch gallery. That figure is a ratio of
**LPIPS** — a learned perceptual image-distance metric — computed **only inside
the mouth-interior mask of the reference render**, on each identity's held-out
frames. So it is a per-identity improvement factor against that identity's own
earlier build: it is not a score you can compare between identities, or against
another vendor. Sharpness metrics were deliberately not used — they reward
speckle, and artifacts inflate them. Every arm was also checked frame by frame
by eye, which is the second gate and the one that has overruled the metric.
Mouth motion is also re-centred and wider, so speech reads as more dynamic.

It costs nothing extra to serve — measured warm and end to end — and **pricing
is unchanged**. The identity bundle also got about **5× smaller** (see Limits,
below). **New creations get it automatically**; agents created before
2026-07-27 keep serving their current build until they are retrained. Nothing
in the API, the session contract, or the `?model=` tier slugs changed.

**Which surfaces serve it.** The sharp mouth-interior rendering described above
is served on the **cloud tiers** (GPU, Apple, CPU) and by
**self-hosted CPU offline rendering**. It is **not** part of a
**browser-local** session yet: `?render=local` runs a separate in-browser
build, and as measured on **2026-08-30** across **all 22 identities** currently
in the browser catalogue, **no published web bundle enables it** — a
browser-local session renders the mouth the earlier way. Nothing about the
price, the API, or the tier slugs changes with the surface; only the mouth
region differs.

### A faster head upsample

The renderer's **head-upsampling step** — the stage that takes the generated
head region up to output resolution — has been rebuilt. It is an **internal
graph change with no surface you can see or write against**: the API, the
session contract, the `?model=` tier slugs and the price are all unchanged,
there is nothing to opt into, and the rendered picture is the same.

"The same picture" is a measurement, not a hope. On the same identity and the
same frames, the rebuilt step's output and the output of the step it replaces
agree to **167.85 dB** peak signal-to-noise ratio — a difference far below one
step of an 8-bit pixel, so no display, encoder or eye resolves it. The change
was also reviewed side by side on video before it was accepted, which is the
gate that has overruled a metric here before. It is a speed change and nothing
else.

It **rolls out per identity**, the way the 2026-07-27 renderer change did: an
identity picks it up when its bundle is rebuilt, and until then that identity
serves the previous build. **First served on 2026-09-02, on a single
identity** — the rollout has begun, it is not a fleet-wide switch, and most
identities are still on the previous build. Nothing you write changes either
way, and you cannot pin a session to one build or the other.

**How much faster is your session? It depends on which tier serves you, and on
the GPU tier the answer is "not measurably".** See
[What the head-upsample rewrite is worth, per tier](#what-the-head-upsample-rewrite-is-worth-per-tier).

## Limits and expectations

- **Output is 25 fps on every tier.** Engine *throughput* is a different
  number, and on the CPU tier it is far below 25 fps — see
  [Rendering throughput, measured](#rendering-throughput-measured).
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

### Rendering throughput, measured

Every tier emits a **25 fps** video, because the stream is paced to the audio.
How fast the engine can *produce* those frames is a separate number, it is not
25 fps everywhere, and on the CPU tier it is the number that decides whether a
tier is usable live.

Measured 2026-08-30 against the deployed cloud CPU worker — one offline render
per row through the same endpoint, 16 vCPU / 32 GB container, 16 render threads,
one session per container, the same 3 seconds of speech, 75 frames each:

| Resolution | Sharp mouth-interior rendering | Frames per second |
|---|---|---:|
| 1280×720 | armed | **0.9** |
| 1280×720 | not armed | 12.4 |
| 1080×1920 | armed | **1.0** |
| 1080×1920 | not armed | 6.5 |

Read the rows in pairs. At a **fixed** resolution the sharp mouth-interior
rendering costs **14×** (1280×720) and **6.5×** (1080×1920); resolution alone
costs under 2×. So the cost is the mouth-interior rendering, not the frame size,
and an armed CPU render runs roughly **25× slower than playback**.

**What this means for you.** The CPU tier is an **offline-rendering and
last-resort** tier, not a real-time one; live sessions route to the GPU and
Apple tiers first. If you pin a live session to CPU, expect it to fall behind.
The un-armed rows vary run to run (a 17.6 fps reading was taken for the same
1280×720 identity on an earlier container); the armed rows did not.

**These rows predate the [head-upsample rewrite](#a-faster-head-upsample).**
They were measured on 2026-08-30, before that change reached any identity. A
rebuilt identity has not been re-measured under this protocol, so read the armed
rows as an **upper bound** on the cost, not as the current figure for an
identity that has already been rebuilt.

GPU and Apple tier throughput has **not** been measured under this protocol
and is deliberately not quoted here — see
[Which Apple compute unit runs Essence 2](#which-apple-compute-unit-runs-essence-2).
(The GPU figures in
[What the head-upsample rewrite is worth, per tier](#what-the-head-upsample-rewrite-is-worth-per-tier)
are a before/after of one renderer step under a different harness. They are not
a session-level throughput for that tier and must not be read as one.)

### What the head-upsample rewrite is worth, per tier

The [head-upsample rewrite](#a-faster-head-upsample) is a speed change, so the
fair question is how much faster *your* session gets. **The honest answer is
that it depends entirely on which tier serves you, and on two of the four tiers
the answer today is "not at all".**

The reason is the step being replaced. A cubic resize is pathologically
expensive in the ONNX Runtime **CPU** kernel and cheap in the **CUDA** one.
Profiled on the same graph, the same identity and the same batch, that single
step is **68.6%** of the whole forward pass on the CPU execution provider and
**0.48%** of it on CUDA. So the rewrite removes most of the CPU tier's work and
almost none of the GPU tier's — and the gain does not transfer between them.

| Tier | Measured? | What the rewrite does there |
|---|---|---|
| **CPU** (portable render core) | yes | **3.00× faster** on the renderer model; **7.54 → 23.87 fps** on the full delivered path |
| **GPU** (NVIDIA CUDA) | yes | **No gain.** 0.971× (about 3% slower) batched, neutral at the streaming shape. Invisible in practice; see below |
| **Apple** | not applicable yet | The Apple tier is not served the rebuilt graph at all — see below |
| **Browser-local** (`?render=local`) | no | **Not measured** |

**CPU tier — measured, and the reason the rewrite exists.** Threadripper PRO
5955WX (x86-64), ONNX Runtime **CPU** execution provider, batch 24, 4 threads,
3.93 GHz held, 63–75 °C, no throttling, **sustained** (240-frame arms reproduce
the 120-frame arms to 0.3%). The renderer model alone runs **3.0023×**
faster against a same-graph noise floor of **0.483%**. The **full delivered path** —
renderer, frame packing, full-body paste-back — goes from **7.54 fps to
23.87 fps** on a 1280×720 identity and **7.52 → 20.97 fps** on a 1080×1920 one,
noise floors 0.19–1.25%. Two things this is not: it is a developer workstation
rather than the deployed CPU worker, which has **not** been re-measured; and
even at 23.87 fps the CPU tier is still **not** real time at 25 fps. The rewrite
moves that tier from hopeless to borderline. It does not make it live-capable,
and the guidance above is unchanged.

**GPU tier — measured, and it is not a win.** NVIDIA RTX 4090 on the serving
host, ONNX Runtime **CUDA** execution provider configured exactly as the
deployed worker (batch 24, fp32 compute, 4 intra-op threads, and every
kernel-time node — 277 before the rewrite, 279 after — placed on CUDA with zero
CPU fallback), 11 interleaved A/B rounds on copies of the real artifacts. The rebuilt graph measured **0.971×** —
about **3% slower** — against a same-graph noise floor of **0.083%**, and it
lost all 11 rounds while a byte-identical duplicate of the unmodified graph
split 5 of 11. At the single-frame streaming shape the ratio was **0.9987×**,
inside the floor: neutral. In frames per second the renderer model on this
tier runs at **1075 fps before and 1044 fps after** — both so far above the
25 fps a session consumes that the difference is not observable in a session.

We publish that because it is what this tier measured, not because it changes
anything for you: **the rewrite targets the CPU tier; on the GPU tier it is
neutral to very slightly negative, and no GPU-tier speed improvement should be
expected or quoted.**

**Apple tier — the rebuilt graph is not sent there.** The rewrite was applied to
the batched graph, and the Apple tier is never shipped that member; it serves
the single-frame graph, which has not been rebuilt. So an Apple-tier session
serves the **previous** head upsample even on an identity that has already been
rebuilt, and there is no figure to publish. Nothing about the picture, the API
or the price differs either way.

**Browser-local is not measured.** No figure is inferred for it from the rows
above.

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
   video), and `supported_models` (`essence-2` + `essence-2-max` after the
   combined creation).
4. **Go live** — [embed widget](/guides/deploy-embed) or share URL for the
   fastest path; [LiveKit plugin](/guides/deploy-livekit) for programmatic
   real-time sessions (`AvatarSession` takes the agent code); tier control
   via [`?model=`](#serving-tiers). Drive a live session with
   [`/speak` and `/add-context`](/api/agents#make-an-agent-speak).
5. **Render offline** — [`POST /v1/video/generate`](/api/video) with
   `model: "essence-2"` for mp4s (4 credits/min of output).
6. **Download the artifact** —
   [`GET /v1/agent/{code}/model/download?model=essence-2`](/api/agents#download-an-agents-model)
   or [`bithuman pull <code>`](/sdk/cli/commands#pull-your-own-agents-model-by-code)
   → `<code>.lebundle.imx`. Inspect it with
   [`bithuman info`](/sdk/cli/commands#bithuman-info--inspect-a-model) (full
   member listing as of CLI 2.4.1). **Licensed weights, cloud-served today**:
   the [Python SDK](/sdk/python#which-model-artifacts-can-the-sdk-load) cannot
   yet load current-renderer Essence 2 bundles locally — serve through the
   cloud surfaces.

## Next steps

- [Essence 2 & Expression 2](/concepts/models-v2) — the family overview and model chooser.
- [Second-generation gallery](https://bithuman.ai/explore?gallery=v2) — talk to a live launch agent.
- [Essence 2 Max](/concepts/essence-2-max) — the premium, highest-fidelity model.
- [Agents API](/api/agents) — full create → poll → serve lifecycle.
- [Embed widget](/guides/deploy-embed) — ship a live session in minutes.
- [MCP server](/guides/mcp-server) — create and manage agents from Claude, Cursor, or any MCP client.
- [Session behavior & troubleshooting](/guides/session-troubleshooting) — latency, idle, common errors.
- [Talking video generation](/concepts/talking-video) — render offline mp4s with `model: "essence-2"`.
