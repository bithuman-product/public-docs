---
title: "Embedding API"
description: "Mint short-lived JWT tokens from your backend and embed a talking avatar on any website via an iframe."
section: api
group: "Deliver"
order: 20
type: endpoint
label: "Embedding"
---

## Embed an avatar

Drop an agent onto any page as an iframe — no SDK install required:

```html
<iframe
  src="https://bithuman.ai/embed/A78WKV4515"
  allow="microphone *; camera *; autoplay *"
  style="width: 100%; height: 600px; border: 0;"
></iframe>
```

Replace `A78WKV4515` with your agent code — find it in the
[Library](https://www.bithuman.ai/#library) or the Deploy & Share dialog.

> **Warning** The iframe needs delegated `microphone` permission to hear the
> user — and the `*` in the `allow` attribute is load-bearing. The embed URL
> redirects cross-origin to `agent.viewer.bithuman.ai`, so a bare
> `allow="microphone"` (which pins to the iframe's `src` origin) leaves the
> mic silently blocked after the redirect. Use `microphone *` (or allowlist
> `https://agent.viewer.bithuman.ai` explicitly). The same applies if the
> embedding page sets a restrictive `Permissions-Policy`.

## Production: mint a token

For per-visitor session tracking and rate limiting, mint a short-lived embed
token on your **backend** (never expose your API secret in frontend code) and
append it to the iframe URL.

`POST /v1/embed-tokens/request`

| Field | Type | Required | Description |
|---|---|---|---|
| `agent_id` | string | yes | Agent code (e.g. `A78WKV4515`). |
| `fingerprint` | string | yes | Stable per-visitor hex string. Used for per-visitor rate limiting, to key the agent's conversation memory so a returning visitor is recognised, and — if you run your own LLM — sent to your endpoint as the OpenAI `user` field so you can tell whose call it is ([details](/api/providers#knowing-which-end-user-a-call-belongs-to)). Supply one value per end user and reuse it across their visits. |
| `model` | string | no | Request a specific avatar model for the session — a model name (`essence-1`, `expression-1`, `essence-2`, `expression-2`) or a force-tier slug (`essence-2-gpu/-apple/-cpu`, `expression-2-gpu/-cpu/-apple`; the older `-ane` spelling stays accepted for saved links, embeds and share tokens — [per model](/concepts/models#advanced-pin-a-serving-tier)). Validated **early**: unknown values return `400` listing the accepted names; requesting a family the agent can't be launched as (missing from its `supported_models` — a trained model that doesn't exist yet) returns [`409 MODEL_NOT_GENERATED`](/api/errors#model-errors) instead of a failed session later. Omitted → the agent's own default model. |

> **Reading `supported_models` back into `model`.** The mint response (and
> `GET /v1/agent/status/{id}`) returns `supported_models`. Every entry is a
> **public** model name and can be sent back verbatim — the internal tier
> spellings `essence-2-light` / `essence-2-quality` are folded before the
> response is built, so they never appear in the array.

```js
// server: mint token (api-secret never reaches the browser)
const res = await fetch("https://api.bithuman.ai/v1/embed-tokens/request", {
  method: "POST",
  headers: {
    "api-secret": process.env.BITHUMAN_API_SECRET,
    "content-type": "application/json",
  },
  body: JSON.stringify({
    agent_id: "A78WKV4515",
    fingerprint: visitorFingerprint, // stable per-device hex
  }),
});
const { data: { token } } = await res.json();
```

### Response

```json
{
  "status": "success",
  "status_code": 200,
  "data": {
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "sid": "f3c9...",
    "supported_models": ["essence-2", "expression-2"]
  }
}
```

The `token` is a **1-hour, HS256-signed JWT**. Mint one per visitor session.
`supported_models` lists the canonical model families the agent can be
launched as right now (useful for building your own model picker); when you
requested a `model`, the response also echoes the `model` baked into the
token.

### Use the token in the iframe

Pass it as a query string (or as the `data-token` attribute on the embed widget
script tag):

```html
<iframe
  src="https://bithuman.ai/embed/A78WKV4515?token=THE_TOKEN"
  allow="microphone *; camera *; autoplay *"
  style="width: 100%; height: 600px; border: 0;"
></iframe>
```

## Pin a serving tier

To pin a session to one cloud tier for a benchmark, append a force-tier slug as
`?model=` to the iframe URL — or, better, pass it as `model` when you mint the
token, so a typo is refused with a `400` instead of being ignored:

```html
<iframe
  src="https://bithuman.ai/embed/A66GYD8664?token=THE_TOKEN&model=expression-2-cpu"
  allow="microphone *; camera *; autoplay *"
  style="width: 400px; height: 700px; border: 0;"
></iframe>
```

The slugs and what a pin does are on
[pin a serving tier](/concepts/models#advanced-pin-a-serving-tier). For
production, omit `model` and let the platform choose.

## Session events

An agent can POST `room.join` and `chat.push` events to a URL of yours as its
conversations happen — see [session events](/api/webhooks#session-events).

## Notes

- The embed token is more constrained than a [runtime token](/api/authentication)
  — it's purpose-built for cross-origin iframe authentication.
- WebRTC requires a secure context: serve the embedding page over **HTTPS** or
  the browser will block microphone access (except on `localhost`).
- The `fingerprint` should be generated once per device and persisted, so
  per-visitor rate limits track the same visitor across sessions.
- An embedded session bills to the agent's owner at the rates on
  [pricing](/guides/pricing).

See the interactive [API reference](/api/reference) for the full request and
response schema.
