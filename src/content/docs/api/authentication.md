---
title: "Authentication"
description: "Authenticate REST calls with the api-secret header, check a secret with /v1/validate, and use short-lived tokens where a secret must not go."
section: api
group: "Get started"
order: 2
type: endpoint
label: "Authentication"
---

Every REST call carries your API secret in the `api-secret` header. The same secret works for the SDKs and the CLI ([Your API secret](/start/api-secret)). Create one under [Developer → API Secrets](https://www.bithuman.ai/developer/api-keys); the value is shown once.

| Method | Path | Purpose | Credits |
|---|---|---|---|
| `POST` | `/v1/validate` | Check an API secret | free |
| `POST` | `/v1/runtime-tokens/request` | Exchange the secret for a short-lived runtime token (the SDKs do this for you) | free |
| `POST` | `/v1/runtime-tokens/mint` | A one-hour token for one agent in one LiveKit room | free |
| `POST` | `/v1/embed-tokens/request` | A one-hour token for a browser embed ([Embedding](/api/embedding)) | free |

## POST /v1/validate

Checks the secret in the `api-secret` header. Always returns `200`; read `valid`.

### Example

```bash
curl -s -X POST https://api.bithuman.ai/v1/validate -H "api-secret: $BITHUMAN_API_SECRET"
```

```python
import os, requests

r = requests.post("https://api.bithuman.ai/v1/validate", headers={"api-secret": os.environ["BITHUMAN_API_SECRET"]})
print(r.json())
```

### Response

```json
{"valid": true}
```

## POST /v1/runtime-tokens/request

Exchanges the API secret for a short-lived runtime token that authorizes rendering for your account. The Python SDK, the LiveKit plugin and the self-hosted containers call it for you and renew the token while a session runs; call it yourself only when you build your own runtime integration. A runtime token cannot create other tokens or call other endpoints.

## POST /v1/runtime-tokens/mint

Mints a one-hour token for `"scope": "livekit-cloud"` that can only start one agent's avatar in one LiveKit room. Pass it to the LiveKit plugin instead of your secret, because the plugin writes its credential into room attributes every participant can read. The request and a complete worker are on [LiveKit](/sdk/livekit#authenticate).

## Keep the secret safe

- Keep it in the environment or a secrets manager, never in source, a command line or an app bundle.
- Browsers get an [embed token](/api/embedding); LiveKit rooms get a minted token; shipped apps fetch a credential from your backend.
- `BITHUMAN_API_KEY` is a deprecated alias of `BITHUMAN_API_SECRET`.

## Rotate a secret

Create the new secret, move your services to it, then revoke the old one under [API Secrets](https://www.bithuman.ai/developer/api-keys). Revocation is immediate: sessions still using the old secret stop at their next usage report. The CLI's per-device secrets (`cli@<hostname>`) revoke one machine at a time. The API equivalents are on [API secrets](/api/api-keys).

## Errors

| Status | Code | Cause | Fix |
|---|---|---|---|
| `401` | `MISSING_AUTH` | no `api-secret` header | send the header on every request |
| `401` | `UNAUTHORIZED` | the secret is invalid, or a revoked secret on a REST endpoint | check it with `/v1/validate`; create a new one |
| `403` | `RUNTIME_SUSPENDED` | a revoked secret on a token endpoint (`/v1/runtime-tokens/*`, `/v1/embed-tokens/request`) | create a new secret and move your services to it |
| `403` | `RUNTIME_SUSPENDED` | runtime access is suspended for the account; the message says so | contact support |
| `403` | `SECRET_REVEAL_CONSOLE_ONLY` | reading a stored secret's value with an API secret | reveal secrets in the console |

All codes: [Errors](/api/errors).
