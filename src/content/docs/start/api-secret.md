---
title: "Your API secret"
description: "The one credential for every bitHuman surface: where to get it, where each platform reads it, and how to keep it off devices."
section: start
group: "Get started"
order: 2
type: guide
label: "Your API secret"
---

One API secret works on every surface: the REST API, the CLI, Python, Apple, Android and LiveKit. Credits pay for session time, talking or idle, by the exact second ([pricing](/guides/pricing)).

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
| Python | `BITHUMAN_API_SECRET` | `api_secret=` |
| Apple | `BITHUMAN_API_SECRET` | `Essence2Credential.set` / `Expression2Credential.set` |
| Android | `BITHUMAN_API_SECRET` | `Essence2Credential.set` / `Expression2Credential.set` |
| LiveKit worker | `BITHUMAN_MASTER_SECRET`, never `BITHUMAN_API_SECRET` | a short-lived token minted from it, never the secret ([LiveKit](/sdk/livekit#authenticate)) |
| Web embed | — | none for a public agent; an [embed token](/api/embedding) for a private one |

`BITHUMAN_API_KEY` is a deprecated alias of `BITHUMAN_API_SECRET`; use the new name.

## Keep it safe

- Keep the secret in the environment or a secrets manager, never in source control or on a command line.
- Do not ship it inside an app you distribute. Fetch it from your own backend at startup instead.
- Browsers and LiveKit rooms get short-lived tokens: an [embed token](/api/embedding) or a runtime token minted with [`POST /v1/runtime-tokens/mint`](/sdk/livekit#authenticate).
- If a secret leaks, create a new one and delete the old one in the console.

## Next

- [REST authentication](/api/authentication): the header, validation and error codes.
- [Choose your path](/start#choose-your-path).
