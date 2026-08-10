---
title: "Organizations"
description: "Create a team, invite members, manage roles, share knowledge bases, issue org-scoped API keys, consolidate billing, and track per-member usage."
section: api
group: "Account & teams"
order: 42
label: "Teams & orgs"
---

## Overview

An organization is a shared account: one roster of people with roles, one set of org-scoped API
keys, one pool of shared knowledge bases, and one bill. Concretely it gives you

- **A member roster with roles** — `owner`, `admin`, `member`, enforced server-side on every call.
- **Shared knowledge bases** — a member shares a knowledge base to the org and the whole org can
  read it. See the [Knowledge API](/api/knowledge).
- **Org-scoped API keys** — keys that belong to the organization rather than to a person, so they
  survive that person leaving.
- **Consolidated billing** — a member's usage is charged to the organization owner's credit pool,
  not to the member.
- **Per-member usage and an audit log** — who spent what, and who changed what.

Base URL `https://api.bithuman.ai`. Authenticate with your `api-secret`; the acting account is
resolved from the key. **Organizations require a Pro, Business, or Enterprise plan** (monthly or
yearly) — creating one or inviting members on a lower plan returns `403`.

**Roles.** Every member is an `owner`, `admin`, or `member`. The table notes the minimum role
each call needs; insufficient role returns `403`. Seat caps by plan: Enterprise 50, Business 25,
Pro 10.

### Not yet supported

> **Agents are not shared by an organization.** An agent stays owned by the individual who
> created it. Joining an organization does not make your teammates' agents visible to you, and
> no endpoint on this page transfers an agent to an organization. What is shared is people,
> keys, knowledge, billing and audit — not agent ownership. To let colleagues or customers use
> an agent, publish it with the [Embedding API](/api/embedding); that path is independent of
> organizations.

> **No SSO.** Members join by email invitation only. SAML / OIDC single sign-on and SCIM
> provisioning are not available.

## Organizations

### Create

`POST /v2/organizations` — create an org (Pro+). Adds you as `owner`. You can own at most one
organization; you can still be invited into others as an `admin` or `member`.

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

The response also carries a `settings` object. It is reserved: `PATCH` accepts only `name` and
`slug`, so nothing writes it today and no key inside it changes platform behaviour.

### Get · Update · Delete

| Method / path | Role | Notes |
|---|---|---|
| `GET /v2/organizations/{org_id}` | member | The org object. |
| `PATCH /v2/organizations/{org_id}` | admin | Body: `name` and/or `slug`. Nothing else is editable. |
| `DELETE /v2/organizations/{org_id}` | owner | Dissolves the org. Shared knowledge bases revert to the member who owns each one; agents attached to a shared KB by someone other than that KB's owner are detached first. |
| `POST /v2/organizations/{org_id}/transfer-ownership` | owner | Body: `new_owner_member_id` (an **active** member who is not you). Old owner becomes `admin`. |
| `GET /v2/users/{user_id}/organizations` | self | Orgs you own or belong to, each with your `role`. Another user's `user_id` returns `403`. |

Deleting an organization does not delete anyone's agents, knowledge bases, or credit history.
It removes the shared layer: the roster, the org-scoped API keys, the org sharing on knowledge
bases, and — permanently — the audit log. Export the audit log first if you need to keep it.

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

The invite token is valid 7 days; the invite link is `…/invite?token=<token>`. The first invite
to a new email is emailed when SMTP is configured on the server — otherwise, and in every other
case below, **the response body is the delivery mechanism**: take `invite_token`, build the link,
and send it yourself. Errors: `403` seat limit reached or owner no longer Pro+ · `409` already a
member or pending · `422` role is not `admin` or `member`.

Re-inviting an email you previously removed reuses the same member row, returns
`"message": "Re-invitation sent"`, and returns a fresh token — but sends no email.

### Other member operations

| Method / path | Role | Notes |
|---|---|---|
| `POST …/members/{member_id}/resend-invite` | admin | Re-issues a token for a `pending` invite and returns it. Sends no email. `422` if the member is not pending. |
| `POST /v2/organizations/accept-invite` | self | Body: `token`. Your email must match the invite (`403` otherwise) · `401` invalid or expired · `409` already accepted · `410` invitation revoked. |
| `PATCH …/members/{member_id}` | admin* | Body: `role` (`admin`/`member`). Only owners can change an admin's role; the `owner` role can't be changed here — use transfer-ownership. |
| `DELETE …/members/{member_id}` | admin* | Remove a member; a member can remove themselves (leave). Only owners remove admins; the owner can't leave. |

Removing a member (or a member leaving) keeps the organization's knowledge intact: knowledge
bases they had shared to the org **transfer to the org owner** and stay shared, and their agents
are detached from any org knowledge base they no longer have access to.

## Organization API keys

An org-scoped key belongs to the organization, not to a person, so it keeps working when the
person who created it leaves. It is the key the [Knowledge API](/api/knowledge) requires — a
personal key returns `403` there.

On every other endpoint an org key authenticates **as the organization owner**, and work done
with it is billed to the owner's credit pool. It does not grant any additional cross-member
access: there is no org-wide view of teammates' agents to reach.

| Method / path | Role | Notes |
|---|---|---|
| `POST /v2/organizations/{org_id}/api-secrets` | admin | Body: `alias` (optional, ≤32 chars, auto-generated if omitted). Returns the full `secret` **once**. `409` if the alias exists. |
| `GET /v2/organizations/{org_id}/api-secrets` | member | Lists keys, masked. |
| `DELETE /v2/organizations/{org_id}/api-secrets/{alias}` | admin | Deletes a key, effective immediately. `404` if the alias is unknown. |

```json
// POST → the secret is shown only on creation
{ "alias": "ci-pipeline", "secret": "k7m2…aC8e" }
```

There is no rotate operation. To rotate, create the replacement key, cut your callers over, then
delete the old alias.

## Usage & audit

| Method / path | Role | Notes |
|---|---|---|
| `GET /v2/organizations/{org_id}/usage` | admin | Per-member credit usage, highest first, all-time. |
| `GET /v2/organizations/{org_id}/audit-log` | admin | Recent org events, newest first; `?limit` (default 50, max 200). |

```json
// usage
{ "org_id": "org_a1b2c3", "usage": [ { "user_id": "user_456", "email": "dev@acme.com", "total_credits_used": 1240.5 } ] }
```

Usage counts activity recorded against the organization — that is, work done by a member while
their membership was active, or through an org API key. It is a lifetime total; there is no date
range or grouping parameter, so compute periods client-side by snapshotting.

**Audit events.** Membership and keys: `create_org`, `invite_member`, `resend_invite`,
`accept_invite`, `update_role`, `remove_member`, `transfer_ownership`, `create_api_key`,
`delete_api_key`, `delete_org`. Knowledge: `kb_share`, `kb_unshare`, `kb_attach_agent`,
`kb_detach_agent`, `kb_source_add`, `kb_source_remove`, `kb_qa_edit`, `kb_rebuild`, `kb_delete`,
`kb_restore`. Each row carries `user_id`, `action`, a `details` object, and `created_at`.

The audit log is scoped to one organization and covers the actions above only — it is not a
platform-wide access log, and it does not record reads, sign-ins, or agent activity. Audit
writes are best-effort: a failure to record an event is logged server-side and does not fail the
underlying operation. Rows are kept until the organization is deleted, at which point they are
removed with it.
