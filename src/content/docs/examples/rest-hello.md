---
title: "REST example"
description: "Create a talking avatar agent with curl and nothing else: validate your API secret, check your balance, create an agent, and open it in the browser."
section: examples
group: "Examples"
order: 50
type: example
label: "REST"
---

Four shell scripts over the REST API: check your secret, check your balance, create an agent from a prompt, then talk to it in the browser. They work from any machine with `curl`.

## Requirements

| You need | Notes |
|---|---|
| An [API secret](/start/api-secret) | every call sends it in the `api-secret` header |
| `curl` and `python3` | `python3` only formats the JSON |
| Credits for one creation | 2000 for Expression 2, 500 for Essence 2 ([pricing](/guides/pricing#creation--one-time-credits)); a free balance cannot create an agent |

To try an avatar with no account and no credits first, use the [Web example](/examples/web).

## Get the code

```bash
git clone https://github.com/bithuman-product/bithuman-examples.git
cd bithuman-examples/api/rest-api/curl
```

## Set your API secret

```bash
export BITHUMAN_API_SECRET="<your API secret>"
```

## Run it

```bash
./validate.sh && ./check-credits.sh
BITHUMAN_MODEL=expression-2 ./generate-agent.sh "You are a friendly fitness coach."
```

`validate.sh` and `check-credits.sh` spend nothing. `generate-agent.sh` spends one creation charge, then polls until the agent is ready (about 2 to 2.5 hours for a second-generation model; a failed creation is refunded).

## Expected output

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

## How it works

| Script | Endpoint |
|---|---|
| `validate.sh` | [`POST /v1/validate`](/api/authentication#post-v1validate): always `200`; read `valid` |
| `check-credits.sh` | [`GET /v2/credit-summaries`](/api/billing): balance and plan |
| `generate-agent.sh` | [`POST /v1/agent/generate`](/api/agents#generate-an-agent), then [`GET /v1/agent/status/{id}`](/api/agents#poll-status) until `ready` or `failed` |
| `speak.sh` | [`POST /v1/agent/{code}/speak`](/api/agents): needs a live session |

## Make it your own

- **A face of your own:** add `"image": "https://…/portrait.jpg"` to the JSON in `generate-agent.sh`.
- **A photoreal person:** `BITHUMAN_MODEL=essence-2`, or `auto` to let the platform choose.
- **A video instead of a live session:** [`POST /v1/video/generate`](/api/video) renders your agent saying a line to an MP4.
- **Other languages:** [`api/rest-api/python`](https://github.com/bithuman-product/bithuman-examples/tree/main/api/rest-api/python) has the same calls in Python.

## Troubleshooting

| Symptom | Fix |
|---|---|
| `402 INSUFFICIENT_BALANCE` | the balance is below the creation cost: [top up](/guides/pricing#top-up-credits) |
| `validate.sh` prints `"valid": false` | the secret is wrong or revoked: create a new one |
| `404` from `speak.sh` | the agent has no live session: open its embed page first |
| The status stays at `lip_sync` for a long time | that is the training step (about 2 hours); keep polling |

All error codes: [Errors](/api/errors).

## Next

- [API quickstart](/api/quickstart) · [Agents API](/api/agents) · [Talking video](/api/video) · [source on GitHub](https://github.com/bithuman-product/bithuman-examples/tree/main/api/rest-api)
