---
title: "Embed widget"
description: "Drop a talking avatar onto any website with a single iframe — zero backend — and mint short-lived embed tokens for per-visitor session tracking."
section: guides
group: "Deploy"
order: 12
---

## Drop-in iframe

Embed an agent as an iframe — no SDK install, drop it on any page. The avatar runs in bitHuman's cloud; your page just hosts the frame:

```html
<iframe
  src="https://bithuman.ai/embed/A78WKV4515"
  allow="microphone *; camera *; autoplay *"
  style="width: 400px; height: 700px; border: none; border-radius: 12px;"
></iframe>
```

Replace `A78WKV4515` with your agent code — find it in the [Library](https://www.bithuman.ai/#library) or the Deploy & Share dialog. URL parameters customize the widget.

> **Note** The `allow` attribute must grant `microphone` (and `camera`, if you use vision) to the embed origin. If the parent page sets a restrictive `Permissions-Policy`, allowlist `agent.viewer.bithuman.ai` or the mic prompt won't appear in some browsers.

## Production: mint short-lived embed tokens

For per-visitor session tracking and rate limiting, mint a short-lived embed token from your backend and pass it to the iframe. Your `api-secret` never reaches the browser. (The mint endpoint authenticates your `api-secret` upstream and is covered by a per-IP [request limit](/api/rate-limits) rather than your plan tiers.)

```js
// SERVER — mint a token (api-secret stays server-side)
const res = await fetch("https://api.bithuman.ai/v1/embed-tokens/request", {
  method: "POST",
  headers: {
    "api-secret": process.env.BITHUMAN_API_SECRET,
    "content-type": "application/json",
  },
  body: JSON.stringify({
    agent_id: "A78WKV4515",
    fingerprint: visitorFingerprint,   // stable per-device hex — required
  }),
});
const { data: { token } } = await res.json();
```

```html
<!-- BROWSER — pass the token in the iframe URL -->
<iframe
  src="https://bithuman.ai/embed/A78WKV4515?token=YOUR_TOKEN"
  allow="microphone *; camera *; autoplay *"
  style="width: 400px; height: 700px; border: none;"
></iframe>
```

The token is a **1-hour JWT** (HS256-signed). Mint one per visitor session. Both `agent_id` and `fingerprint` are required; the response also returns a `sid` session identifier for tracking the embed instance. See [`POST /v1/embed-tokens/request`](/api/reference) for the full request shape.

## Webhooks

bitHuman POSTs to your endpoint when session events occur. Return `200` immediately and offload work to a queue — long handlers risk the timeout.

**`room.join`** — fired once when a user connects:

```json
{ "agent_code": "A91XMB7113", "event_type": "room.join",
  "data": { "room_name": "support", "participant_count": 1,
            "session_id": "session_xyz" }, "timestamp": 1705312200.0 }
```

**`chat.push`** — fired per message (user and agent):

```json
{ "agent_code": "A91XMB7113", "event_type": "chat.push",
  "data": { "role": "user", "message": "help with order #12345",
            "session_id": "session_xyz" }, "timestamp": 1705312285.0 }
```

Endpoint setup, signature verification, and retry policy are in the [API reference](/api/reference).

## Where to go next

- [Essence 2 & Expression 2](/concepts/models-v2) — the second-generation models, including the advanced per-tier `?model=` override for embed URLs.
- [Deploy via LiveKit](/guides/deploy-livekit) — full agent-worker integration.
- [Browser rendering](/guides/browser-rendering) — render client-side to cut server video egress.
- [API reference](/api/reference) — embed tokens, agents, and webhooks.
- [Pricing](/guides/pricing) — what an embedded session costs.
