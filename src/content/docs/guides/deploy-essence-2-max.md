---
title: "Self-hosted Essence 2 Max"
description: "Run Essence 2 Max on your own NVIDIA GPU: one container, one API key, one render at a time. Prerequisites, install, a working end-to-end example, the full API reference, and what gets metered."
section: guides
group: "Deploy"
order: 11.5
---

## What it is

Self-hosted [Essence 2 Max](/concepts/essence-2-max) is a single Docker container that renders a photoreal talking avatar from an avatar identity plus audio, entirely on your own NVIDIA GPU. You give it a WAV file and an avatar id; it gives you back an MP4.

The container is a **single-tenant appliance, not a server**. It renders **one job at a time**. It has no queue: while a render is running, a second create call returns `429`. To run more jobs at once, run more containers on more GPUs.

Serving bills at the self-hosted rate of **4 credits/min** of rendering time — see [Pricing and metering](#pricing-and-metering) below and the [pricing reference](/guides/pricing).

## When to use it

Use the self-hosted container when the audio, the rendered video, or both must stay inside your own network, or when you want to render on hardware you already own. Everything else — creating avatars, real-time conversational sessions, browser embeds — runs in bitHuman cloud.

This release renders **complete clips**. It does not join a live transport and there is no session endpoint; for real-time, use [LiveKit deployment](/guides/deploy-livekit) against bitHuman cloud.

## Prerequisites

| Requirement | Value |
|---|---|
| GPU | NVIDIA **Ada generation (RTX 40-series) or newer**, 12 GB VRAM or more |
| Reference hardware | RTX 4070 Ti, 12 GB — the platform this release is qualified on |
| VRAM used | 6.3 GB resident, 6.3 GB peak during a render, measured on the reference GPU |
| NVIDIA driver | **560.35.05 or newer** (the container declares `cuda>=12.6` and will not start on an older driver) |
| Container runtime | Docker with the NVIDIA Container Toolkit installed and working |
| System RAM | 32 GB |
| Disk | 20 GB free, plus room for your rendered output |
| Network | Outbound HTTPS to the bitHuman licence and metering endpoint |

Verify the GPU and driver before you do anything else. `nvidia-smi` must report a driver at or above the floor, and the toolkit must work inside a container:

```bash
nvidia-smi --query-gpu=name,driver_version,memory.total --format=csv
docker run --rm --gpus all nvidia/cuda:12.6.3-base-ubuntu22.04 nvidia-smi
```

If the second command fails, fix the NVIDIA Container Toolkit first. Nothing below will work until it prints your GPU.

### Not supported

Stated plainly, so you find out here rather than after an install:

- **NVIDIA A100, V100, and every GPU older than Ada.** The shipped engine is FP8, built for compute capability 8.9. The A100 is 8.0 and has no FP8 tensor cores, so it cannot load this engine — the "12 GB or more" floor is a floor *within* Ada and newer, not an invitation to older data-centre cards.
- **Air-gapped or offline operation.** The container must be able to reach the metering endpoint. There is no offline licence mode in this release.
- **More than one concurrent render per container.**
- **Real-time sessions.** There is no `/v1/sessions` endpoint; calling one returns `404`.
- **Choosing the output resolution.** Output geometry and frame rate follow the avatar bundle you were given.
- **Sharing one container between accounts.** Every render is billed to the identity that authenticated the request.

## Get access

The image is not on a public registry and there is no public pull command. Email **hello@bithuman.ai** with:

- the GPU model and driver version you plan to run on (paste the `nvidia-smi` line above),
- the avatars you want installed, by name or agent code,
- the account the usage should bill to.

You receive back, in one message:

1. **Registry credentials and the exact image reference** to pull.
2. **An API key** for the container.
3. **The metering endpoint URL** the container reports usage to.
4. **A download link for the model weights**, with checksums.
5. **A download link for each avatar bundle**, one file per avatar.

Keep the message — steps below refer to it. Nothing on this page requires any other credential.

## Install

### 1. Lay out the directories

The container reads weights and avatars from bind mounts and writes working files to a fourth directory. Create all four, then unpack the weights download into `models/` and `engines/` as your access email describes:

```bash
mkdir -p ~/bithuman/{models,engines,avatars,work}
```

Put each avatar bundle in `~/bithuman/avatars/` **named `<avatar_id>.pkl`**. The file stem is the `avatar_id` you send to the API — an avatar delivered as `A49MST0248.pkl` is rendered with `"avatar_id": "A49MST0248"`.

### 2. Put the credentials in an env file

Keep secrets out of your shell history and out of `ps`:

```bash
umask 077
cat > ~/bithuman/essence2max.env <<'EOF'
ESSENCE2MAX_API_KEYS=<the API key from your access email>
ESSENCE2MAX_LICENSE_URL=<the metering endpoint from your access email>
EOF
```

Both are required. With no key configured the container still boots, but every authenticated route answers `503` and logs the reason — it fails closed rather than serving anonymously.

### 3. Run the container

The container listens on port **8080** inside the container. The example below publishes it on `127.0.0.1:8089` on the host, so it is reachable from the host only; change or remove the `127.0.0.1` prefix deliberately, not by accident.

```bash
export E2MAX_IMAGE="<the image reference from your access email>"

docker run -d --name essence-2-max \
  --gpus all \
  --restart unless-stopped \
  -p 127.0.0.1:8089:8080 \
  -v ~/bithuman/models:/models:ro \
  -v ~/bithuman/engines:/flp:ro \
  -v ~/bithuman/avatars:/avatars:ro \
  -v ~/bithuman/work:/var/lib/essence2max \
  --env-file ~/bithuman/essence2max.env \
  "$E2MAX_IMAGE"
```

All four mounts are required. A container with the weights but no `/avatars` mount starts, reports healthy, and then answers `404 avatar_not_found` for every render.

### 4. Wait for ready — not for healthy

The engine loads in the background. **`GET /v1/ready` is the only readiness signal.** A `200` from `/v1/health` and a `healthy` from `docker ps` mean the process is answering, not that it can render.

```bash
export E2MAX_URL=http://127.0.0.1:8089

until curl -fsS "$E2MAX_URL/v1/ready" >/dev/null 2>&1; do
  echo "waiting for the engine…"; sleep 5
done
curl -fsS "$E2MAX_URL/v1/ready"
```

On the reference host the engine is ready about 3 seconds after start when the weights are in the page cache; a genuinely cold first boot takes longer. If `/v1/ready` has not turned `200` after a few minutes, go to [Troubleshooting](#troubleshooting).

## Your first render

Everything below runs after two exports: your key and the container URL. Audio should be **16-bit PCM WAV**; the response MP4 carries the audio you sent.

```bash
export BITHUMAN_API_SECRET=...        # the API key from your access email
export E2MAX_URL=http://127.0.0.1:8089
export AVATAR_ID=...                  # the stem of your .pkl file in ~/bithuman/avatars
```

### Create, poll, download

```bash
#!/usr/bin/env bash
set -euo pipefail

# 1. create — JSON with base64 audio
render=$(curl -fsS -X POST "$E2MAX_URL/v1/renders" \
  -H "Authorization: Bearer $BITHUMAN_API_SECRET" \
  -H "Content-Type: application/json" \
  -d "$(jq -n --arg a "$AVATAR_ID" --arg b "$(base64 -w0 speech.wav)" \
        '{avatar_id: $a, audio_base64: $b}')")
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

`curl -f` exits non-zero on an HTTP error **and discards the body**, so if a step fails, re-run that one command without `-f` to read the `error` envelope — it names the cause and the `request_id`.

The last line prints what you got and what it cost, for example:

```json
{"format":"mp4","width":720,"height":1280,"fps":25,"duration_s":65.92,"frames":1648}
{"served_seconds":68.25,"billable":true,"rate_credits_per_minute":4,"credits":4.55}
```

A render takes roughly as long as the audio it renders — about 6 seconds of fixed overhead plus a little under one second of wall clock per second of audio, measured on the reference GPU.

### The same thing in Python

```python
import base64, os, time, requests

BASE = os.environ["E2MAX_URL"]
H = {"Authorization": "Bearer " + os.environ["BITHUMAN_API_SECRET"]}

with open("speech.wav", "rb") as f:
    audio = base64.b64encode(f.read()).decode()

r = requests.post(f"{BASE}/v1/renders", headers=H, timeout=30,
                  json={"avatar_id": os.environ["AVATAR_ID"], "audio_base64": audio})
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

### Or send the file directly

If you would rather not base64-encode, post multipart instead — same responses:

```bash
curl -fsS -X POST "$E2MAX_URL/v1/renders" \
  -H "Authorization: Bearer $BITHUMAN_API_SECRET" \
  -F "avatar_id=$AVATAR_ID" \
  -F "audio=@speech.wav"
```

## API reference

The container serves its own specification at `GET /v1/openapi.json`. That document, not this page, is the machine-readable contract; this section is the human summary of it.

### Endpoints

| Method | Path | Key required | Purpose |
|---|---|---|---|
| `GET` | `/v1/health` | no | Liveness. Answers `200` while loading — not a readiness signal |
| `GET` | `/v1/ready` | no | `200` when warm and a slot is free; `503` otherwise |
| `GET` | `/v1/openapi.json` | no | This container's OpenAPI document |
| `POST` | `/v1/renders` | yes | Start a render. `201` on accept |
| `GET` | `/v1/renders/{render_id}` | yes | Poll a render |
| `GET` | `/v1/renders/{render_id}/video` | yes | Download the MP4. `409` until the render has succeeded |
| `DELETE` | `/v1/renders/{render_id}` | yes | Cancel a running render, or release a finished one. `204` |

Any other path returns `404`. There are no administrative, debug, or documentation endpoints in this image.

### Authentication

Send `Authorization: Bearer <key>` on every endpoint except the three probes. A missing key and a wrong key both return `401` with an identical body — deliberately, so the endpoint cannot be used to test whether a key exists.

Keys are validated live against the metering endpoint, with a short positive cache. **Deleting a key in the dashboard revokes it**: the next render on that container is refused. A render already in flight is not cut off mid-frame.

### Create a render

`POST /v1/renders` accepts either JSON or multipart.

| Field | Where | Notes |
|---|---|---|
| `avatar_id` | both | Required. The stem of the `.pkl` bundle in the avatars mount |
| `audio_base64` | JSON | Base64 of the audio file. Provide this **or** `audio_url`, not both |
| `audio_url` | JSON | `https` only. Redirects are rejected, and a host resolving to a private, loopback, link-local or reserved address is rejected |
| `audio` | multipart | The audio file itself |

Audio is capped at **32 MB**. A render that has not finished within **15 minutes** is abandoned.

### The render object

```json
{
  "id": "rnd_a1b31d5a761f4272",
  "object": "render",
  "status": "succeeded",
  "avatar_id": "A49MST0248",
  "created_at": "2026-08-06T01:20:11Z",
  "completed_at": "2026-08-06T01:21:19Z",
  "output": {"format": "mp4", "width": 720, "height": 1280,
             "fps": 25, "duration_s": 65.92, "frames": 1648},
  "usage": {"served_seconds": 68.25, "billable": true,
            "rate_credits_per_minute": 4, "credits": 4.55},
  "error": null,
  "links": {"self": "/v1/renders/rnd_a1b31d5a761f4272",
            "video": "/v1/renders/rnd_a1b31d5a761f4272/video"}
}
```

`status` is one of `queued`, `running`, `succeeded`, `failed`, `cancelled`. Only the last three are terminal. New values may be added within `/v1`, so **treat any status you do not recognise as non-terminal and keep polling** — do not treat it as an error. `output` and `usage` are `null` until the render reaches a terminal state, and both become visible in the same update as the status, so a poller that stops on a terminal status can always read them.

### Errors

Every failure, including validation failures, returns the same envelope:

```json
{"error": {"type": "at_capacity",
           "message": "all 1 render slot(s) busy; retry shortly",
           "request_id": "req_2f81c0a9b3d4e567",
           "retry_after_s": 5}}
```

Branch on `error.type`. Never parse `error.message` — it changes. Quote `error.request_id` in any support request.

| HTTP | `error.type` | Meaning |
|---|---|---|
| 400 | `invalid_request` | Malformed body, missing `avatar_id`, or both audio fields supplied |
| 401 | `unauthenticated` | No key, wrong key, or a non-bearer `Authorization` header |
| 402 | `license_inactive` | The key is no longer valid, or the account cannot be billed |
| 404 | `not_found` | Unknown render id, or unknown `avatar_id` |
| 405 | `method_not_allowed` | That path exists but not with that method |
| 409 | `render_not_complete` | The video was requested before the render succeeded |
| 413 | `payload_too_large` | Audio above 32 MB |
| 415 | `unsupported_media_type` | Content type is neither JSON nor multipart |
| 429 | `at_capacity` | The single render slot is busy. Honour `Retry-After` |
| 500 | `internal_error` | Report it with the `request_id` |
| 503 | `not_ready` | The engine is still loading, or no key is configured |

`429` and `503` are different on purpose: `429` means busy and normal, `503` means this container cannot serve yet. Both carry `Retry-After`.

### Environment variables

| Variable | Default | Purpose |
|---|---|---|
| `ESSENCE2MAX_API_KEYS` | — | Your API key. Comma-separated if you have several |
| `ESSENCE2MAX_LICENSE_URL` | — | The metering endpoint from your access email |
| `ESSENCE2MAX_PORT` | `8080` | Port inside the container |
| `ESSENCE2MAX_BUNDLE_DIR` | `/avatars` | Where avatar `.pkl` bundles are read from |
| `ESSENCE2MAX_WORK_DIR` | `/var/lib/essence2max` | Writable scratch and render output |
| `ESSENCE2MAX_MAX_AUDIO_BYTES` | `33554432` | Audio size cap |
| `ESSENCE2MAX_RENDER_TIMEOUT_S` | `900` | Abandon a render after this long |
| `ESSENCE2MAX_ALLOW_AUDIO_URL` | `1` | Set to `0` to refuse `audio_url` and accept uploaded audio only |
| `ESSENCE2MAX_LOG_LEVEL` | `INFO` | Log verbosity |

## Pricing and metering

Self-hosted Essence 2 Max bills at **4 credits/min**, half the cloud rate. All rates live on the [pricing page](/guides/pricing).

**What is metered: rendering time.** The meter opens when a render is accepted and closes when it finishes, and it charges every second in between — **including idle time inside that render**, such as silence in your audio. A clip that is half silence costs the same as a clip that talks throughout.

**What is not metered:**

- a container that is running, healthy and ready but rendering nothing — a container left up overnight with no renders costs **zero**;
- engine warm-up at start;
- the time the image and weights spend downloading;
- renders you cancel, which are reported as `billable: false`.

Each render tells you what it cost in its own `usage` object, and that number is what is reported: `served_seconds`, the rate, and the resulting credits. Usage appears on your account the same way cloud usage does.

A render that fails part-way still consumed the GPU and is still reported. If a failure was our fault, contact support with the `request_id` — billing errors caused by us are resolved in your favour.

If the container cannot reach the metering endpoint it logs that usage is not being reported. That is a misconfiguration, not a mode: fix the outbound connectivity, and see [Not supported](#not-supported) for why there is no offline mode.

## Troubleshooting

| Symptom | Cause | Fix |
|---|---|---|
| `curl: (56) Recv failure` or connection reset on every call | The published port does not map to the container's port | The container listens on **8080**. Use `-p 127.0.0.1:8089:8080` |
| `docker ps` says `healthy` but nothing renders | `/v1/health` answers `200` while the engine is still loading, and keeps answering `200` if the engine failed | Gate on `GET /v1/ready`. If it never turns `200`, read `docker logs essence-2-max` for the engine error |
| `/v1/ready` returns `503 not_ready` forever | Weights mounts wrong, or the GPU is not visible in the container | Check `docker run --rm --gpus all …  nvidia-smi` works, and that `/models` and `/flp` are both mounted and non-empty |
| Container will not start, CUDA version error | Driver older than the container requires | Upgrade to driver **560.35.05 or newer** |
| Engine fails to load with an unsupported-hardware error | The GPU is older than Ada, e.g. A100 or V100 | Not supported. See [Not supported](#not-supported) |
| `401` on every authenticated call | No `Authorization: Bearer` header, or the wrong key. Missing and wrong return identical bodies | Re-check the key from your access email; confirm the header reaches the container |
| `503 not_ready` immediately after start, with a key-configuration error in the logs | `ESSENCE2MAX_API_KEYS` is not set | Set it in the env file and recreate the container |
| `402 license_inactive` | The key was revoked, or the account is out of credits | Check the dashboard; a deleted key stops working on the next render |
| `404 avatar_not_found` | No `<avatar_id>.pkl` in the avatars mount | `ls ~/bithuman/avatars` — the file stem is the `avatar_id`; confirm `-v …:/avatars:ro` is present |
| `429 at_capacity` | One render at a time, per container | Wait `Retry-After` seconds and retry, or run another container on another GPU |
| `409 render_not_complete` on the video | Downloaded before the render succeeded | Poll `GET /v1/renders/{id}` until `succeeded` |
| Poll loop never ends | Client is waiting for a status the API does not emit | Terminal statuses are `succeeded`, `failed`, `cancelled` |
| Out of memory when starting a second container on the same GPU | One engine set does not leave room for a second | Run one container per GPU |
| Renders work but no usage appears on the account | The container cannot reach the metering endpoint | Allow outbound HTTPS to the endpoint in your access email |

To reach support, email **hello@bithuman.ai** with the `error.request_id` from the failing response and the body of `GET /v1/health`. Include container logs only if support asks for them.

## Next steps

- [Essence 2 Max](/concepts/essence-2-max) — what the model is and how it compares
- [Pricing](/guides/pricing) — every rate in one place
- [Deploy via LiveKit](/guides/deploy-livekit) — real-time conversational sessions in bitHuman cloud
