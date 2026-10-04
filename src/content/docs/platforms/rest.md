---
title: "REST API"
description: "Call bitHuman from any backend over HTTPS with your API secret."
section: platforms
group: "REST"
order: 10
type: platform
llms: platforms
renders: ["cloud"]
next: ["/api/agents", "/api/video", "/api/reference"]
availability: creator
moved:
  first-frame: /platforms/rest#run-your-first-avatar
---

The REST API creates agents, drives live sessions and renders talking videos from your audio, from any language.

## Before you start

- An [API secret](/start/api-secret). API use needs the Creator plan or higher.
- `curl`, or any HTTP client.
- Credits for anything beyond a check: a talking video bills per minute of output ([pricing](/pricing#talking-video--per-minute-of-output)).
- Time: creating an agent of your own takes about 2 hours (Essence 2 or Expression 2). Start with a sample agent meanwhile.

Start with a sample agent: any API secret can read the public samples, such as `A23WJF0199` (`wise-pup`), and render them speaking your audio, [`GET /v1/models/showcase`](https://api.bithuman.ai/v1/models/showcase) lists them; each one's `supported_models` says which `model` to pass. Then create an agent of your own.

To try an avatar with no account first, use the [web embed](/platforms/web).

## Authenticate

Send your API secret in the `api-secret` header on every call. `POST /v1/validate` checks it and spends nothing; it always returns `200`, so read `valid`. The full rules are on [Authentication](/api/authentication).

## Run your first avatar

Render the `wise-pup` sample speaking a 5-second hosted clip (16 kHz mono WAV):

```bash
export BITHUMAN_API_SECRET="<your API secret>"
curl -s -X POST https://api.bithuman.ai/v1/validate -H "api-secret: $BITHUMAN_API_SECRET"
# → {"valid":true}
curl -s -X POST https://api.bithuman.ai/v1/video/generate \
  -H "api-secret: $BITHUMAN_API_SECRET" -H "Content-Type: application/json" \
  -d '{"model": "expression-2", "agent_code": "A23WJF0199", "input": {"type": "audio", "audio_url": "https://docs.bithuman.ai/samples/speech-16k-short.wav"}}'
# → {"success": true, "job_id": "vid_…", "status": "processing"}
curl -s https://api.bithuman.ai/v1/video/vid_… -H "api-secret: $BITHUMAN_API_SECRET"
# → … "status": "completed", "video_url": "https://…mp4"
```

Poll until `status` is `completed`, then open `video_url`. The video costs 4 credits, billed to you; the sample's owner pays nothing. bitHuman renders the audio you bring: a recording, or a WAV or MP3 from any text-to-speech tool, at a public URL. On a sample, only audio input and the models in its `supported_models` work, and `/speak` is the owner's alone. Get an API secret under [Developer → API Secrets](https://www.bithuman.ai/developer/api-keys).

## Complete example

Then make an agent of your own. Four shell scripts from the examples repository: check your secret, check your balance, create an agent from a prompt, then talk to it in the browser.

### Get the code

```bash
git clone https://gitlab.com/bithuman/sdk/bithuman-examples.git
cd bithuman-examples/rest-api/curl
```

### Run it

```bash
./validate.sh && ./check-credits.sh
BITHUMAN_MODEL=expression-2 ./generate-agent.sh "You are a friendly fitness coach."
```

`validate.sh` and `check-credits.sh` spend nothing. `generate-agent.sh` spends one creation charge ([pricing](/pricing#creation--one-time-credits)), then polls until the agent is ready (about 2 to 2.5 hours for a second-generation model; a failed creation is refunded).

### Expected output

```text
{
    "valid": true
}
Checking credit balance...
Balance:        … credits
…
{"success": true, "agent_id": "<agent_id>", "status": "processing"}
  Status: processing  Progress: 10%
…
Agent is ready!
```

Open `https://www.bithuman.ai/embed/<agent_id>` and talk to your agent. While that page is open, `./speak.sh <agent_id> "Hello!"` makes it say a line.

### How it works

| Script | Endpoint |
|---|---|
| `validate.sh` | [`POST /v1/validate`](/api/authentication#post-v1validate): always `200`; read `valid` |
| `check-credits.sh` | [`GET /v2/credit-summaries`](/api/billing): balance and plan |
| `generate-agent.sh` | [`POST /v1/agent/generate`](/api/agents#generate-an-agent), then [`GET /v1/agent/status/{id}`](/api/agents#poll-status) until `ready` or `failed` |
| `speak.sh` | [`POST /v1/agent/{code}/speak`](/api/agents): needs a live session |

### Make it your own

- **A face of your own:** add `"image": "https://…/portrait.jpg"` to the JSON in `generate-agent.sh`.
- **A photoreal person:** `BITHUMAN_MODEL=essence-2`, or `auto` to let the platform choose. Every model except Expression 2 needs a real human face ([Choosing a model](/models#choosing-a-model)).
- **A video instead of a live session:** [`POST /v1/video/generate`](/api/video) renders your agent speaking your audio to an MP4.
- **Other languages:** [`rest-api/python`](https://gitlab.com/bithuman/sdk/bithuman-examples/-/tree/main/rest-api/python) has the same calls in Python.

## Integrate into your app

### Create your own agent

Creation is a one-time charge ([pricing](/pricing#creation--one-time-credits)); a balance below the creation cost returns `402`. Your first own agent takes about 2–2.5 hours for `essence-2` or `expression-2`, or minutes for `expression-1` with a real person's portrait. Always send `model`: `essence-2` for a real person, `expression-2` for any character ([Choosing a model](/models#choosing-a-model)).

```bash
curl -s -X POST https://api.bithuman.ai/v1/agent/generate \
  -H "api-secret: $BITHUMAN_API_SECRET" -H "Content-Type: application/json" \
  -d '{"model": "expression-2", "prompt": "You are a friendly fitness coach.", "image": "https://your-site.example/portrait.jpg"}'
# → {"success": true, "agent_id": "A80HVD8577", "status": "processing"}
```

Poll until `status` is `ready` or `failed`:

```bash
curl -s https://api.bithuman.ai/v1/agent/status/A80HVD8577 -H "api-secret: $BITHUMAN_API_SECRET"
# → {"success": true, "data": {"status": "ready", "progress": 1.0, …}}
```

### Make it speak in a live session

Open `https://www.bithuman.ai/embed/<your agent code>`, then push text from your backend:

```bash
curl -s -X POST https://api.bithuman.ai/v1/agent/A80HVD8577/speak \
  -H "api-secret: $BITHUMAN_API_SECRET" -H "Content-Type: application/json" \
  -d '{"message": "Hello! Great to meet you."}'
# → {"agent_code": "A80HVD8577", "delivered_to_rooms": 1, …}
```

`404` means the agent is not yours, or it has no live session (the message says which).

To show a sample agent with no account, embed it:

```html
<iframe src="https://www.bithuman.ai/embed/A23WJF0199" allow="microphone *" style="width:100%;height:600px;border:0"></iframe>
```

Open the page and talk to it. Keep the `*` in `allow`, or the microphone is blocked. For your own site in production, mint an [embed token](/api/embedding).

### Render a talking video

```bash
curl -s -X POST https://api.bithuman.ai/v1/video/generate \
  -H "api-secret: $BITHUMAN_API_SECRET" -H "Content-Type: application/json" \
  -d '{"agent_code": "A80HVD8577", "model": "expression-2", "input": {"type": "audio", "audio_url": "https://docs.bithuman.ai/samples/speech-16k-short.wav"}}'
```

Poll `GET /v1/video/{job_id}` until `status` is `completed`, then download `video_url` ([Talking video](/api/video)).

## Troubleshooting

| Symptom | Cause | Fix |
|---|---|---|
| `402 INSUFFICIENT_BALANCE` | the balance is below the creation cost | [top up](https://www.bithuman.ai/billing#credits) |
| `validate.sh` prints `"valid": false` | the secret is wrong or revoked | create a new one |
| The status stays at `lip_sync` for a long time | that is the training step (about 2 hours) | keep polling |
| `422 MODEL_SUBJECT_MISMATCH` | the model needs a real human face; the image or prompt is a character, or has no face | use `expression-2`, or `auto`; nothing was charged |
| `404` for `A23WJF0199` on `/speak`, an update or a delete | on a sample, only reads and audio-input talking video are open to you | create an agent of your own |
| `400 VALIDATION_ERROR` *renders from audio only* on a sample | samples render your audio, not text | send `"input": {"type": "audio", "audio_url": "…"}` |
| `409 MODEL_NOT_GENERATED` on a sample | the `model` is not in the sample's `supported_models` | pass a model it lists (`wise-pup`: `expression-2`) |
| `404` from `speak.sh` or `/v1/agent/{code}/speak` | the agent is not yours, or it has no live session | the message says which; open its embed page first |

All error codes: [Errors](/api/errors).

## Reference

- [API reference](/api/reference): every endpoint, generated from the OpenAPI spec.
- [Agents](/api/agents) · [Talking video API](/api/video) · [Embedding](/api/embedding) · [Errors](/api/errors)
