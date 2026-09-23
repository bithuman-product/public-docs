---
title: "Building avatars"
description: "Get a pre-built avatar or generate one from a portrait — media specs, the CO-STAR prompt framework, animal mode, and the agent-generation API."
section: guides
group: "Build"
order: 0
---

## Two ways to get an avatar

An avatar is **likeness + voice + personality**, packaged into a single [`.imx` file](/concepts/avatars-imx) the runtime plays. You either pull a pre-built one or generate your own.

### 1. Download a pre-built one

Browse [Explore](https://www.bithuman.ai/explore), open the **⋮** menu on any agent, and choose **Download**. Or via the [CLI](/sdk/cli#install):

```bash
bithuman list                          # browse the showcase — free, no account
bithuman pull sofia-ramirez            # → ~/.cache/bithuman/showcase/sofia-ramirez.imx
bithuman login                         # `run` needs a credential; `pull` did not
bithuman run ~/.cache/bithuman/showcase/sofia-ramirez.imx
```

`sofia-ramirez` (agent code `A52DHS2219`) is an Essence 2 identity in the free
showcase, about 148 MB; `bithuman list` prints the rest.

> **What is free, and what needs an account.** `bithuman list`, `bithuman pull <slug>`
> and `bithuman open` are anonymous — the showcase weights download with no
> credential at all. **Playing** a model is not: `bithuman run` and `bithuman render`
> need `bithuman login` or `BITHUMAN_API_SECRET`, an Essence 2 `.imx` refuses to start
> without one (its weights activate per device on first local play), and the minutes
> bill at the [published rates](/guides/pricing). Pulling one of **your own** agents by
> **code** rather than a showcase slug needs that credential too.

### 2. Generate from your own portrait

Upload a mix of image, voice clip, and system prompt at [bithuman.ai](https://www.bithuman.ai/explore) — or generate programmatically over the API (covered below).

Agent creation is **image-only**: provide a portrait image (or let the prompt
generate one) and bitHuman generates a **10-second identity video
internally**, authored to loop seamlessly (its first and last frames match) —
so movement comes built in, for every model.

## Media uploads

| Input | Use for | Limits |
|---|---|---|
| **Image** | Facial likeness | < 10 MB; one clear figure, neutral expression, facing the camera, relaxed pose, face unobstructed |
| **Voice** | Voice cloning | < 1 min, clean (no music/noise), MP3 / WAV / M4A, natural speech |

### What makes a good photo

Your image sets the likeness, so it is worth picking a good one. For the best result, use a photo with:

- **A clear figure** — one subject, in focus and easy to see.
- **A neutral expression** — a resting face, not mid-laugh or mid-word.
- **Facing the camera** — straight on, not a side profile.
- **A relaxed pose** — however the person naturally stands or sits.
- **No occlusion of the face** — eyes, nose and mouth all visible.

None of this is enforced: any photo you send is accepted, and nothing inspects or scores it. These are simply the conditions the models were built around, so a photo that meets them gives the most lifelike avatar. If you are building on top of bitHuman, pass the same five points on to whoever chooses the photo.

### Priority rules

1. **Image ⇒ auto-persona** — an image auto-generates a persona, so a manual prompt becomes optional.
2. **Voice** — when uploaded, replaces the auto-generated voice.
3. **Prompt** — required only when no image is provided.

| Combination | Result |
|---|---|
| Prompt only | Likeness + voice + movement from text — good for fictional characters |
| Image only | Instant avatar; persona + voice auto-generated |
| Image + Voice | Realistic recreation — image for face, voice for speech |
| Image + Voice + Prompt | Full control — image face, cloned voice, prompt personality |

> **Tip** Start simple: upload one good photo for an instant avatar, or write a prompt for a creative character. Add voice or refine later.

Common fixes: poor lighting → edit before upload; background noise → re-record in a quiet room; multiple people → crop to one; excessive motion → keep it subtle.

## Prompts — the CO-STAR framework

Six fields cover everything that shapes response quality. Be specific in every one — vague prompts produce vague avatars.

| Field | Defines | Weak → Strong |
|---|---|---|
| **C**ontext | Setting & situation | "customer service" → "Level-2 support for a cloud SaaS, handling escalated cases" |
| **O**bjective | The specific goal | "be helpful" → "resolve the issue in the first interaction" |
| **S**tyle | How they communicate | "be professional" → "like an Apple Genius Bar tech — uses analogies" |
| **T**one | Emotional attitude | patient, empathetic, calm under frustration |
| **A**udience | Who they talk to | "everyone" → "everyday users, beginner-to-intermediate" |
| **R**esponse | Output structure | "acknowledge → clarify → step-by-step → confirm → offer more" |

Template:

```text
CONTEXT:   [setting/situation the avatar operates in]
OBJECTIVE: [specific goal to achieve]
STYLE:     [how they communicate — which profession/persona]
TONE:      [emotional attitude]
AUDIENCE:  [who they're talking to — demographics]
RESPONSE:  [format/structure responses should follow]
```

Worked example (educational tutor):

```text
CONTEXT:   Online tutor helping high-schoolers with exam-season math.
           Students are stressed and need academic + emotional support.
OBJECTIVE: Explain concepts clearly, solve specific problems, build confidence.
STYLE:     Like an award-winning teacher — real-world examples, step-by-step.
TONE:      Encouraging, patient; reframe mistakes as learning.
AUDIENCE:  Ages 14–18, varying ability, some test anxiety.
RESPONSE:  Acknowledge → break into steps → encourage → analogy → confidence close.
```

Avoid conflicting tones ("professional" + "casual and fun"), vague objectives, "everyone" audiences, and skipping context.

## Animal mode

Upload a pet photo or use a pre-built animal character. The system auto-detects the face (eye tracking, mouth, expression mapping). When auto-detection fails, you'll be prompted to **Mark Face** — draw one rectangle around eyes/nose/mouth/chin and submit; landmarks are extracted from that box.

Best results: front-facing, high-contrast, well-lit, face filling the frame. Side profiles produce unnatural movement — use straight-on views. Start with a pre-built animal for guaranteed compatibility.

## Generate programmatically

The same upload + packaging flow is available over HTTP — generate agents from your own service. Call [`POST /v1/agent/generate`](/api/reference) with:

- **`prompt`** — system instructions for the agent's personality.
- **`image`** — portrait URL (the 10-second identity video is generated from it internally). Best results from [one clear figure, neutral expression, facing the camera, relaxed pose, face unobstructed](#what-makes-a-good-photo).
- **`audio`** — voice sample URL (3–10 s of clean speech) for voice cloning.
- **`model`** — which avatar model to build. An omitted `model` defaults to `expression-1` (Expression 1, 250 credits, since 2026-07-12); send `"auto"` to let the platform pick between the second-generation models, or name one explicitly.

Video is not part of the creation contract for any model and is being removed
platform-wide: do not send `video` — as the rollout completes, a request
carrying it is rejected with
[`400 VIDEO_INPUT_NOT_SUPPORTED`](/api/errors#agent-operations) before
anything is billed.

Set your API secret in the shell first — the call is rejected without it, and it is
read from the environment, never pasted into the body (see
[Authentication](/api/authentication)):

```bash
curl -X POST https://api.bithuman.ai/v1/agent/generate \
  -H "api-secret: $BITHUMAN_API_SECRET" \
  -H "content-type: application/json" \
  -d '{
    "prompt": "You are a friendly receptionist.",
    "image": "https://example.com/headshot.jpg",
    "audio": "https://example.com/voice.wav",
    "model": "auto"
  }'
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


> **Choosing a model.** `"auto"` classifies your input — a photorealistic
> person routes to [`essence-2`](/concepts/essence-2), a stylized / animal /
> creature / robot to [`expression-2`](/concepts/expression-2). You can also
> name a model directly (`essence-2` or `expression-2`);
> note the Essence 2 family requires a photorealistic human subject, so an
> explicit `essence-2*` creation with a non-human input is rejected with
> [`422 MODEL_SUBJECT_MISMATCH`](/api/errors#model-errors) (nothing billed).
> See [Essence 2 & Expression 2](/concepts/models#which-should-i-choose)
> for the full chooser and the [subject gate](/api/agents#the-essence-2-subject-gate-422).

The call returns immediately with `{ agent_id, status: "processing" }`. Poll [`GET /v1/agent/status/{agent_id}`](/api/reference) until `ready`, then drive the resulting `agent_code` like any other avatar. See the [agent lifecycle](/api/agents) for the full generate → resolve → speak flow.

### Media tips for generation

- **Portrait** — one clear figure, neutral expression, facing the camera, relaxed pose, face unobstructed. See [what makes a good photo](#what-makes-a-good-photo).
- **Voice** — 3–10 seconds of clean speech, no background noise or music, mono WAV preferred (16 kHz+).

## What it costs

Creation is a one-time charge per agent — 250 credits for the
first-generation models, 500 for `essence-2`,
2000 for `expression-2`; `auto` bills the routed model's rate. Serving then
bills per active minute. Every number lives on one page:
[Pricing & credits](/guides/pricing).

**A free account cannot generate an agent.** The free tier's monthly credit
allowance is smaller than the cheapest creation charge above, so the call in this
section needs a paid plan — see [Pricing & credits](/guides/pricing) for the
allowance and the plan that covers the model you want. Everything on the download
side stays free either way: `bithuman list`, `bithuman pull <slug>` and
`bithuman open` need no account at all.

## Next steps

- [Deploy via LiveKit](/sdk/livekit) — ship it to production.
- [Embed widget](/guides/deploy-embed) — put it on your site in one line.
- [Pricing & credits](/guides/pricing) — what it costs to run.
- [Quickstart](/api/quickstart) — run your `.imx` in 2 minutes.
- [Avatars and the `.imx` format](/concepts/avatars-imx) — inspect what you built.
- [API reference](/api/reference) — generation and management endpoints.
