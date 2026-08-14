---
title: "Self-hosted Essence 2 Max"
description: "Run a live photoreal avatar on your own NVIDIA GPU — the self-hosted, GPU version of essence-2: verify the hand-delivered image, launch the container, and stream your agent into a locally-hosted LiveKit room, including a real-time voice chat loop powered by your own OpenAI key."
section: guides
group: "Deploy"
order: 12
label: "Self-hosted Essence 2 Max"
---

## The Essence 2 Max container

This is the **self-hosted, GPU version of
[essence-2](/concepts/essence-2)** — bitHuman's photoreal avatar, packaged as
a single Docker container that **streams a live agent from your own NVIDIA
GPU** (the model slug is [`essence-2-max`](/concepts/essence-2-max)). Nothing
about the avatar leaves your machine: the container renders locally, a
locally-hosted LiveKit server carries the stream, and the bundle includes a
**real-time voice chat loop** — bring your own OpenAI API key and talk to
your agent live in a browser
([below](#talk-to-your-agent-live-livekit--openai-realtime-voice)).

Two serving surfaces sit under the stream. A **live session**
(`ws /v1/sessions`) runs one continuous engine stream per conversation — the
avatar idles naturally between utterances and speaks each reply in the same
stream, with no cuts, exactly as it serves in bitHuman's cloud; this is what
the realtime chat example uses. And a simple REST API: send speech audio, get
back H.264 video of your agent saying it, for clip generation. One
container, one API key, one concurrent render; sessions bill at the
self-hosted rate — 4 credits/min ([pricing](/guides/pricing)). For a live
cloud session instead of self-hosting, use the
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

## Get your licence key

The container is licensed with a **bitHuman API secret** — the same key the
cloud API uses. One key does three jobs here: it licenses the container
(validated live at every session start), authenticates callers on the local
REST API, and attributes usage for billing.

1. Sign in at [bithuman.ai](https://www.bithuman.ai) (the free tier works —
   no credit card).
2. Go to [Developer → API Keys](https://www.bithuman.ai/developer/api-keys).
3. Click **Create new key**, name it for this machine (e.g. `gpu-server-1`),
   and copy the value — **you won't be able to view it again**.

Export it on the GPU host as `BITHUMAN_API_SECRET` and use it as the bearer
token in every API call below. Deleting the key on the dashboard revokes it
on this container within ~20 seconds; your account balance funds the
sessions ([billing](#billing)).

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
| `avatars/<agent code>.pkl` | Your avatar's prepared identity bundle — see [Avatars](#launch) |
| `examples/realtime-chat/` | Talk to your avatar live — LiveKit + OpenAI Realtime voice |
| `examples/livekit/` | Locally-hosted LiveKit server + clip-streaming loop |
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
> public record. No cosign on the machine? One-line install:
> `curl -sLo /usr/local/bin/cosign https://github.com/sigstore/cosign/releases/latest/download/cosign-linux-amd64 && chmod +x /usr/local/bin/cosign`
> — or rely on the sha256 check alone (the signature additionally proves
> origin).

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

**Avatars.** Your avatar ships **with the bundle** as
`avatars/<agent code>.pkl` — a prepared identity bundle for this container.
Install it once into the `essence-2-max-avatars` Docker volume, from the
bundle directory:

```bash
docker run --rm -v essence-2-max-avatars:/avatars -v "$PWD/avatars:/src" \
  alpine cp /src/<agent code>.pkl /avatars/
```

**Default avatar.** A render that names no `avatar_id` uses the container's
default: `ESSENCE2MAX_DEFAULT_AVATAR` if set in your env file, otherwise the
single installed avatar. With several installed and no default configured,
the API asks you to name one rather than guess.

**Use your own avatar — from your own photo.** Create an agent from your
portrait with the ordinary cloud creation — the dashboard, or
[`POST /v1/agent/generate`](/api/agents#generate-an-agent) with
`model: "essence-2"` and your `image` (skip the image and one is generated
from your prompt; ~45 minutes, 500 credits). Once it's ready, just render
with `avatar_id=<its agent code>`: with live licensing the container
**fetches your avatar automatically on first use** — your own key authorizes
it — and caches it in the volume. Air-gapped installs
[download the avatar bundle](/api/agents#download-an-agents-self-hosted-avatar)
themselves and copy it into the volume like the bundled one:

```bash
curl -H "Authorization: Bearer $BITHUMAN_API_SECRET" \
  https://api.bithuman.ai/v1/agent/<agent code>/self-hosted-avatar -o <agent code>.pkl
```

## Render over the REST API

Every call needs `Authorization: Bearer` with a bitHuman API secret.

**Health and readiness.** Wait for `"status": "ok"` — the first boot loads
the model into GPU memory, so allow a couple of minutes:

```bash
curl -s localhost:8080/v1/health | jq '{status, engine: .engine.status, capacity}'
```

**Render a talking video.** Rendering is an async job; the result is
H.264/AAC mp4, playable in any browser `<video>` tag. `avatar_id` is the
agent code of an avatar installed in the avatars volume. Audio can be
any common format — WAV at any sample rate, MP3, M4A/AAC, OGG, FLAC — the
container normalizes it internally:

```bash
RID=$(curl -s -X POST localhost:8080/v1/renders \
  -H "Authorization: Bearer $BITHUMAN_API_SECRET" \
  -F "avatar_id=A49MST0248" -F "audio=@your_speech.wav" | jq -r .id)

# poll until succeeded/failed
curl -s -H "Authorization: Bearer $BITHUMAN_API_SECRET" \
  localhost:8080/v1/renders/$RID | jq .status

# fetch the video
curl -s -H "Authorization: Bearer $BITHUMAN_API_SECRET" \
  localhost:8080/v1/renders/$RID/video -o out.mp4
```

From code, you can also send JSON — `{"avatar_id": …, "audio_base64": …,
"format": "mp4"}` — to the same endpoint. Build the JSON body in a file and
POST it with `curl --data @payload.json` rather than interpolating the
base64 into the command line, which hits the shell's argument-length limit
on clips longer than a few seconds.

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

## Talk to your agent live (LiveKit + OpenAI Realtime voice)

`examples/realtime-chat/` in the bundle is a complete, **interactive, local
conversation loop**: you speak in a browser, and your avatar answers you —
voice and video. Everything runs on your machine except the voice brain,
which is your own OpenAI account:

```
your mic (chat.html) ──▶ LiveKit (local, docker) ──▶ chat_agent.py
       ├──▶ OpenAI Realtime (speech-to-speech, YOUR key)
       └──▶ essence-2-max container (renders each reply)
  ◀── the avatar answers you, voice + video, in the browser
```

Four steps, with the container already running:

1. `docker compose -f examples/livekit/docker-compose.yml up -d` — the local
   LiveKit server (dev mode, `ws://localhost:7880`).
2. `pip install livekit livekit-api av requests numpy websockets`
3. ```bash
   OPENAI_API_KEY=sk-... python3 examples/realtime-chat/chat_agent.py \
     --api http://localhost:8080 --api-key $BITHUMAN_API_SECRET \
     --avatar <agent code>
   ```
4. Open `examples/realtime-chat/chat.html`, paste the **USER TOKEN** the
   agent printed, allow the microphone — and just talk.

The avatar greets you, then it's a conversation: OpenAI's server-side voice
detection decides when you've finished speaking, the model answers in
speech, and the container renders the reply and streams it into the room.
Replies begin a few seconds after you stop talking — the default persona
keeps answers to a few short sentences so turns stay snappy — and while the
avatar speaks your mic is ignored, so you can't talk over it. Rendering
bills your bitHuman key at the self-hosted rate; the voice side bills your
OpenAI key.

### Stream pre-rendered clips instead

`examples/livekit/` is the simpler half of the loop — render a clip through
the API and stream it into the same locally-hosted room for any viewer:
`python3 publish_render.py --api http://localhost:8080 --api-key
$BITHUMAN_API_SECRET --avatar <agent code> --audio speech.wav --loop`, then
open `viewer.html` with the printed token.

Dev mode uses LiveKit's fixed `devkey`/`secret` pair — fine on localhost,
never expose it publicly. For production, use your own LiveKit key/secret
and mint tokens server-side.

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
