---
title: "API keys"
description: "Create, list, reveal, and delete your account's API secrets programmatically."
section: api
group: "Account & teams"
order: 40
---

## Overview

Manage your account's **API secrets** from code — create new keys, list them (masked), reveal
a key's value, or delete one. Handy for rotating keys or provisioning per-server credentials.

Base URL `https://api.bithuman.ai`. Authenticate with an existing `api-secret`. The `{user_id}`
in the path is your own account id — get it from [`GET /v1/me`](/api/billing#account-status).

> **Header differs on the self-hosted container.** These cloud-API calls use the
> `api-secret:` header. The [self-hosted Essence 2 Max container](/guides/deploy-essence-2-max)
> takes the **same key** but as a bearer token — `Authorization: Bearer $BITHUMAN_API_SECRET`.
> Use `api-secret:` against `api.bithuman.ai`, `Authorization: Bearer` against your local container.

Set it once in your shell before the examples below — with `$USER_ID` unset the
paths collapse to `/v2//…` and the API answers `404 {"detail":"Not Found"}`:

```bash
export USER_ID=$(curl -s https://api.bithuman.ai/v1/me \
  -H "api-secret: $BITHUMAN_API_SECRET" \
  | python3 -c "import sys,json;print(json.load(sys.stdin)['data']['user_id'])")
```

You can only manage your own keys.

## Create a key

`POST /v2/{user_id}/api-secrets`

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `alias` | string | no | A label for the key (≤32 chars). Auto-generated if omitted. |

```bash
curl -X POST "https://api.bithuman.ai/v2/$USER_ID/api-secrets" \
  -H "api-secret: $BITHUMAN_API_SECRET" -H "content-type: application/json" \
  -d '{"alias":"prod-server"}'
```

**`200 OK`** — the **only** response that returns the full secret. Store it now; it can't be
listed in plaintext later.

```json
{ "alias": "prod-server", "secret": "k7m2p9x4…Sn3Q8vT1w…aC8e" }
```

Errors: `409` alias already exists · `404` account not found.

## List keys

`GET /v2/{user_id}/api-secrets` — your keys, masked.

```bash
curl "https://api.bithuman.ai/v2/$USER_ID/api-secrets" -H "api-secret: $BITHUMAN_API_SECRET"
```

```json
{
  "user_id": "8f14e45f-…",
  "data": [
    { "alias": "prod-server", "name": "prod-server",
      "key_display": "k7m2p9x4••••••••••••••••••••aC8e",
      "created_at": "2026-07-15T15:30:45Z" }
  ],
  "total_count": 1
}
```

The raw secret is never returned here — only `key_display` (masked). `name`, `key`, and `alias`
all carry the same alias label.

## Reveal a key

`GET /v2/{user_id}/api-secrets/{alias}/get-value` — return one key's full value.

```bash
curl "https://api.bithuman.ai/v2/$USER_ID/api-secrets/prod-server/get-value" \
  -H "api-secret: $BITHUMAN_API_SECRET"
```

```json
{ "value": "k7m2p9x4…aC8e" }
```

Errors: `404` no key with that alias.

## Delete a key

`DELETE /v2/{user_id}/api-secrets/{alias}` — remove a key and revoke it at the runtime.

```bash
curl -X DELETE "https://api.bithuman.ai/v2/$USER_ID/api-secrets/prod-server" \
  -H "api-secret: $BITHUMAN_API_SECRET"
```

```json
{ "alias": "prod-server", "message": "API secret deleted successfully" }
```

Deleting a key adds it to a runtime denylist immediately — only that key stops working; your
other keys keep running. Errors: `404` no key with that alias.

> Need to stop **every** key at once (a leak)? See
> [Runtime sessions → revoke all](/api/runtime-sessions#revoke-all-keys).
