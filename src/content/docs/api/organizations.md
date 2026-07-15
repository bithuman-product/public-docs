---
title: "Organizations"
description: "Create a team, invite members, manage roles and org-scoped API keys, and track per-member usage."
section: api
group: "Account & teams"
order: 42
label: "Teams & orgs"
---

## Overview

Organizations let a team share agents, knowledge bases, and API keys under one account, with
role-based access and per-member usage tracking.

Base URL `https://api.bithuman.ai`. Authenticate with your `api-secret`; the acting account is
resolved from the key. **Organizations require a Pro, Business, or Enterprise plan** — creating
one or inviting members on a lower plan returns `403`.

**Roles.** Every member is an `owner`, `admin`, or `member`. The table notes the minimum role
each call needs; insufficient role returns `403`. Seat caps by plan: Enterprise 50, Business 25,
Pro 10.

## Organizations

### Create

`POST /v2/organizations` — create an org (Pro+). Adds you as `owner`. One org per user today.

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `name` | string | yes | 1–100 chars. |
| `slug` | string | no | URL slug (lowercase alphanumeric + hyphens, 3–64). Auto-derived from `name` if omitted. |

```bash
curl -X POST https://api.bithuman.ai/v2/organizations \
  -H "api-secret: $BITHUMAN_API_SECRET" -H "content-type: application/json" \
  -d '{"name":"Acme Inc"}'
```

```json
{ "id": "org_a1b2c3", "name": "Acme Inc", "slug": "acme-inc", "owner_user_id": "user_123",
  "plan": "membership_business", "max_members": 25, "created_at": "2026-07-15T10:00:00Z" }
```

Errors: `403` plan gate · `409` you already own an org, or the slug is taken · `422` bad slug.

### Get · Update · Delete

| Method / path | Role | Notes |
|---|---|---|
| `GET /v2/organizations/{org_id}` | member | The org object. |
| `PATCH /v2/organizations/{org_id}` | admin | Body: `name` and/or `slug`. |
| `DELETE /v2/organizations/{org_id}` | owner | Reverts members' agents to personal ownership. |
| `POST /v2/organizations/{org_id}/transfer-ownership` | owner | Body: `new_owner_member_id`. Old owner becomes `admin`. |
| `GET /v2/users/{user_id}/organizations` | self | Orgs you own or belong to, each with your `role`. |

## Members

### List

`GET /v2/organizations/{org_id}/members` — any member. Owners/admins see pending & removed
members too; regular members see only active ones.

```json
{
  "org_id": "org_a1b2c3",
  "members": [
    { "id": "mem_1", "user_id": "user_123", "email": "owner@acme.com", "role": "owner", "status": "active" },
    { "id": "mem_3", "email": "invitee@acme.com", "role": "admin", "status": "pending" }
  ],
  "total": 2
}
```

### Invite

`POST /v2/organizations/{org_id}/members/invite` — owner or admin.

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `email` | string | yes | Invitee email. |
| `role` | string | no | `admin` or `member` (default `member`). |

```json
{ "message": "Invitation created", "invite_token": "…", "member_id": "mem_9" }
```

The invite token is valid 7 days; the invite link is `…/invite?token=<token>` (emailed if SMTP
is configured, otherwise share it yourself). Errors: `403` seat limit reached or owner no longer
Pro+ · `409` already a member or pending.

### Other member operations

| Method / path | Role | Notes |
|---|---|---|
| `POST …/members/{member_id}/resend-invite` | admin | Re-issues a token for a pending invite. |
| `POST /v2/organizations/accept-invite` | self | Body: `token`. Your email must match the invite. |
| `PATCH …/members/{member_id}` | admin* | Body: `role` (`admin`/`member`). Only owners can change an admin's role. |
| `DELETE …/members/{member_id}` | admin* | Remove a member; a member can remove themselves (leave). Only owners remove admins; the owner can't leave. |

## Organization API keys {#org-api-keys}

Org-scoped keys are what the [Knowledge API](/api/knowledge) and other org-shared resources use.

| Method / path | Role | Notes |
|---|---|---|
| `POST /v2/organizations/{org_id}/api-secrets` | admin | Body: `alias` (optional). Returns the full `secret` **once**. |
| `GET /v2/organizations/{org_id}/api-secrets` | member | Lists keys, masked. |
| `DELETE /v2/organizations/{org_id}/api-secrets/{alias}` | admin | Deletes a key. |

```json
// POST → the secret is shown only on creation
{ "alias": "ci-pipeline", "secret": "k7m2…aC8e" }
```

## Usage & audit

| Method / path | Role | Notes |
|---|---|---|
| `GET /v2/organizations/{org_id}/usage` | admin | Per-member credit usage, highest first. |
| `GET /v2/organizations/{org_id}/audit-log` | admin | Recent org events; `?limit` (default 50, max 200). |

```json
// usage
{ "org_id": "org_a1b2c3", "usage": [ { "user_id": "user_456", "email": "dev@acme.com", "total_credits_used": 1240.5 } ] }
```

Audit events include `create_org`, `invite_member`, `accept_invite`, `update_role`,
`remove_member`, `create_api_key`, `delete_api_key`, `transfer_ownership`, and `delete_org`.
