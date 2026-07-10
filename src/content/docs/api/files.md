---
title: "File Upload API"
description: "Upload images, video, audio, and documents by URL or base64. Files are auto-organized by type and returned as CDN URLs."
section: api
group: "Build"
order: 13
---

## Upload a file

`POST /v1/files/upload` — upload a file for processing. Supports both URL
downloads and direct base64 uploads. Files are automatically organized by type:

| Category | Storage path | Extensions |
|---|---|---|
| **Images** | `assets/image/` | `.jpg`, `.jpeg`, `.png`, `.gif`, `.webp`, `.bmp`, `.svg` |
| **Videos** | `assets/video/` | `.mp4`, `.avi`, `.mov`, `.wmv`, `.flv`, `.webm`, `.mkv` |
| **Audio** | `assets/audio/` | `.mp3`, `.wav`, `.flac`, `.aac`, `.ogg`, `.m4a` |
| **Documents** | `assets/docs/` | `.pdf`, `.doc`, `.docx`, `.txt`, `.ppt`, `.pptx`, `.xls`, `.xlsx`, `.csv` |

## Method 1: URL upload

Download a file from a publicly accessible URL.

| Parameter | Type | Description |
|---|---|---|
| `file_url` | string | URL of the file to download. |
| `file_type` | string | One of `auto`, `image`, `video`, `audio`, `document`. |

```python
import requests

resp = requests.post(
    "https://api.bithuman.ai/v1/files/upload",
    headers={"Content-Type": "application/json", "api-secret": "YOUR_API_SECRET"},
    json={"file_url": "https://example.com/presentation.pdf", "file_type": "auto"},
)
print(resp.json())
```

## Method 2: direct upload

Upload base64-encoded file data directly.

| Parameter | Type | Description |
|---|---|---|
| `file_data` | string | Base64-encoded file data. |
| `file_name` | string | Original filename with extension. |
| `file_type` | string | One of `auto`, `image`, `video`, `audio`, `document`. |

```python
import base64, requests

with open("document.pdf", "rb") as f:
    file_data = base64.b64encode(f.read()).decode("utf-8")

resp = requests.post(
    "https://api.bithuman.ai/v1/files/upload",
    headers={"Content-Type": "application/json", "api-secret": "YOUR_API_SECRET"},
    json={"file_data": file_data, "file_name": "document.pdf", "file_type": "auto"},
)
print(resp.json())
```

## Response

Both methods return the same shape:

```json
{
  "success": true,
  "message": "File uploaded successfully",
  "data": {
    "file_url": "https://storage.bithuman.ai/bithuman/YOUR_USER_ID/assets/docs/20260515_103000_document.pdf",
    "original_source": "https://example.com/document.pdf",
    "file_type": "auto",
    "file_size": 1024000,
    "mime_type": "application/pdf",
    "asset_category": "docs",
    "uploaded_at": "2026-05-15T10:30:00Z"
  }
}
```

Use the returned `file_url` as the `image` or `audio` input to
[agent generation](/api/agents). (Agent creation is image-only — `video`
files upload fine as assets, but `video` is not a creation input; the
idle/driver video is generated internally.)

## Size limits

| Category | Max size |
|---|---|
| Images | 10 MB |
| Videos | 100 MB |
| Audio | 50 MB |
| Documents | 10 MB |

Exceeding a limit returns HTTP `413`.

## URL vs. direct upload

| Method | Best for | Pros | Cons |
|---|---|---|---|
| URL upload | External files, cloud storage | No request-size limit, efficient | Requires a publicly accessible URL |
| Direct upload | Local files, form uploads | Works with any file source | Limited by request size |

## Error codes

| HTTP | Code | Meaning |
|---|---|---|
| `400` | `DOWNLOAD_FAILED` | Could not download the URL — ensure it's publicly accessible. |
| `401` | `UNAUTHORIZED` | Invalid API secret. |
| `413` | `FILE_TOO_LARGE` | File exceeds the size limit for its category. |
| `415` | `UNSUPPORTED_TYPE` | File type not supported. Supported: JPEG, PNG, WebP, MP4, WAV, MP3, OGG. |
| `500` | `INTERNAL_ERROR` | Server-side error. |

See the full [error reference](/api/errors) and the interactive
[API reference](/api/reference).
