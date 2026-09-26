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
<iframe src="https://www.bithuman.ai/embed/A78WKV4515" allow="microphone *; camera *; autoplay *" style="width:100%;height:100vh;border:0"></iframe>
```

Replace `A78WKV4515` with your agent code — find it in the
[Library](https://www.bithuman.ai/#library) or the Deploy & Share dialog.

> **Warning** Keep `microphone *` (and `camera *` for camera chat) in `allow`, with the `*`. The embed redirects to another origin, so a bare `allow="microphone"` leaves the microphone silently blocked. A restrictive `Permissions-Policy` on your page blocks it too.

## Production: mint a token

For per-visitor session tracking and rate limiting, mint a short-lived embed
token on your **backend** (never expose your API secret in frontend code) and
append it to the iframe URL.

`POST /v1/embed-tokens/request`

| Field | Type | Required | Description |
|---|---|---|---|
| `agent_id` | string | yes | Agent code (e.g. `A78WKV4515`). |
| `fingerprint` | string | yes | Stable per-visitor string (any format). Used for per-visitor rate limiting, to key the agent's conversation memory so a returning visitor is recognised, and — if you run your own LLM — sent to your endpoint as the OpenAI `user` field so you can tell whose call it is ([details](/api/providers#knowing-which-end-user-a-call-belongs-to)). Supply one value per end user and reuse it across their visits. |
| `model` | string | no | Optional model name: `essence-1`, `expression-1`, `essence-2` or `expression-2`. To pin a serving tier see [Models](/concepts/models#advanced-pin-a-serving-tier). A model outside your plan returns `403 PLAN_REQUIRED`. Validated **early**: unknown values return `400` listing the accepted names; requesting a family the agent can't be launched as (missing from its `supported_models` — a trained model that doesn't exist yet) returns [`409 MODEL_NOT_GENERATED`](/api/errors#model-errors) instead of a failed session later. Omitted → the agent's own default model. |

Every entry of `supported_models` in the mint response (and in `GET /v1/agent/status/{id}`) is a model name you can send back as `model` unchanged.

```js
// server: mint token (api-secret never reaches the browser)
const visitorFingerprint = "3f9a2c1b8e7d4a6f0b21c4d5e6f70812"; // one stable id per visitor, persisted
const res = await fetch("https://api.bithuman.ai/v1/embed-tokens/request", {
  method: "POST",
  headers: {
    "api-secret": process.env.BITHUMAN_API_SECRET,
    "content-type": "application/json",
  },
  body: JSON.stringify({
    agent_id: "A78WKV4515",
    fingerprint: visitorFingerprint,
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
    "model": "expression-2",
    "supported_models": ["essence-1", "expression-2"]
  }
}
```

The `token` is a **1-hour, HS256-signed JWT**. Mint one per visitor session.
`supported_models` lists the canonical model families the agent can be
launched as right now (useful for building your own model picker). The
response always includes the `model` baked into the token (the agent's own
model when you omit it).

### Use the token in the iframe

Pass it as a query string:

```html
<iframe src="https://www.bithuman.ai/embed/A78WKV4515?token=THE_TOKEN" allow="microphone *; camera *; autoplay *" style="width:100%;height:100vh;border:0"></iframe>
```

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
