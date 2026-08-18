---
title: "Providers (BYOK)"
description: "Bring your own LLM, STT, and TTS provider keys — store them encrypted and have your agents use them."
section: api
group: "Build"
order: 16
label: "Bring your own keys"
---

## Overview

The Providers API lets you **bring your own provider keys** (BYOK) — e.g. your own OpenAI or
Deepgram key — for your agents to use. Keys are stored **encrypted at rest** and are never
returned in plaintext; reads return only presence, a masked hint, and timestamps.

Base URL `https://api.bithuman.ai`. Authenticate with the `api-secret` header. The `{user_id}`
in the path is your account id — get it from [`GET /v1/me`](/api/billing#account-status).

Set it once in your shell before the examples below — with `$USER_ID` unset the
paths collapse to `/v2//…` and the API answers `404 {"detail":"Not Found"}`:

```bash
export USER_ID=$(curl -s https://api.bithuman.ai/v1/me \
  -H "api-secret: $BITHUMAN_API_SECRET" \
  | python3 -c "import sys,json;print(json.load(sys.stdin)['data']['user_id'])")
```


## Get provider config

`GET /v2/{user_id}/providers` — your configured providers, secrets masked.

```bash
curl "https://api.bithuman.ai/v2/$USER_ID/providers" \
  -H "api-secret: $BITHUMAN_API_SECRET"
```

```json
{
  "user_id": "3f9a…",
  "providers": {
    "entries": [
      {
        "id": "b7e1…",
        "platform": "openai",
        "label": "OpenAI",
        "options": {},
        "secrets": {
          "apiKey": { "present": true, "hint": "sk…4f2a", "updated_at": "2026-07-02T09:30:00Z" }
        }
      }
    ]
  }
}
```

Sensitive keys (`apiKey`, `api_key`, `secret`, `apiSecret`, `clientSecret`, `accessToken`,
`privateKey`) are returned only as `{present, hint, updated_at}` — never in full.

## Update provider config

`PUT /v2/{user_id}/providers` — replace your provider list. Send the full set of entries you
want stored.

**Body:** `{ "entries": ProviderEntry[] }`. Each entry:

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `platform` | string | yes | Provider id, e.g. `openai`, `deepgram`. |
| `id` | string | no | Existing entry id to update; omit to add a new one. |
| `label` | string | no | Display name; defaults to the platform name. |
| `credentials` | object | no | Key/value credentials. Sensitive keys are encrypted at rest. |
| `options` | object | no | Per-capability configuration. |
| `clearSecrets` | string[] | no | Sensitive credential keys to remove. |
| `metadata` | object | no | Freeform metadata. |

```bash
curl -X PUT "https://api.bithuman.ai/v2/$USER_ID/providers" \
  -H "api-secret: $BITHUMAN_API_SECRET" -H "content-type: application/json" \
  -d '{"entries":[{"platform":"openai","label":"OpenAI","credentials":{"apiKey":"sk-…"}}]}'
```

Returns the same masked shape as `GET`. Existing entries are matched by `id` and merged
(unspecified credentials are preserved); new entries get a generated id.

> **`entries` replaces the whole list.** Sending `{"entries": []}` **clears all** providers —
> to edit one provider, send the full set you want to keep. To drop a single secret, use
> `clearSecrets`.

Errors: `401`/`403` auth · `404` account not found · `500` on a storage failure.

## Point an agent at your provider

Registering a key does **not** change any agent by itself — it just stores the credential.
Each agent chooses its providers independently, so the last step is to attach the entry
you registered to the agent that should use it.

`POST /v1/agent/{agent_code}` — set the per-capability selection. Send only the
capabilities you want to change; the rest of the agent's settings are preserved.

| Capability | Value | Meaning |
|---|---|---|
| `llm` / `stt` / `tts` / `realtime` | `"default"` | Use the bitHuman-managed provider (the default). |
| `llm` / `stt` / `tts` / `realtime` | `{"mode": "custom", "provider_id": "<id>"}` | Use one of your registered entries. |

`provider_id` is the `id` returned by `GET`/`PUT /v2/{user_id}/providers`.

```bash
curl -X POST https://api.bithuman.ai/v1/agent/A12345678 \
  -H "api-secret: $BITHUMAN_API_SECRET" -H "content-type: application/json" \
  -d '{"providers": {"llm": {"mode": "custom", "provider_id": "b7e1…"}}}'
```

```json
{ "agent_code": "A12345678", "updated": true }
```

A `provider_id` you have not registered is rejected with `400 VALIDATION_ERROR` naming the
id — the selection is never stored half-configured. The change applies to the **next
session**; a call already in progress keeps the provider it started with.

### OpenAI-compatible endpoints (self-hosted, proxies, gateways)

Any endpoint that speaks the OpenAI chat-completions API works: register it with
`platform: "openai"` and put your endpoint in `credentials.baseUrl`.

```bash
curl -X PUT https://api.bithuman.ai/v2/$USER_ID/providers \
  -H "api-secret: $BITHUMAN_API_SECRET" -H "content-type: application/json" \
  -d '{"entries":[{
        "platform": "openai",
        "label": "My gateway",
        "credentials": {"apiKey": "…", "baseUrl": "https://llm.example.com/v1"},
        "options": {"llm": {"model": "my-model"}}
      }]}'
```

- **`baseUrl` is the base, not the full route.** Use `https://llm.example.com/v1` — we append
  `/chat/completions` ourselves. A pasted full endpoint is tolerated and trimmed.
- **`options.llm.model`** is the model name we send in the request body.
- **There is no host allowlist.** Any reachable HTTPS endpoint is called as configured; you
  do not need to ask us to permit a domain.

### Knowing which end user a call belongs to

Requests to your endpoint carry the visitor's identifier in the standard OpenAI
`user` field, so you can attribute a call without any bitHuman-specific parsing:

```json
{
  "model": "my-model",
  "messages": [ … ],
  "stream": true,
  "user": "29830a59917f82805468b3170b0d9082"
}
```

The value is resolved in this order, and the first one present wins:

1. the **`endUserId`** claim in the embed token you minted (also accepted as
   `fingerprint`) — see [Embedding](/api/embedding#production-mint-a-token);
2. an explicit **`?end_user_id=`** on the embed URL (aliases: `endUserId`,
   `visitor_id`, `fingerprint`);
3. the **session correlator** — a per-conversation identifier we generate.

Options 1 and 2 are *durable*: mint or pass the same string for a returning
visitor and you get the same value on every call, across sessions. Option 3 is
the automatic fallback so the field is **never empty** for your endpoint, but it
changes each session — if you see a value that varies per conversation, that
means no durable identifier reached us and you should set one.

> **Fixed 2026-08-18.** Embed tokens carrying `endUserId` were re-minted without
> the claim before reaching the runtime, so customers who followed option 1
> received the per-session correlator instead of their own identifier. The claim
> is now carried through. If you supply `endUserId` and still see a changing
> value, tell us — that is a bug, not a configuration issue.

Two limits worth knowing:

- **Sent only to your own endpoint.** Agents on bitHuman's default LLM do not
  send it, and neither does the fallback if your endpoint is unreachable.
- **Treat it as a hint, not an authenticated identity.** The value originates in
  the page that embeds the agent, so a determined visitor can change it. Use it
  to group and attribute traffic; do not use it alone to authorise access to one
  user's data.

Each request also carries `X-LiveKit-Room-ID` and `X-LiveKit-Job-ID` headers.
Those identify the live session, not the person, and are useful for correlating a
single conversation's calls.
