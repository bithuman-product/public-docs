---
title: "Errors"
description: "The bitHuman API error format, HTTP status codes, and the full error-code catalog with resolution steps."
section: api
group: "Reference"
order: 50
---

## Error response format

Every error follows the same structured envelope:

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

> **Important** The HTTP transport status **always matches** `status_code` and
> `error.httpStatus` — there is no "200-on-error". An auth failure returns HTTP
> `401`, a validation failure returns HTTP `400`, and so on. You can branch on
> either the HTTP status line or the parsed `error.code`; they never disagree.

## HTTP status codes

| Status | Meaning | Common cause |
|---|---|---|
| `200` | Success | Request completed. |
| `400` | Bad Request | Malformed JSON, missing required parameter (`MISSING_PARAM`), or failed validation (`VALIDATION_ERROR`). |
| `401` | Unauthorized | Invalid `api-secret` (`UNAUTHORIZED`) or absent `api-secret` header (`MISSING_AUTH`). |
| `402` | Payment Required | Insufficient credits — top up to continue. |
| `404` | Not Found | Agent, resource, or endpoint doesn't exist. |
| `413` | Payload Too Large | File exceeds the size limit. |
| `415` | Unsupported Media Type | File type not supported. |
| `429` | Rate Limited | Too many requests — see [rate limits](/api/rate-limits). |
| `500` | Internal Error | Server-side error — retry or contact support. |
| `503` | Service Unavailable | All workers busy — retry with backoff. |

## Error codes

### Authentication

| Code | HTTP | Resolution |
|---|---|---|
| `UNAUTHORIZED` | 401 | The `api-secret` header is present but invalid. Get a valid secret from [Developer → API Keys](https://www.bithuman.ai/#developer). |
| `MISSING_AUTH` | 401 | The `api-secret` header is absent. Add it to your request. |
| `ACCOUNT_SUSPENDED` | 401/403 | Balance below the `-11` suspension floor. Top up, then contact support if it persists. |
| `INSUFFICIENT_BALANCE` | 402 | Top up credits at [www.bithuman.ai](https://www.bithuman.ai). |

### Agent operations

| Code | HTTP | Resolution |
|---|---|---|
| `NOT_FOUND` | 404 | Returned both when no agent matches the code **and** when an agent has no active session for `/speak` / `/add-context`. Distinguish by the `message` string: `"Agent not found for code: <code>"` vs `"No active rooms found for agent <code>"`. |
| `VALIDATION_ERROR` | 400 | Body failed schema validation. Include all required fields. |
| `MISSING_PARAM` | 400 | A required parameter was not provided. |

### File operations

| Code | HTTP | Resolution |
|---|---|---|
| `FILE_TOO_LARGE` | 413 | Images 10 MB, video 100 MB, audio 50 MB, docs 10 MB. |
| `UNSUPPORTED_TYPE` | 415 | Supported: JPEG, PNG, WebP, MP4, WAV, MP3, OGG. |
| `DOWNLOAD_FAILED` | 400 | Ensure the URL is publicly accessible and returns a valid file. |

### Session & infrastructure

| Code | HTTP | Resolution |
|---|---|---|
| `RATE_LIMITED` | 429 | Back off and retry. See [rate limits](/api/rate-limits). |
| `SESSION_LIMIT` | 429 | Concurrent-session capacity reached. Wait for an active session to end, then retry. |
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

# The HTTP status always matches the body's status_code, so either is safe to
# branch on. On error, the body is the structured envelope: {"error": {...}}.
if resp.ok:
    body = resp.json()
    print("Agent generating:", body["data"]["agent_id"] if "data" in body else body.get("agent_id"))
elif resp.status_code in (401, 403):
    print("Auth failed. Check BITHUMAN_API_SECRET.")
elif resp.status_code == 429:
    print("Rate limited. Wait and retry with backoff.")
elif resp.status_code == 503:
    print("Workers busy. Retry in a few seconds.")
else:
    err = resp.json()["error"]
    print(f"Error {err['code']}: {err['message']}")
```

For `429` and `503`, use exponential backoff with jitter — see
[rate limits](/api/rate-limits) for the recommended retry strategy.
