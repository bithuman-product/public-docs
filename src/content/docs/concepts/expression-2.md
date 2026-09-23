---
title: "Expression 2"
description: "Expression 2 — bitHuman's generative avatar model: a whole 416x720 scene generated live from one portrait, for any character. Where it runs, how an agent is created and trained, how it serves, and what to expect."
section: guides
group: "Learn"
order: 3
type: concept
label: "Expression 2"
---

## What it is

**Expression 2** (`expression-2`) generates the whole avatar scene live from the
audio — expressions, mouth and head movement are synthesized each session, not
replayed from a base video. It animates the **entire 416x720 frame** with no
face detector or cropping step, so it works for any character: cartoons,
animals, creatures, robots, and people.

At creation the platform trains a **small model of your specific identity** from
one photo. That per-identity model is what serves your sessions, at **20 fps**,
and it is why creation takes a couple of hours.

## When to choose it

- **Your character is not a photorealistic human** — this is the model for it,
  and where `model: "auto"` routes such inputs.
- **You want motion generated from the audio itself**, not patched onto a base
  video.
- **You only have a photo** — one image is enough.

For a photorealistic person animated from their own footage, compare
[Essence 2](/concepts/essence-2). The side-by-side is on [Models](/concepts/models).

## Where it runs

| Surface | How |
|---|---|
| bitHuman cloud | the [REST API](/api), the [embed widget](/api/embedding) and [LiveKit](/sdk/livekit) — routed down a GPU → Apple Silicon → CPU chain |
| macOS and Linux | the [CLI](/sdk/cli) (`run`, `render`) and the [Python SDK](/sdk/python) (`[expression-2]` extra) |
| iPhone, iPad, Mac | the [Apple SDK](/sdk/apple)'s `Expression2` product — a complete app is on [Swift / iOS — Expression 2](/examples/swift-ios-expression2) |
| Android | [`expression2-android`](/sdk/android) — sessions use your API secret |
| The viewer's browser | [`?render=local`](/sdk/web#integrate-into-your-app) |

The file you download from
[`GET /v1/agent/{code}/model/download?model=expression-2`](/api/agents#download-an-agents-model)
or `bithuman pull <CODE>` is labelled `<CODE>.imx`; `.avatar` is the legacy
extension for the same container. Measured frame rates per platform are on
[performance](/performance).

## How creation works

Create the agent with [`POST /v1/agent/generate`](/api/agents#generate-an-agent)
and `model: "expression-2"`, or add `expression-2` to an existing agent with
[`POST /v1/agent/{code}/models`](/api/agents#add-a-model-to-an-existing-agent).

- **The input is a portrait image**, of any subject. Without one, the platform
  generates a portrait from your prompt first. It also generates the agent's
  10-second idle clip and prepares a voice.
- **The per-identity training dominates the wait.** Poll
  [`GET /v1/agent/status/{agent_id}`](/api/agents#poll-status) until `ready`, or
  wait for the completion email. Plan for **about 2 to 2.5 hours**, and treat 4
  hours as a normal upper tail rather than a fault: training is adaptive, and an
  identity that needs more work gets more training, never a lower bar.
- **The charge is taken up front.** A run that fails early is refunded
  automatically; a creation that completes is not refundable, so a second
  `generate` is a second charge. If a `ready` agent will not serve, report it.
- **Failures are terminal** and reported on the status endpoint as
  `status: "failed"` with an `error_message` — see
  [failure modes](/api/agents#errors).

The creation cost is on [pricing](/guides/pricing).

## Serving tiers

By default each cloud session is routed down the **GPU → Apple → CPU** chain,
starting on an always-warm GPU line and overflowing on capacity. Real-time
sessions run on the GPU and Apple tiers; the CPU tier is sized for overflow and
batch work. To force one tier for a benchmark, append `?model=expression-2-gpu`,
`expression-2-apple` or `expression-2-cpu` to the session URL — how a pin
behaves is on [pin a serving tier](/concepts/models#advanced-pin-a-serving-tier).
For production, omit it.

## Idle and speaking behavior

During silences the avatar plays its **10-second idle clip**, generated from the
identity at creation, looping forward-only and seamlessly. When speech starts,
the engine hands off to generated frames with a per-identity color match, so the
two stay visually continuous; idle resumes only after sustained silence, not in
pauses inside a sentence. Idle animation is not billed.

**Speech onset.** The engine renders in fixed audio chunks, so the first
*talking* frame appears roughly **1.6 seconds** after speech audio begins; the
moving idle clip covers that window.

## Limits and expectations

- **Output is the full 416x720 scene at 20 fps**, over WebRTC in the cloud.
- **A clear, frontal, well-lit photo** gives the best result. The identity is
  fixed at creation — to change the face, create a new agent.
- **The first session on a new agent** can take longer to connect while its
  model is provisioned; later sessions reuse it.
- **Before training completes**, a launch that requests this model is refused
  with [`409 MODEL_NOT_GENERATED`](/api/errors#model-errors). Once ready,
  `expression-2` appears in the agent's `supported_models`.

## Next steps

- [Models](/concepts/models) — the four models side by side
- [Agents API](/api/agents) — create, poll, download
- [Embed widget](/api/embedding) — a live session in minutes
- [Video API](/api/video) — render an MP4 with `model: "expression-2"`
- [Session behavior & troubleshooting](/guides/session-troubleshooting)
