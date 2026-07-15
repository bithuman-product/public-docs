---
title: "Knowledge API"
description: "Ingest documents and URLs, build knowledge bases, and rebuild them — programmatically, with an organization API key."
section: api
group: "Build"
order: 14
label: "Knowledge bases"
---

## Overview

The Knowledge API lets you ingest source material and build **knowledge bases (KBs)**
your agents answer from — entirely from code. It covers the ingest → create → build →
resync loop: upload a file or URL, create a KB from those files, and rebuild it when the
sources change.

> **Requires an organization API key.** These endpoints are scoped to an organization —
> use a key created under [Organizations → API keys](/api/organizations#org-api-keys).
> A personal key returns `403`. Everything you create is owned by the organization and
> counts against its plan quotas.

Ingestion and builds run **asynchronously**: each call returns immediately with the created
row, and conversion/indexing continues in the background. There is no per-call credit charge —
limits are your plan's file-count and KB-count quotas, plus a build concurrency cap (1 at a
time) and a daily build cap (20/day).

Base URL `https://api.bithuman.ai`. Authenticate with the `api-secret` header.

## Ingest a file or URL

`POST /v1/knowledge/files` — add one source. Accepts either an uploaded file (multipart) or
a URL to fetch (JSON). Returns the created file row at status `uploaded`; conversion runs
in the background.

**Upload a file** (multipart/form-data):

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `file` | file | yes | The document bytes. Max 100 MB. |
| `name` | string | no | Display name; defaults to the uploaded filename. |

**Fetch a URL** (application/json):

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `url` | string | yes | A public `http(s)` URL to fetch and convert. |
| `name` | string | no | Display name; defaults to the URL host. |
| `sync_freq` | string | no | Re-sync cadence: `never` (default), `daily`, `weekly`, `monthly`. |

```bash
# Upload a file
curl -X POST https://api.bithuman.ai/v1/knowledge/files \
  -H "api-secret: $ORG_API_SECRET" \
  -F "file=@handbook.pdf" -F "name=Employee Handbook"

# Or ingest a URL
curl -X POST https://api.bithuman.ai/v1/knowledge/files \
  -H "api-secret: $ORG_API_SECRET" -H "content-type: application/json" \
  -d '{"url":"https://example.com/help","name":"Help Center","sync_freq":"weekly"}'
```

**`201 Created`** — the file row:

```json
{
  "id": "3f2b9c14-8a7e-4d21-9f10-2c5b6e0a11dd",
  "org_id": "org_9d1f",
  "file_name": "handbook.pdf",
  "ext": "pdf",
  "size_bytes": 428193,
  "status": "uploaded",
  "source_kind": "upload",
  "created_at": "2026-07-15T12:00:00Z"
}
```

Use the returned `id` when creating a KB. Errors: `413` file over 100 MB · `422` empty file,
missing `file`/`url`, non-public URL, or bad `sync_freq` · `409` `QUOTA_EXCEEDED` (file-count
limit reached).

## Create a knowledge base

`POST /v1/knowledge/kbs` — create a KB and (by default) kick off its first build.

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `name` | string | yes | KB name (1–120 chars). |
| `description` | string | no | Up to 2000 chars. |
| `file_ids` | string[] | no | File `id`s to attach (must be your org's own files). |
| `build` | boolean | no | Build immediately after create. Default `true`. |

```bash
curl -X POST https://api.bithuman.ai/v1/knowledge/kbs \
  -H "api-secret: $ORG_API_SECRET" -H "content-type: application/json" \
  -d '{"name":"Support KB","file_ids":["3f2b9c14-8a7e-4d21-9f10-2c5b6e0a11dd"]}'
```

**`201 Created`** — the KB row, plus `file_ids` and `build_dispatched`:

```json
{
  "id": "b71e0a92-4c3d-4f88-8a01-9e2f4c6d7b10",
  "org_id": "org_9d1f",
  "name": "Support KB",
  "status": "stale",
  "content_rev": 1,
  "file_ids": ["3f2b9c14-8a7e-4d21-9f10-2c5b6e0a11dd"],
  "build_dispatched": true
}
```

`build_dispatched` is `true` only when `build` was `true`, files were attached, and the build
queued successfully. The KB is still created (`201`) otherwise — build it later with the
rebuild call. Errors: `404` a `file_id` doesn't exist · `403` a `file_id` isn't yours · `409`
`QUOTA_EXCEEDED` (KB-count limit).

## List knowledge bases

`GET /v1/knowledge/kbs` — the organization's KBs, newest first. Each row includes computed
`agent_count` and `source_count`.

```bash
curl https://api.bithuman.ai/v1/knowledge/kbs -H "api-secret: $ORG_API_SECRET"
```

```json
{
  "kbs": [
    {
      "id": "b71e0a92-4c3d-4f88-8a01-9e2f4c6d7b10",
      "name": "Support KB",
      "status": "ready",
      "content_rev": 2,
      "built_rev": 2,
      "artifact_url": "https://…/artifact.zip",
      "agent_count": 1,
      "source_count": 3
    }
  ],
  "total": 1
}
```

## Rebuild a knowledge base

`POST /v1/knowledge/kbs/{kb_id}/rebuild` — re-index a KB after its sources change. Returns the
queued build row; indexing runs in the background.

```bash
curl -X POST https://api.bithuman.ai/v1/knowledge/kbs/b71e0a92-…/rebuild \
  -H "api-secret: $ORG_API_SECRET"
```

```json
{
  "id": "e5c9a1f7-0b44-4a6e-9c22-77d0b3e18a55",
  "kb_id": "b71e0a92-4c3d-4f88-8a01-9e2f4c6d7b10",
  "status": "queued",
  "started_at": "2026-07-15T12:10:00Z"
}
```

Errors: `404` unknown KB · `422` `KB_EMPTY` (no source files) · `409` `BUILD_IN_PROGRESS`
(one already running on this KB — the request flags a rebuild-when-done), `BUILD_CONCURRENCY`
(another build is running for the account), or `BUILD_DAILY_CAP` (20/day reached).

## Scope & limits

The `/v1/knowledge` surface covers ingest → create → build → resync. Status polling, agent
attach/detach, sharing, Q&A curation, and build history are managed in the dashboard (the
session-authed `/v2/knowledge` surface) and aren't on the developer key yet.
