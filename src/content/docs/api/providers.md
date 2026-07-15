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
