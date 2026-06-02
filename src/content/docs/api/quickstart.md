---
title: "API quickstart"
description: "Pick an existing agent and get a live, talking avatar on your page in two steps — no agent generation required."
section: api
group: "Get started"
order: 2
---

The fastest way to start: **pick an agent that already exists and embed it.**
No generation, no polling, no credits to create one — a live, talking avatar in
two steps. (Want your own custom face later? See
[Generate your own agent](#generate-your-own-agent-optional).)

## 1. Pick an agent

Every agent has a short **code** like `A01GYN2750`. Browse the
[agent gallery](https://www.bithuman.ai/#explore) and copy the code of any one
you like — or use `A01GYN2750` to follow along.

## 2. Embed it

Drop it onto any page as an iframe. It's live and talking immediately — the user
can speak to it and it responds:

```html
<iframe
  src="https://bithuman.ai/embed/A01GYN2750"
  allow="microphone; camera; autoplay"
  style="width: 100%; height: 600px; border: 0;"
></iframe>
```

Replace `A01GYN2750` with your chosen code. That's the whole quickstart — open
the page and start talking.

> **Note** The iframe needs delegated `microphone` permission to hear the user.
> If your page sets a restrictive `Permissions-Policy`, the avatar loads but the
> mic stays silent — allowlist `agent.viewer.bithuman.ai`. For per-visitor
> session tracking and rate limiting, mint a short-lived embed token on your
> backend — see [Embedding](/api/embedding).

---

## Going further

The steps above need no API key. The rest of the platform does — get an API
secret at [Developer → API Keys](https://www.bithuman.ai/#developer) (free tier,
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

Fetch any agent's details by code:

```bash
curl https://api.bithuman.ai/v1/agent/A01GYN2750 \
  -H "api-secret: $BITHUMAN_API_SECRET"
```

### Make it speak from your backend

When an agent has an **active session** (the embed above, or a LiveKit room),
push text into it and the avatar speaks it aloud:

```bash
curl -X POST https://api.bithuman.ai/v1/agent/A01GYN2750/speak \
  -H "api-secret: $BITHUMAN_API_SECRET" \
  -H "content-type: application/json" \
  -d '{"message": "Hello! Great to meet you."}'
```

> **Note** `/speak` and `/add-context` require an active session. With no live
> room you'll get `404 NO_ACTIVE_ROOMS` — open the embed first, or start a
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
`agent_id` immediately and takes ~2–5 minutes (250 credits):

```bash
curl -X POST https://api.bithuman.ai/v1/agent/generate \
  -H "api-secret: $BITHUMAN_API_SECRET" \
  -H "content-type: application/json" \
  -d '{
    "prompt": "You are a friendly fitness coach.",
    "image": "https://example.com/headshot.jpg"
  }'
```

Then poll [`GET /v1/agent/status/{agent_id}`](/api/agents) until `ready` and
embed it exactly like step 2. See [Agents](/api/agents) for the full lifecycle.

## Next steps

- [API reference](/api/reference) — every endpoint with a live console.
- [Embedding](/api/embedding) — production embed tokens and the iframe flow.
- [Authentication](/api/authentication) — runtime tokens and key rotation.
- [Python SDK](/sdk/python) — the same engine, in-process, with the canonical
  [push-audio/drain-frames loop](/concepts/audio-streaming).
