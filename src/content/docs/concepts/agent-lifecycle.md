---
title: "Agent lifecycle"
description: "From a face and voice to a live talking avatar — generate, poll, resolve, and drive a session over the REST API and SDKs."
section: concepts
group: "Core"
order: 4
---

## The agent lifecycle

From "I have a face and voice" to "live talking avatar":

```text
Generate → Store → Resolve → Live session → Speak
```

## 1. Generate

Call [`POST /v1/agent/generate`](/api/reference) with a prompt plus an optional portrait image and voice sample (creation is image-only — bitHuman generates the 10-second identity video internally, authored to loop seamlessly). It returns `{ agent_id, status: "processing" }` immediately — generation runs async. Measured end to end on 2026-09-20, one creation per model: `expression-1` 1 min, `essence-1` 13 min, `expression-2` 2 h 02 m, `essence-2` 2 h 09 m. Plan for under 15 minutes for either first-generation model and **about 2 to 2.5 hours** for either model of the [second generation](/concepts/models) — neither of those two is the quick one.

```bash
curl -X POST https://api.bithuman.ai/v1/agent/generate \
  -H "api-secret: $BITHUMAN_API_SECRET" \
  -H "content-type: application/json" \
  -d '{
    "prompt": "You are a friendly receptionist.",
    "image": "https://example.com/headshot.jpg",
    "audio": "https://example.com/voice.wav"
  }'
```

> **Note — `image` must be publicly fetchable, and this is not checked at
> submit time.** The `https://example.com/…` URLs above are placeholders.
> Posting one verbatim returns `HTTP 200` with
> `{"success": true, "status": "processing"}`, and the job only fails seconds
> later with `Image processing failed: Failed to download after 3 attempts:
> 404`. The credits are charged at submit and **automatically refunded** on that
> failure (verified 2026-07-28: `-500` then `+500` within 4 s), so nothing is
> lost — but a `200` here is not confirmation that your image was accepted. Poll
> [`GET /v1/agent/status/{agent_id}`](/api/agents#poll-status) before assuming
> the creation started.


See [Building avatars](/guides/building-avatars) for media specs and the full set of generation inputs.

## 2. Poll until ready

Poll [`GET /v1/agent/status/{agent_id}`](/api/reference) every 5 seconds. Status transitions:

```text
processing → generating → completed → ready   (success)
                                  \→ failed    (error)
```

> **Note** `generating` and `completed` are **intermediate** states, not terminal — keep polling past them until you see `ready` or `failed`. Wall-clock runs from about a minute to a couple of hours depending on the model ([creation times](/api/agents#model-specific-inputs-and-creation-times)) — don't apply a short client timeout.

> **`ready` does not yet mean downloadable.** The agent serves, embeds and speaks as soon as it reports `ready`, but its model file is published separately and a little later. Until it is, [`GET /v1/agent/{code}/model/download`](/api/agents#download-an-agents-model) answers a retryable [`404 MODEL_ARTIFACT_NOT_READY`](/api/errors#model-errors) — on 2026-09-20 an `expression-2` agent was still answering it 23 minutes after it went `ready`. Retry the download on that 404.

## 3. Resolve and stream

Once `ready`, the agent has an `agent_code` (e.g. `A78WKV4515`). Every SDK can resolve it by code — no need to download the [`.imx`](/concepts/avatars-imx):

```python
from bithuman import AsyncBithuman
import os

rt = await AsyncBithuman.create(
    model_path="agent.imx",      # the local .imx file — required on-device
    agent_code="A78WKV4515",     # optional: billing attribution
    api_secret=os.environ["BITHUMAN_API_SECRET"],
)
```

From here, drive frames with the [push/drain loop](/concepts/audio-streaming).

## 4. Drive the live session

For a hosted LiveKit session, push text into the live room:

```bash
curl -X POST https://api.bithuman.ai/v1/agent/A78WKV4515/speak \
  -H "api-secret: $BITHUMAN_API_SECRET" \
  -H "content-type: application/json" \
  -d '{"message": "Hello!"}'
```

For silent knowledge injection — the avatar doesn't say it aloud but uses it in future replies:

```bash
curl -X POST https://api.bithuman.ai/v1/agent/A78WKV4515/add-context \
  -H "api-secret: $BITHUMAN_API_SECRET" \
  -H "content-type: application/json" \
  -d '{"context": "The customer is on the Pro plan."}'
```

## Updating an agent

[`POST /v1/agent/{code}`](/api/reference) updates the **system prompt only**. For a new face or voice, generate a new agent.

## Where to go next

- [Audio streaming](/concepts/audio-streaming) — the push/drain pattern that powers a live session.
- [Building avatars](/guides/building-avatars) — design likeness, voice, and personality.
- [Deploy via LiveKit](/guides/deploy-livekit) — the fastest path to a hosted session.
- [API reference](/api/reference) — full request/response schemas.
