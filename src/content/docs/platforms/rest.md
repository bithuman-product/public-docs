---
title: "REST API"
description: "Call bitHuman from any backend over HTTPS: check your API secret, speak with text to speech, create your own agent, drive a live session and render a talking video."
section: platforms
group: "Agents & APIs"
order: 20
type: platform
llms: platforms
renders: ["cloud"]
next: ["/api/agents", "/api/video", "/api/reference"]
availability: creator
---

The REST API creates and manages agents, speaks with text to speech, pushes lines into live sessions and renders talking videos. Every call is HTTPS with your API secret in a header, from any language that can make a request.

## Before you start

- An [API secret](/start/api-secret). API use needs the Creator plan or higher.
- `curl`, or any HTTP client.
- Credits for anything beyond a check: creating an agent is a one-time charge ([pricing](/pricing#creation--one-time-credits)).

To try an avatar with no account first, use the [web embed](/platforms/web).

## Authenticate

Send your API secret in the `api-secret` header on every call. `POST /v1/validate` checks it and spends nothing; it always returns `200`, so read `valid`. The full rules are on [Authentication](/api/authentication).

## First frame

```bash
export BITHUMAN_API_SECRET="<your API secret>"
curl -s -X POST https://api.bithuman.ai/v1/validate -H "api-secret: $BITHUMAN_API_SECRET"
# → {"valid":true}
curl -s -X POST https://api.bithuman.ai/v1/tts \
  -H "api-secret: $BITHUMAN_API_SECRET" -H "Content-Type: application/json" \
  -d '{"text": "Hello from bitHuman.", "voice": "F1"}' --output hello.wav
# → hello.wav
```

`/v1/validate` always returns `200`; read `valid`. Get an API secret under [Developer → API Secrets](https://www.bithuman.ai/developer/api-keys).

## Complete example

Four shell scripts from the examples repository: check your secret, check your balance, create an agent from a prompt, then talk to it in the browser.

### Get the code

```bash
git clone https://github.com/bithuman-product/bithuman-examples.git
cd bithuman-examples/api/rest-api/curl
```

### Run it

```bash
./validate.sh && ./check-credits.sh
BITHUMAN_MODEL=expression-2 ./generate-agent.sh "You are a friendly fitness coach."
```

`validate.sh` and `check-credits.sh` spend nothing. `generate-agent.sh` spends one creation charge, then polls until the agent is ready (about 2 to 2.5 hours for a second-generation model; a failed creation is refunded).

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
- **A photoreal person:** `BITHUMAN_MODEL=essence-2`, or `auto` to let the platform choose.
- **A video instead of a live session:** [`POST /v1/video/generate`](/api/video) renders your agent saying a line to an MP4.
- **Other languages:** [`api/rest-api/python`](https://github.com/bithuman-product/bithuman-examples/tree/main/api/rest-api/python) has the same calls in Python.

## Integrate into your app

### Create your own agent

Creation is a one-time charge ([pricing](/pricing#creation--one-time-credits)); a balance below the creation cost returns `402`. Always send `model`.

```bash
curl -s -X POST https://api.bithuman.ai/v1/agent/generate \
  -H "api-secret: $BITHUMAN_API_SECRET" -H "Content-Type: application/json" \
  -d '{"model": "expression-2", "prompt": "You are a friendly fitness coach.", "image": "https://your-site.example/portrait.jpg"}'
# → {"success": true, "agent_id": "A80HVD8577", "status": "processing"}
```

Poll until `status` is `ready` or `failed` (about 2–2.5 hours for a second-generation model):

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
  -d '{"agent_code": "A80HVD8577", "model": "expression-2", "input": {"type": "text", "text": "Welcome to our store."}}'
```

Poll `GET /v1/video/{job_id}` until `status` is `completed`, then download `video_url` ([Talking video](/api/video)).

## Troubleshooting

| Symptom | Cause | Fix |
|---|---|---|
| `402 INSUFFICIENT_BALANCE` | the balance is below the creation cost | [top up](https://www.bithuman.ai/billing#credits) |
| `validate.sh` prints `"valid": false` | the secret is wrong or revoked | create a new one |
| The status stays at `lip_sync` for a long time | that is the training step (about 2 hours) | keep polling |
| `404` from `speak.sh` or `/v1/agent/{code}/speak` | the agent is not yours, or it has no live session | the message says which; open its embed page first |

All error codes: [Errors](/api/errors).

## Reference

- [API reference](/api/reference): every endpoint, generated from the OpenAPI spec.
- [Agents](/api/agents) · [Talking video API](/api/video) · [Text to speech](/api/text-to-speech) · [Embedding](/api/embedding) · [Errors](/api/errors)
