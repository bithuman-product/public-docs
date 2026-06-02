---
title: "Errors"
description: "The bitHuman API error format, HTTP status codes, and the full error-code catalog with resolution steps."
section: api
group: "Reference"
order: 50
---

## Error response format

All errors follow the same structure:

```json
{
  "error": {
    "code": "ERROR_CODE",
    "message": "Human-readable description of what went wrong.",
    "httpStatus": 401
  },
  "status": "error",
  "status_code": 401
}
```

> **Important** Some endpoints (e.g. `GET /v1/agent/{code}`) return the real code
> in the **body** (`status_code` / `error.code`) while the HTTP transport status is
> still `200`. A few endpoints (e.g. an auth failure on `POST /v1/tts`) return a
> bare `{"error": "Unauthorized"}` instead of the structured envelope. So always
> branch on the parsed body's `status_code` / `error.code`, not just the HTTP
> status line.

## HTTP status codes

| Status | Meaning | Common cause |
|---|---|---|
| `200` | Success | Request completed. |
| `400` | Bad Request | Malformed JSON or unexpected payload shape. |
| `401` | Unauthorized | Invalid or missing `api-secret` header. |
| `402` | Payment Required | Insufficient credits — top up to continue. |
| `404` | Not Found | Agent, resource, or endpoint doesn't exist. |
| `413` | Payload Too Large | File exceeds the size limit. |
| `415` | Unsupported Media Type | File type not supported. |
| `422` | Validation Error | Body parsed but failed schema validation. |
| `429` | Rate Limited | Too many requests — see [rate limits](/api/rate-limits). |
| `500` | Internal Error | Server-side error — retry or contact support. |
| `503` | Service Unavailable | All workers busy — retry with backoff. |

## Error codes

### Authentication

| Code | HTTP | Resolution |
|---|---|---|
| `UNAUTHORIZED` | 401 | Check your `api-secret` header. Get a valid secret from [Developer → API Keys](https://www.bithuman.ai/#developer). |
| `MISSING_AUTH` | 401 | Add the `api-secret` header to your request. |
| `ACCOUNT_SUSPENDED` | 401/403 | Balance below the `-11` suspension floor. Top up, then contact support if it persists. |
| `INSUFFICIENT_BALANCE` | 402 | Top up credits at [www.bithuman.ai](https://www.bithuman.ai). |

### Agent operations

| Code | HTTP | Resolution |
|---|---|---|
| `AGENT_NOT_FOUND` | 404 | Check the agent code. Use `POST /v1/validate` to confirm your secret has access. |
| `AGENT_FAILED` | 400 | Generation failed. Check `error_message`; retry with different parameters. |
| `VALIDATION_ERROR` | 422 | Body failed schema validation. Include all required fields. |
| `NO_ACTIVE_ROOMS` | 404 | The agent must be in an active session before you can `/speak` or `/add-context`. |
| `MISSING_PARAM` | 400 | A required parameter was not provided. |

### File operations

| Code | HTTP | Resolution |
|---|---|---|
| `FILE_TOO_LARGE` | 413 | Images 10 MB, video 100 MB, audio 50 MB, docs 10 MB. |
| `UNSUPPORTED_TYPE` | 415 | Supported: JPEG, PNG, WebP, MP4, WAV, MP3, OGG. |
| `DOWNLOAD_FAILED` | 400 | Ensure the URL is publicly accessible and returns a valid file. |

### Dynamics

| Code | HTTP | Resolution |
|---|---|---|
| `DYNAMICS_NOT_FOUND` | 404 | Generate dynamics first with `POST /v1/dynamics/generate`. |

### Session & infrastructure

| Code | HTTP | Resolution |
|---|---|---|
| `RATE_LIMITED` | 429 | Back off and retry. See [rate limits](/api/rate-limits). |
| `SESSION_LIMIT` | 429 | Concurrent-session limit reached. Wait for a session to end or upgrade your tier. |
| `NO_AVAILABLE_WORKERS` | 503 | All workers busy. Retry with exponential backoff (up to 5 times). |
| `INTERNAL_ERROR` | 500 | Retry once. If persistent, report via [Discord](https://discord.gg/ES953n7bPA). |

## Handling errors in Python

```python
import requests

resp = requests.post(
    "https://api.bithuman.ai/v1/agent/generate",
    headers={"api-secret": api_secret, "Content-Type": "application/json"},
    json={"prompt": "You are a helpful assistant"},
)

# Branch on the BODY's status_code/error.code, not just resp.status_code —
# some endpoints return the real code in the body while the HTTP status is 200.
body = resp.json() if resp.headers.get("content-type", "").startswith("application/json") else {}
code = body.get("status_code", resp.status_code)
err = body.get("error")
err_code = err.get("code") if isinstance(err, dict) else err  # dict envelope or bare string

if code == 200:
    print("Agent generating:", body["data"]["agent_id"] if "data" in body else body.get("agent_id"))
elif code in (401, 403):
    print("Auth failed. Check BITHUMAN_API_SECRET.")
elif code == 429:
    print("Rate limited. Wait and retry with backoff.")
elif code == 503:
    print("Workers busy. Retry in a few seconds.")
else:
    msg = err.get("message") if isinstance(err, dict) else err
    print(f"Error {err_code}: {msg}")
```

For `429` and `503`, use exponential backoff with jitter — see
[rate limits](/api/rate-limits) for the recommended retry strategy.
