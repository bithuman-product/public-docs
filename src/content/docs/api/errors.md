---
title: "Errors"
description: "The bitHuman API error format, HTTP status codes, and the full error-code catalog with resolution steps."
section: api
group: "Reference"
order: 40
type: reference
label: "Errors"
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

The HTTP status always matches `status_code` and `error.httpStatus`; there is no "200 on error". Branch on either the status or `error.code`.

### 502 and 504 may not be JSON

A `502` or `504` comes either from the API (the envelope above, code
`UPSTREAM_UNAVAILABLE` or `UPSTREAM_TIMEOUT`) or from the delivery network in
front of it (an HTML page). Check `Content-Type` before parsing any error, and
fall back to the HTTP status line when it is not `application/json`. Both are
transient: retry after `Retry-After` seconds when present, otherwise back off.

## HTTP status codes

| Status | Meaning | Common cause |
|---|---|---|
| `200` | Success | Request completed. |
| `302` | Redirect | Not an error — [`GET /v1/agent/{code}/model/download`](/api/agents#download-an-agents-model) redirects to the artifact URL by default. |
| `400` | Bad Request | Malformed JSON, missing required parameter (`MISSING_PARAM`), failed validation (`VALIDATION_ERROR`), or a request that can never succeed as posed (`MODEL_NOT_DOWNLOADABLE`). |
| `401` | Unauthorized | Invalid `api-secret` (`UNAUTHORIZED`) or absent `api-secret` header (`MISSING_AUTH`). |
| `402` | Payment Required | Insufficient credits — top up to continue. |
| `403` | Forbidden | The credential is known but refused here: a revoked secret on a token endpoint (`RUNTIME_SUSPENDED`), a session limit (`CONCURRENCY_LIMIT_REACHED`, `SESSION_DURATION_LIMIT`), a model outside your plan (`PLAN_REQUIRED`), or a secret's value read with an API secret (`SECRET_REVEAL_CONSOLE_ONLY`). |
| `404` | Not Found | Agent, resource, or endpoint doesn't exist — or a model artifact not published to the download store yet (`MODEL_ARTIFACT_NOT_READY`, retryable). |
| `410` | Gone | The agent was deleted (`AGENT_DELETED`, `AGENT_PURGED`). |
| `409` | Conflict | The request is valid but the agent's **state** doesn't allow it yet (`MODEL_NOT_GENERATED`, `AGENT_NOT_READY`) — a state change (generate/add the model, wait for `ready`) fixes it. |
| `413` | Payload Too Large | File exceeds the size limit. |
| `415` | Unsupported Media Type | File type not supported. |
| `422` | Unprocessable Entity | The request is well-formed but semantically incompatible with the target model (`MODEL_SUBJECT_MISMATCH`, `MODEL_PREREQUISITE_MISSING`) — change the input or asset, not the request syntax. |
| `429` | Rate Limited | Too many requests — see [rate limits](/api/rate-limits). |
| `500` | Internal Error | Server-side error — retry or contact support. |
| `502` / `504` | Bad Gateway / Gateway Timeout | Transient. JSON from the API, HTML from the delivery network ([above](#502-and-504-may-not-be-json)). Retry after `Retry-After`. |
| `503` | Service Unavailable | Temporarily unavailable or at capacity (`SERVICE_UNAVAILABLE`), or a model paused for your account (`MODEL_NOT_YET_AVAILABLE`). Retry after `Retry-After`, with backoff. |

## Error codes

### Authentication

| Code | HTTP | Resolution |
|---|---|---|
| `UNAUTHORIZED` | 401 | The `api-secret` header is present but invalid. Get a valid secret from [Developer → API Secrets](https://www.bithuman.ai/developer/api-keys). |
| `MISSING_AUTH` | 401 | The `api-secret` header is absent. Add it to your request. |
| `RUNTIME_SUSPENDED` | 403 | A token endpoint refused the secret: it was revoked (create a new one), or runtime access is suspended (contact support). |
| `ACCOUNT_SUSPENDED` | 403 | Your balance is too far below zero. Top up; contact support if it persists. |
| `PLAN_REQUIRED` | 403 | The model you named is not in your plan; the message names the plan. [Contact sales](https://www.bithuman.ai/sales). |
| `SECRET_REVEAL_CONSOLE_ONLY` | 403 | An API secret tried to read a stored secret's value. Reveal it in the console, or create a new secret. |
| `INSUFFICIENT_BALANCE` | 402 | Top up credits at [www.bithuman.ai](https://www.bithuman.ai). |

### Agent operations

| Code | HTTP | Resolution |
|---|---|---|
| `NOT_FOUND` | 404 | Returned both when no agent matches the code **and** when an agent has no active session for `/speak` / `/add-context`. Distinguish by the `message` string: `"Agent not found for code: <code>"` vs `"No active rooms found for agent <code>"`. |
| `VALIDATION_ERROR` | 400 | Body failed schema validation. Include all required fields. |
| `VIDEO_INPUT_NOT_SUPPORTED` | 400 | [Agent creation](/api/agents#generate-an-agent) with a `video` input. Creation is **image-only** for every model — provide a portrait `image`; bitHuman generates the 10-second identity video internally so it loops seamlessly (first frame == last frame). Nothing is charged; never send `video`. |
| `MISSING_PARAM` | 400 | A required parameter was not provided. |
| `IMAGE_FACE_UNSUITABLE` | 422 | Essence 2 creation or add: the face is too small, missing, or one of several similar faces. Upload a closer waist-up or head-and-shoulders photo of one person. Nothing is charged. |
| `AGENT_DELETED` / `AGENT_PURGED` | 410 | The agent was deleted; model download, gestures and talking video refuse it. Create a new agent. |

### Model errors

The model-release surfaces — [creation](/api/agents#generate-an-agent),
[model add](/api/agents#add-a-model-to-an-existing-agent),
[model download](/api/agents#download-an-agents-model), the
[embed-token `model` field](/api/embedding), and
[talking video](/api/video) — share these codes:

| Code | HTTP | Resolution |
|---|---|---|
| `MODEL_NOT_GENERATED` | 409 | The requested model family isn't in the agent's `supported_models` — it can't be launched (or downloaded) as that family yet. **The message names the fix**: the exact [model-add](/api/agents#add-a-model-to-an-existing-agent) call and its cost when this agent qualifies for it, or the missing asset when it doesn't. Trained families (`expression-2`, `essence-2`): `"agent <code>'s <model> model hasn't been generated yet — add it with POST /v1/agent/<code>/models …"`. `expression-1` reads `"isn't enabled on this agent yet"` instead — nothing is ever trained for it, and the add is **instant and free** (see [Add a model to an existing agent](/api/agents#add-a-model-to-an-existing-agent)). Checked **before any charge**. |
| `AGENT_NOT_READY` | 409 | [`POST /v1/agent/{code}/models`](/api/agents#add-a-model-to-an-existing-agent) on an agent that is still generating or failed. Wait for the current generation to finish, or fix/re-create a failed agent first. |
| `MODEL_SUBJECT_MISMATCH` | 422 | An explicit Essence 2 creation or add whose input is not a **photorealistic human subject** — e.g. `"essence-2 requires a photorealistic human subject; this image looks like a cartoon — use expression-2"`. Nothing is billed and no agent row is created. Use `expression-2` for stylized/non-human subjects, or `model: "auto"` to route automatically. See [the subject gate](/api/agents#generate-an-agent). |
| `MODEL_PREREQUISITE_MISSING` | 422 | A [model add](/api/agents#add-a-model-to-an-existing-agent) needs a stored asset this agent doesn't have — a stored identity video for `essence-2` (generated internally by Essence creations, never uploaded), face image for `expression-2`, image + voice for `expression-1`, stored identity video or image for `essence-1`. Add the missing image/voice asset, then retry. |
| `MODEL_NOT_DOWNLOADABLE` | 400 | [Model download](/api/agents#download-an-agents-model) for a family with no per-identity artifact — `expression-1` renders server-side from the agent's image. A `400` because no state change can fix it (unlike the 409s). |
| `MODEL_NOT_YET_AVAILABLE` | 503 | A model is paused for your account (not returned in normal operation). Nothing is charged; retry later or use another model. |
| `MODEL_ARTIFACT_NOT_READY` | 404 | [Model download](/api/agents#download-an-agents-model) for a **supported** family whose artifact hasn't been published to the download store yet. Retryable — the message carries a per-family retry hint; poll on this code. |

### File operations

| Code | HTTP | Resolution |
|---|---|---|
| `FILE_TOO_LARGE` | 413 | Images 10 MB, video 100 MB, audio and documents 25 MB. |
| `UNSUPPORTED_TYPE` | 415 | The bytes are not a supported type, they contradict `file_type`, the filename extension is not one [File upload](/api/files) lists, or the file would run in a browser (SVG, HTML, scripted text). |
| `DOWNLOAD_FAILED` | 400 | Ensure the URL is publicly accessible and returns a valid file. |

### Session & infrastructure

| Code | HTTP | Resolution |
|---|---|---|
| `RATE_LIMITED` | 429 | Back off and retry. See [rate limits](/api/rate-limits). |
| `CONCURRENCY_LIMIT_REACHED` | 403 | A new session start would exceed your plan's [concurrent avatar session allowance](/api/rate-limits#session-concurrency). End an active session or upgrade the plan, then retry — live sessions are never cut off mid-stream by this limit. |
| `SESSION_DURATION_LIMIT` | 403 | One session ran past the maximum continuous length. Start a new session; your account is fine. |
| `SERVICE_UNAVAILABLE` | 503 | A dependency is briefly unavailable or at capacity. Nothing was changed. Retry after `Retry-After` seconds, with backoff. |
| `UPSTREAM_UNAVAILABLE` / `UPSTREAM_TIMEOUT` | 502 / 504 | Transient. Retry with backoff. |
| `INTERNAL_ERROR` | 500 | Retry once. If persistent, report via [Discord](https://discord.gg/ES953n7bPA). |

### Text to speech

| Code | HTTP | Resolution |
|---|---|---|
| `VOICE_NOT_FOUND` | 404 | Unknown voice code. List voices with `GET /v1/voices`. |

## Handling errors in Python

The Python examples use [`requests`](https://pypi.org/project/requests/) (`pip install requests`). This call is free: it asks for the status of an agent that does not exist.

```python
import os, requests

resp = requests.get(
    "https://api.bithuman.ai/v1/agent/status/A00XXX0000",
    headers={"api-secret": os.environ["BITHUMAN_API_SECRET"]},
    timeout=30,
)
if resp.ok:
    print(resp.json()["data"]["status"])
elif resp.headers.get("content-type", "").startswith("application/json") and "error" in resp.json():
    err = resp.json()["error"]
    print(resp.status_code, err["code"], err["message"])  # 404 NOT_FOUND here
else:
    print(resp.status_code, "retry after", resp.headers.get("Retry-After"))
```

Retry `429` and `5xx`. Fix the request for any other `4xx`.

For `429` and `5xx`, use exponential backoff with jitter — see
[rate limits](/api/rate-limits) for the recommended retry strategy.
