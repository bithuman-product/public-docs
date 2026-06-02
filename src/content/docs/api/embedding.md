---
title: "Embedding API"
description: "Mint short-lived JWT tokens from your backend and embed a talking avatar on any website via an iframe."
section: api
group: "Platform"
order: 40
---

## Embed an avatar

Drop an agent onto any page as an iframe — no SDK install required:

```html
<iframe
  src="https://bithuman.ai/embed/A78WKV4515"
  allow="microphone; camera; autoplay"
  style="width: 100%; height: 600px; border: 0;"
></iframe>
```

Replace `A78WKV4515` with your agent code.

> **Warning** The iframe needs delegated `microphone` permission to hear the
> user. If the embedding page sets a restrictive `Permissions-Policy`, the
> avatar will load but the mic will stay silent — allowlist
> `agent.viewer.bithuman.ai` in the parent's policy.

## Production: mint a token

For per-visitor session tracking and rate limiting, mint a short-lived embed
token on your **backend** (never expose your API secret in frontend code) and
append it to the iframe URL.

`POST /v1/embed-tokens/request`

| Field | Type | Required | Description |
|---|---|---|---|
| `agent_id` | string | yes | Agent code (e.g. `A78WKV4515`). |
| `fingerprint` | string | yes | Stable per-device hex string for session tracking and per-visitor rate limiting. |

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
    "sid": "f3c9..."
  }
}
```

The `token` is a **1-hour, HS256-signed JWT**. Mint one per visitor session.

### Use the token in the iframe

Pass it as a query string (or as the `data-token` attribute on the embed widget
script tag):

```html
<iframe
  src="https://bithuman.ai/embed/A78WKV4515?token=THE_TOKEN"
  allow="microphone; camera; autoplay"
  style="width: 100%; height: 600px; border: 0;"
></iframe>
```

## Notes

- The embed token is more constrained than a [runtime token](/api/authentication)
  — it's purpose-built for cross-origin iframe authentication.
- WebRTC requires a secure context: serve the embedding page over **HTTPS** or
  the browser will block microphone access (except on `localhost`).
- The `fingerprint` should be generated once per device and persisted, so
  per-visitor rate limits track the same visitor across sessions.

See the interactive [API reference](/api/reference) for the full request and
response schema.
