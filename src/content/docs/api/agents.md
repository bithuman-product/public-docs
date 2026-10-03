---
title: "Agents"
description: "Create an avatar agent from a portrait, then manage it and make it speak."
section: api
group: "Agents"
order: 10
type: endpoint
llms: api
moved:
  inject-knowledge: "/api/knowledge#inject-knowledge"
  errors: "/api/errors#agent-operations"
---

An agent is an avatar (face, voice and persona) identified by a short code such as `A23WJF0199`. Create one, poll until it is `ready`, then use it everywhere: the [web embed](/platforms/web), the SDKs, [talking video](/api/video) and live sessions. Creation and model adds cost credits per model ([pricing](/pricing)); everything else on this page is free.

The sample avatars (such as `A23WJF0199`, `wise-pup`) only [download](#download-an-agents-model); every other call on this page needs an agent you own, and returns `404` for a sample.

To add knowledge to a live session, see [Knowledge](/api/knowledge#inject-knowledge); every operation is also in the [API reference index](/api/reference).

## Generate an agent

Starts an asynchronous creation and returns an `agent_id` at once. Credits are reserved at submit and refunded automatically if creation fails. Pick the model from the subject: a real person → `essence-2`; a cartoon, animal, robot or any other character → `expression-2` ([Choosing a model](/models#choosing-a-model)).

### Request

| Parameter | Type | Required | Description |
|---|---|---|---|
| `model` | string | always send it | `essence-2` (a real person), `expression-2` (any character) or `auto` (picks from the image). `essence-1` and `expression-1` are the first generation. Always send it: it becomes required on 2026-12-26 (see Notes). |
| `image` | string | no | Portrait URL (publicly fetchable) or base64. Used as a reference; a portrait is generated from `prompt` when omitted |
| `prompt` | string | no | System prompt and personality |
| `audio` | string | no | Voice sample URL or base64, for voice cloning |
| `aspect_ratio` | string | no | `16:9` (default), `9:16` or `1:1` |
| `framing` | string | no | `portrait` (default) or `full_body` |
| `transparency` | boolean | no | `true` generates on a green-screen background for chroma key |
| `agent_id` | string | no | Leave it out; a fresh code is generated. If it names an agent you already own, that agent is regenerated in place (it returns to `processing`); another account's code returns `404` |

A model outside your plan gets `403 PLAN_REQUIRED`.

Headers: `api-secret`, and optionally `Idempotency-Key`: a repeated request with the same key returns the first response and starts no second creation.

### Example

```bash tab="curl"
curl -X POST https://api.bithuman.ai/v1/agent/generate \
  -H "Content-Type: application/json" \
  -H "api-secret: $BITHUMAN_API_SECRET" \
  -H "Idempotency-Key: museum-guide-1" \
  -d '{"model": "expression-2", "prompt": "You are a cheerful museum guide.", "image": "https://example.com/portrait.jpg"}'
```

```python tab="Python"
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

- Omitted, `model` still creates an `expression-1` agent and warns (`MODEL_DEFAULT_DEPRECATED`), so a character is refused with `422`. From 2026-12-26 `model` is required, and the bare names `essence` and `expression` (and the `version` field) are refused with a `400` naming the replacement.
- Creation takes minutes for `essence-1` and `expression-1`, and about 2–2.5 hours for `essence-2` and `expression-2`. Set your polling timeout per model.
- Every model except `expression-2` needs a clear, real human face. For `essence-2`, `essence-1` or `expression-1`, a cartoon, stylized character, animal, robot or creature in the photo or prompt, or a photo with no face found, returns `422 MODEL_SUBJECT_MISMATCH` before anything is charged; the message tells you to use Expression 2. An `essence-2` creation or add also checks the photo's face before charging: a face too small in frame, or several similar-sized faces, returns `422 IMAGE_FACE_UNSUITABLE` — upload a closer photo of one person. `auto` routes people to `essence-2` and everything else to `expression-2`.
- A `200` does not mean the image was fetched. An unreachable `image` fails the creation a few seconds later (refunded); poll [status](#poll-status) to confirm. Creation is image-only: a `video` field returns `400 VIDEO_INPUT_NOT_SUPPORTED`.
- At most two `essence-2` creations run at once per account; a third fails at once with a capacity message and no charge.

## Poll status

Reports a creation's progress. Poll every 5 seconds until `status` is `ready` or `failed`; every other value is intermediate. The response is the agent's full record, the same as [Get an agent](#get-an-agent); the fields below are the ones to poll.

```bash
curl https://api.bithuman.ai/v1/agent/status/A80HVD8577 -H "api-secret: $BITHUMAN_API_SECRET"
```

```json
{"success": true, "data": {"agent_id": "A80HVD8577", "status": "ready", "progress": 1.0, "current_step": "done", "error_message": null, "supported_models": ["expression-2"], "model_status": {"expression-2": {"state": "ready", "reason": null}}, "name": "Museum Guide"}}
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

def wait_until_ready(agent_id, timeout_s=3 * 3600):
    deadline = time.time() + timeout_s
    while time.time() < deadline:
        r = requests.get(f"https://api.bithuman.ai/v1/agent/status/{agent_id}",
                         headers={"api-secret": os.environ["BITHUMAN_API_SECRET"]}, timeout=30)
        if r.ok:
            data = r.json()["data"]
            if data["status"] == "ready":
                return data
            if data["status"] == "failed":
                raise RuntimeError(data["error_message"])
        time.sleep(5)   # creation continues server-side through transient errors
    raise TimeoutError(agent_id)
```

### Notes

- `supported_models` lists the models the agent can be launched as, spelled as `model` values you can send back.
- `model_status` gives each requested model's state (`pending`, `ready`, `failed`). Models never requested are absent.
- For second-generation models `model_url` is a storage reference, not a link: fetch the file with [Download an agent's model](#download-an-agents-model).
- The downloadable model file is published shortly after `ready`; until then the [download](#download-an-agents-model) returns `404 MODEL_ARTIFACT_NOT_READY`. Retry.

## Get an agent

Returns the agent's full record: persona (`system_prompt`, `name`, `language`), `voice_id`, media URLs, creation state, `model` and `supported_models`.

```bash
curl https://api.bithuman.ai/v1/agent/A80HVD8577 -H "api-secret: $BITHUMAN_API_SECRET"
```

```json
{"success": true, "data": {"code": "A80HVD8577", "status": "ready", "model": "expression-2", "supported_models": ["expression-2"], "name": "Museum Guide", "system_prompt": "You are a cheerful museum guide.", "language": "en", "voice_id": "bf0a246a-8642-498a-9950-80c35e9276b5", "image_url": "https://…/image.jpg"}}
```

## List your agents

Lists your agents, newest first. Query: `limit` (default 20, max 100), `offset`, `status` (for example `ready`). Items are summaries (`code`, `name`, `model`, `status`, `supported_models`, `created_at` and a few more); read the full record with [Get an agent](#get-an-agent). Deleted agents appear with `status: "deleted"`. Older agents can also show `completed`, `success` or `unknown`; read `supported_models` to see what they can launch as.

```bash
curl "https://api.bithuman.ai/v1/agents?status=ready&limit=20" -H "api-secret: $BITHUMAN_API_SECRET"
```

```json
{"success": true, "data": [{"code": "A80HVD8577", "name": "Museum Guide", "model": "expression-2", "status": "ready"}], "pagination": {"limit": 20, "offset": 0, "total": 1, "has_more": false}}
```

## Update an agent

`POST /v1/agent/{code}` (not `PATCH`, which returns `404`) changes the `system_prompt`, the voice-provider selection (`providers`, see [Voice providers](/api/providers)), or both. Send at least one, or the call returns `400 MISSING_PARAM`. The name is generated and cannot be set. The voice cannot be set here: change it in the bitHuman app ([Voices](/build/voices#change-the-voice)).

```bash
curl -X POST https://api.bithuman.ai/v1/agent/A80HVD8577 \
  -H "Content-Type: application/json" -H "api-secret: $BITHUMAN_API_SECRET" \
  -d '{"system_prompt": "You are a concise sales assistant."}'
```

```json
{"agent_code": "A80HVD8577", "updated": true}
```

## Delete an agent

Deletes an agent you own. Usage history is kept. An unknown or unowned code returns `404`.

```bash
curl -X DELETE https://api.bithuman.ai/v1/agent/A80HVD8577 -H "api-secret: $BITHUMAN_API_SECRET"
```

```json
{"success": true, "agent_code": "A80HVD8577", "deleted": true}
```

## Add a model to an existing agent

Adds a model to a `ready` agent without re-creating it; the body is `{"model": "<model>"}`. Re-adding a model the agent has costs nothing, and a failed add is refunded.

| `model` | Needs | Time | Credits |
|---|---|---|---|
| `expression-1` | a stored image and voice, of a real person | immediate | free |
| `expression-2` | a stored image | about 2–2.5 h | 2000 |
| `essence-2` | a stored identity video and a photoreal person | about 2–2.5 h | 500 |
| `essence-1` | a stored image or identity video, of a real person | 10–20 min | 250 |

```bash
curl -X POST https://api.bithuman.ai/v1/agent/A80HVD8577/models \
  -H "Content-Type: application/json" -H "api-secret: $BITHUMAN_API_SECRET" \
  -d '{"model": "essence-2"}'
```

```json
{"success": true, "agent_id": "A80HVD8577", "model": "essence-2", "status": "processing", "supported_models": ["expression-2"]}
```

Poll [status](#poll-status) until `model_status["essence-2"].state` is `ready` or `failed`. The top-level `status` stays `ready` during an add. A failed add is refunded, and its `reason` says why. Errors: `409 AGENT_NOT_READY`, `422 MODEL_PREREQUISITE_MISSING`, `422 MODEL_SUBJECT_MISMATCH` (an `essence-2`, `essence-1` or `expression-1` add for an agent that isn't a real person; nothing is charged, see [Choosing a model](/models#choosing-a-model)).

## Download an agent's model

Redirects (`302`) to the agent's model file, a `.imx` container, for the [SDKs](/platforms) and [CLI](/platforms/cli). Pass `?model=` to choose a model when the agent has several; the default is the model it was created with. Sample avatars download with no credential; your own agents need the `api-secret` header.

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
| `403` | `PLAN_REQUIRED` | the model is not in your plan; the message names the plan |
| `404` | `MODEL_ARTIFACT_NOT_READY` | published shortly after `ready`; retry |
| `409` | `MODEL_NOT_GENERATED` | the agent does not have that model; [add it](#add-a-model-to-an-existing-agent) |

## List the freely downloadable showcase models

Lists the sample avatars anyone can download, with no API secret and no account: slug, agent code, model and size. Each entry's `url` is [Download an agent's model](#download-an-agents-model). `bithuman list` and `bithuman pull` read this list.

```bash
curl https://api.bithuman.ai/v1/models/showcase
```

```json
{"version": 2, "updated": "2026-09-10", "models": [{"slug": "bolt", "name": "Bolt", "model": "expression-2", "agent_code": "X03BOLT", "url": "https://api.bithuman.ai/v1/agent/X03BOLT/model/download?model=expression-2", "size": 198106157}]}
```

## List an agent's live sessions

Lists the agent's open sessions. Use a `room_id` whose `deliverable` is `true` with [speak](#make-an-agent-speak) or [add-context](/api/knowledge#inject-knowledge).

```bash
curl https://api.bithuman.ai/v1/agent/A80HVD8577/sessions -H "api-secret: $BITHUMAN_API_SECRET"
```

```json
{"agent_code": "A80HVD8577", "sessions": [{"room_id": "room-A80HVD8577-x1y2", "num_participants": 2, "created_at": 1788480000, "deliverable": true}]}
```

## Make an agent speak

Makes the avatar say `message` in its live sessions: one session with `room_id`, or every deliverable session without it. With no live session it returns `404 NOT_FOUND`.

```bash
curl -X POST https://api.bithuman.ai/v1/agent/A80HVD8577/speak \
  -H "Content-Type: application/json" -H "api-secret: $BITHUMAN_API_SECRET" \
  -d '{"message": "We have a 20% discount today.", "room_id": "room-A80HVD8577-x1y2"}'
```

```json
{"agent_code": "A80HVD8577", "delivered_to_rooms": 1, "rooms": ["room-A80HVD8577-x1y2"], "rooms_skipped": [], "rooms_failed": []}
```
