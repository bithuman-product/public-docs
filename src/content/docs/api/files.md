---
title: "Files"
description: "Upload images, video, audio and documents by URL or base64."
section: api
group: "Media"
order: 40
type: endpoint
llms: api
---

## Upload a file

Upload a file for processing. Supports both URL
downloads and direct base64 uploads. Each file belongs to one category:

| Category | Extensions |
|---|---|
| **Images** | `.jpg`, `.jpeg`, `.png`, `.gif`, `.webp`, `.bmp` |
| **Videos** | `.mp4`, `.avi`, `.mov`, `.wmv`, `.flv`, `.webm`, `.mkv` |
| **Audio** | `.mp3`, `.wav`, `.flac`, `.aac`, `.ogg`, `.m4a` |
| **Documents** | `.pdf`, `.doc`, `.docx`, `.txt`, `.rtf`, `.ppt`, `.pptx`, `.xls`, `.xlsx`, `.csv` |

The category comes from the file's own bytes: bytes from a different category
than `file_type` (for example an image sent as `document`) return `415`. Within
a category the name is stored as sent.

SVG is not accepted. An uploaded file is served from a public address, and a
browser opening an SVG would run the script inside it as if it came from us;
HTML and any text file carrying a script are refused for the same reason.

### Method 1: URL upload

Download a file from a publicly accessible URL.

| Parameter | Type | Description |
|---|---|---|
| `file_url` | string | Public URL of the file. Without `file_name`, its last path segment is the filename. |
| `file_name` | string | Optional. The filename to store, with a supported extension; required when the URL's last path segment has none (signed or query URLs). |
| `file_type` | string | One of `auto`, `image`, `video`, `audio`, `document`, `pdf`. Any other value returns `400`. |

> **Note** The Python examples below use
> [`requests`](https://pypi.org/project/requests/), which is not in the standard
> library — `pip install requests` first, or use `curl` / `urllib` instead.

```bash
curl -X POST https://api.bithuman.ai/v1/files/upload \
  -H "api-secret: $BITHUMAN_API_SECRET" -H "Content-Type: application/json" \
  -d '{"file_url": "https://example.com/presentation.pdf", "file_type": "auto"}'
```

### Method 2: direct upload

Upload base64-encoded file data directly.

| Parameter | Type | Description |
|---|---|---|
| `file_data` | string | Base64-encoded file data. |
| `file_name` | string | Original filename. The extension is required and must be a supported one. |
| `file_type` | string | One of `auto`, `image`, `video`, `audio`, `document`, `pdf`. Any other value returns `400`. |

```python
import os
import base64, requests

with open("document.pdf", "rb") as f:
    file_data = base64.b64encode(f.read()).decode("utf-8")

resp = requests.post(
    "https://api.bithuman.ai/v1/files/upload",
    headers={"Content-Type": "application/json", "api-secret": os.environ["BITHUMAN_API_SECRET"]},
    json={"file_data": file_data, "file_name": "document.pdf", "file_type": "auto"},
)
print(resp.json())
```

### Response

Both methods return the same shape:

```json
{
  "success": true,
  "message": "File uploaded successfully",
  "data": {
    "file_url": "https://assets.bithuman.ai/bithuman/YOUR_USER_ID/assets/docs/20260515_103000_document.pdf",
    "original_source": "https://example.com/document.pdf",
    "file_type": "docs",
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
10-second identity video is generated internally.)

## Size limits

| Category | Max size |
|---|---|
| Images | 10 MB |
| Videos | 100 MB |
| Audio | 25 MB |
| Documents | 25 MB |

Exceeding a limit returns HTTP `413` with code `FILE_TOO_LARGE`. The category
is read from the file itself, so the limit that applies is the one for what the
file actually is.

## URL vs. direct upload

| Method | Best for | Pros | Cons |
|---|---|---|---|
| URL upload | External files, cloud storage | No request-size limit, efficient | Requires a publicly accessible URL |
| Direct upload | Local files, form uploads | Works with any file source | Limited by request size |

## Error codes

| HTTP | Code | Meaning |
|---|---|---|
| `400` | `DOWNLOAD_FAILED` | Could not download the URL — ensure it's publicly accessible. |
| `400` | `VALIDATION_ERROR` | `file_data` was not valid base64, both `file_url` and `file_data` were sent, or `file_type` was not one of the six values above. |
| `401` | `UNAUTHORIZED` | Invalid API secret. |
| `413` | `FILE_TOO_LARGE` | File exceeds the size limit for its category. |
| `415` | `UNSUPPORTED_TYPE` | The bytes are not a supported type, they contradict `file_type`, the filename extension is not one of those listed above, or the file would run in a browser. |
| `429` | `RATE_LIMITED` | Too many requests — wait `Retry-After` seconds. See [Rate limits](/api/rate-limits). |
| `500` | `INTERNAL_ERROR` | Server-side error. |

See the full [error reference](/api/errors) and the interactive
[API reference](/api/reference).
