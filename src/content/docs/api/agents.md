---
title: "Agents"
description: "Create an avatar agent from a portrait, poll until it is ready, then manage it, download its model, and make it speak in live sessions."
section: api
group: "Build"
order: 10
type: endpoint
label: "Agents"
---

An agent is an avatar (face, voice and persona) identified by a short code such as `A23WJF0199`. Create one, poll until it is `ready`, then use it everywhere: the [web embed](/sdk/web), the SDKs, [talking video](/api/video) and live sessions. Creation costs credits per model ([pricing](/guides/pricing)); everything else on this page is free.

| Method | Path | Purpose |
|---|---|---|
| `POST` | `/v1/agent/generate` | [Create an agent](#generate-an-agent) |
| `GET` | `/v1/agent/status/{agent_id}` | [Poll creation](#poll-status) |
| `GET` | `/v1/agent/{code}` | [Get an agent](#get-an-agent) |
| `GET` | `/v1/agents` | [List your agents](#list-your-agents) |
| `POST` | `/v1/agent/{code}` | [Update the prompt or providers](#update-an-agent) |
| `DELETE` | `/v1/agent/{code}` | [Delete an agent](#delete-an-agent) |
| `POST` | `/v1/agent/{code}/models` | [Add a model](#add-a-model-to-an-existing-agent) |
| `GET` | `/v1/agent/{code}/model/download` | [Download the model file](#download-an-agents-model) |
| `GET` | `/v1/agent/{code}/sessions` | [List live sessions](#list-an-agents-live-sessions) |
| `POST` | `/v1/agent/{code}/speak` | [Speak in a live session](#make-an-agent-speak) |
| `POST` | `/v1/agent/{code}/add-context` | [Add knowledge to a live session](#inject-knowledge) |

## Generate an agent

`POST /v1/agent/generate` starts an asynchronous creation and returns an `agent_id` at once. Credits are reserved at submit and refunded automatically if creation fails.

### Request

| Parameter | Type | Required | Description |
|---|---|---|---|
| `model` | string | always send it | `essence-2` (a photoreal person), `expression-2` (any character), `auto` (the platform picks from the image), `essence-1` or `expression-1`. Omitted, the API creates an `expression-1` agent |
| `image` | string | no | Portrait URL (publicly fetchable) or base64. Used as a reference; a portrait is generated from `prompt` when omitted |
| `prompt` | string | no | System prompt and personality |
| `audio` | string | no | Voice sample URL or base64, for voice cloning |
| `aspect_ratio` | string | no | `16:9` (default), `9:16` or `1:1` |
| `framing` | string | no | `portrait` (default) or `full_body` |
| `transparency` | boolean | no | `true` generates on a green-screen background for chroma key |
| `agent_id` | string | no | Your own identifier |

Headers: `api-secret`, and optionally `Idempotency-Key`: a repeated request with the same key returns the first response and starts no second creation.

### Example

```bash
curl -X POST https://api.bithuman.ai/v1/agent/generate \
  -H "Content-Type: application/json" \
  -H "api-secret: $BITHUMAN_API_SECRET" \
  -H "Idempotency-Key: museum-guide-1" \
  -d '{"model": "expression-2", "prompt": "You are a cheerful museum guide.", "image": "https://example.com/portrait.jpg"}'
```

```python
import os, requests

resp = requests.post(
    "https://api.bithuman.ai/v1/agent/generate",
    headers={"api-secret": os.environ["BITHUMAN_API_SECRET"]},
    json={"model": "expression-2", "prompt": "You are a cheerful museum guide.", "image": "https://example.com/portrait.jpg"},
)
print(resp.json())
```

### Response

```json
{"success": true, "message": "Agent generation started", "agent_id": "A80HVD8577", "status": "processing"}
```

### Notes

- Creation takes minutes for `essence-1` and `expression-1`, and about 2–2.5 hours for `essence-2` and `expression-2`. Set your polling timeout per model.
- `essence-2` needs a photoreal person: another subject returns `422 MODEL_SUBJECT_MISMATCH` before anything is charged. `auto` routes people to `essence-2` and everything else to `expression-2`.
- A `200` does not mean the image was fetched. An unreachable `image` fails the creation a few seconds later (refunded); poll [status](#poll-status) to confirm. Creation is image-only: a `video` field returns `400 VIDEO_INPUT_NOT_SUPPORTED`.
- At most two `essence-2` creations run at once per account; a third fails at once with a capacity message and no charge.

## Poll status

`GET /v1/agent/status/{agent_id}` reports a creation's progress. Poll every 5 seconds until `status` is `ready` or `failed`; every other value is intermediate.

```bash
curl https://api.bithuman.ai/v1/agent/status/A80HVD8577 -H "api-secret: $BITHUMAN_API_SECRET"
```

```json
{"success": true, "data": {"agent_id": "A80HVD8577", "status": "ready", "progress": 1.0, "current_step": "done", "error_message": null, "model_url": "https://…", "supported_models": ["expression-2"], "name": "Museum Guide"}}
```

| `current_step` | Progress | Stage |
|---|---|---|
| `payment` | about 2% | credits reserved |
| `persona` | 5–15% | persona prepared |
| `voice_image` | about 20% | voice and portrait |
| `video` | about 45% | identity video (Essence models) |
| `lip_sync` | 70–99% | the model step; the longest for second-generation models |
| `done` | 100% | `ready` |

```python
import os, time, requests

def wait_until_ready(agent_id):
    while True:
        r = requests.get(f"https://api.bithuman.ai/v1/agent/status/{agent_id}",
                         headers={"api-secret": os.environ["BITHUMAN_API_SECRET"]}, timeout=30)
        if r.ok:
            data = r.json()["data"]
            if data["status"] == "ready":
                return data
            if data["status"] == "failed":
                raise RuntimeError(data["error_message"])
        time.sleep(5)   # creation continues server-side through transient errors
```

### Notes

- `supported_models` lists the models the agent can be launched as, spelled as `model` values you can send back.
- The downloadable model file is published shortly after `ready`; until then the [download](#download-an-agents-model) returns `404 MODEL_ARTIFACT_NOT_READY`. Retry.

## Get an agent

`GET /v1/agent/{code}` returns the agent's full record: persona (`system_prompt`, `name`, `language`), `voice_id`, media URLs, creation state, `model` and `supported_models`.

```bash
curl https://api.bithuman.ai/v1/agent/A80HVD8577 -H "api-secret: $BITHUMAN_API_SECRET"
```

```json
{"success": true, "data": {"code": "A80HVD8577", "status": "ready", "model": "expression-2", "supported_models": ["expression-2"], "name": "Museum Guide", "system_prompt": "You are a cheerful museum guide.", "image_url": "https://…/image.jpg"}}
```

## List your agents

`GET /v1/agents` lists your agents, newest first. Query: `limit` (default 20, max 100), `offset`, `status` (for example `ready`). Items are summaries (`code`, `name`, `model`, `status`, `supported_models`, `created_at` and a few more); read the full record with [Get an agent](#get-an-agent). Deleted agents appear with `status: "deleted"`.

```bash
curl "https://api.bithuman.ai/v1/agents?status=ready&limit=20" -H "api-secret: $BITHUMAN_API_SECRET"
```

```json
{"success": true, "data": [{"code": "A80HVD8577", "name": "Museum Guide", "model": "expression-2", "status": "ready"}], "pagination": {"limit": 20, "offset": 0, "total": 1, "has_more": false}}
```

## Update an agent

`POST /v1/agent/{code}` changes the `system_prompt`, the voice-provider selection (`providers`, see [Voice providers](/api/providers)), or both. Send at least one, or the call returns `400 MISSING_PARAM`. The name is generated and cannot be set.

```bash
curl -X POST https://api.bithuman.ai/v1/agent/A80HVD8577 \
  -H "Content-Type: application/json" -H "api-secret: $BITHUMAN_API_SECRET" \
  -d '{"system_prompt": "You are a concise sales assistant."}'
```

```json
{"agent_code": "A80HVD8577", "updated": true}
```

## Delete an agent

`DELETE /v1/agent/{code}` deletes an agent you own. Usage history is kept. An unknown or unowned code returns `404`.

```bash
curl -X DELETE https://api.bithuman.ai/v1/agent/A80HVD8577 -H "api-secret: $BITHUMAN_API_SECRET"
```

```json
{"success": true, "agent_code": "A80HVD8577", "deleted": true}
```

## Add a model to an existing agent

`POST /v1/agent/{code}/models` with `{"model": "<model>"}` adds a model to a `ready` agent without re-creating it. Re-adding a model the agent has costs nothing, and a failed add is refunded.

| `model` | Needs | Time |
|---|---|---|
| `expression-1` | a stored image and voice | instant, free |
| `expression-2` | a stored image | about 2–2.5 h |
| `essence-2` | a stored identity video and a photoreal person | about 2–2.5 h |
| `essence-1` | a stored image or identity video | 10–20 min |

```bash
curl -X POST https://api.bithuman.ai/v1/agent/A80HVD8577/models \
  -H "Content-Type: application/json" -H "api-secret: $BITHUMAN_API_SECRET" \
  -d '{"model": "essence-2"}'
```

```json
{"success": true, "agent_id": "A80HVD8577", "model": "essence-2", "status": "processing", "supported_models": ["expression-2"]}
```

Poll [status](#poll-status) until `supported_models` includes the new model. Errors: `409 AGENT_NOT_READY`, `422 MODEL_PREREQUISITE_MISSING`, `422 MODEL_SUBJECT_MISMATCH`.

## Download an agent's model

`GET /v1/agent/{code}/model/download` redirects (`302`) to the agent's model file, a `.imx` container, for the [SDKs](/sdk) and [CLI](/sdk/cli). Pass `?model=` to choose a model when the agent has several; the default is the model it was created with. Sample avatars download with no credential; your own agents need the `api-secret` header.

```bash
curl -fL -o A80HVD8577.imx -H "api-secret: $BITHUMAN_API_SECRET" \
  "https://api.bithuman.ai/v1/agent/A80HVD8577/model/download?model=expression-2"
```

Name the output file yourself (`-o`). Add `?redirect=false` to get the URL as JSON:

```json
{"success": true, "data": {"code": "A80HVD8577", "model": "expression-2", "filename": "A80HVD8577.imx", "url": "https://…", "expires_in": 3600}}
```

| Status | Code | Meaning |
|---|---|---|
| `400` | `MODEL_NOT_DOWNLOADABLE` | the model has no file (`expression-1`) |
| `404` | `MODEL_ARTIFACT_NOT_READY` | published shortly after `ready`; retry |
| `409` | `MODEL_NOT_GENERATED` | the agent does not have that model; [add it](#add-a-model-to-an-existing-agent) |

## List an agent's live sessions

`GET /v1/agent/{code}/sessions` lists the agent's open sessions. Use a `room_id` whose `deliverable` is `true` with [speak](#make-an-agent-speak) or [add-context](#inject-knowledge).

```bash
curl https://api.bithuman.ai/v1/agent/A80HVD8577/sessions -H "api-secret: $BITHUMAN_API_SECRET"
```

```json
{"agent_code": "A80HVD8577", "sessions": [{"room_id": "room-A80HVD8577-x1y2", "num_participants": 2, "created_at": 1788480000, "deliverable": true}]}
```

## Make an agent speak

`POST /v1/agent/{code}/speak` makes the avatar say `message` in its live sessions: one session with `room_id`, or every deliverable session without it. With no live session it returns `404 NOT_FOUND`.

```bash
curl -X POST https://api.bithuman.ai/v1/agent/A80HVD8577/speak \
  -H "Content-Type: application/json" -H "api-secret: $BITHUMAN_API_SECRET" \
  -d '{"message": "We have a 20% discount today.", "room_id": "room-A80HVD8577-x1y2"}'
```

```json
{"agent_code": "A80HVD8577", "delivered_to_rooms": 1, "rooms": ["room-A80HVD8577-x1y2"], "rooms_skipped": [], "rooms_failed": []}
```

## Inject knowledge

`POST /v1/agent/{code}/add-context` gives a live agent background knowledge (`"type": "add_context"`, the default) or a message to say (`"type": "speak"`). `room_id` targets one session. It needs a live session, like speak.

```bash
curl -X POST https://api.bithuman.ai/v1/agent/A80HVD8577/add-context \
  -H "Content-Type: application/json" -H "api-secret: $BITHUMAN_API_SECRET" \
  -d '{"context": "The visitor is a member. Preferred name: Alex."}'
```

## Errors

| Status | Code | When |
|---|---|---|
| `400` | `MISSING_PARAM` | an update with nothing to change |
| `400` | `MODEL_NOT_DOWNLOADABLE` | downloading a model that has no file |
| `400` | `VALIDATION_ERROR` | invalid body or `model`; the message lists accepted values |
| `400` | `VIDEO_INPUT_NOT_SUPPORTED` | `video` in a creation request |
| `401` | `UNAUTHORIZED` | missing or invalid `api-secret` |
| `402` | `INSUFFICIENT_BALANCE` | not enough credits to create |
| `404` | `MODEL_ARTIFACT_NOT_READY` | the model file is not published yet; retry |
| `404` | `NOT_FOUND` | unknown agent, or no live session for speak or add-context |
| `409` | `AGENT_NOT_READY` | adding a model to an agent that is not `ready` |
| `409` | `MODEL_NOT_GENERATED` | the agent does not have the requested model |
| `422` | `MODEL_PREREQUISITE_MISSING` | the agent lacks an asset the model needs |
| `422` | `MODEL_SUBJECT_MISMATCH` | `essence-2` for a subject that is not a photoreal person |
| `503` | `MODEL_NOT_YET_AVAILABLE` | a model is paused for your account (not returned in normal operation) |

All codes: [Errors](/api/errors). Legacy parameters: `model: "essence"` or `"expression"` with `version: "v1"` or `"v2"` still select a model; `duration` is ignored.
