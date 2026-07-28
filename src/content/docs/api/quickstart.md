---
title: "API quickstart"
description: "Pick an existing agent and get a live, talking avatar on your page in two steps — no agent generation required."
section: api
group: "Get started"
order: 1
---

The fastest way to start: **pick an agent that already exists and embed it.**
No generation, no polling, no credits to create one — a live, talking avatar in
two steps. (Want your own custom face later? See
[Generate your own agent](#generate-your-own-agent-optional).)

## 1. Pick an agent

Every agent has a short **code** like `A78WKV4515`. Browse the
[agent gallery](https://www.bithuman.ai/explore) and copy the code of any one
you like — or use `A78WKV4515` to follow along.

## 2. Embed it

Drop it onto any page as an iframe. It's live and talking immediately — the user
can speak to it and it responds:

```html
<iframe
  src="https://bithuman.ai/embed/A78WKV4515"
  allow="microphone *; camera *; autoplay *"
  style="width: 100%; height: 600px; border: 0;"
></iframe>
```

Replace `A78WKV4515` with your chosen code. That's the whole quickstart — open
the page and start talking.

> **Note** The iframe needs delegated `microphone` permission to hear the user,
> and the `*` in the `allow` attribute is load-bearing — the embed URL redirects
> cross-origin to `agent.viewer.bithuman.ai`, so a bare `allow="microphone"`
> leaves the mic silently blocked. If your page sets a restrictive
> `Permissions-Policy`, the avatar loads but the mic stays silent — allowlist
> `agent.viewer.bithuman.ai`. For per-visitor
> session tracking and rate limiting, mint a short-lived embed token on your
> backend — see [Embedding](/api/embedding).

---

## Going further

The steps above need no API key. The rest of the platform does — get an API
secret at [Developer → API Keys](https://www.bithuman.ai/developer/api-keys) (free tier,
no credit card) and export it:

```bash
export BITHUMAN_API_SECRET=your_api_secret
```

Verify it with the cheapest call there is — no credits, no agent needed:

```bash
curl -X POST https://api.bithuman.ai/v1/validate \
  -H "api-secret: $BITHUMAN_API_SECRET"
```

It always returns HTTP `200` — read the body: `{"valid": true}` means you're set, `{"valid": false}` means the secret is missing or wrong.

### Look up an agent

Fetch **one of your own** agents by code. List them first — `GET /v1/agents`
returns every agent on your account:

```bash
curl "https://api.bithuman.ai/v1/agents?limit=5" \
  -H "api-secret: $BITHUMAN_API_SECRET"
```

Then read one by its code (substitute a code from the list above):

```bash
curl https://api.bithuman.ai/v1/agent/YOUR_AGENT_CODE \
  -H "api-secret: $BITHUMAN_API_SECRET"
```

> **Note** `/v1/agent/{code}` is **owner-scoped**. A gallery code you do not own
> — including the `A78WKV4515` used for the embed above — returns
> `404 NOT_FOUND` (`"Agent not found for code: …"`) even with a perfectly valid
> key. That is an ownership answer, not a "this agent doesn't exist" answer:
> the same code still embeds and still mints an
> [embed token](/api/embedding). Only agents on your own account are readable,
> speakable, and renderable through the [Video API](/api/video).

### Make it speak from your backend

When one of **your** agents has an **active session** (an embed of it, or a
LiveKit room), push text into it and the avatar speaks it aloud:

```bash
curl -X POST https://api.bithuman.ai/v1/agent/YOUR_AGENT_CODE/speak \
  -H "api-secret: $BITHUMAN_API_SECRET" \
  -H "content-type: application/json" \
  -d '{"message": "Hello! Great to meet you."}'
```

> **Note** `/speak` and `/add-context` need both **ownership** and an active
> session, and both failures are reported as `404 NOT_FOUND` — read the message
> to tell them apart. `"Agent not found for code: <code>"` means the agent is
> not on your account; `"No active rooms found
> for agent <code>"` means it is yours but idle — open the embed first, or start a
> [LiveKit worker](/api/embedding).

### Voice without an avatar

Text-to-speech needs no agent at all — one call returns a WAV:

```bash
curl -X POST https://api.bithuman.ai/v1/tts \
  -H "api-secret: $BITHUMAN_API_SECRET" \
  -H "content-type: application/json" \
  -d '{"text": "Hello from bitHuman.", "voice": "F1"}' \
  --output hello.wav
```

See [Text to Speech](/api/text-to-speech) for languages, voices, and streaming.

## Generate your own agent (optional)

Prefer a custom face and persona? Generation is asynchronous — it returns an
`agent_id` immediately and takes a few minutes for the default `expression` +
`v1` engine (Expression 1, 250 credits). Select an engine with `model`
(`expression` default, or `essence`) plus `version` (`v1` default, or `v2`) —
`essence` + `v2` → Essence 2, `expression` + `v2` → Expression 2; the full
engine names (`essence-1` … `expression-2`) still work directly too. The
[second-generation models](/concepts/models-v2) train a real per-identity
model, so they take roughly 45 minutes to 1.5 hours and cost more — 500 credits for
Essence 2, 2000 for Expression 2; see
[per-model creation](/api/agents#model-specific-inputs-and-creation-times).
Creation is image-only — a seamless 10-second identity video is generated
internally:

```bash
curl -X POST https://api.bithuman.ai/v1/agent/generate \
  -H "api-secret: $BITHUMAN_API_SECRET" \
  -H "content-type: application/json" \
  -d '{
    "prompt": "You are a friendly fitness coach.",
    "image": "https://example.com/headshot.jpg",
    "model": "expression",
    "version": "v2",
    "aspect_ratio": "9:16",
    "transparency": false
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


Then poll [`GET /v1/agent/status/{agent_id}`](/api/agents) until `ready` and
embed it exactly like step 2. See [Agents](/api/agents) for the full lifecycle.

## Next steps

- [Authentication](/api/authentication) — keys, tokens, and how auth works.
- [Agents API](/api/agents) — generate, update, and drive agents.
- [Embed widget](/api/embedding) — drop your agent into any page.
- [API reference](/api/reference) — every endpoint with a live console.
- [Python SDK](/sdk/python) — the same engine, in-process, with the canonical
  [push-audio/drain-frames loop](/concepts/audio-streaming).
