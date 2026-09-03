---
title: "Python SDK"
description: "On-device avatar runtime for Python — pip install bithuman. Backends, AI agents, batch render jobs, edge boxes. macOS arm64 + Linux x86_64 / aarch64."
section: sdk
group: "Languages"
order: 10
---

## Overview

`bithuman` is the Python SDK and the most popular surface for backend services,
AI agents, batch render jobs, and edge boxes. Audio in (16-bit PCM), numpy BGR
frames out at 25 FPS. The runtime and all native dependencies ship in the wheel
— no compile step. This SDK is **GA**.

## Install

```bash
pip install bithuman
```

**Python 3.10–3.14** supported; the latest release on
[PyPI](https://pypi.org/project/bithuman/) is **2.10.0**. Platforms: macOS arm64, Linux x86_64, Linux
aarch64 — all three, on every supported interpreter (15 wheels). (Windows wheels were last published with 1.9.0 and are not yet back in
the 2.x matrix — use WSL2, or fall back to the [CLI](/sdk/cli/overview) on a different host.)

> **macOS note** As of 2.8.1 the macOS wheels are tagged for **macOS 14+
> (arm64)** (the 2.3.x wheels required macOS 26+). On older macOS versions
> `pip install bithuman` fails with `No matching distribution found` —
> upgrade macOS, or contact [hello@bithuman.ai](mailto:hello@bithuman.ai).

> **Note** `pip install bithuman` is the **library** — `from bithuman import
> AsyncBithuman` — and ships cross-platform wheels (macOS arm64 + Linux
> x86_64/aarch64). For the command-line tool, install the sibling
> [`bithuman-cli`](https://pypi.org/project/bithuman-cli/) — via Homebrew or the
> [universal installer](/sdk/cli/install) on macOS/Linux; `pip install bithuman-cli`
> is **macOS Apple Silicon only**. Both share the same `libessence` engine.

> **Linux CA certificates — fixed in 2.3.4.** The SDK auto-discovers your
> distro's CA bundle on Linux (Debian, Ubuntu, RHEL, SUSE, Alpine-glibc layouts
> — including `python:*-slim` Docker images); no configuration needed. If you
> must stay on **≤ 2.3.3**, where authenticated calls fail on Debian/Ubuntu with
> `RuntimeError: auth_authenticate: curl_easy_perform: Problem with the SSL CA cert`:
> either upgrade (recommended) or create the symlink:
>
> ```bash
> sudo mkdir -p /etc/pki/tls/certs && \
>   sudo ln -s /etc/ssl/certs/ca-certificates.crt /etc/pki/tls/certs/ca-bundle.crt
> ```
>
> (In a Dockerfile, drop the `sudo`.) Note that the `CURL_CA_BUNDLE` /
> `SSL_CERT_FILE` env vars **override auto-discovery when set** — a stale or
> wrong value will break auth even on 2.3.4; unset them unless you point them at
> a valid bundle.

> **Note** The SDK returns frames as numpy BGR arrays and needs **no** OpenCV
> itself. Only example scripts that *display* a window need `opencv-python` — it
> is in each example's `requirements.txt`.

Auth: export `BITHUMAN_API_SECRET`. Get a secret at [Developer → API
Keys](https://www.bithuman.ai/developer/api-keys). See [authentication](/api/quickstart)
for details.

> **Which calls read the env var? (re-measured on 2.10.0)** **Both** do. The
> sync `Bithuman.load(...)` has always fallen back to `BITHUMAN_API_SECRET`
> when you omit `api_secret`, and the async `AsyncBithuman.create(...)` now
> does too — on 2.8.1 it did not, so code written against that release passes
> the secret explicitly and still works. Measured with its control: with the
> variable set and `api_secret=` omitted, `create()` returns a runtime and the
> process exits `0`; with the variable unset, the same call exits `1` on
>
> ```text
> bithuman.exceptions.BithumanError: [unknown] AsyncAvatar.create: api_secret is
> required (or set BITHUMAN_API_SECRET in env). Get a key at
> https://www.bithuman.ai/#developer
> ```

## 2.3 — slim wheel, CLI moved out

Through 2.2, `pip install bithuman` bundled both the Python SDK and a `bithuman`
CLI console-script. As of **2.3.0** the wheel is **library-only** (~16–26 MB
depending on platform) — the
CLI moved to the sibling [`bithuman-cli`](https://pypi.org/project/bithuman-cli/)
wheel. The runtime API (`AsyncBithuman`, `Bithuman`, `AudioChunk`, `VideoFrame`,
…) is unchanged; code pinned to `bithuman==1.11.3` or any `2.x` runs on 2.3
without edits.

Also removed from the slim wheel: the leaf modules `bithuman.audio`
(`load_audio`, `float32_to_int16`) and `bithuman.utils` (`FPSController`). They
were tiny shims around `soundfile` / `time.monotonic`; applications inline them
now (~15–30 LOC).

## Which model artifacts can the SDK load?

The `bithuman` wheel loads avatar models directly on-device, and *which*
models it can load depends on your platform:

- **`essence-1` `.imx` — every platform.** `AsyncBithuman` / `Bithuman`
  (and the low-level `Fixture`) load `essence-1` **`.imx`** files through
  `libessence`, including the ones you get from
  [`GET /v1/agent/{code}/model/download`](/api/agents#download-an-agents-model)
  or [`bithuman pull <AGENT_CODE>`](/sdk/cli/commands).
- **[Essence 2](/concepts/essence-2) `.imx` — Linux, as of 2.8.0, but see the
  warning below.** The Linux combined wheel bundles the Essence 2 runtime: the
  loader reads the engine from the IMX header and routes second-generation
  models to the bundled `libengine` backend, through the **same
  `AsyncBithuman` facade**. The Essence 2 bundle carries licensed weights, so
  this path needs a valid `BITHUMAN_API_SECRET`. On **macOS** the wheel stays
  `essence-1`-only — serve Essence 2 through the cloud instead.

  > **Warning — the streaming loader still refuses bundles built on the
  > current renderer (re-measured 2026-09-02 on 2.10.0, Linux x86_64).** The
  > loader wants source frames materialized in the container; Essence 2
  > `.imx` files produced since the **2026-07-27 unified-renderer change**
  > carry them in a different form, so `AsyncBithuman.create()` raises:
  >
  > ```text
  > [essence2-light] open refused: neither P.f16/source_frames.f16 nor
  > fs_red.f16/feature_synth.f16 in /tmp/libengine-e2l-… — repack the .imx with
  > source frames materialized
  > ModelLoadError: [model_load_failed] failed to load v2 (essence2-light) .imx:
  > libengine status=9: imx: backend loader for engine='essence2-light' failed
  > to open the container
  > ```
  >
  > That is the 2.10.0 wording and status code, on an artifact fetched that day
  > from `GET /v1/agent/{code}/model/download?model=essence-2`. Earlier releases
  > raised the same refusal with `status=4` and a shorter member list.
  >
  > `essence2-light` in that message is the container's **engine id** for
  > [Essence 2](/concepts/essence-2) — a legacy name kept for compatibility,
  > quoted verbatim by the loader. It is not a model you can request; see [the
  > `engine` value is a legacy
  > name](/concepts/avatars-imx#the-engine-value-is-a-legacy-name).
  >
  > For **live streaming**, serve Essence 2 through the cloud — the
  > [Video API](/api/video) for cloud-rendered mp4, or the
  > [LiveKit plugin](#livekit-voice-agents) for live sessions.

  **Offline self-host rendering works as of 2.9.0 on Linux and 2.10.0 on
  macOS** and does *not* hit the warning above: `bithuman.tessera_offline`
  (install the `bithuman[tessera]` extra) unpacks current-renderer bundles
  itself and renders them on CPU, metered. Throughput depends on the
  identity's frame size and on the box — see [the measured
  run](#5-render) below rather than planning against a single figure. The
  warning still applies to the **streaming** `AsyncBithuman` / `Bithuman` load
  path.

  > **If you are on macOS, use 2.10.0 or later.** This route calls a native
  > library, `lible_core`, that the macOS wheels did not ship until 2.10.0 —
  > every macOS wheel up to and including 2.9.0 carried the Python half and
  > raised `lible_core.so not found` at the first frame. The Linux wheels have
  > carried it since 2.8.1. `pip install --upgrade bithuman` and check
  > `python -c "import bithuman; print(bithuman.__version__)"`.
- **[Essence 2 Max](/concepts/essence-2-max) — cloud-only from Python.**
- **Expression 1 / Expression 2 — no Python-loadable artifact.** Serve them
  through the [LiveKit plugin](#livekit-voice-agents)'s `AvatarSession`, which
  takes the **agent code** (not a model file) and streams whatever family
  that agent serves. Handing an Expression 2 `.avatar` to
  `AsyncBithuman.create()` fails with a message that does not explain itself —
  `failed to load v2 (expression2) .imx: 'W'` — so check the family before you
  debug the loader ([the exact errors](#what-the-wheel-will-not-load)).
  Expression 2 *does* self-host on Linux, through the CLI's render host rather
  than this wheel, and its metering default is the **opposite** of Essence 2's:
  see [Expression 2 self-hosting is
  fail-OPEN](#expression-2-self-hosting-is-fail-open--the-opposite-default).

## Self-hosting Essence 2 on Linux — the run behind this page

Every command and every snippet below was executed on **2026-09-02** in a
clean virtualenv, and the outputs are pasted as printed — including the
failures and their exit codes. Where something on this page was **read from a
shipped file rather than run**, it says so. The box: Linux x86_64 (AMD
Threadripper PRO 5955WX, 16 cores / 32 threads), Python 3.14.4, `bithuman`
**2.10.0**, `ffmpeg` 8.0.1 on `PATH`.

This route renders a whole audio clip to an MP4 on your own CPU. It is **not**
live streaming — for a live Essence 2 session, see
[LiveKit](/guides/deploy-livekit). For the per-platform walkthrough (macOS,
Android, iOS) see [run a model on your own
hardware](/guides/self-host-local).

### 1. A clean virtualenv

```bash
python3 -m venv .venv && source .venv/bin/activate
pip install bithuman
python -c "import bithuman; print(bithuman.__version__)"
```

```text
Successfully installed annotated-types-0.8.0 av-18.1.0 bithuman-2.10.0 cffi-2.1.1
loguru-0.7.3 numpy-2.5.2 opencv-python-headless-5.0.0.93 pycparser-3.0
pydantic-2.13.5 pydantic-core-2.46.5 pydantic-settings-2.15.0 python-dotenv-1.2.3
soundfile-0.14.0 typing-extensions-4.16.0 typing-inspection-0.4.4
2.10.0
```

pip resolved `bithuman-2.10.0-cp314-cp314-manylinux_2_28_x86_64.whl` (21.7 MB).
Note what came with it: **`soundfile` and `opencv-python-headless` are already
dependencies of the wheel** — you do not install them separately.

Then the render extras. Install the CPU build of torch **first**, or the
`tessera` extra drags in the ~2.5 GB CUDA stack this CPU route never touches:

```bash
pip install torch --index-url https://download.pytorch.org/whl/cpu
pip install "bithuman[tessera]"
```

```text
Successfully installed ... torch-2.14.0+cpu
Successfully installed flatbuffers-25.12.19 ml_dtypes-0.6.0 onnx-1.22.0
onnxruntime-1.29.0 packaging-26.3 protobuf-7.36.1
```

### 2. Get an artifact

```bash
curl -sS -LOJ -w 'http=%{http_code} bytes=%{size_download}\n' \
  -H "api-secret: $BITHUMAN_API_SECRET" \
  "https://api.bithuman.ai/v1/agent/A31BSK9325/model/download?model=essence-2"
```

```text
http=200 bytes=99536068
```

That writes `A31BSK9325.lebundle.imx` (~95 MiB). `lebundle` is a [legacy name
kept for compatibility](/concepts/avatars-imx#second-generation-artifacts) that
you will see in the filename and in error messages — the model is
`essence-2`. `bithuman pull <CODE>` fetches the same file.

### 3. Check the bundle before you render

Essence 2's sharp mouth interior is **borrowed** from four optional members
inside the container. A bundle without them still renders — it just renders the
mouth the earlier, softer way, at the same frame count and the same resolution.
Reading the container costs nothing, so read it first. This needs no CLI:

```python
"""List an IMX v2 container's members and say whether the four teeth-borrow
members are present — before you spend a render finding out."""
import struct, sys

NEEDED = ("tessera_bank.v1.json", "tessera_bank.v1.mp4",
          "tessera_head.v1.json", "tessera_head.v1.pt")

with open(sys.argv[1], "rb") as f:
    magic, _, n = struct.unpack("<4sHH", f.read(8))
    assert magic == b"IMX\0", "not an IMX v2 container"
    names = []
    for _ in range(n):
        (nl,) = struct.unpack("<H", f.read(2))
        names.append(f.read(nl).decode())
        f.read(16)                       # offset + size

print(f"{n} members")
for m in NEEDED:
    print(f"  {'present' if m in names else 'MISSING':>7}  {m}")
print("verdict:", "can borrow" if all(m in names for m in NEEDED)
      else "cannot borrow — no teeth members in this container")
```

```text
$ python check_members.py A31BSK9325.lebundle.imx
27 members
  present  tessera_bank.v1.json
  present  tessera_bank.v1.mp4
  present  tessera_head.v1.json
  present  tessera_head.v1.pt
verdict: can borrow
```

**Run the control too**, or you cannot tell a working check from one that
prints "present" no matter what. Point it at an Essence 1 model, which by
construction carries none of these members:

```text
$ python check_members.py ~/.cache/bithuman/showcase/modern-court-jester.imx
9 members
  MISSING  tessera_bank.v1.json
  MISSING  tessera_bank.v1.mp4
  MISSING  tessera_head.v1.json
  MISSING  tessera_head.v1.pt
verdict: cannot borrow — no teeth members in this container
```

If the CLI is installed, `bithuman info <file> | grep tessera` prints the same
four names with their sizes.

### 4. The audio encoder is not in the wheel

The render calls a shared speech encoder — a ~377 MB ONNX file that is **not
in the artifact, not in the wheel, and not downloaded for you**. Without it the
renderer raises before it builds anything:

```text
bithuman.tessera_offline.TesseraOfflineError: shared audio encoder (wav2vec2 fp32 8s,
~377MB) not found — set BITHUMAN_W2V_ONNX, or provision the dependency store
(~/.bithuman/deps, asset id audio-encoder-fp32).
```

That is the real exception, produced by pointing `BITHUMAN_DEPS_DIR` at an
empty directory; the process exits **1**. Resolution order is `$BITHUMAN_W2V_ONNX` (or
`$W2V_ONNX`), then the per-host store `~/.bithuman/deps` (override with
`$BITHUMAN_DEPS_DIR`) for asset id `audio-encoder-fp32`. There is no self-serve
download: email [hello@bithuman.ai](mailto:hello@bithuman.ai) and say you are
self-hosting Essence 2 on CPU, then `export
BITHUMAN_W2V_ONNX=/path/to/the/file.onnx`. One copy serves every agent on the
host — the encoder is identity-agnostic.

### 5. Render

```python
import json, os, sys
from bithuman.tessera_offline import render_offline

stats = render_offline(
    sys.argv[1],                       # <code>.lebundle.imx  (essence-2)
    sys.argv[2],                       # any audio ffmpeg reads
    out_mp4=sys.argv[3],
    api_secret=os.environ.get("BITHUMAN_API_SECRET"),
)
print(json.dumps({k: stats[k] for k in
                  ("frames", "fps", "borrow_state", "borrow_reason")
                  if k in stats}, indent=2))
assert stats["borrow_state"] == "borrowed", stats["borrow_reason"]
print("OK: every frame borrowed")
```

```text
$ python render_check.py A31BSK9325.lebundle.imx speech.wav rendered.mp4
{
  "frames": 250,
  "fps": 5.44,
  "borrow_state": "borrowed",
  "borrow_reason": ""
}
OK: every frame borrowed
```

Exit code `0`. A 10-second 16 kHz clip produced 250 frames of 25 fps video, and
`ffprobe` reads the MP4 back as `1080x1920`, `nb_frames=250`, `duration=10.0`.

A second run of the same command, printing the whole `stats` dict unedited —
the fields you will actually gate on are at the bottom:

```json
{
  "frames": 250,
  "fps": 6.33,
  "wall_s": 39.472,
  "motion_s": 0.828,
  "director_s": 38.056,
  "paste_s": 10.964,
  "width": 1080,
  "height": 1920,
  "pipelined": true,
  "director_backend": "onnx",
  "director_batch": 24,
  "paste_threads": null,
  "tessera_armed": true,
  "tessera_frames": 250,
  "billing_type": "self-hosted-essence-2-model",
  "metered_heartbeat": true,
  "tessera": {
    "frames": 250,
    "passthrough": 0,
    "borrowed": 250,
    "unborrowed_rate": 0.0,
    "reasons": {},
    "synth_w_mean": 0.0646,
    "synth_w_max": 0.8031,
    "synth_w_sampled": 31,
    "synth_w_every": 8,
    "synth_w_errors": 0,
    "synth_w_state": "armed",
    "tessera_ms_p50": 29.727,
    "tessera_ms_p95": 53.502,
    "cpu_tier": "fast",
    "int8_head_armed": true
  },
  "borrow_state": "borrowed",
  "borrow_reason": ""
}
```

> **On throughput — measure your own identity, do not plan against one
> number.** Four runs of the command above, on this box, reported `fps` of
> **5.44, 5.64, 6.33 and 6.41** — a **1080×1920** identity on the ONNX director
> path, on a machine carrying a load average of 7–14 from other work
> throughout. Frame size, the director backend and what else the box is doing
> all move this figure, so the only number worth planning against is the one
> your identity produces on your hardware. Two things to know before you read
> it: `stats["fps"]` times the render loop **only** — the same run took 57.2 s
> of process wall clock for a loop that reported 39.0 s, so roughly 18 s of
> import and model load sits outside the figure — and the output is 25 fps
> video, so compare your `fps` against 25 to know whether the box renders
> faster or slower than real time.

For frame-level control instead of an MP4:
`OfflineTesseraRenderer(imx_path, api_secret=...).render(audio,
on_frame=callback)` hands you RGB numpy frames as they are produced.

### 6. Prove the borrow gate fires

★ **This is the most important thing on the page.** `assert
stats["borrow_state"] == "borrowed"` is only worth writing if you have watched
it fail. Render the bundle, then render a copy of it with one teeth member
removed, and compare:

```python
"""Prove the borrow gate FIRES: render the bundle, then render a copy with
one tessera member removed. Same frame count, different verdict."""
import os, shutil, sys
from bithuman.tessera_offline import render_offline, unfold_imx

imx, wav = sys.argv[1], sys.argv[2]
sec = os.environ["BITHUMAN_API_SECRET"]

ok = unfold_imx(imx, "bundle_ok")                 # 27 members, flat dir
shutil.rmtree("bundle_broken", ignore_errors=True)
shutil.copytree(ok, "bundle_broken")
os.remove(os.path.join("bundle_broken", "tessera_bank.v1.json"))   # the control

for name, path in (("ARMED   ", ok), ("STRIPPED", "bundle_broken")):
    s = render_offline(path, wav, api_secret=sec, max_frames=50)
    print(f"{name} frames={s['frames']:4d} "
          f"borrow_state={s['borrow_state']:12s} "
          f"borrow_reason={s['borrow_reason'] or '-'}")
```

```text
$ python borrow_control.py A31BSK9325.lebundle.imx speech.wav
ARMED    frames=  50 borrow_state=borrowed     borrow_reason=-
STRIPPED frames=  50 borrow_state=absent       borrow_reason=no-tessera-members
```

Exit code `0` — **both arms succeeded**. That is the point. `unfold_imx`
extracts a container to a directory, and the renderer accepts a directory
wherever it accepts a `.imx`, so the two arms differ by exactly one deleted
file.

Now run the full render against the stripped copy and watch what a bundle that
cannot borrow actually gives you:

```text
$ python render_check.py bundle_broken speech.wav broken.mp4
{
  "frames": 250,
  "fps": 6.62,
  "borrow_state": "absent",
  "borrow_reason": "no-tessera-members"
}
Traceback (most recent call last):
  File "render_check.py", line 13, in <module>
    assert stats["borrow_state"] == "borrowed", stats["borrow_reason"]
           ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
AssertionError: no-tessera-members
```

Exit code **1** — and `broken.mp4` is a complete, playable file: `ffprobe`
reads `1080x1920`, `nb_frames=250`, the same as the good render. **Same frame
count, same resolution, same duration, no warning, no error.** The only thing
that separates a borrowed render from a synthesized one is the field, and the
only thing that stops a synthesized render reaching your users is your assert.

| `borrow_state` | What happened |
|---|---|
| `borrowed` | The mouth interior was borrowed on every frame. The good case. |
| `partial` | Borrowed on some frames — `stats["tessera"]["unborrowed_rate"]` is the fraction it was not. |
| `synthesized` | The stage was available and did not run on any frame. |
| `absent` | The bundle carries no teeth members; `borrow_reason` says which condition failed. |
| `unknown` | The renderer could not determine it — treat as a failure, not as a pass. |

Compare against the names the SDK exports, not against string literals:

```python
from bithuman.tessera_offline import BORROW_BORROWED
assert stats["borrow_state"] == BORROW_BORROWED, stats["borrow_reason"]
```

If a bundle you own reports `absent`, contact us — the artifact needs
rebuilding and there is nothing to configure on your side.

### 7. Metering — what you see in each credential state

Self-hosted rendering is billed at the self-hosted rate
([pricing](/guides/pricing)). **Essence 2's offline route is fail-closed and
stays that way**, and the three credential states are three different
behaviours:

**A valid secret** — the render proceeds and beats once a minute. The proof is
in `stats`, not in the logs:

```json
"billing_type": "self-hosted-essence-2-model", "metered_heartbeat": true
```

**No secret at all** — the renderer constructs, then refuses at the *first
frame*. Exit code **1**:

```text
bithuman.tessera_offline.MeteringNotArmedError: v2 self-host metering gate refused
frame production (billing_type=self-hosted-essence-2-model): no authenticated
heartbeat / grace elapsed. Pass api_secret / set BITHUMAN_API_SECRET.
```

> ★ **A file still appears.** When `out_mp4=` is set, `render_offline` has
> already started `ffmpeg` before the gate refuses, so a **261-byte
> `rendered.mp4`** is left on disk — `ffprobe` reports `duration=N/A` and no
> streams. A CI step that checks "did the output file get created?" **passes on
> a render that produced zero frames**. Check the exit code, or the frame
> count, or both.

**A wrong or revoked secret** — this one fails *earlier*, at construction,
before any frame and before ffmpeg starts. Also exit code **1**:

```text
RuntimeError: auth_authenticate: HTTP 401 {"error":{"code":"UNAUTHORIZED",
"message":"Invalid credentials","httpStatus":401},"status":"error","status_code":401}
```

To tell a good key from a bad one without a render — note this endpoint always
returns HTTP `200`, so read the body, not the status:

```bash
curl -s -X POST https://api.bithuman.ai/v1/validate -H "api-secret: $BITHUMAN_API_SECRET"
# {"valid":true}
curl -s -X POST https://api.bithuman.ai/v1/validate -H "api-secret: not-a-real-secret"
# {"valid":false}
```

Both calls returned `http=200`; only the body differs.

### Expression 2 self-hosting is fail-OPEN — the opposite default

The two products do **not** share a metering policy, and assuming they do will
cost you money or a broken pipeline depending on which way you assume.

Expression 2 does not self-host from this wheel at all (see
[below](#what-the-wheel-will-not-load)); its Linux self-host runtime is the
render host that ships inside the CLI's `engines/` artifact. As of the
**2026-09-02** engine rebuild that runtime is **fail-open**: a render with no
credential *proceeds*, behind a banner on stderr naming exactly what did not
happen. This is the line as printed here, by driving the `selfhost_meter.py`
that ships inside CLI 2.5.1's `engines/linux-x64-1.0.0.engine` with no
credential — the same line appears on stderr when `bithuman run` starts that
host:

```text
[selfhost-meter] ★ UNMETERED RENDER: no BITHUMAN_API_SECRET is set, so this render
cannot be attributed to an account. Proceeding anyway — metering is FAIL-OPEN
(owner ruling 2026-09-02: the LGPL artifact rebuild must not switch billing on by
itself). Usage from this session may not reach the ledger. Self-hosted expression-2
is billed at the published self-host rate (see https://bithuman.ai/pricing); set
BITHUMAN_API_SECRET to the API secret of the account this render should be billed
to. (Lab/CI only: BITHUMAN_UNMETERED=1 renders free and unbilled.) To make this a
hard refusal instead, set BITHUMAN_METER_ENFORCE=1.
```

With a credential set, the same startup prints the metered line instead, and
nothing is unmetered:

```text
[selfhost-meter] metering armed for identity=A55NVK9945 product=expression-2
endpoint=https://api.bithuman.ai/v1/meter/beats session=x2-litert-… enforce=OFF (fail-open)
```

**`BITHUMAN_METER_ENFORCE=1` turns fail-open back into a hard refusal.** With
it set and no credential, the same startup raises instead of printing the
banner — measured here by driving that shipped meter directly:

```text
enforcing() = True
MeteringRefused: refusing to serve: no BITHUMAN_API_SECRET is set, so this render
cannot be attributed to an account. Self-hosted expression-2 is billed at the
published self-host rate (see https://bithuman.ai/pricing); set BITHUMAN_API_SECRET
to the API secret of the account this render should be billed to. (Lab/CI only:
BITHUMAN_UNMETERED=1 renders free and unbilled.)
```

Set it if you would rather a misconfigured box stop than serve unbilled.

Four more properties of the policy, **read from the shipped
`selfhost_meter.py` rather than measured here**:

- **The refusal lands before the host signals ready**, so an enforcing host
  that cannot bill never starts serving rather than hanging mid-stream.
- **A failed *mid-render* beat never interrupts a render**, in either mode. The
  uncovered interval is re-claimed on the next successful beat.
- **The claim is server-clocked.** Each beat to `/v1/meter/beats` claims an
  interval derived from frames actually rendered, and the server clamps that
  claim to its own clock, so an over-claim is not expressible — a render that
  runs faster than real time under-bills by design, and a host sitting idle
  claims nothing.
- **Whose account to charge is derived server-side** from the credential; it is
  never in the request body.

> **`BITHUMAN_UNMETERED=1` is a lab and CI escape, not a deployment mode.** The
> shipped meter reads it and prints its own banner — `★ BITHUMAN_UNMETERED is
> set — THIS RENDER IS NOT BEING BILLED` — for the Expression 2 render host;
> the [self-hosted GPU
> container](/guides/deploy-self-hosted#dev--parity-testing-without-metering)
> has the same switch. It has **no effect on Essence 2's offline route** — the
> released wheel does not honour it. Measured: `BITHUMAN_UNMETERED=1` with no
> secret raises the same `MeteringNotArmedError` at the first frame and exits
> **1**. The Essence 2 route has no unmetered mode you can reach.

### What the wheel will not load

Both of these are real messages from `bithuman` 2.10.0 on Linux, not
paraphrases.

**An Expression 2 `.avatar` through the streaming loader** — the family has no
Python-loadable path, and the error does not say so kindly:

```text
ModelLoadError: [model_load_failed] failed to load v2 (expression2) .imx: 'W'
```

**An Essence 2 `.lebundle.imx` through the streaming loader** — the offline
route above reads these bundles happily; `AsyncBithuman.create()` still cannot:

```text
[essence2-light] open refused: neither P.f16/source_frames.f16 nor
fs_red.f16/feature_synth.f16 in /tmp/libengine-e2l-… — repack the .imx with
source frames materialized
ModelLoadError: [model_load_failed] failed to load v2 (essence2-light) .imx:
libengine status=9: imx: backend loader for engine='essence2-light' failed to open
the container
```

`essence2-light` there is the container's **engine id** for Essence 2 — a
[legacy name kept for
compatibility](/concepts/avatars-imx#the-engine-value-is-a-legacy-name),
quoted verbatim by the loader. It is not a model you can request.

**Either artifact through the sync `Bithuman.load()`** — this one at least
tells you where to go:

```text
RuntimeError: bithuman.Avatar.load: A31BSK9325.lebundle.imx is a v2
(essence2-light) model. Load it with `await AsyncBithuman.create(model_path=...)`
(the v2 libengine route, metered with the v2 self-host billing slug), or render
offline via bithuman.tessera_offline. The sync Avatar class serves essence-1
models only.
```

Follow the second half of that sentence: `bithuman.tessera_offline` is the
route that works.

## The streaming loop

`AsyncBithuman` is the runtime — one instance per avatar session. Create it,
push audio, drain frames:

```python
import asyncio, os
from bithuman import AsyncBithuman

async def main():
    rt = await AsyncBithuman.create(
        model_path="avatar.imx",
        api_secret=os.environ["BITHUMAN_API_SECRET"],
    )
    print(rt.frame_width, "x", rt.frame_height)
    await rt.stop()

asyncio.run(main())
```

> **Note** Straight after `create()` this prints **`0 x 0`**, not the avatar's
> dimensions — `frame_width` / `frame_height` are populated once the runtime has
> produced its first frame. Read them inside the `run()` loop (or take the shape
> off `frame.bgr_image`) rather than treating `0 x 0` as a load failure.

The full `push_audio` / `flush` / `run` loop — including loading a WAV into
int16 PCM without the removed audio helpers — is documented once, canonically,
in [audio streaming](/concepts/audio-streaming). Read that page for the
copy-pasteable end-to-end example; everything below assumes you have it.

| Concept | What it is |
|---|---|
| `AsyncBithuman` | The runtime. One per session. Keep it alive between turns in production. |
| `push_audio(bytes, sr, last_chunk)` | Feed 16-bit PCM; the avatar lip-syncs live. |
| `flush()` | Mark end of audio input. |
| `run()` | Async generator yielding frames at 25 FPS. |
| `interrupt()` | Cancel current playback (barge-in). **Synchronous** — call it directly; `await rt.interrupt()` raises `TypeError`. |
| `frame` | `.bgr_image`, `.audio_chunk`, `.has_image`, `.end_of_speech`, `.frame_index`. |

`push_audio` and `run()` are independent — push as audio arrives (mic, TTS,
WebRTC), drain frames on your render tick.

`Bithuman` (no `Async`) is the sync class, but it is **not** the same surface with
`await` dropped. It does **not** expose `push_audio` / `run` / `flush`. The sync
surface is just two calls: the **classmethod** `Bithuman.load()` (which returns
the loaded runtime — there is no separate constructor step), and `compose()` — an
**iterator** that yields frames for an audio input. Use it for batch scripts and
notebooks; use `AsyncBithuman` for the incremental push/drain streaming loop.
`Avatar` / `AsyncAvatar` remain as **soft-deprecated identity aliases** for
pre-2.0 code (`Avatar is Bithuman` evaluates `True`); new code should use the
`Bithuman` names.

### Offline render, sync (re-run on 2.10.0, Linux x86_64)

Renders frames from a WAV with no event loop — e.g. against a showcase
`essence-1` model fetched with
[`bithuman pull modern-court-jester`](/sdk/cli/commands#bithuman-pull--list--your-models-and-showcase-avatars):

```python
import os
import soundfile as sf                # ships with the wheel
from bithuman import Bithuman

# Sync load: classmethod, returns the runtime. api_secret omitted —
# Bithuman.load() falls back to the BITHUMAN_API_SECRET env var.
rt = Bithuman.load(os.path.expanduser(
    "~/.cache/bithuman/showcase/modern-court-jester.imx"))

audio, sr = sf.read("speech.wav", dtype="int16")   # 16 kHz mono PCM
n = 0
for frame in rt.compose(audio, output_size=(1280, 720)):
    bgr = frame.bgr                    # numpy uint8, (H, W, 3)
    n += 1
print("frames:", n, "shape:", bgr.shape, "sr:", sr)
```

```text
frames: 247 shape: (720, 1280, 3) sr: 16000
```

Exit code `0`, from a 10-second 16 kHz clip. `compose()` yields
`ComposedFrame` objects — the pixels are on **`.bgr`** (there is no `.image`
attribute). Note `frame_width` / `frame_height` report `0 x 0` on the sync
class too — take the shape off `.bgr` instead. `soundfile` needs no separate
install: `pip install bithuman` brings it, along with
`opencv-python-headless`.

## Public API at a glance

Top-level imports are the surface you build against:

```python
from bithuman import (
    AsyncBithuman, Bithuman,              # runtime (async / sync)
    AudioChunk, VideoFrame, VideoControl, # I/O types
    Emotion, EmotionPrediction,           # emotion analysis
    # exceptions
    BithumanError,
    ModelError, ModelLoadError, ModelNotFoundError, ModelSecurityError,
    RuntimeNotReadyError,
    TokenError, TokenExpiredError, TokenValidationError, TokenRequestError,
    AccountStatusError,
    # version metadata
    __version__, __core_version__, __abi_version__,
)
```

Controls let you drive idle behavior and actions out of band:

```python
await rt.push(VideoControl(action="wave"))
await rt.push(VideoControl(target_video="idle"))
```

## Low-level API (advanced)

For multi-tenant servers that share one set of model weights across many
concurrent sessions, the wheel exposes the engine primitives directly:

```python
from bithuman import Fixture, Runtime, EP_AUTO, EP_CPU, EP_COREML

fixture = Fixture("avatar.imx", preferred_ep=EP_AUTO)  # weights, load once
runtime = Runtime(fixture)                             # cheap per session
```

`EP_AUTO` / `EP_CPU` / `EP_COREML` / `EP_NNAPI` / `EP_QNN` select the ONNX
Runtime execution provider. Most users should stick to `AsyncBithuman` /
`Bithuman`, which wrap these for you.

## Native acceleration

The wheel ships a native extension `bithuman/_core.cpython-3X-<platform>.so` — a
pybind11 binding to the shared `libessence` engine that also powers the Swift
and Rust SDKs. You never import `_core` directly; it loads automatically
behind `AsyncBithuman`. `bithuman.__core_version__` reports the engine version;
`bithuman.__abi_version__` reports the C ABI.

## LiveKit voice agents

For a real-time WebRTC voice agent with an avatar, use the LiveKit plugin
instead of driving the runtime yourself:

```bash
pip install livekit-plugins-bithuman pillow
```

> **Note** The plugin currently imports Pillow but doesn't declare it as a
> dependency — install `pillow` alongside it (as above), or
> `from livekit.plugins import bithuman` fails with
> `ModuleNotFoundError: No module named 'PIL'`. An upstream fix is pending with
> LiveKit.

> **Note** There is no `bithuman[agent]` extra and no
> `bithuman.utils.agent.LocalAvatarRunner` in the slim wheel — install the LiveKit
> plugin as its own package above. The only extra the slim `bithuman` wheel
> declares is `test`.

```python
import os
from livekit.plugins import bithuman

avatar = bithuman.AvatarSession(
    avatar_id=os.environ["BITHUMAN_AGENT_ID"],
    api_secret=os.environ["BITHUMAN_API_SECRET"],
)
# attach to your AgentSession, then start it
```

`AvatarSession` is the single integration point — the same call works cloud or
self-hosted. See the [LiveKit page](/sdk/livekit) for the full deploy path.

## Fully on-device

For private, no-cloud operation, install the `[local]` extra on the **CLI**
package and set `BITHUMAN_LOCAL=1`. The conversation brain swaps from OpenAI
Realtime to an entirely in-process stack (whisper.cpp + llama.cpp + Supertonic +
Silero) — no API key, no outbound network. See [local mode](/sdk/cli/local-mode).

## System requirements

- **Python 3.10–3.14** (cp310–cp314 wheels ship for every supported platform).
- **Essence**: any modern CPU, 4 GB RAM. macOS arm64 / Linux x86_64 / Linux aarch64.

## Troubleshooting

### `ModuleNotFoundError: No module named 'bithuman'`

Not installed in the active environment — `pip install bithuman --upgrade` in
the same venv you run from.

### Authentication failed

Confirm `BITHUMAN_API_SECRET` is set in the running shell, then check the key:

```bash
curl -X POST https://api.bithuman.ai/v1/validate -H "api-secret: $BITHUMAN_API_SECRET"
```

`/v1/validate` always returns HTTP `200` — read the body: `{"valid": true}` means
the key is good, `{"valid": false}` means it's missing or wrong (it does **not**
return `401`).

### `Problem with the SSL CA cert` on Linux (Debian/Ubuntu)

**Fixed in 2.3.4** — the SDK auto-discovers your distro's CA bundle on Linux;
no configuration needed. `pip install --upgrade bithuman`.

On **≤ 2.3.3**, `AsyncBithuman.create()` raises
`RuntimeError: auth_authenticate: curl_easy_perform: Problem with the SSL CA cert (path? access rights?)`
on Debian, Ubuntu, and derived images (including `python:*-slim`) because the
wheel's bundled libcurl only reads the RHEL CA path
`/etc/pki/tls/certs/ca-bundle.crt`. Either upgrade (recommended) or symlink the
Debian bundle into place once:

```bash
sudo mkdir -p /etc/pki/tls/certs && \
  sudo ln -s /etc/ssl/certs/ca-certificates.crt /etc/pki/tls/certs/ca-bundle.crt
```

Still failing **on 2.3.4**? Check for stale `CURL_CA_BUNDLE` / `SSL_CERT_FILE`
env vars — when set, they **override** auto-discovery, and a wrong value breaks
auth even on 2.3.4.

### `No matching distribution found for bithuman`

pip found no wheel for your platform. The common causes:

- **macOS older than 14** — the 2.8.1 macOS wheels are tagged for **macOS 14+
  (arm64)** (2.3.x wheels required macOS 26+). Upgrade macOS, or contact
  [hello@bithuman.ai](mailto:hello@bithuman.ai).
- **Alpine / musl Linux** — not supported. The Linux wheels are
  `manylinux_2_28` (glibc) for x86_64 / aarch64; use a glibc-based image
  (e.g. `python:*-slim`) instead.
- **Python outside 3.10–3.14**, or 32-bit / Windows interpreters (see the
  platform list above).

### Avatar shows but no lip movement

Push **int16 PCM bytes** (clip float32 to ±1 and scale by 32767), call `flush()`
after all audio, and pass the same sample rate you decoded with.

### `ImportError: No module named 'bithuman.audio' / 'bithuman.utils'`

Removed in 2.3.0. Inline `load_audio` / `float32_to_int16` / `FPSController` in
your app — see [audio streaming](/concepts/audio-streaming) for the drop-in.

### `objc: Class AVFFrameReceiver is implemented in both …/cv2/… and …/av/…`

Both OpenCV and PyAV ship their own FFmpeg dylibs. Harmless if you depend on the
headless variant; otherwise fix the variant explicitly:

```bash
pip uninstall -y opencv-python && pip install opencv-python-headless
```

### Slow first startup (30–60 s)

First `.imx` load warms the runtime / upgrades the file format. Keep the runtime
alive between sessions in production.

## See also

- [Audio streaming](/concepts/audio-streaming) — the canonical push/drain loop
- [Models](/concepts/models) — Essence models and the `.imx` format
- [Run a model on your own hardware](/guides/self-host-local) — the same route
  per platform, plus macOS, Android and iOS
- [LiveKit](/sdk/livekit) — WebRTC voice agents with a face
- [CLI](/sdk/cli/overview) — no-code render and live chat, same engine
