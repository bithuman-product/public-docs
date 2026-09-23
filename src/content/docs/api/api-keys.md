---
title: "API secrets"
description: "Create, list, and delete your account's API secrets programmatically."
section: api
group: "Account"
order: 30
type: endpoint
label: "API secrets"
---

## Overview

Manage your account's **API secrets** from code — create new ones, list them (masked), or
delete one. Handy for rotating API secrets or provisioning one per server.

Base URL `https://api.bithuman.ai`. Authenticate with an existing `api-secret`. The `{user_id}`
in the path is your own account id — get it from [`GET /v1/me`](/api/billing#account-status).

Set it once in your shell before the examples below — with `$USER_ID` unset the
paths collapse to `/v2//…` and the API answers `404 {"detail":"Not Found"}`:

```bash
export USER_ID=$(curl -s https://api.bithuman.ai/v1/me \
  -H "api-secret: $BITHUMAN_API_SECRET" \
  | python3 -c "import sys,json;print(json.load(sys.stdin)['data']['user_id'])")
```

You can only manage your own API secrets.

## Create an API secret

`POST /v2/{user_id}/api-secrets`

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `alias` | string | no | A label for the API secret (≤32 chars). Auto-generated if omitted. |

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

## List API secrets

`GET /v2/{user_id}/api-secrets` — your API secrets, masked.

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
all carry the same alias label; despite its name, the `key` field is the label, not the secret.

## Reveal an API secret

`GET /v2/{user_id}/api-secrets/{alias}/get-value` is **console-only**. Only the signed-in owner
can reveal a stored secret, in the console under
[Developer → API Secrets](https://www.bithuman.ai/developer/api-keys). The request below fails:

```bash
curl "https://api.bithuman.ai/v2/$USER_ID/api-secrets/prod-server/get-value" \
  -H "api-secret: $BITHUMAN_API_SECRET"
```

**`403 Forbidden`**

```json
{ "error": { "code": "SECRET_REVEAL_CONSOLE_ONLY", "httpStatus": 403,
             "message": "A stored API secret can only be revealed in the bitHuman console …" } }
```

The rule is there so that one leaked secret cannot be used to read all your other secrets. Keep
the value that [create](#create-an-api-secret) returns. If you have lost it, create a new secret
and delete the old one.

## Delete an API secret

`DELETE /v2/{user_id}/api-secrets/{alias}` — remove an API secret and revoke it at the runtime.

```bash
curl -X DELETE "https://api.bithuman.ai/v2/$USER_ID/api-secrets/prod-server" \
  -H "api-secret: $BITHUMAN_API_SECRET"
```

```json
{ "alias": "prod-server", "message": "API secret deleted successfully" }
```

Deleting an API secret adds it to a runtime denylist immediately — only that one stops working;
your other API secrets keep running. Errors: `404` no API secret with that alias.

> Need to stop **every** API secret at once (a leak)? See
> [Runtime sessions → revoke all](/api/runtime-sessions#revoke-all-keys).
