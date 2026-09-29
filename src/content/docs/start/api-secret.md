---
title: "Your API secret"
description: "The one credential for every bitHuman surface: where to get it, where each platform reads it, and what a shipped app holds."
section: start
group: "Get started"
order: 20
type: guide
llms: start
availability: creator
next: ["/start", "/platforms", "/api/authentication"]
---

One API secret works on every surface: the REST API, the CLI, Python, Apple, Android and LiveKit. Credits pay for session time, talking or idle, by the exact second ([pricing](/pricing)).

## Get one

Create an API secret under [Developer → API Secrets](https://www.bithuman.ai/developer/api-keys), then export it:

```bash
export BITHUMAN_API_SECRET="<your API secret>"
curl -s -X POST https://api.bithuman.ai/v1/validate -H "api-secret: $BITHUMAN_API_SECRET"
# → {"valid":true}
```

## Where each platform reads it

| Platform | Environment | In code |
|---|---|---|
| REST API | — | header `api-secret` |
| CLI | `BITHUMAN_API_SECRET` | `bithuman login` stores a credential for you |
| Python | `BITHUMAN_API_SECRET` (read by `bithuman.open`) | `api_secret=` on `AsyncBithuman.create()` only; `bithuman.open()` reads the environment |
| Apple | `BITHUMAN_API_SECRET` | `Essence2Credential.set` / `Expression2Credential.set` |
| Android | — | `Essence2Credential.set(secret)` / `Expression2Credential.set(secret)` before `fetch()` and `create()`; fetch the secret from your backend in a shipped app |
| LiveKit worker | `BITHUMAN_MASTER_SECRET`, never `BITHUMAN_API_SECRET` | a short-lived token minted from it, never the secret ([LiveKit](/platforms/livekit#authenticate)) |
| Web embed | — | none for a public agent; an [embed token](/api/embedding) for a private one |

`BITHUMAN_API_KEY` is a deprecated alias of `BITHUMAN_API_SECRET`; rename it. It stops being read in CLI 3.0 and bithuman 4.0 (no earlier than 2026-12-26).

## Keep it safe

- Keep the secret in the environment or a secrets manager, never in source control or on a command line.
- Browsers and LiveKit rooms get short-lived tokens: an [embed token](/api/embedding) or a runtime token minted with [`POST /v1/runtime-tokens/mint`](/platforms/livekit#authenticate).
- If a secret leaks, create a new one and delete the old one in the console.

## What a shipped app holds

```partial
shipped-app-secret
```

## Next

- [REST authentication](/api/authentication): the header, validation and error codes.
- [Pick your platform](/start#choose-your-platform).
