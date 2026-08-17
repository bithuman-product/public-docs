---
title: "Self-hosted Essence 2 Max"
description: "Run Essence 2 Max on your own NVIDIA GPU. One container, one API key, one render at a time — prerequisites, a copy-paste install that works, the full API reference, what the output format is, and what gets metered."
section: guides
group: "Deploy"
order: 11.5
---

## What it is

Self-hosted [Essence 2 Max](/concepts/essence-2-max) is a **single Docker container** that renders a
photoreal talking avatar from an avatar identity plus audio, entirely on your own NVIDIA GPU. You
give it a WAV file and an avatar id; it gives you back an MP4.

The container is **self-contained**. The rendering weights and engines are *baked into the image* —
there is nothing to download separately and nothing to mount for them. The only thing you mount is
your own avatar bundle and a writable work directory.

It is a **single-tenant appliance, not a server**. It renders **one job at a time** and has no
queue: while a render is running, a second create call returns `429`. To run more jobs at once, run
more containers on more GPUs.

Serving bills at the self-hosted rate of **4 credits/min** of rendering time — see
[Pricing and metering](#pricing-and-metering) and the [pricing reference](/guides/pricing).

## When to use it

Use the self-hosted container when the audio, the rendered video, or both must stay inside your own
network, or when you want to render on hardware you already own. Everything else — creating avatars,
real-time conversational sessions, browser embeds — runs in bitHuman cloud.

This release renders **complete clips**. It does not join a live transport and there is no session
endpoint; for real-time, use [LiveKit deployment](/guides/deploy-livekit) against bitHuman cloud.

## Prerequisites

| Requirement | Value |
|---|---|
| GPU | **NVIDIA RTX 4070 Ti (12 GB) or above.** Ada generation (compute capability 8.9) with **12 GB VRAM or more** |
| Reference hardware | RTX 4070 Ti, 12 GB — the platform this release is qualified on, and the platform every number on this page was measured on |
| VRAM used | **6.3 GB** peak during a render (measured: 6,331 MiB) |
| NVIDIA driver | **560.35.05 or newer** (the image declares `cuda>=12.6` and will not start on an older driver) |
| Container runtime | Docker with the NVIDIA Container Toolkit installed and working |
| System RAM | **16 GB** (measured resident set: 3.6 GB) |
| Disk | **10 GB** free — the image is ~2.8 GiB to download and ~3.0 GB on disk — plus room for your rendered output |
| Network | Outbound HTTPS to the bitHuman metering endpoint |

Verify the GPU and driver before you do anything else. `nvidia-smi` must report a driver at or above
the floor, and the toolkit must work inside a container:

```bash
nvidia-smi --query-gpu=name,driver_version,memory.total --format=csv
docker run --rm --gpus all nvidia/cuda:12.6.3-base-ubuntu22.04 nvidia-smi
```

If the second command fails, fix the NVIDIA Container Toolkit first. Nothing below will work until
it prints your GPU.

### Not supported

Stated plainly, so you find out here rather than after an install:

- **NVIDIA A100, V100, and every GPU older than Ada.** The shipped engine is FP8, built for compute
  capability **8.9**. The A100 is 8.0 and has no FP8 tensor cores, so **it cannot load this engine** —
  the "12 GB or more" floor is a floor *within* Ada and newer, not an invitation to older
  data-centre cards. The container proves the engines really deserialize on your GPU at startup and
  refuses to serve if they do not, so a wrong GPU is a clean refusal rather than a mystery failure.
- **Air-gapped or fully offline operation.** Not supported in v1. The container reports usage to the
  metering endpoint and there is no offline licence mode in this release.
- **More than one concurrent render per container.** One container needs 6.3 GB of VRAM, so two do
  not fit on a 12 GB card.
- **Real-time sessions.** There is no `/v1/sessions` endpoint; calling one returns `404`.
- **Choosing the output resolution.** Output geometry and frame rate follow the avatar bundle you
  were given. Every performance number on this page was measured at the bundle's native
  **720×1280 at 25 fps**; 1080p output is **not** a claim this release makes.
- **Sharing one container between accounts.** Every render is billed to the identity that
  authenticated the request.

## Get access

The image is not on a public registry and there is no public pull command. Email
**hello@bithuman.ai** with:

- the GPU model and driver version you plan to run on (paste the `nvidia-smi` line above),
- the avatars you want installed, by name or agent code,
- the account the usage should bill to.

You receive back, in one message:

1. **The exact image reference and the credentials to pull it** — or, if you prefer, the image as a
   file you can `docker load`.
2. **An API key** for the container.
3. **The metering endpoint URL** the container reports usage to, and the account id it bills.
4. **One avatar bundle file per avatar.** These are the *only* model files you install by hand.

Keep the message — the steps below refer to it. Nothing on this page requires any other credential.
In particular, this container never needs a database credential and never calls back into our
storage.

## Install

### 1. Do not mount anything over `/models` or `/flp`

Read this before you copy the `docker run` below, because it is the one mistake that bricks the
container.

Earlier revisions of this guide told you to bind-mount your own `models/` and `engines/`
directories over the container's `/models` and `/flp`. **Do not.** Those paths hold the baked
weights. Mounting your — necessarily empty — directories over them hides **2.7 GB of weights and
342 MB of engines**: the engine then dies on a missing file, the startup self-test reports *"no
baked plans found"*, and `/v1/ready` answers `503 … retry_after_s: 10` **forever**. There is
nothing you are supposed to put in those directories.

### 2. Lay out the two directories

You need exactly two directories: one for your avatar bundles, one writable scratch/output dir.

```bash
mkdir -p ~/bithuman/avatars ~/bithuman/work
```

Put each avatar bundle in `~/bithuman/avatars/` **named `<avatar_id>.pkl`**. The file stem is the
`avatar_id` you send to the API — an avatar delivered as `A49MST0248.pkl` is rendered with
`"avatar_id": "A49MST0248"`.

### 3. Put the credentials in an env file

Keep secrets out of your shell history and out of `ps`:

```bash
umask 077
cat > ~/bithuman/essence2max.env <<'EOF'
ESSENCE2MAX_API_KEYS=<the API key from your access email>
ESSENCE2MAX_LICENSE_URL=<the metering endpoint from your access email>
ESSENCE2MAX_ACCOUNT_ID=<the account id from your access email>
EOF
```

With no key configured at all the container still boots, but every authenticated route answers `503`
and logs the reason — it fails closed rather than serving anonymously.

`ESSENCE2MAX_LICENSE_URL` is what makes the container report usage and validate keys live (so a key
you delete in the dashboard stops working). Your licence requires it. Without it the container logs
`this container is UNMETERED. No usage is being reported.` on the first render — if you see that
line, the URL is missing or unreachable.

### 4. Run the container

The container listens on port **8080** inside the container. The example below publishes it on
`127.0.0.1:8089` on the host, so it is reachable from the host only; change or remove the
`127.0.0.1` prefix deliberately, not by accident.

```bash
export E2MAX_IMAGE="<the image reference from your access email>"

docker run -d --name essence-2-max \
  --gpus all \
  --restart unless-stopped \
  -p 127.0.0.1:8089:8080 \
  -v ~/bithuman/avatars:/avatars:ro \
  -v ~/bithuman/work:/var/lib/essence2max \
  --env-file ~/bithuman/essence2max.env \
  "$E2MAX_IMAGE"
```

**Two mounts. That is the whole list.** A container with no `/avatars` mount starts and reports
healthy, and then answers `404 avatar_not_found` for every render.

### 5. Wait for the container to become healthy

The engine loads in the background. The image ships a `HEALTHCHECK` that already gates on the
engine being loaded, so `docker ps` telling you `healthy` is a real signal:

```bash
export E2MAX_URL=http://127.0.0.1:8089

until [ "$(docker inspect -f '{{.State.Health.Status}}' essence-2-max)" = healthy ]; do
  echo "waiting for the engine…"; sleep 5
done
curl -fsS "$E2MAX_URL/v1/health" | jq '{status, engine: .engine.status, capacity}'
```

On the reference host the engine is ready about **8.6 s** after a genuinely cold start and about
**3.4 s** when the image layers are already in the page cache.

#### `/v1/ready` is a free-slot signal, not just a readiness signal

`GET /v1/ready` returns `200` only when the engine is loaded **and the single render slot is free**.
It answers `503 not_ready "at capacity"` for the whole duration of every render. That makes it the
right thing to poll before dispatching work, and the **wrong** thing to put in a wait loop around a
render you have already started. Use `/v1/health` (`status: "ok"`) to ask "is the engine up?".

If the container never becomes healthy, read `/v1/health` before you retry. `engine.status` is the
truth: `"loading"` means wait, and **`"failed"` means it will never become ready** — a permanent
error. `POST /v1/renders` and `/v1/ready` both answer `503 … retry_after_s: 10` in that state, so
the retry hint is misleading; go to [Troubleshooting](#troubleshooting) instead of retrying.

## Your first render

Everything below runs after three exports:

```bash
export BITHUMAN_API_SECRET=...        # the API key from your access email
export E2MAX_URL=http://127.0.0.1:8089
export AVATAR_ID=...                  # the stem of your .pkl file in ~/bithuman/avatars
```

Audio should be **16-bit PCM WAV**. The response MP4 carries the audio you sent.

### Create, poll, download

Send the audio as a **multipart file upload**. This is the form to copy: it streams the file and has
no size limit beyond the 32 MB audio cap.

```bash
#!/usr/bin/env bash
set -euo pipefail

# 1. create
render=$(curl -fsS -X POST "$E2MAX_URL/v1/renders" \
  -H "Authorization: Bearer $BITHUMAN_API_SECRET" \
  -F "avatar_id=$AVATAR_ID" \
  -F "audio=@speech.wav")
id=$(jq -r .id <<<"$render")
echo "render $id accepted"

# 2. poll — succeeded / failed / cancelled are terminal; anything else means keep polling
while :; do
  render=$(curl -fsS "$E2MAX_URL/v1/renders/$id" \
    -H "Authorization: Bearer $BITHUMAN_API_SECRET")
  status=$(jq -r .status <<<"$render")
  case "$status" in
    succeeded) break ;;
    failed|cancelled) echo "render $status: $(jq -c .error <<<"$render")" >&2; exit 1 ;;
    *) sleep 2 ;;
  esac
done

# 3. download
curl -fsS "$E2MAX_URL/v1/renders/$id/video" \
  -H "Authorization: Bearer $BITHUMAN_API_SECRET" -o "$id.mp4"

echo "wrote $id.mp4"
jq -c '.output, .usage' <<<"$render"
```

#### Do not build the JSON body with `jq --arg` on the command line

The obvious one-liner —
`jq -n --arg b "$(base64 -w0 speech.wav)" …` — **dies at about 3 seconds of audio**. Linux caps a
single argument at 128 KiB, and base64 of a 4-second 16-bit 16 kHz WAV is 170,772 characters:
`/usr/bin/jq: Argument list too long`. Measured: 2 s works, 3 s works, 4 s fails. Use the multipart
form above, or build the JSON into a **file** and post it with `--data-binary @file`.

The last line prints what you got and what it cost, for example:

```json
{"format":"mp4","video_codec":"mpeg4","width":720,"height":1280,"fps":25,"duration_s":4.0,"frames":100}
{"served_seconds":8.171,"billable":true,"rate_credits_per_minute":4,"credits":0.5448}
```

A render takes roughly **as long as the audio, plus about four seconds** of fixed overhead. Measured
on the reference GPU with the identity already warm: 2 s of audio → 6.2 s, 4 s → 8.2 s, 20 s → 22.8 s
of served time. The **first** render of a given avatar adds a second or two to load its bundle.

`curl -f` exits non-zero on an HTTP error **and discards the body**, so if a step fails, re-run that
one command without `-f` to read the `error` envelope — it names the cause and the `request_id`.

### Output format: MPEG-4 Part 2, not H.264

This is the single most surprising thing about the container's output, so it is stated here rather
than left to be discovered:

| | |
|---|---|
| Container | MP4 |
| Video codec | **MPEG-4 Part 2 (Simple Profile)**, `mp4v` tag, `yuv420p`, reported as `"video_codec": "mpeg4"` |
| Audio codec | AAC-LC |

Desktop players (VLC, ffplay, QuickTime) play it. **Browsers do not** — `<video>` in Chrome, Safari
and Firefox needs H.264. Transcode once, with a stream copy of the audio:

```bash
ffmpeg -i "$id.mp4" \
  -c:v libx264 -preset veryfast -crf 18 -pix_fmt yuv420p \
  -c:a copy -movflags +faststart "$id.h264.mp4"
```

That is lossless-to-the-eye at `-crf 18`, keeps 720×1280 / 25 fps, and produced a *smaller* file in
our measurement (1.65 MB → 1.18 MB for a 4-second clip). Check it landed:

```bash
ffprobe -v error -select_streams v:0 -show_entries stream=codec_name,pix_fmt -of default=nw=1 "$id.h264.mp4"
# codec_name=h264
# pix_fmt=yuv420p
```

### The same thing in Python

```python
import os, time, requests

BASE = os.environ["E2MAX_URL"]
H = {"Authorization": "Bearer " + os.environ["BITHUMAN_API_SECRET"]}

with open("speech.wav", "rb") as f:
    r = requests.post(f"{BASE}/v1/renders", headers=H, timeout=60,
                      data={"avatar_id": os.environ["AVATAR_ID"]},
                      files={"audio": ("speech.wav", f, "audio/wav")})
if r.status_code == 429:                       # busy: one render at a time
    time.sleep(int(r.headers.get("Retry-After", 5)))
r.raise_for_status()
render_id = r.json()["id"]

while True:
    render = requests.get(f"{BASE}/v1/renders/{render_id}", headers=H, timeout=30).json()
    if render["status"] == "succeeded":
        break
    if render["status"] in ("failed", "cancelled"):
        raise RuntimeError(render.get("error"))
    time.sleep(2)                              # any other status: keep polling

video = requests.get(f"{BASE}/v1/renders/{render_id}/video", headers=H, timeout=300)
video.raise_for_status()
open(f"{render_id}.mp4", "wb").write(video.content)
print(render["output"], render["usage"])
```

### Or send JSON

If you would rather send JSON, base64-encode the audio into a **file** and post the file:

```bash
python3 - "$AVATAR_ID" speech.wav > body.json <<'PY'
import base64, json, sys
json.dump({"avatar_id": sys.argv[1],
           "audio_base64": base64.b64encode(open(sys.argv[2], "rb").read()).decode()},
          sys.stdout)
PY

curl -fsS -X POST "$E2MAX_URL/v1/renders" \
  -H "Authorization: Bearer $BITHUMAN_API_SECRET" \
  -H "Content-Type: application/json" \
  --data-binary @body.json
```

## API reference

**This page is the contract.** The container also serves a spec at `GET /v1/openapi.json`, but that
document has known errors in this release — see [Known spec
discrepancies](#known-spec-discrepancies) before you generate a client from it.

### Endpoints

| Method | Path | Key required | Purpose |
|---|---|---|---|
| `GET` | `/v1/health` | no | Liveness **and engine state**. `status` is `ok`, `loading` or `failed` |
| `GET` | `/v1/ready` | no | `200` when the engine is loaded **and the render slot is free**; `503` otherwise |
| `GET` | `/v1/openapi.json` | no | This container's OpenAPI document |
| `POST` | `/v1/renders` | yes | Start a render. `201` on accept |
| `GET` | `/v1/renders/{render_id}` | yes | Poll a render |
| `GET` | `/v1/renders/{render_id}/video` | yes | Download the MP4. `409` until the render has succeeded |
| `DELETE` | `/v1/renders/{render_id}` | yes | Request cancellation. `204`. See [Cancelling](#cancelling-a-render) |

Any other path returns `404`. There are no administrative, debug, or documentation endpoints in this
image: `/docs`, `/redoc` and a root `/openapi.json` all `404`.

Every response carries `X-Request-Id` and `X-Essence2Max-Api-Version`.

### Authentication

Send `Authorization: Bearer <key>` on every endpoint except the three probes.

**A missing key and a wrong key are different answers** — the bodies and the `WWW-Authenticate`
challenge both differ, so you can tell a plumbing problem from a bad key:

| What you sent | HTTP | `error.type` | `WWW-Authenticate` |
|---|---|---|---|
| No `Authorization` header | `401` | `missing_credentials` | `Bearer realm="essence-2-max"` |
| `Authorization: Basic …`, or any non-bearer header | `401` | `missing_credentials` | `Bearer realm="essence-2-max"` |
| `Authorization: Bearer <wrong key>` | `401` | `invalid_key` | `Bearer realm="essence-2-max", error="invalid_token"` |

A revoked key is reported as `invalid_key`, deliberately: a distinct "revoked" answer would tell an
attacker which keys once existed.

When `ESSENCE2MAX_LICENSE_URL` is set, keys are validated live against the metering endpoint with a
short positive cache, so **deleting a key in the dashboard revokes it** — the next render on that
container is refused, and a render already in flight is not cut off mid-frame. When only
`ESSENCE2MAX_API_KEYS` is set, the container has no way to hear about a revocation.

### Create a render

`POST /v1/renders` accepts either multipart or JSON.

| Field | Where | Notes |
|---|---|---|
| `avatar_id` | both | Required. The stem of the `.pkl` bundle in the avatars mount |
| `audio` | multipart | The audio file itself. **The recommended form** |
| `audio_base64` | JSON | Base64 of the audio file |
| `audio_url` | JSON | `https` only. Redirects are rejected, and a host resolving to a private, loopback, link-local or reserved address is rejected |

Supply **exactly one** audio field. If you send both `audio_base64` and `audio_url`, the request is
**accepted (`201`)** and `audio_base64` is used — the URL is ignored silently, and the render is
metered normally. It is not a `400`. Do not rely on the API to catch that mistake for you.

Audio is capped at **32 MB**. A render that has not finished within **15 minutes** is abandoned with
`error.type: "render_timeout"`.

### The render object

```json
{
  "id": "rnd_f84cbd47749f44b6",
  "object": "render",
  "status": "succeeded",
  "avatar_id": "A49MST0248",
  "created_at": "2026-08-07T12:49:31Z",
  "completed_at": "2026-08-07T12:49:39Z",
  "output": {"format": "mp4", "video_codec": "mpeg4", "width": 720, "height": 1280,
             "fps": 25, "duration_s": 4.0, "frames": 100},
  "usage": {"served_seconds": 8.171, "billable": true,
            "rate_credits_per_minute": 4, "credits": 0.5448},
  "performance": {"measured": true, "frames": 100, "fps_steady": 27.07,
                  "ms_p50": 20.108, "ms_p95": 23.38, "budget_ms": 40.0,
                  "frames_over_budget": 4, "pct_over_budget": 4.01,
                  "realtime_margin_p95": 1.711},
  "error": null,
  "links": {"self": "/v1/renders/rnd_f84cbd47749f44b6",
            "video": "/v1/renders/rnd_f84cbd47749f44b6/video"}
}
```

`status` is one of `queued`, `running`, `succeeded`, `failed`, `cancelled` — note the **double `l`**.
Only the last three are terminal. New values may be added within `/v1`, so **treat any status you do
not recognise as non-terminal and keep polling**.

`output`, `usage` and `performance` are `null` until the render reaches a terminal state, and
`output` and `usage` become visible in the same update as the status, so a poller that stops on a
terminal status can always read them.

`performance` is per-frame timing for that render (also available for the most recent render on
`/v1/health`). `budget_ms` is 40 ms — one frame at 25 fps — so `realtime_margin_p95` above 1.0 means
the render kept up with real time.

### Cancelling a render

`DELETE /v1/renders/{render_id}` returns `204` and marks the render `cancelled` **immediately**, with
`usage: null`.

**It does not stop a render already on the GPU, and it does not stop the meter.** Measured: a
20-second render cancelled 5 seconds in reported `status: "cancelled", usage: null`, and then
~20 seconds later reported `status: "succeeded"` with `usage.billable: true` and 22.777 served
seconds — the full charge — and its video was downloadable. `DELETE` on an already-succeeded render
also returns `204` but changes nothing: the render stays `succeeded` and the video stays available.

Treat `DELETE` as *"I no longer want this result"*, not as *"stop billing me"*. The only way to stop
a render that is already on the GPU is to stop the container.

### Errors

Every failure, including validation failures, returns the same envelope:

```json
{"error": {"type": "at_capacity",
           "message": "all 1 render slot(s) busy; retry shortly",
           "request_id": "req_2f81c0a9b3d4e567",
           "retry_after_s": 5}}
```

Branch on `error.type`. Never parse `error.message` — it changes. Quote `error.request_id` in any
support request.

| HTTP | `error.type` | Meaning |
|---|---|---|
| 400 | `invalid_request` | Malformed body, missing `avatar_id`, invalid base64, empty audio, or an `audio_url` that is not `https` or resolves to a non-public address |
| 401 | `missing_credentials` | No `Authorization` header, or a header that is not `Bearer` |
| 401 | `invalid_key` | The key presented is not valid — including a revoked one |
| 404 | `avatar_not_found` | `POST /v1/renders` with an `avatar_id` that has no `.pkl` in the avatars mount. The message names the path it looked at |
| 404 | `not_found` | Unknown render id, unknown path, or the output file is no longer on disk |
| 405 | `method_not_allowed` | That path exists but not with that method |
| 409 | `render_not_complete` | The video was requested before the render succeeded |
| 413 | `payload_too_large` | Audio above 32 MB |
| 415 | `unsupported_media_type` | Content type is neither JSON nor multipart |
| 429 | `at_capacity` | The single render slot is busy. Honour `Retry-After` (5 s) |
| 500 | `internal_error` | Report it with the `request_id` |
| 503 | `not_ready` | The engine is still loading, **or a render is in flight**, or no key is configured |

Two more types appear **inside the render object**, never as an HTTP status, because the render was
already accepted:

| `error.type` on the render | Meaning |
|---|---|
| `render_failed` | The render started and threw. `message` carries the first 300 characters of the cause — an unreadable audio file is the common one |
| `render_timeout` | The render exceeded `ESSENCE2MAX_RENDER_TIMEOUT_S` (default 900 s) |

`429` and `503` are different on purpose: `429` means busy and normal, `503` means this container
cannot serve right now. Both carry `Retry-After`. **A `503` with `retry_after_s: 10` does not prove
the condition is temporary** — if `/v1/health` reports `engine.status: "failed"`, retrying will never
succeed.

### Known spec discrepancies

The `GET /v1/openapi.json` document shipped in this release disagrees with the running container in
five places. A client generated from it will silently misread money and cancellation. Until it is
regenerated, prefer this page:

| Spec says | Container actually does |
|---|---|
| `Usage` has `billable_seconds` | `served_seconds`, plus a `billable` boolean |
| `status` enum contains `canceled` | The container emits `cancelled` (two `l`s) |
| `Render` has no `performance` | Every terminal render carries `performance` |
| `error.type` may be `unauthenticated` / `license_inactive`, and `402` is a documented response | Neither type is ever emitted and `402` never occurs; auth failures are `401 missing_credentials` / `401 invalid_key` |
| `POST /v1/renders` documents no `404` | `404 avatar_not_found` is a normal outcome |

### Environment variables

| Variable | Default | Purpose |
|---|---|---|
| `ESSENCE2MAX_API_KEYS` | — | Your API key. Comma-separated if you have several |
| `ESSENCE2MAX_LICENSE_URL` | — | The metering endpoint from your access email. Required by your licence: it is what reports usage and validates keys live |
| `ESSENCE2MAX_ACCOUNT_ID` | — | The account usage is attributed to |
| `ESSENCE2MAX_PORT` | `8080` | Port inside the container |
| `ESSENCE2MAX_BUNDLE_DIR` | `/avatars` | Where avatar `.pkl` bundles are read from |
| `ESSENCE2MAX_WORK_DIR` | `/var/lib/essence2max` | Writable scratch and render output |
| `ESSENCE2MAX_MAX_AUDIO_BYTES` | `33554432` | Audio size cap |
| `ESSENCE2MAX_RENDER_TIMEOUT_S` | `900` | Abandon a render after this long |
| `ESSENCE2MAX_ALLOW_AUDIO_URL` | `1` | Set to `0` to refuse `audio_url` and accept uploaded audio only |
| `ESSENCE2MAX_IDENTITY_CACHE` | `1` | How many avatar identities stay resident. Clamped to 2 — each one holds decoded frames in RAM |
| `ESSENCE2MAX_LOG_LEVEL` | `INFO` | Log verbosity |

There is deliberately **no** environment variable that changes what you are charged.

## Pricing and metering

Self-hosted Essence 2 Max bills at **4 credits/min**, half the cloud rate. All rates live on the
[pricing page](/guides/pricing).

**What is metered: rendering time, wall clock.** The meter opens the moment GPU work starts for your
render and closes when that render leaves the GPU, and it charges **every second in between —
including idle time inside the render**, such as silence in your audio. A clip that is half silence
costs the same as a clip that talks throughout.

**What is not metered:**

- a container that is running, healthy and ready but rendering nothing — **a container left up
  overnight with no renders costs zero**. The meter is opened by a render, not by the process;
- engine warm-up at start;
- the time the image spends downloading.

Each render reports what it cost in its own `usage` object — `served_seconds`, the rate, and the
resulting credits — and that is what is reported to your account.

**Cancelled renders are still billed.** See [Cancelling a render](#cancelling-a-render): `DELETE`
stops you waiting, not the GPU. A render that fails part-way also still consumed the GPU and is
still reported. If a failure was our fault, contact support with the `request_id` — billing errors
caused by us are resolved in your favour.

If the container cannot reach the metering endpoint it logs that usage is not being reported. That
is a misconfiguration, not a mode: fix the outbound connectivity. See
[Not supported](#not-supported) for why there is no offline mode in v1.

## Performance

Measured on the reference RTX 4070 Ti at the bundle's native **720×1280, 25 fps**:

| | |
|---|---|
| Steady-state render rate | **26.8 fps** against a 25 fps budget — about **7% of headroom** |
| Per-frame time | p50 20.6 ms, p95 23.0 ms (budget 40 ms) |
| Frames over budget | 4.3% |
| Peak GPU memory | 6,331 MiB |
| Resident memory | 3.6 GB |
| Time to first frame | 0.076 s |
| Engine load | 8.6 s cold, 3.4 s warm |

Seven percent is a **thin** margin: a busy host, a lower clock or a shared GPU can push a render
past real time. Read `performance.realtime_margin_p95` off your own renders rather than assuming
these numbers. **These figures are 720×1280 only** — no 1080p figure is published for this release.

## Troubleshooting

| Symptom | Cause | Fix |
|---|---|---|
| `/v1/ready` returns `503 not_ready` forever, and the logs mention missing engine files or *"no baked plans found"* | You bind-mounted your own directories over `/models` and/or `/flp`, hiding the baked weights | **Remove those mounts.** The image already contains the weights. The only mounts are `/avatars` and `/var/lib/essence2max` — see the [warning above](#1-do-not-mount-anything-over-models-or-flp) |
| `/v1/ready` returns `503 not_ready` and `/v1/health` says `engine.status: "failed"` | The engine could not be built on this GPU. Usually a GPU older than Ada, or a driver below 560.35.05 | This is **permanent** — do not retry. Check the GPU against [Prerequisites](#prerequisites) and read `docker logs essence-2-max` for the startup self-test verdict |
| `/v1/ready` returns `503 not_ready "at capacity"` | A render is in flight. This is normal | Wait, or poll `/v1/health` for `status: "ok"` instead |
| `curl: (56) Recv failure` or connection reset on every call | The published port does not map to the container's port | The container listens on **8080**. Use `-p 127.0.0.1:8089:8080` |
| Container will not start, CUDA version error | Driver older than the container requires | Upgrade to driver **560.35.05 or newer** |
| `jq: Argument list too long` when building the request | The base64 of more than ~3 s of audio exceeds the 128 KiB single-argument limit | Use the multipart form, or write the JSON to a file and `--data-binary @file` |
| `401` on every authenticated call | `missing_credentials` means the header never arrived; `invalid_key` means the key is wrong or revoked | Read `error.type` — the two are different answers |
| `503 not_ready` immediately after start, with a key-configuration error in the logs | `ESSENCE2MAX_API_KEYS` / `ESSENCE2MAX_LICENSE_URL` are not set | Set them in the env file and recreate the container |
| `404 avatar_not_found` on create | No `<avatar_id>.pkl` in the avatars mount | The error message names the exact path it looked at. `ls ~/bithuman/avatars` — the file stem is the `avatar_id` |
| `429 at_capacity` | One render at a time, per container | Wait `Retry-After` seconds and retry, or run another container on another GPU |
| `409 render_not_complete` on the video | Downloaded before the render succeeded | Poll `GET /v1/renders/{id}` until `succeeded` |
| Render reports `failed` with `render_failed` | The audio could not be decoded — a truncated upload or a non-WAV file is the usual cause | Send 16-bit PCM WAV. `ffprobe` the file first |
| The MP4 will not play in a browser | The container emits MPEG-4 Part 2, not H.264 | [Transcode it](#output-format-mpeg-4-part-2-not-h264) |
| Poll loop never ends | Client is waiting for a status the API does not emit — often `canceled` with one `l`, which the shipped spec wrongly lists | Terminal statuses are `succeeded`, `failed`, `cancelled` |
| A cancelled render turns into `succeeded` and is billed | Cancellation does not stop a render on the GPU | Expected. See [Cancelling a render](#cancelling-a-render) |
| Out of memory when starting a second container on the same GPU | One engine set needs 6.3 GB; two do not fit on 12 GB | Run one container per GPU |
| Renders work but no usage appears on the account | The container cannot reach the metering endpoint; it logs `this container is UNMETERED` | Allow outbound HTTPS to the endpoint in your access email and check `ESSENCE2MAX_LICENSE_URL` |

To reach support, email **hello@bithuman.ai** with the `error.request_id` from the failing response
and the body of `GET /v1/health`. Include container logs only if support asks for them.

## Next steps

- [Essence 2 Max](/concepts/essence-2-max) — what the model is and how it compares
- [Pricing](/guides/pricing) — every rate in one place
- [Deploy via LiveKit](/guides/deploy-livekit) — real-time conversational sessions in bitHuman cloud
