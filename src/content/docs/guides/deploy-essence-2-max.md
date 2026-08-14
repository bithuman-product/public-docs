---
title: "Self-hosted Essence 2 Max"
description: "Run essence-2 self-hosted — the GPU version of bitHuman's photoreal avatar rendering — as a container on your own NVIDIA GPU: verify the hand-delivered image, launch it, render H.264 talking videos over a local REST API, and visualize them in a locally-hosted LiveKit room."
section: guides
group: "Deploy"
order: 12
label: "Self-hosted Essence 2 Max"
---

## The Essence 2 Max container

This is the **self-hosted, GPU version of
[essence-2](/concepts/essence-2)** — bitHuman's photoreal avatar rendering,
packaged as a single Docker container you run on your own NVIDIA GPU
(the model slug is [`essence-2-max`](/concepts/essence-2-max)). One container,
one API key, one concurrent render: you POST audio to a local REST API and get
back an H.264 talking video of your agent, rendered entirely on your hardware.
Sessions bill at the self-hosted rate — 4 credits/min ([pricing](/guides/pricing)).

This container renders **videos as jobs** (audio in → mp4 out). For live
streaming, publish the rendered clips into a LiveKit room — the bundle ships a
complete locally-hosted example ([below](#visualize-live-in-a-locally-hosted-livekit-room)).
For a live cloud session instead of self-hosting, use the
[cloud surfaces](/concepts/essence-2-max#serving).

**Requirements**

- **NVIDIA Ada (RTX 40-series) or newer**, with **12 GB VRAM dedicated to
  this container** — the container needs ~10 GB to itself, so don't share the
  GPU with another renderer.
- **32 GB system RAM.**
- Docker with the NVIDIA Container Toolkit.

> **Note — hand-delivered distribution.** There is no public registry to pull
> from. The image ships as a signed, checksummed bundle delivered directly to
> your team — contact [hello@bithuman.ai](mailto:hello@bithuman.ai) to get
> one. Everything below assumes you have the bundle on the GPU host.

## What's in the bundle

| File | What it is |
|---|---|
| `essence-2-max-<version>.tar` | The container image, in `docker load` form |
| `essence-2-max-<version>.tar.sha256` | Checksum of the tarball |
| `essence-2-max-<version>.tar.sig` | Cosign signature over the tarball (key-based, offline) |
| `cosign.pub` | The public key that verifies the signature |
| `run-essence-2-max.sh` | Launch script — revision guard + revocable-auth default |
| `essence-2-max.env.example` | Every configuration knob, documented |
| `QUICKSTART.md` | Verify → configure → run → render, all commands executed verbatim |
| `examples/livekit/` | Locally-hosted LiveKit visualization loop |
| `sample-<agent code>.mp4` | The literal output of the quickstart render |

## Verify and load the image

Check the bytes, verify the signature, then load. Both checks run fully
offline. Substitute your bundle's version for `<version>` (the tarball name in
your delivery, e.g. `essence-2-max-1.0.4.tar`):

```bash
sha256sum -c essence-2-max-<version>.tar.sha256
cosign verify-blob --key cosign.pub \
  --signature essence-2-max-<version>.tar.sig \
  --insecure-ignore-tlog essence-2-max-<version>.tar   # "Verified OK"
docker load -i essence-2-max-<version>.tar
```

`Verified OK` means the bytes are exactly what bitHuman signed.

> **Note** `--insecure-ignore-tlog` is required and correct here: the
> signature is deliberately absent from the public transparency log, and
> trust anchors in the `cosign.pub` delivered with your bundle — not in a
> public record.

## Configure

Copy `essence-2-max.env.example` to `essence-2-max.env` next to the launch
script and review the auth section. The default is **live auth**: callers
authenticate with their bitHuman **API secrets** — the keys on your
[dashboard](/api/api-keys) — validated live against the license service, so
**deleting a key on the dashboard revokes it on this container within
~20 seconds**.

| Variable | Meaning |
|---|---|
| `ESSENCE2MAX_LICENSE_URL` | Base URL of the license service (default `https://api.bithuman.ai`) — live key validation and revocation |
| `ESSENCE2MAX_AUTH_MODE=static` + `ESSENCE2MAX_API_KEYS` | Air-gapped allowlist you mint yourself — see the caveat below |
| `ESSENCE2MAX_ACCOUNT_ID` | The bitHuman account that static-mode usage is attributed to |
| `ESSENCE2MAX_MAX_CONCURRENT` | Concurrent renders — keep `1` per GPU |
| `ESSENCE2MAX_BUNDLE_DIR` | In-container avatar directory (default `/avatars`) |

> **Air-gapped installs.** If the host has no route to `bithuman.ai`, switch
> to static mode: comment out `ESSENCE2MAX_LICENSE_URL` and set both
> `ESSENCE2MAX_AUTH_MODE=static` and `ESSENCE2MAX_API_KEYS` (a long random
> string you mint yourself). Keys are then a fixed allowlist —
> **revocation is not enforced**, deleting a dashboard key will not stop an
> air-gapped box, and the container says so in its logs on every boot.

The env example documents every other knob — port (default `8080`),
usage-report cadence, startup self-test, and H.264 quality. Leave the
runtime-tuning values at their shipped defaults.

## Launch

```bash
E2MAX_EXPECT_REVISION=<revision from your bundle's DELIVERY-README> \
  bash run-essence-2-max.sh
```

The launcher enforces a **revision guard**: it refuses any image whose
provenance label doesn't match your delivery document, so a wrong or stale
`docker load` fails before any container starts.

**Avatars.** Identity bundles live in the `essence-2-max-avatars` Docker
volume. Put each agent's `.imx` file there — download it from the dashboard
or with
[`GET /v1/agent/{code}/model/download`](/api/agents#download-an-agents-model).

## Render over the REST API

Every call needs `Authorization: Bearer` with a bitHuman API secret.

**Health and readiness.** Wait for `"status": "ok"` — the first boot loads
the model into GPU memory, so allow a couple of minutes:

```bash
curl -s localhost:8080/v1/health | jq '{status, engine: .engine.status, capacity}'
```

**Render a talking video.** Rendering is an async job; the result is
H.264/AAC mp4, playable in any browser `<video>` tag. `avatar_id` is the
agent code of an avatar whose `.imx` is in the avatars volume:

```bash
AUDIO_B64=$(base64 -w0 your_speech.wav)
RID=$(curl -s -X POST localhost:8080/v1/renders \
  -H "Authorization: Bearer $BITHUMAN_API_SECRET" \
  -H 'Content-Type: application/json' \
  -d "{\"avatar_id\": \"A49MST0248\", \"audio_base64\": \"$AUDIO_B64\", \"format\": \"mp4\"}" \
  | jq -r .id)

# poll until succeeded/failed
curl -s -H "Authorization: Bearer $BITHUMAN_API_SECRET" \
  localhost:8080/v1/renders/$RID | jq .status

# fetch the video
curl -s -H "Authorization: Bearer $BITHUMAN_API_SECRET" \
  localhost:8080/v1/renders/$RID/video -o out.mp4
```

A bad or revoked key returns `401`. Capacity is enforced: check
`/v1/health` → `.capacity.available` before posting — a second concurrent
render queues or refuses per `ESSENCE2MAX_MAX_CONCURRENT`.

> **Tip — first render after boot.** A cold engine may refuse the very first
> render once after boot; the shipped default
> (`ESSENCE2MAX_FIRST_RENDER_RETRY=1`) retries it automatically. Keeping
> `ESSENCE2MAX_IDENTITY_CACHE=1` holds the last-used identity resident
> between renders, so repeat calls for the same avatar are faster.

## Performance

Measured at 720×1280 on the reference RTX 4070 Ti across many sessions:
**20–26 fps steady** (median frame time ~21 ms). In wall-clock terms, a 22 s
clip returns in ~30–45 s and a 3 min clip in ~4 min, encode included.

Every render reports its **own measured `performance` block** — frame-time
percentiles and an honest `meets_realtime` verdict — in the API response.
Trust that over any number printed here.

A `render_incomplete` error means the host was too loaded or too slow for the
requested output size, and the container refused to return a truncated video
rather than pretend. Retry, or free up the machine.

## Billing

Usage is metered **per session** and reported automatically to bitHuman
(once per minute by default — `ESSENCE2MAX_BEAT_INTERVAL_S`). Sessions are
charged in **floor-minutes** at the self-hosted rate for this model —
4 credits/min ([pricing](/guides/pricing)). A depleted credit balance refuses
**new** consumption but never kills an in-flight render — a video that
started rendering finishes and is delivered.

In static (air-gapped) auth mode, usage is attributed to the account you set
in `ESSENCE2MAX_ACCOUNT_ID`. Check balances any time with the
[Billing API](/api/billing).

## Visualize live in a locally-hosted LiveKit room

`examples/livekit/` in the bundle runs the full loop on your machine — no
cloud account needed:

```
essence-2-max ──mp4──▶ publish_render.py ──▶ livekit-server (local) ──▶ viewer.html
```

1. `docker compose up -d` starts a local LiveKit server in dev mode on
   `ws://localhost:7880`.
2. `pip install livekit livekit-api av requests` for the publisher.
3. `python3 publish_render.py --api http://localhost:8080 --api-key
   $BITHUMAN_API_SECRET --avatar <agent code> --audio speech.wav --loop`
   renders through the container's API, publishes video+audio into a room,
   and prints a **viewer token**.
4. Open `viewer.html` in a browser and paste the token — you'll see the
   avatar playing live from the room.

Dev mode uses LiveKit's fixed `devkey`/`secret` key pair — fine on
localhost, never expose it publicly. For production, replace the dev
credentials with your own key/secret and mint tokens server-side. For
real-time pipelines, POST short audio chunks per utterance and publish each
finished clip — the render API is job-based, so latency ≈ clip length plus a
few seconds.

## Errors

| Symptom | Meaning |
|---|---|
| `401` | Bad, deleted, or revoked API key — live mode re-validates against the dashboard. |
| Render queues or refuses | Capacity: `ESSENCE2MAX_MAX_CONCURRENT` reached — poll `/v1/health` → `.capacity.available` first. |
| First render after boot refused | Cold-engine warmup — retried automatically with `ESSENCE2MAX_FIRST_RENDER_RETRY=1`. |
| `render_incomplete` | Host too loaded/slow for the requested output — the container won't return a truncated video. Retry or free the machine. |
| New renders refused, balance empty | Credits depleted — new consumption is refused; an in-flight render still finishes. |

## Where to go next

- [Essence 2 Max](/concepts/essence-2-max) — what the model is, creation, and cloud serving.
- [Pricing & credits](/guides/pricing) — the full cloud vs. self-hosted schedule.
- [API keys](/api/api-keys) — create and delete the keys this container validates.
- [Self-hosted Expression GPU](/guides/deploy-self-hosted) — the live-session self-host path for Expression, and Essence 2 CPU rendering.
- [Deploy via LiveKit](/guides/deploy-livekit) — the managed cloud path.
