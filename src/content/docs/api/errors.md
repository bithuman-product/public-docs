---
title: "Errors"
description: "The bitHuman API error format, HTTP status codes, and the full error-code catalog with resolution steps."
section: api
group: "Operate & reference"
order: 33
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
| `302` | Redirect | Not an error — [`GET /v1/agent/{code}/model/download`](/api/agents#download-an-agents-model) redirects to the artifact URL by default. |
| `400` | Bad Request | Malformed JSON, missing required parameter (`MISSING_PARAM`), failed validation (`VALIDATION_ERROR`), or a request that can never succeed as posed (`MODEL_NOT_DOWNLOADABLE`). |
| `401` | Unauthorized | Invalid `api-secret` (`UNAUTHORIZED`) or absent `api-secret` header (`MISSING_AUTH`). |
| `402` | Payment Required | Insufficient credits — top up to continue. |
| `404` | Not Found | Agent, resource, or endpoint doesn't exist — or a model artifact not published to the download store yet (`MODEL_ARTIFACT_NOT_READY`, retryable). |
| `409` | Conflict | The request is valid but the agent's **state** doesn't allow it yet (`MODEL_NOT_GENERATED`, `AGENT_NOT_READY`) — a state change (generate/add the model, wait for `ready`) fixes it. |
| `413` | Payload Too Large | File exceeds the size limit. |
| `415` | Unsupported Media Type | File type not supported. |
| `422` | Unprocessable Entity | The request is well-formed but semantically incompatible with the target model (`MODEL_SUBJECT_MISMATCH`, `MODEL_PREREQUISITE_MISSING`) — change the input or asset, not the request syntax. |
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
| `VIDEO_INPUT_NOT_SUPPORTED` | 400 | [Agent creation](/api/agents#generate-an-agent) with a `video` input. Creation is **image-only** for every model — provide a portrait `image`; bitHuman generates the 10-second idle/driver video internally so it loops seamlessly (first frame == last frame). Rejected before dispatch; nothing charged. |
| `MISSING_PARAM` | 400 | A required parameter was not provided. |

### Model errors

The model-release surfaces — [creation](/api/agents#generate-an-agent),
[model add](/api/agents#add-a-model-to-an-existing-agent),
[model download](/api/agents#download-an-agents-model), the
[embed-token `model` field](/api/embedding), and
[talking video](/api/video) — share these codes:

| Code | HTTP | Resolution |
|---|---|---|
| `MODEL_NOT_GENERATED` | 409 | The requested model family isn't in the agent's `supported_models` — it can't be launched (or downloaded) as that family yet. Trained families (`expression-2`, `essence-2-light` — the standard Essence 2's internal family name): `"agent <code>'s <model> model hasn't been generated yet"` — [add the model](/api/agents#add-a-model-to-an-existing-agent) or create the agent with it. `essence-2-max` is gated on the agent's **stored identity video** (generated internally by Essence creations, never uploaded; its identity prepares on demand from that video; the message keeps the internal `essence-2-quality` family name until the platform-side flip). Checked **before any charge**. |
| `AGENT_NOT_READY` | 409 | [`POST /v1/agent/{code}/models`](/api/agents#add-a-model-to-an-existing-agent) on an agent that is still generating or failed. Wait for the current generation to finish, or fix/re-create a failed agent first. |
| `MODEL_SUBJECT_MISMATCH` | 422 | An explicit Essence 2 creation or add whose input is not a **photorealistic human subject** — e.g. `"essence-2 requires a photorealistic human subject; this image looks like a cartoon — use expression-2"`. Nothing is billed and no agent row is created. Use `expression-2` for stylized/non-human subjects, or `model: "auto"` to route automatically. See [the subject gate](/api/agents#the-essence-2-subject-gate-422). |
| `MODEL_PREREQUISITE_MISSING` | 422 | A [model add](/api/agents#add-a-model-to-an-existing-agent) needs a stored asset this agent doesn't have — a stored identity video for `essence-2` (generated internally by Essence creations, never uploaded), face image for `expression-2`, image + voice for `expression-1`, stored identity video or image for `essence-1`. Add the missing image/voice asset, then retry. |
| `MODEL_NOT_DOWNLOADABLE` | 400 | [Model download](/api/agents#download-an-agents-model) for a family with no per-identity artifact — `expression-1` renders server-side from the agent's image. A `400` because no state change can fix it (unlike the 409s). |
| `MODEL_ARTIFACT_NOT_READY` | 404 | [Model download](/api/agents#download-an-agents-model) for a **supported** family whose artifact hasn't been published to the download store yet. Retryable — the message carries a per-family retry hint; poll on this code. |

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
