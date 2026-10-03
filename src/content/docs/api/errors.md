---
title: "Errors"
description: "The error format, HTTP status codes and every error code, with fixes."
section: api
group: "Basics"
order: 20
type: reference
llms: api
moved:
  text-to-speech: /api/errors#error-codes
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

Successful responses do not share one envelope: some wrap the result as `{"success": true, "data": …}` (agents, credits, video), some as `{"status": "success", "status_code": 200, "data": …}` (`/v1/me`, embed tokens), and some return a bare object (`/v1/validate`, `/speak`). Each endpoint's page shows its response.

### 502 and 504 may not be JSON

A `502` or `504` comes either from the API (the envelope above, code
`UPSTREAM_UNAVAILABLE` or `UPSTREAM_TIMEOUT`) or from the delivery network in
front of it (an HTML page). Check `Content-Type` before parsing any error, and
fall back to the HTTP status line when it is not `application/json`. Both are
transient: retry after `Retry-After` seconds when present, otherwise back off.

## HTTP status codes

| Status | Meaning | [Codes](#error-codes) |
|---|---|---|
| `302` | Redirect, not an error | [Model download](/api/agents#download-an-agents-model) redirects to the artifact URL. |
| `400` | Bad Request | `MISSING_PARAM`, `VALIDATION_ERROR`, `MODEL_NOT_DOWNLOADABLE`, `MODEL_NOT_OFFERED` |
| `401` | Unauthorized | `UNAUTHORIZED`, `MISSING_AUTH` |
| `402` | Payment Required | `INSUFFICIENT_BALANCE` |
| `403` | Forbidden | [Plan limits](#plan-and-credit-refusals), `FORBIDDEN`, `RUNTIME_SUSPENDED`, `SESSION_DURATION_LIMIT`, `SECRET_REVEAL_CONSOLE_ONLY` |
| `404` | Not Found | `NOT_FOUND`, `MODEL_ARTIFACT_NOT_READY`, `VOICE_NOT_FOUND` |
| `409` | Conflict: agent not ready for it, or a build already running | `MODEL_NOT_GENERATED`, `AGENT_NOT_READY`, `BUILD_IN_PROGRESS`, `BUILD_CONCURRENCY`, `BUILD_DAILY_CAP` |
| `410` | Gone | `AGENT_DELETED`, `AGENT_PURGED`, `ENDPOINT_RETIRED` |
| `413` / `415` | File too large / unsupported type | `FILE_TOO_LARGE`, `UNSUPPORTED_TYPE` |
| `422` | Input doesn't fit the model | `MODEL_SUBJECT_MISMATCH`, `MODEL_PREREQUISITE_MISSING`, `IMAGE_FACE_UNSUITABLE`, `KB_EMPTY` |
| `429` | Rate Limited | `RATE_LIMITED` ([rate limits](/api/rate-limits)) |
| `500` | Internal Error | `INTERNAL_ERROR`, `UPSTREAM_ERROR`. Retry, or contact support. |
| `502` / `504` | Bad Gateway / Gateway Timeout | Transient; may be HTML ([above](#502-and-504-may-not-be-json)). Retry after `Retry-After`. |
| `503` | Service Unavailable | `SERVICE_UNAVAILABLE`, `MODEL_NOT_YET_AVAILABLE`. Retry after `Retry-After`, with backoff. |

## Error codes

### Authentication

| Code | HTTP | Resolution |
|---|---|---|
| `UNAUTHORIZED` | 401 | The `api-secret` header is present but invalid. Get a valid secret from [Developer → API Secrets](https://www.bithuman.ai/developer/api-keys). |
| `MISSING_AUTH` | 401 | The `api-secret` header is absent. Add it to your request. |
| `SECRET_REVEAL_CONSOLE_ONLY` | 403 | An API secret tried to read a stored secret's value. Reveal it in the console, or create a new secret. |
| `FORBIDDEN` | 403 | A `/v2/{user_id}/…` path names another account's `user_id`. Read your own from [`GET /v1/me`](/api/billing#account-status). |

### Plan and credit refusals

A plan or credit refusal names its fix in a link field of `error`: send the user there rather than retrying.

| Code | HTTP | Resolution |
|---|---|---|
| `PLAN_REQUIRED` | 403 | Your plan does not include this; the `message` says what, and `upgrade_url` links the fix. From **2026-10-12 00:00 UTC**, a Free account's API secret is refused, and Free accounts cannot create agents or buy top-ups. A model outside your plan: the message names the plan; [contact sales](https://www.bithuman.ai/enterprise?topic=api-errors#contact). |
| `AGENT_LIMIT_REACHED` | 403 | A new agent would pass your plan's agent limit (Creator 7, Pro 40, Business 200, Enterprise unlimited): "Your {Plan} plan includes {N} agents and you have {M}. Existing agents keep working; delete one or upgrade at https://www.bithuman.ai/pricing to create more." Link: `upgrade_url`. |
| `CONCURRENCY_LIMIT_REACHED` | 403 | A new session would pass your plan's [concurrent cloud sessions](/api/rate-limits#session-concurrency); the message names the limit and how many are running. End a session or upgrade; live sessions are never cut off. An ended session frees its slot at once; to end one, [terminate it](/api/runtime-sessions#terminate-a-session). Link: `upgrade_url`, also in `details`. |
| `INSUFFICIENT_BALANCE` | 402 | Not enough credits for this action. Top up (Creator plan or higher; on Free, choose a plan), then retry. Link: `topup_url`. |
| `ACCOUNT_SUSPENDED` | 403 | Your balance is too far below zero. Top up; contact support if it persists. No link. |
| `RUNTIME_SUSPENDED` | 403 | A token endpoint refused the secret: it was revoked (create a new one), or runtime access is suspended (contact support). A plan change does not clear it. No link. |

Until 2026-10-12, a Free account's runtime-token and meter responses carry a `plan_notice` field and an `X-Bithuman-Plan-Notice` header: "Free-plan API and SDK access ends on 2026-10-12. Upgrade at https://www.bithuman.ai/pricing to keep it." A Free account with top-up credits bought before 2026-09-27 keeps access until those credits are spent, and its notice says so. Show `plan_notice` as sent. [Choose a plan](https://www.bithuman.ai/pricing?from=docs) · [top up](https://www.bithuman.ai/billing#credits).

### Agent operations

| Code | HTTP | Resolution |
|---|---|---|
| `NOT_FOUND` | 404 | Returned both when no agent matches the code **and** when an agent has no active session for `/speak` / `/add-context`. Distinguish by the `message` string: `"Agent not found for code: <code>"` vs `"No active rooms found for agent <code>"`. |
| `VALIDATION_ERROR` | 400 | Body failed schema validation. Include all required fields. |
| `VIDEO_INPUT_NOT_SUPPORTED` | 400 | [Agent creation](/api/agents#generate-an-agent) with a `video` input. Creation is **image-only** for every model — provide a portrait `image`; bitHuman generates the 10-second identity video internally so it loops without a seam (first frame == last frame). Nothing is charged; never send `video`. |
| `MISSING_PARAM` | 400 | A required parameter was not provided, or an agent update has nothing to change. |
| `IMAGE_FACE_UNSUITABLE` | 422 | Essence 2 creation or add, for a real person: the face is too small in frame, or one of several similar faces. Upload a closer waist-up or head-and-shoulders photo of one person. Nothing is charged. A photo with no face at all is `MODEL_SUBJECT_MISMATCH`. |
| `MODEL_DEFAULT_DEPRECATED` | 200 (warning) | [Agent creation](/api/agents#generate-an-agent) without `model`: the agent is created as `expression-1` and the response carries this warning. From 2026-12-26 `model` is required. Send `model` explicitly. |
| `AGENT_DELETED` / `AGENT_PURGED` | 410 | The agent was deleted; model download, gestures and talking video refuse it. Create a new agent. |

### Model errors

[Agent creation](/api/agents#generate-an-agent),
[adding a model](/api/agents#add-a-model-to-an-existing-agent),
[model download](/api/agents#download-an-agents-model),
[embed tokens](/api/embedding) and
[talking video](/api/video) share these codes:

| Code | HTTP | Resolution |
|---|---|---|
| `MODEL_NOT_GENERATED` | 409 | The agent does not have that model yet. **The message gives the fix**: the exact [add-a-model](/api/agents#add-a-model-to-an-existing-agent) call and its cost (adding `expression-1` is free and immediate), or the missing input when the agent cannot get it. Nothing is charged. |
| `AGENT_NOT_READY` | 409 | [`POST /v1/agent/{code}/models`](/api/agents#add-a-model-to-an-existing-agent) on an agent that is still generating or failed. Wait for the current generation to finish, or fix/re-create a failed agent first. |
| `MODEL_SUBJECT_MISMATCH` | 422 | Every model except Expression 2 needs a clear, real human face. A creation or model add for `essence-2`, `essence-1` or `expression-1` (also when `model` is omitted) is refused when the photo or prompt is a cartoon, a stylized character, an animal, a robot or a creature, or when no face can be found in the photo — e.g. `"Expression 1 needs a clear, real human face, and this image looks like an animal. Use Expression 2, which animates any character: cartoons, animals, robots and stylized art. Nothing was charged."` Nothing is billed and no agent is created. Use `expression-2`, or `model: "auto"` to route automatically. See [Choosing a model](/models#choosing-a-model). |
| `MODEL_PREREQUISITE_MISSING` | 422 | Adding that model needs an input this agent lacks: for `essence-2`, the video an Essence creation makes; for `expression-2`, a face image; for `expression-1`, an image and a voice; for `essence-1`, an image or that video. Add the missing image or voice, then retry. |
| `MODEL_NOT_DOWNLOADABLE` | 400 | [Model download](/api/agents#download-an-agents-model) for a model with no file: `expression-1` renders in the bitHuman cloud from the agent's image. |
| `MODEL_NOT_OFFERED` | 400 | The request names a model that is not currently offered to any account; the `message` names it. Nothing is launched or charged, and no other model is used in its place. Pick one of the [models](/models). |
| `MODEL_NOT_YET_AVAILABLE` | 503 | A model is paused for your account (not returned in normal operation). Nothing is charged; retry later or use another model. |
| `MODEL_ARTIFACT_NOT_READY` | 404 | [Model download](/api/agents#download-an-agents-model) before the file is published (shortly after the agent is ready). Retry; the message says when. |

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
| `SESSION_DURATION_LIMIT` | 403 | One session ran past the maximum continuous length. Start a new session; your account is fine. |
| `SERVICE_UNAVAILABLE` | 503 | A dependency is briefly unavailable or at capacity. Nothing was changed. Retry after `Retry-After` seconds, with backoff. |
| `UPSTREAM_UNAVAILABLE` / `UPSTREAM_TIMEOUT` | 502 / 504 | Transient. Retry with backoff. |
| `INTERNAL_ERROR` | 500 | Retry once. If persistent, report via [Discord](https://discord.gg/99yuGCKGgR). |
| `UPSTREAM_ERROR` | 500 | A backing query failed or timed out (seen on [runtime sessions](/api/runtime-sessions)). Nothing was changed. Retry with backoff. |
| `ENDPOINT_RETIRED` | 410 | The endpoint was removed; the message names its replacement. `POST /v1/realtime/ephemeral-token` answers it: connect through the [Realtime relay](/api/realtime). |
| `MODEL_LOCKED` | — | A [Realtime relay](/api/realtime) `error` event: a `session.update` tried to change the model fixed at connect. Reconnect with the new `model`. |

### Knowledge bases

| Code | HTTP | Resolution |
|---|---|---|
| `KB_EMPTY` | 422 | A [build](/api/knowledge) of a knowledge base with no source files. Upload files, then build. |
| `BUILD_IN_PROGRESS` | 409 | A build is already running on this knowledge base; the request is queued as a rebuild when it finishes. |
| `BUILD_CONCURRENCY` | 409 | Another build is running for the account. Retry when it finishes. |
| `BUILD_DAILY_CAP` | 409 | The account reached 20 builds today. Retry tomorrow. |

The CLI's exit codes, such as `PUBLIC_BIND_REFUSED`, are on [CLI troubleshooting](/platforms/cli/troubleshooting).

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

Retry `429` and `5xx` with exponential backoff and jitter ([rate limits](/api/rate-limits)). For a [plan or credit refusal](#plan-and-credit-refusals), follow its link field; fix the request for any other `4xx`. Is the API down? Check [status.bithuman.ai](https://status.bithuman.ai).

```endpoint
getReadiness
```
