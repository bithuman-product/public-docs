---
title: "Changelog"
description: "Release notes and version history for the bitHuman platform."
section: resources
group: "Resources"
order: 1
---

> **Note** Product-level changes only. For per-version notes, see the [Python SDK CHANGELOG](https://github.com/bithuman-product/homebrew-bithuman/blob/main/python/CHANGELOG.md) and the [Swift SDK releases](https://github.com/bithuman-product/homebrew-bithuman/releases).

## September 2026

### Essence 2's head upsample reaches the Android path, and the phone figure is measured (2026-09-03)

★ **Correction to the 2026-09-02 entry below.** That entry announced a rebuilt
head-upsampling step and published a **3.00×** CPU speedup. Both statements
stand, but the entry let a reader infer something that was not true: that an
**Android** device got the win. It did not.

**Why not.** An identity's renderer ships as **two** graphs — a **batched** one
and a **single-frame** one — and they are rewritten independently. The
2026-09-02 rollout rewrote **only the batched graph**. **Android runs the
single-frame graph** (its batched path is unavailable while the sharp
mouth-interior pass is attached, and that pass is always attached), so the
change reached nothing a phone executes. The single-frame graph was rewritten
and deployed on **2026-09-03**, on the same single identity. **The rewrite is
now on 1 of 52 published identities, in both graphs; the other 51 have it in
neither.**

**And now it is measured on a phone.** Both graphs, benchmarked head to head on
a **Galaxy S25+ (`SM-S936U1`, Snapdragon 8 Elite / SM8750)**, ONNX Runtime
**1.26.0** CPU execution provider, **batch 1** (the shape Android runs), 4
intra-op threads pinned to the four big cores, screen held awake, 8 interleaved
and rotated repeats, medians, 80 of 80 samples passing the clock and contention
guards. This is an **offline benchmark of the renderer graph** — not a live
session, and not a run through the published Android SDK's own API.

| Renderer graph | Cooled ms/frame | fps | RTF | Sustained ms/frame | fps | RTF |
|---|---:|---:|---:|---:|---:|---:|
| Previous step (cubic resize) | **109.23** | 9.15 | 2.73 | **160.04** | 6.25 | 4.00 |
| Rebuilt step | **49.00** | 20.41 | 1.23 | **83.38** | 11.99 | 2.08 |

**2.23× cooled, 1.92× sustained.** The deployed identity, benchmarked as
itself, agrees to 0.27% / 0.30%. Both controls fired: a byte-identical duplicate
measured 1.003× / 1.016×, inside the floor; a deliberately 33.8%-heavier arm
measured **slower**, 0.968× / 0.938×. The sustained figure is a **lower bound** —
the burn preceding it is fixed *work*, not fixed *time*, so the faster arm
enters its window hotter (50.7 °C vs 47.8 °C) and against a lower clock ceiling
(1.958 vs 2.438 GHz).

★ **Essence 2 still does not render in real time on a flagship phone.** Even
cooled and rebuilt, 20.41 fps is below the 25 fps a session consumes (RTF 1.22);
sustained it is 11.99 fps. Against the internal real-time bar (RTF ≤ 0.50,
≥ 40 fps) the rebuilt graph is 2.45× short cooled and 4.17× short sustained.

★ **The 7.54 → 23.87 fps figure is not an Android figure.** It is a **developer
workstation** — Threadripper PRO 5955WX, x86-64, batch 24 — and it is neither a
phone nor the deployed CPU worker. The handset rows above supersede it for every
on-device claim. The share of the forward pass taken by the replaced step is
**68.6%** on that x86 part but **57.9%** on the Snapdragon, which is why the same
rewrite is worth 3.00× there and 2.23× here; shares and speedups do not carry
across silicon.

**Unchanged, and stated again so it is not read as a general speedup:** on the
**GPU** tier the rewrite is **0.971× — about 3% slower**, and no GPU speedup
should be expected or quoted. On the **Apple** tier there is nothing to gain:
that build's converter has expressed this step the rewritten way since
2026-08-30, and the step is 6.06% of that tier's forward pass, which caps any
work on it at **1.06×**.

**No other Android device has been measured** and no figure is projected for
one. See [Android, measured on the handset](/concepts/essence-2#android-measured-on-the-handset)
and the [Android SDK page](/sdk/android#on-device-speed-measured-on-a-snapdragon-8-elite).

### essence-2 lands on Maven Central — both families now have a public Android SDK (2026-09-03)

`ai.bithuman:essence2-android:0.2.0` is published to Maven Central and resolves
anonymously, with no credential. With
`ai.bithuman:expression2-android:0.3.0` (2026-09-02) and
`ai.bithuman:sdk:2.3.6` (essence-1), **the `ai.bithuman` group now lists three
artifacts** and every model the scope ruling puts on the Android lane has a
coordinate that resolves.

```kotlin
implementation("ai.bithuman:essence2-android:0.2.0")   // essence-2, minSdk 29, arm64-v8a
```

**Ship-state, stated plainly.** This artifact ships knowingly under the
2026-08-30 "base offering first" ruling, and two things are below bar:

- it **fails the `PARITY_U8` gate at 2 levels**;
- sustained throughput is **1.63x short of the accepted bar** — a 1,000-second
  Hexagon run reads RTF 0.9959 / 20.08 fps against an accepted RTF 0.61 /
  32.7 fps.

No Gradle project outside bitHuman has been compiled against it yet, and no
render through this artifact's own API has been taken — what is established is
the coordinate, the bytes, the checksum, the declared `minSdk` and the native
payload. **Updated the same day:** the renderer graph it carries has since been
benchmarked on a Snapdragon 8 Elite handset — see the entry above. The [Android SDK page](/sdk/android) carries the
measurements and both negative controls.

**FFmpeg / LGPL.** The AAR links FFmpeg 7.1 statically, so LGPL-2.1 **§6(a)**
applies, and the relink materials are published beside the AAR at a
`repo1.maven.org` URL baked into the shipped `META-INF/NOTICE.txt`. The kit has
15 entries — the object archive, the real link command, and FFmpeg's complete
corresponding source. Every claim about it is checkable from the published
bytes: [FFmpeg / LGPL — the Android relink offer](/legal/android-ffmpeg-lgpl).
`expression2-android` carries no FFmpeg and needs no such offer.

### CLI `2.5.1` — macOS and Linux back on one version (2026-09-03)

`cli-v2.5.1` publishes **both** `aarch64-apple-darwin` and
`x86_64-unknown-linux-gnu`. The 2.5.0 split — where macOS moved ahead and
Linux was stuck three releases back on `cli-v2.4.2` — is closed, and **the
`BITHUMAN_VERSION=cli-v2.4.2` pin this site used to recommend on Linux should
be dropped**. The unpinned universal installer is now correct on both.

`pull --model <family>` is in the Linux build too; the note saying it was
macOS-only is withdrawn.

**Still not published, and never has been:** `x86_64-apple-darwin` (Intel Mac)
and, since `cli-v2.3.27`, `aarch64-unknown-linux-gnu` (Linux ARM). On those two
targets `install.sh` resolves a download that 404s and exits 1. See
[Downloads](/downloads#bithuman-cli-no-code) for the four-target probe.

**`bithuman render` is unchanged and still limited**: `rc=0` for expression-2,
**`rc=69` for essence-2** — the shipped `lib/libonnxruntime.so.1` is built at
`VERS_1.20.1` while every `lible_core.so` requires `VERS_1.26.0`, so **copying
a file in does not fix it** — and `rc=70` for essence-1. Details and the
controls: [what the CLI actually does](/sdk/cli/verified).

### Expression 2 self-hosting on Linux is fail-open, by owner ruling (2026-09-02)

The rebuilt Linux engine that ships inside CLI 2.5.1
(`engines/linux-x64-1.0.0.engine`) has metering **enforcement off**. A render
with no credential **proceeds**, behind a `★ UNMETERED RENDER` banner on
stderr; the meter is still running and still beats wherever a credential exists.

This was deliberate. The engine's own source carries the ruling: shipping the
LGPL remediation fail-closed *"would have switched billing on for every
existing self-hoster at the moment they upgraded, with no notice — a pricing
change riding in on a licence fix."* Both switches (`ENFORCE_DEFAULT` and its
twin `METER_ENFORCE_DEFAULT`) read `False` in the shipped bytes.

**Scope: expression-2 only.** The engine declares `PRODUCT = "expression-2"`,
and essence-2's `bithuman.tessera_offline` **stays fail-closed** — no
credential there still raises `MeteringNotArmedError` and produces no frames.
Enforcement is expected to return; treat unmetered rendering as a grace period,
not a price.

### Essence 2's head upsample is rebuilt — a CPU-tier speedup, same picture (2026-09-02)

> **Corrected 2026-09-02.** The first version of this entry said the Apple tier
> serves the *previous* head upsample. It does not: that tier's CoreML build
> already expressed the step the rewritten way. The Apple row below is the
> measured replacement.

Essence 2's **head-upsampling step** has been rebuilt. It is an internal graph
change: the API, the session contract, the `?model=` tier slugs and the price
are unchanged, there is nothing to opt into, and the picture is the same — the
new and previous builds agree to **167.85 dB** PSNR on the same identity and the
same frames, below one step of an 8-bit pixel, and the change was reviewed side
by side on video before it was accepted.

It **rolls out per identity**, the way the 2026-07-27 renderer change did: an
identity picks it up when its bundle is rebuilt, and serves the previous build
until then. **The first identity was served on 2026-09-02.** One identity is not
a fleet: most identities are still on the previous build.

**The speedup is a CPU-tier speedup, and only a CPU-tier speedup.** The step it
replaces is **68.6%** of the forward pass under the ONNX Runtime **CPU**
execution provider and **0.48%** of it on **CUDA**, so the gain does not
transfer:

- **CPU** (Threadripper PRO 5955WX, ORT CPU provider, batch 24, 4 threads,
  sustained, no throttling): **3.00×** on the model step; the full delivered
  path goes **7.54 → 23.87 fps**. Still short of 25 fps — that tier remains an
  offline and last-resort tier.
- **GPU** (RTX 4090, ORT CUDA provider, batch 24, as the deployed worker is
  configured): **0.971×, about 3% slower**, against a 0.083% noise floor. No
  gain, and none should be expected. The absolute cost there — 1075 fps before,
  1044 fps after on that step — is far enough above a session's 25 fps that the
  difference is not observable.
- **Apple** (M4 Max on the serving host, CoreML, GPU compute, batch 1, fp32,
  cooled and unthrottled): **no gain — the step was already built this way
  there.** The rebuilt graph is genuinely not shipped to that tier, but its
  CoreML converter has expressed this step as the same padded 5×5 depthwise
  convolution plus pixel shuffle since before the rollout began, so the change
  is not a change there. That step costs **6.06%** of the forward pass on that
  tier (renderer model 1.834 ms/frame, 545 fps, 0.36% noise floor), which caps
  any further work on it at **1.06×**. Batch 1, so not comparable with the
  batch-24 rows above.
- **Browser-local**: not measured.

See
[What the head-upsample rewrite is worth, per tier](/concepts/essence-2#what-the-head-upsample-rewrite-is-worth-per-tier).

### The "Apple Neural Engine" tier is renamed **Apple**, and a false performance claim is withdrawn (2026-09-02)

Essence 2's cloud Apple tier was documented as the **Apple Neural Engine**
tier, with a per-frame throughput figure attached and attributed to every
operation in the graph running on the Neural Engine. That attribution was
wrong, so the number went with it.

**What is true.** The tier runs on Apple Silicon Macs through **CoreML**, and
every serving worker on those hosts binds the **GPU** compute unit — verified
on the production hosts on 2026-09-02. The Neural Engine is not off-limits: on
a minority of identities the renderer resolves to a half-precision graph the
Neural Engine accepts and runs there. Measured head to head, it was about
**2.2× slower** than the Metal GPU *and* slightly further from the reference
picture, so the GPU is not a fallback — it is the fastest and most faithful
unit on that machine. Both "it runs on the Neural Engine" and "it can never
touch the Neural Engine" are false; the page now says the measured thing.

**No replacement number is published.** The withdrawn figure was a
model-in-isolation reading that a live session never sees, and the per-model,
per-compute-unit protocol used for Essence 2's CPU table has not been run for
the Apple or GPU tiers. Picking one of the figures in circulation is what
produced the error, so the page says so instead. See
[Which Apple compute unit runs Essence 2](/concepts/essence-2#which-apple-compute-unit-runs-essence-2).

**Expression 2 is the opposite case, and is now documented separately.** Its
Apple members are exported at half precision and CoreML's own per-operation
compute plan places **84–100%** of their operations on the Neural Engine — none
on the GPU. The two models share the word "Apple" and the historical `-ane`
slug and nothing else. See
[Which Apple compute units run Expression 2](/concepts/expression-2#which-apple-compute-units-run-expression-2).

**Nothing you can write changed.** `essence-2-ane`, `expression-2-ane`, the
`?model=` force slugs, saved links and every API field keep working exactly as
before. Only the prose name of the tier changed, from "Apple Neural Engine" to
"Apple".

### Linux wheels restored for `bithuman` 2.10.0 (2026-09-02)

2.10.0 was published for macOS first and carried **no Linux files for about a
day**, so between 2026-09-01 and 2026-09-02 `pip install bithuman` on Linux
silently resolved to the previous release, **2.9.0**. All ten Linux wheels
(cp310–cp314 × `manylinux_2_28` x86_64 and aarch64) are on PyPI now, published
from the same measured build as the macOS wheels. If you installed in that
window, run `pip install -U bithuman` and check `bithuman.__version__`. See
[Downloads](/downloads).

## August 2026

### `409 MODEL_NOT_GENERATED` now tells you how to fix it (2026-08-17)

The model gate used to state the problem and stop — `"agent <code>'s
expression-1 model hasn't been generated yet"` — which read as *"this agent
can't do that model"*. It can. Every 409 now names the remedy: the exact
[model-add](/api/agents#add-a-model-to-an-existing-agent) call and its cost when
the agent qualifies, or the missing asset when it doesn't. `expression-1` is the
clearest case and got its own wording (*"isn't enabled on this agent yet"*):
nothing is ever trained for it, so **any** agent with an image and a voice —
including an Essence 1 agent — enables it with one free, instant call and can
then render Expression 1 talking videos immediately. See
[Using Expression 1 on an existing agent](/api/agents#using-expression-1-on-an-existing-agent).
Same gate, same 409, same "before any charge" guarantee — only the message
changed.

### Essence 2 Max self-hosted — a GPU container you run yourself (2026-08-13)

`essence-2-max` — the **premium photoreal renderer** — can now run on **your
own NVIDIA RTX 40-series GPU** as a self-hosted container. You POST audio to a
local REST API and get back an H.264 talking video rendered entirely on your
hardware, with an included example for visualizing it live in a locally-hosted
LiveKit room. The image is **hand-delivered** (signed and checksummed) rather
than pulled from a public registry — contact
[hello@bithuman.ai](mailto:hello@bithuman.ai) to get a bundle. Sessions bill at
the self-hosted rate (4 credits/min). Quickstart:
[Self-hosted Essence 2 Max](/guides/deploy-essence-2-max).

### Essence 2 self-hosted — offline CPU rendering ships in Python SDK 2.9.0 (2026-08-02)

The `essence-2` model now **self-hosts on your own CPU servers**. Python SDK
**2.9.0** (Linux x86_64 and aarch64, Python 3.10–3.14) adds
`bithuman.tessera_offline` — install the **`bithuman[tessera]`** extra and
render the downloaded `<code>.lebundle.imx` to frames or an mp4 entirely on
your hardware, no GPU required, teeth-refinement stage included. Measured
end-to-end: **~22–31 FPS on a 16-core desktop** (the higher band when the
bundle carries the CPU acceleration member). The runtime ships **together with
its metering**: a valid `BITHUMAN_API_SECRET` is required, sessions bill at
the self-hosted rate (2 credits/min), and without a key the renderer is
fail-closed — zero frames. Live streaming from your own server still runs
through the cloud. Quickstart:
[Self-hosted → Essence 2](/guides/deploy-self-hosted#essence-2-self-hosted--cpu-offline-rendering-sdk-290).

## July 2026

### Essence 2 — sharper mouth and teeth, and a much smaller model file (2026-07-27)

Essence 2 now renders each identity through a **new unified renderer**. The
mouth interior — the teeth especially — is **rendered sharply** rather than
being averaged out of the source frames, and it shows
most on wide-open speech: measured against each identity's own previous build,
mouth-region fidelity improved **roughly 2× to 4.7×** across the launch gallery.
That ratio is LPIPS — a learned perceptual image-distance metric — computed only
inside the mouth-interior mask of the reference render, on each identity's
held-out frames, so it is a per-identity improvement factor and not a
cross-identity score
([conditions](/concepts/essence-2#the-renderer-updated-2026-08-29)). It was
also checked frame by frame by eye, not only by metrics. Mouth motion is
also re-centred and wider, so speech reads as more dynamic.

Two practical consequences:

- **The downloadable model got about 5× smaller.** A `<code>.lebundle.imx` from
  [`GET /v1/agent/{code}/model/download`](/api/agents#download-an-agents-model)
  is now roughly **85–105 MB** instead of several hundred. Read `Content-Length`
  rather than hard-coding a size.
- **No serving-cost or pricing change.** Measured warm and end to end, the new
  renderer costs nothing extra to serve. Rates are unchanged: 4 credits/min
  cloud, 2 self-hosted, 500 credits to create.

Nothing in the API, the session contract, or the tier slugs changed. **New
creations get the new renderer automatically**; existing agents move over as
they are retrained, so an older agent keeps serving its current build (and its
larger model file) until then. Runs on all three runtimes — cloud GPU, Apple
Silicon, and CPU.

### Expression 2 — faster creation, same quality bar (2026-07-22)

Expression 2 agent creation now runs the **adaptive-ladder recipe by default**:
it starts from a short, efficient training schedule and climbs to more training
only when an identity needs it to pass the **same** quality checks. In head-to-head
testing this reaches essentially the same quality as the previous full-length
recipe at roughly **40% of the training time and cost**. Creation now takes
**about 1 to 1.5 hours** (a recent cold-start run measured ~1h40m; runs trend
faster as the shared training pool stays warm). No API, pricing, or serving
changes — new creations get the faster path automatically.

### Run Expression 2 locally from the CLI (2026-07-16)

The [bitHuman CLI](/sdk/cli/overview) now renders `expression-2` avatars on your
own hardware. `bithuman run` with no arguments is a zero-config quickstart: it
fetches the free **Wise Pup** avatar and renders it live — on macOS (Apple
Silicon) via CoreML / Apple Neural Engine, and on Linux x86_64 via LiteRT;
Windows is coming. Each avatar is one self-contained
[`.imx` file](/concepts/avatars-imx) and the render engine ships inside the CLI,
so a fresh install runs its first avatar with no extra setup — the CLI downloads
only your platform's slice (about 26 MB on macOS, 63 MB on Linux). See
[Local rendering by platform](/sdk/cli/overview#local-rendering-by-platform).

### Expression 2 — smaller, sharper serving model (2026-07-16)

Expression 2 now serves each identity through a **more compact per-identity
model** — roughly **6× smaller and faster to run** than the previous build —
with **sharper rendering of the mouth and teeth**.
The result is a crisper avatar at a lighter serving cost. The change is live
across the [gallery](https://bithuman.ai/explore?gallery=v2) identities and is
applied to new creations automatically. Serving surfaces, the platform
contract (push audio in, drain video out), the APIs, and pricing are
unchanged — existing agents get the improvement with no action needed.

### Expression 2 — adaptive per-identity training (2026-07-15)

Expression 2 agent creation now runs an **adaptive training recipe**: every
agent must pass the same quality checks as before, and an identity that needs
more work automatically gets more training rather than a lower bar. In
practice creation completes in **about 1 to 1.5 hours** — see
[Expression 2](/concepts/expression-2#how-creation-works) for the updated
expectations. The Expression 2 identities in the
[gallery](https://bithuman.ai/explore?gallery=v2) have been refreshed with
models trained under the new recipe, with the same quality checks enforced.
No action is needed: existing agents, integrations, APIs, and pricing are
unchanged.

### Agent creation is image-only (2026-07-10)

The `video` creation input is removed for **all models** (`essence-1`,
`expression-1`, `essence-2`, `essence-2-max`, `expression-2`):

- **Provide a portrait `image`** (or let the prompt generate one) — bitHuman
  generates the **identity video internally**, always **10 seconds**,
  authored so idle loops seam perfectly (first frame == last frame). User
  footage can't guarantee that loop contract, which is why it's no longer
  accepted.
- Never send `video` to
  [`POST /v1/agent/generate`](/api/agents#generate-an-agent): as enforcement
  rolls out platform-wide, requests carrying it are rejected with
  [`400 VIDEO_INPUT_NOT_SUPPORTED`](/api/errors#agent-operations) **before
  anything is billed** — never silently ignored.
- `video_aspect_ratio` is removed with the video input; `duration` is
  **deprecated** (accepted but ignored — the internally generated identity
  video is always 10 seconds).
- Existing agents are unaffected, and [`POST /v1/files/upload`](/api/files)
  still accepts video files as assets — video just isn't a *creation* input.
- `essence-2-max` comes with the combined `essence-2` creation: its identity
  derives from the same internally generated identity video. See
  [Essence 2 Max](/concepts/essence-2-max#how-creation-works).

### `essence-2-max` — the premium Essence 2 model renamed (2026-07-10)

The Essence 2 branding is now **Essence 2** and **Essence 2 Max**:

- **`essence-2-max` is the new canonical name of the premium model**
  (previously `essence-2-quality`) — the highest-fidelity Essence 2
  renderer, served directly on dedicated cloud GPUs. The API accepts
  `essence-2-max` everywhere a model is requested (`POST /v1/agent/generate`,
  [`POST /v1/video/generate`](/api/video), the embed-token `model` field, and
  `?model=` session pins); during the migration `essence-2-quality` was
  accepted as a deprecated alias, so nothing broke. *(Update 2026-07-29: the
  `essence-2-quality` alias has been fully retired — generation endpoints now
  return a `400` naming the current models, and server responses report
  `essence-2-max`. Saved `?model=essence-2-quality` viewer links still render
  by falling back to the agent's stored model. Send `essence-2-max`.)* See
  [Naming & migration](/concepts/models-v2#naming--migration) and
  [Essence 2 Max](/concepts/essence-2-max).
- **`essence-2` is the standard tier name** — the light-name retirement
  completed (the former `essence-2-light` was consolidated into `essence-2`
  on 2026-07-05): the standard photoreal model, optimized to run everywhere
  (GPU / Apple Silicon / CPU / WebGPU-WASM), and the default. See
  [Essence 2](/concepts/essence-2).
- **Rates unchanged.** `essence-2` stays 4 credits/min cloud and
  `essence-2-max` 8 credits/min cloud, each 0.5× when self-hosted; creation
  stays 500 credits (the combined `essence-2` creation still covers both
  models). [`GET /v1/pricing`](/api/billing#get-the-pricing-schedule) now
  advertises `essence-2-max` — the canonical name — in both
  `agent_generation.by_model` and `talking_video.rates`; the deprecated
  alias is no longer advertised.
- **Docs moved.** The model guides now live at
  [/concepts/essence-2](/concepts/essence-2) and
  [/concepts/essence-2-max](/concepts/essence-2-max); the old URLs
  (`/concepts/essence-2-light`, `/concepts/essence-2-quality`) redirect.

### Expression 2 creation price: 2000 credits (2026-07-10)

Creation pricing is now **per engine**:

- **`expression-2` creation (and model-add) costs 2000 credits** — up from
  500. Expression 2 is the fully generative engine; each per-identity train
  runs substantially more GPU time than an Essence 2 train, and the price now
  reflects that cost.
- **The Essence 2 family stays at 500 credits** (`essence-2` combined creation
  — one charge, both tiers — and `essence-2-quality`); v1 stays at 250.
- **`auto` bills the routed model's rate** — 500 when your subject routes to
  `essence-2` (photorealistic person), 2000 when it routes to `expression-2`
  (cartoon / animal / stylized character). The dashboard shows the range
  before you generate; [`GET /v1/pricing`](/api/billing#get-the-pricing-schedule)
  advertises `auto` at the 2000 ceiling so callers never see a number lower
  than the possible charge.

### Essence 2 & Expression 2 — launch rollout begins; model pages refreshed (2026-07-10)

The second-generation models reach their announced launch date and the
rollout is underway. **Creation access opens progressively** (a v2 creation
ahead of your account's access returns
[`503 MODEL_NOT_YET_AVAILABLE`](/api/errors#model-errors) and bills nothing;
the dashboard's v2 creation entries ship separately from the API). Alongside the
rollout, the model documentation gained the shipping characteristics:

- **[`essence-2`](/concepts/essence-2)** — photorealistic people;
  animates real identity footage at its native resolution (full-HD 1080p
  identity video by default) at ~25 fps; serves GPU → Apple Silicon →
  CPU (*corrected 2026-09-02: this entry originally said "fully on-device on
  Apple Silicon"; no on-device Essence 2 build has been published — the Apple
  tier is bitHuman's own hardware*), and a **browser-local tier is rolling out**
  (`?render=local`, WebGPU with WASM fallback) as per-identity web bundles
  publish.
- **[`expression-2`](/concepts/expression-2)** — stylized and universal
  characters; **fully generative across the whole 416×720 scene** at 20 fps
  from a single photo (no face detection or cropping anywhere in the
  pipeline), which is why any character morphology animates naturally;
  serves GPU → Apple Silicon → CPU; its on-device Apple engine shipped later,
  in [Swift SDK 2.5.0](/sdk/swift#expression-2-on-device) — engine only, with no
  model bundle published.
- The family overview's [device matrix](/concepts/models-v2#where-each-model-runs)
  and [creation guide](/concepts/models-v2#how-creation-works) were refreshed
  to match.

### Plan concurrency, offline licensing preview, and one pricing page (2026-07-10)

Rounding out the launch — plan allowances and a documentation overhaul:

- **Concurrent avatar sessions are now a plan allowance** — Creator 3,
  Pro 10, Business 50, Enterprise 200, Custom unlimited. Enforcement is
  rolling out: once active, a session start beyond the allowance returns
  [`403 CONCURRENCY_LIMIT_REACHED`](/api/errors#session--infrastructure),
  and live sessions are never cut off mid-stream by the limit. See
  [Session concurrency](/api/rate-limits#session-concurrency).
- **Offline licensing is coming soon** — run avatars fully self-hosted with
  per-device, per-model signed credit bundles minted through your online
  account: Business $999/year prepacks 120,000 credits (Essence 2 +
  Expression 2); Enterprise $1,999/year prepacks 240,000 credits (adds
  Essence 2 Max). Self-hosted minutes meter at half the cloud rate. Preview
  at [Pricing → Offline licensing](/guides/pricing#offline-licensing--coming-soon).
- **[Pricing](/guides/pricing) is now the single home of every number** —
  per-model serving rates (cloud and self-hosted), creation credits,
  talking-video rates, and the plan table live there; other pages link to it
  instead of repeating figures.
- **Naming and migration history has one home** — every alias, retired name,
  and response-name lag is consolidated at
  [Models → Naming & migration](/concepts/models-v2#naming--migration).
- **Every API operation ships a runnable example** — all 33 operations in
  the [interactive API reference](/api/reference) now carry copy-paste curl
  samples with realistic bodies and next-step hints.
- **Android documentation restored** — the [Kotlin / Android SDK](/sdk/android)
  page and the [Android hello example](/examples/kotlin-android-hello) are
  reachable again, and the voice reference URLs consolidated at
  [Text to speech](/api/text-to-speech).

### Multi-agent avatar rooms — audio binds to the launching agent (2026-07-09)

The cloud avatar now pins its audio to the agent that starts the
`AvatarSession` (via the LiveKit `lk.publish_on_behalf` attribute), fixing
wrong-agent audio binding in rooms with more than one agent participant. The
avatar previously bound to the *first* agent it saw, so with a facilitator +
persona in the same room it could latch onto the wrong agent — staying silent
for the persona and never returning `playback_started`/`playback_finished`.
Server-side fix; no SDK or plugin upgrade required. See
[LiveKit → Multiple agents](/sdk/livekit#multiple-agents-in-one-room).

### `essence-2-light` consolidated into `essence-2`; force-tier slugs (2026-07-05)

The Essence 2 request surface is now just **`essence-2`** (plus the explicit
`essence-2-quality` reference tier):

- **The `essence-2-light` name is retired.** Create and render with
  `model: "essence-2"` — the light tier is what it serves. Requests naming
  `essence-2-light` (or the old `essence-2-light-ane` slug) get a targeted
  `400` pointing at `essence-2`. Existing agents and saved links keep working
  (retired values route to the `essence-2` chain), and `essence-2-light`
  remains the internal **family** name you'll still see in
  `supported_models`, `409` messages, and
  [model downloads](/api/agents#download-an-agents-model).
- **Serving chains + force tiers.** By default `essence-2` and
  `expression-2` sessions route down a serving chain
  (GPU → Apple Silicon → CPU) with automatic overflow. New
  **force-tier slugs** — `essence-2-gpu` / `essence-2-ane` / `essence-2-cpu`
  and `expression-2-gpu` / `expression-2-cpu` / `expression-2-ane` — pin one
  tier for benchmarking/placement testing and never overflow. See
  [tier pinning](/concepts/models-v2#advanced-pin-a-serving-tier).
- **Talking videos:** [`POST /v1/video/generate`](/api/video) accepts
  `essence-2` (4 credits/min) in place of the retired name;
  `essence-2-quality` (8) and `expression-2` (4) unchanged.
- **Where each model runs:** the family overview gains a
  [device/runtime matrix](/concepts/models-v2#where-each-model-runs) (cloud
  tiers, self-hosted, on-device Apple Silicon, browser-local status).

### Android / Kotlin SDK docs restored (2026-07-04)

The [Android SDK](/sdk/android) page and the [Kotlin hello-avatar example](/examples/kotlin-android-hello) are back. The on-device Essence runtime for Android — `ai.bithuman:sdk:2.3.6`, a self-contained arm64-v8a AAR on Maven Central — is unchanged and installable; only its documentation had been removed. It's pinned at `2.3.6` (Essence, Engine ABI v7, Beta) and renders Essence `.imx` models fully on-device.

### Pick-for-me creation, combined Essence 2, model adds & downloads (2026-07-02)

*Named as of today: these two tiers were called **Essence 2 Light** and
**Essence 2 Quality** when this shipped; they are **`essence-2`** and
**`essence-2-max`** now — both retired names and the migration are documented
under [Naming & migration](/concepts/models-v2#naming--migration).*

The model-release UX wave — one creation surface across all five model families, plus post-creation adds and artifact downloads:

- **`model: "auto"` — let the platform pick.** [`POST /v1/agent/generate`](/api/agents#auto--let-the-platform-pick-the-model) now accepts `auto`: an LLM classifies your input (the image if provided, else the prompt) and routes it — a **photorealistic person** → `essence-2`, a **cartoon / animal / exotic creature** → `expression-2`. It's the default selection in the dashboard's create flow; API callers send it explicitly (an omitted `model` keeps the historical `essence-1` default). Charges the routed model's 500-credit rate.
- **`model: "essence-2"` — one creation, both Essence 2 tiers.** A single 500-credit charge trains [Essence 2](/concepts/essence-2) **and** makes [Essence 2 Max](/concepts/essence-2-max) available from the same identity video — [pick the tier at launch](/api/agents#essence-2--the-combined-creation) (`?model=` or the embed-token `model` field).
- **The Essence 2 subject gate.** Explicit `essence-2*` creations require a **photorealistic human subject** — anything else is rejected with a clean [`422 MODEL_SUBJECT_MISMATCH`](/api/errors#model-errors) *before billing* and before any agent row is created (`auto` routes instead of rejecting). See [the subject gate](/api/agents#the-essence-2-subject-gate-422).
- **Per-model creation pricing.** Creation is billed per model — 500 credits for the second generation (`essence-2`, `essence-2-quality`, `essence-2-light`, `expression-2`, `auto`), 250 for v1 (`essence-1`, `expression-1`). [`GET /v1/pricing`](/api/billing#get-the-pricing-schedule) now returns the per-model map (`agent_generation.by_model`) — the old flat field is gone.
- **`POST /v1/agent/{code}/models` — add a model to an existing agent.** No re-creation: [add](/api/agents#add-a-model-to-an-existing-agent) `essence-1` (250), `essence-2` (combined, 500), `expression-2` (500), or `expression-1` (**free, instant** — the shared v1 engine drives the agent's existing image + voice, nothing trained). Async adds poll via `supported_models`; failures auto-refund; re-POSTing never double-charges.
- **`GET /v1/agent/{code}/model/download` — download your generated model.** A 302 to the artifact (`?redirect=false` for JSON): `essence-1` → `.imx`, `essence-2-light` → `.lebundle.imx` (licensed weights), `essence-2-quality` → `.pkl`, `expression-2` → `.avatar` (the Mac-runnable CoreML build). Per-family [error matrix](/api/agents#download-an-agents-model) including the poll-able `404 MODEL_ARTIFACT_NOT_READY`.
- **The CLI recognizes every model family.** [`bithuman run` / `info` / `pull`](/sdk/cli/commands) now sniff any bitHuman artifact and answer honestly: `essence-1` `.imx` runs locally as always; `.lebundle.imx` / `.pkl` / `.avatar` are recognized with a clear handoff to where they run ([launch matrix](/sdk/cli/commands#which-model-files-run-locally)). New: **`bithuman pull <AGENT_CODE>`** downloads your own agent's model through the endpoint above.
- **Essence 2 Max is now gated on the source video.** Its identity prepares on demand **from the agent's source footage** — an image-only agent can never render Max, so it's no longer advertised in `supported_models` without a video, and requesting it returns `409 MODEL_NOT_GENERATED` with the real blocker named (`… requires a source video, which this agent doesn't have`). This corrects the earlier "never gated" behavior/wording (see the 2026-07-02 gate note below).

### Official model guides + natural idle for the second generation (2026-07-02)

*Named as of today: these two tiers were called **Essence 2 Light** and
**Essence 2 Quality** when this shipped; they are **`essence-2`** and
**`essence-2-max`** now — both retired names and the migration are documented
under [Naming & migration](/concepts/models-v2#naming--migration).*

- **Per-model official documentation.** Each second-generation model now has a full product guide — what it is, how creation works (inputs, pipeline steps, realistic durations), serving tiers and `?model=` pinning, idle behavior, pricing, and limits: [Expression 2](/concepts/expression-2), [Essence 2 Max](/concepts/essence-2-max), [Essence 2](/concepts/essence-2) — plus a new [session behavior & troubleshooting](/guides/session-troubleshooting) guide covering connect latency (warm first line vs scale-from-zero overflow), idle vs speaking behavior, and the common errors.
- **Expression 2: real-footage idle on every creation.** During silences the avatar now plays a looping clip derived from the identity itself — cropped from your source footage when available, or captured from the trained model's rest pose for photo-only creations — instead of generated idle frames. Baked in automatically at creation; existing agents' idle clips were regenerated.
- **Forward-only looping.** Idle and base-video loops now always play forward, wrapping from the last frame back to the first — footage never plays in reverse. Applies to `expression-2` (all tiers, including on-device) and `essence-2-light` (idle and speech, all tiers).
- **`supported_models` + early model gate.** Agent responses ([status](/api/agents#poll-status), get, list, and the [embed-token](/api/embedding) response) now include `supported_models` — the canonical model families the agent can be launched as right now. [`POST /v1/embed-tokens/request`](/api/embedding#production-mint-a-token) accepts an optional `model` field, validated up front; requesting `expression-2` / `essence-2-light` before the agent's trained model exists returns a clean `409 MODEL_NOT_GENERATED` ("agent `<code>`'s `<model>` model hasn't been generated yet") — on [talking video](/api/video), **before any charge**. *(Update, later on 2026-07-02: `essence-2-quality` — originally never gated here — is now gated on the agent's **source video**, the footage its identity prepares from; see the model-release entry above.)* A live `?model=` override to an ungenerated model now ends the session cleanly with `avatar_error: "model_not_generated"` instead of hanging.

### Announced — Essence 2 & Expression 2 (launching July 10, 2026)

bitHuman's two second-generation avatar models — **`essence-2`** and **`expression-2`** — are announced and **launch July 10, 2026** on every surface (the REST API, the embed widget, the dashboard, and the SDKs). Until then, `essence-1` and `expression-1` are available today. See [Essence 2 & Expression 2](/concepts/models-v2) for the full guide.

- **`expression-2`** — the second-generation expression engine. Audio-driven, real-time avatar video from a **single photo**: agent creation trains a small per-identity model, then the engine synthesizes fully generated motion live. *(Update 2026-07-02: per-model creation-time expectations are now documented — roughly 45 minutes for `expression-2`; see the [per-model guides](/concepts/models-v2).)* Serves on three tiers — **gpu**, **cpu**, and **ane** (the Apple tier — the slug is historical; [it runs on the Mac GPU, not the Neural Engine](/concepts/essence-2#which-apple-compute-unit-runs-essence-2)). 4 credits/min cloud · 2 credits/min self-hosted.
- **`essence-2-quality`** — the **highest-fidelity** tier of the Essence family: a heavy GPU renderer for close-up, hero-quality output on cloud GPUs. 8 credits/min cloud · 4 credits/min self-hosted.
- **`essence-2-light`** — the **cost-effective** tier: an efficient renderer that runs across **gpu**, **cpu**, and **ane** — including fully **on-device**, where audio and video never leave your hardware. 4 credits/min cloud · 2 credits/min self-hosted.

All three are **train-on-create** via [`POST /v1/agent/generate`](/api/agents) (500 credits, one-time) and serve through the existing session flows unchanged. The v1 models (`essence-1`, `expression-1`) remain fully supported at 250 credits creation.

## June 2026

### Talking video generation — new API (2026-06-29)

- **New endpoints: `POST /v1/video/generate` + `GET /v1/video/{job_id}`.** Render a finished **talking-video mp4** of one of your agents from **text** or **audio**. With text input, the agent's own voice speaks your script; with audio input, your hosted `audio_url` drives the render directly. The API is asynchronous — submit a job, then poll for the public mp4 URL, output duration, and credits charged. Launch engines: **`expression-2`** (4 credits/min) and **`essence-2-quality`** (8 credits/min), billed per minute of output **rounded up**; a failed render is automatically refunded. Limits: 120 seconds of output, 5000 characters of text. See [Talking video generation](/concepts/talking-video) and the [Video API reference](/api/video).

### Agent generation — v2 model names accepted (2026-06-29)

- **`POST /v1/agent/generate` now accepts the v2 model names.** The `model` parameter takes **`essence-2-quality`**, **`expression-2`**, and **`essence-2-light`** as supported generation targets (alongside `essence-1` / `expression-1`). The v2 models launch **July 10, 2026** (upcoming). *Update 2026-06-30:* the legacy aliases (`elevate`, `embody`, `embody-gpu`, `essence-2-mobile`) were retired ahead of GA — requests using them now return a `400 VALIDATION_ERROR` naming the current model list. Share links are unaffected.

### Model naming — versioned public taxonomy (2026-06-26)

- **The avatar model families now have versioned public names.** The `model` parameter on agent generation (and the viewer's `?model=` selector) accepts the consolidated names **`essence-1`**, **`essence-2-quality`**, **`essence-2-light`**, **`expression-1`**, and **`expression-2`**. **Essence 2** ships in two tiers — **Quality** (`essence-2-quality`, the high-fidelity cloud GPU renderer) and **Light** (`essence-2-light`, the efficient run-everywhere renderer). The older values **`essence`** and **`expression`** map to **`essence-1`** / **`expression-1`**; the pre-release codename values (`elevate`, `embody`, `essence-2-mobile`) were transitional aliases and have since been retired (*see the 2026-06-30 note above* — they now return a validation error naming the current model list). Share links are unaffected. Documentation, dashboards, and app labels now use the new family names.

### Python SDK `bithuman` 2.3.10 (2026-06-23) — self-hosted streaming lag fix

- **Streaming no longer degrades over a long turn.** Self-hosted streaming now holds a steady frame rate for the full length of a turn (long utterances used to slow down as they grew), with byte-identical output. The audio stream also resets at the start of each turn so idle frames can't shift lip-sync.

### Python SDK `bithuman` 2.3.9 (2026-06-23) — barge-in / interrupt fix

- **Interrupt (barge-in) no longer wedges the runtime.** Interrupting the avatar mid-utterance previously froze it after the first barge-in (the interrupt path shared the terminal stop signal). 2.3.9 routes interrupts through a separate event, drains in-flight frames, and resumes on a fresh runtime — so a user can talk over the avatar repeatedly without it getting stuck.
- **Recommended LiveKit stack:** `bithuman` 2.3.9+ with `livekit-plugins-bithuman` 1.6.3 and `livekit-agents` 1.6.x (plus `pillow`).

### Python SDK `bithuman` 2.3.8 (2026-06-16)

- Maintenance release on the 2.3 line (2.3.5–2.3.7 were not published).

### Python SDK `bithuman` 2.3.4 (2026-06-12) — Linux CA auto-discovery

- **Linux CA auto-discovery.** The SDK now finds your distro's CA bundle automatically on Linux — self-hosted auth (`AsyncBithuman.create()`) works **zero-config** on Debian, Ubuntu, SUSE, and Alpine-glibc layouts. The `/etc/pki/tls/certs/ca-bundle.crt` symlink workaround needed on ≤ 2.3.3 is obsolete. Thanks to the customer report that pinned down the Debian/Ubuntu `Problem with the SSL CA cert` failure.
- **Env-var override preserved.** `CURL_CA_BUNDLE` / `SSL_CERT_FILE` take precedence over auto-discovery when set — a stale or wrong value will still break auth, so unset them unless they point at a valid bundle.
- **macOS wheel tags.** The 2.3.4 macOS wheels are tagged for **macOS 26+ (arm64)**. On older macOS, pip reports `No matching distribution found` — see the [Python SDK page](/sdk/python) for options.

## May 2026

### 2.3.0 (2026-05-28) — layered architecture + PyPI wheel split

- **PyPI wheel split.** `pip install bithuman` is now the Python SDK **library only** (~5 MB) — `from bithuman import AsyncBithuman` still works. The bitHuman CLI moved to the sibling [`bithuman-cli`](https://pypi.org/project/bithuman-cli/2.3.0/) wheel; install via `pip install bithuman-cli`, `brew install bithuman-product/bithuman/bithuman-cli` (the old `bithuman` formula keeps working as a deprecated alias), or the universal `curl -sSL https://raw.githubusercontent.com/bithuman-product/homebrew-bithuman/main/install.sh | sh` installer — all three deliver the same Rust binary that prints `libessence 1.19.1 ABI 7 / bithuman 2.3.0` on `bithuman --version`.
- **CLI surface trimmed.** The binary now exposes exactly six runtime subcommands: `run`, `render`, `info`, `pull`, `list`, `doctor` (plus `init` for scaffolding a new project — seven in total). Legacy 1.x verbs (`voice`, `text`, `avatar`, `stream`, `speak`, `action`, `generate`, `asr`, `tts`, `models pull|list`, `cleanup`) were removed during the 2.x line and stay removed.
- **Wheel matrix.** The Python library [`bithuman`](https://pypi.org/project/bithuman/) ships on PyPI for **macOS arm64** *and* **Linux x86_64 + aarch64** (manylinux). The CLI wheel [`bithuman-cli`](https://pypi.org/project/bithuman-cli/) is **macOS Apple Silicon only** on PyPI — on Linux, install the CLI via the universal `install.sh` / tarball, not pip. Python 3.10–3.14. *(Latest patches, as of 2026-09-03: `bithuman` 2.10.0; `bithuman-cli` 2.3.25 on PyPI, `cli-v2.5.1` via Homebrew / the universal installer — macOS arm64 and Linux x86_64 on the same version.)*
- **Repo layout.** Public source lives in two repos: [`bithuman-sdk-public`](https://github.com/bithuman-archive/bithuman-sdk-public) (since archived; examples now live in `homebrew-bithuman/Examples`) — docs source, runnable examples, and landing pages — and [`homebrew-bithuman`](https://github.com/bithuman-product/homebrew-bithuman) — the Homebrew tap, universal `install.sh`, and tarball release mirror. The engine and language SDKs ship as prebuilt, statically linked artifacts on PyPI and SwiftPM.
- **`BITHUMAN_BRAIN_*` → `BITHUMAN_AGENT_*` env-var rename** (carried through from Wave 5 of the 2.x line): `BITHUMAN_AGENT_PORT`, `BITHUMAN_AGENT_PYTHON`, `BITHUMAN_AGENT_SCRIPT`. The old `BITHUMAN_BRAIN_*` names are still read with a deprecation warning.
- **No external API breaks.** Python (`from bithuman import AsyncBithuman`) and Swift (`import Bithuman`) public APIs are unchanged from 2.2.x. Migration for existing `pip install bithuman && bithuman run` users is install-time only: `pip install bithuman-cli` (or `brew install bithuman-product/bithuman/bithuman-cli`) to keep the `bithuman` console-script.
- **Engine ABI** bumps to `v7` (libessence 1.19.1) — adds `be_runtime_tick_compose_from_mel` (compose a tick directly from a mel feed). Additive on top of v6; old SDK builds keep working. (`be_set_default_audio_encoder` is an additive, ABI-unchanged entry point and did not bump the ABI.)
- **LiveKit integration.** The upstream pin-relaxation PR ([livekit/agents#5882](https://github.com/livekit/agents/pull/5882)) has since merged — `livekit-plugins-bithuman` (1.6.3) now pins `bithuman<3,>=0.5.25`, so `pip install bithuman livekit-plugins-bithuman` resolves cleanly.
- **Removed surfaces.** The `bithuman.utils` and `bithuman.audio` Python modules are gone from the slim 2.3.0 wheel (helpers are inlined into the examples). **Elevate** was removed from the **cloud** model family but is **retained as the on-device engine** (vendored `libelevate`, used by AvatarUIKit and the `expression/iphone` sample app) — it was not deleted from the platform.

### Python SDK `bithuman` 2.2.2 (2026-05-25) — Linux CLI tarballs restored

- CI-only cleanup release; no API / runtime changes. Same Python wheel content as 2.2.1.
- Linux CLI tarballs (`bithuman-x86_64-unknown-linux-gnu.tar.gz` and `bithuman-aarch64-unknown-linux-gnu.tar.gz`) ship on the GitHub Release again — they had been missing since 2.0.1 because of two container-build blockers, both now fixed in `main`.
- Pin `bithuman==2.2.2` if you want `pip install` AND the standalone Linux CLI binary from the same tag; `==2.2.1` is fine for wheel-only consumers.

### Python SDK `bithuman` 2.2.1 (2026-05-25) — `bithuman-cli[local]` extra

> **Note** 2.2.0 was skipped; 2.2.1 is the first published build of this release, with identical source content. Install 2.2.1.

- New `pip install 'bithuman-cli[local]'` extra adds a **fully on-device conversation brain** to `bithuman run`. Flip it on with `BITHUMAN_LOCAL=1`; no API key required, no outbound network.
- Stack: `whisper.cpp` (STT) + `llama.cpp` (LLM, default Qwen 2.5 0.5B-Instruct Q4_K_M) + Supertonic 3 (TTS, 31 languages, voice M1 default) + Silero VAD. All in-process — no Ollama or other server.
- All three backends have first-party iOS C++ cores, so the same `.gguf` / `.bin` / `.onnx` model files are reusable when porting to mobile.
- New plugins live in `livekit.plugins.bithuman.{WhisperSTT, LlamaCppLLM, SupertonicTTS}` alongside `AvatarSession`. The avatar-only install path is unchanged (heavy deps are lazy-imported).
- Tuning via env vars: `BITHUMAN_LOCAL_WHISPER`, `BITHUMAN_LOCAL_LLM`, `BITHUMAN_LOCAL_LLM_FILE`, `BITHUMAN_LOCAL_VOICE`, `BITHUMAN_LOCAL_LANG`, `BITHUMAN_INSTRUCTIONS`. See [Python SDK](/sdk/python).
- Footprint: ~860 MB on disk (auto-downloaded from HuggingFace on first run), ~1.5 GB RAM, ~717 ms warm load, ~1.4 s warm end-to-end on Apple Silicon.
- Cloud path (`BITHUMAN_LOCAL` unset, `OPENAI_API_KEY` set) is byte-for-byte unchanged.

### Python SDK `bithuman` 2.1.0 (2026-05-24) — figure → avatar

- Retired legacy "figure" terminology. CLI flag `--figures-root` is now `--avatars-root` (old name kept as a deprecated alias). Default cache moved from `~/.cache/bithuman/figures` to `~/.cache/bithuman/avatars`.
- No runtime behavior change; alignment with the public-facing "avatar" product term.

### Python SDK `bithuman` 2.0.2 (2026-05-24) — graceful drain

- `bithuman run` now cancels active sessions and waits up to 2 s for libessence/HDF5 teardown before the process unwinds. Eliminates the `H5F.c: decrementing file ID failed` + exit 134 SIGABRT on Ctrl-C / LaunchDaemon stop. Required for production-style supervisors.

### Python SDK `bithuman` 2.0.1 (2026-05-24)

- `AsyncBithuman.cleanup` is now `async` — `await b.cleanup()` works (was raising `TypeError` and segfaulting at interpreter shutdown).
- CLI error message polish: `bithuman pull <bad-slug>` and `bithuman render` no longer reference renamed subcommands.
- `essence-render --help` shows the correct prog name (was `bithuman`).

### Python SDK `bithuman` 2.0.0 (2026-05-22) — bundled-CLI release

- `pip install bithuman` now ships a `bithuman` console-script that runs the full talk-to-your-avatar stack (Rust CLI + embedded livekit-server + the agent brain (STT/LLM/TTS) + browser UI). One install, one command, one URL — same Rust binary as the Homebrew CLI.
- The runtime library API (`import bithuman`, `AsyncBithuman`, `from bithuman import Avatar`) is unchanged — existing library consumers keep working.
- The legacy 1.x Python CLI is preserved as the `essence-render` console-script.
- Wheels: macOS arm64, Linux x86_64, Linux aarch64. Python 3.10+.
- Quickstart: `pip install bithuman && bithuman run` — see the [quickstart](/api/quickstart) for the full flow.

### v1.18.5 (2026-05-18)

- Unified `bithuman`: one `pip install bithuman` = full prior `1.11.3` API + native engine, 100% backward-compatible (`==1.11.3` code runs unchanged).
- Native engine: far faster cold load + lower memory than pure-Python, exact output parity. Loads fresh console `.imx` TAR exports natively.
- Python 3.9–3.14 (Linux x86_64/ARM64, macOS Apple Silicon). Pin `>=1.18.5` (1.18.0–1.18.4 predate the unification; Windows / macOS-Intel stay on `==1.11.3`).

### v1.17.x (2026-05-14)

- `bithuman avatar --openai` — workstation Realtime, browser-rendered avatar.
- `voice` / `text` auto-pick cloud vs `--local`; explicit flags override.
- Interactive TUI for `voice` (mic/bot meters + transcript); `BITHUMAN_NO_TUI=1` opts out.
- Flutter plugin renamed `bithuman_avatar` → `bithuman` (one Dart codebase, mac/iOS).
- Canonical OpenAI Realtime path is now the Rust CLI's `--openai` mode.

### v1.16.0 (2026-05-14)

- Streaming API on Swift (`pushAudio`/`frames()`/`resetStream()`). Flat per-tick cost on long sessions.
- Default Realtime model: `gpt-realtime-mini`.

### v1.12.0 (2026-05-12)

- First unified release: Python, Swift, CLI from one source, identical output.
- Linux + Windows Python wheels (no WSL).

## April 2026

- **Chat Widget v5** — text/voice/video in one floating widget; themes, FAB styles, JS API (`open`/`close`/`setTheme`/`destroy`).
- **FAQ KB** — search always runs; removed dedup that dropped valid results.
- **Voice** — Siri-style animation; multilingual TTS (+11 languages including Thai, Chinese, and Arabic).
- **Streaming** — instant text to UI without waiting for audio sync.

## March 2026

- **Platform UI** — sidebar (Explore / Library / Billing / Developer); Explore replaces Community, Library replaces My Agents; credit balance in top nav.
- **Docs** — screenshots + navigation refreshed for the new UI.

## February 2026

- **Expression Avatar v2** — 24% faster pipeline; no concurrent-session artifacts.
- **Self-hosted GPU container** — up to 8 sessions/GPU; ~50 s cold / 4–6 s warm; ~5 GB weights auto-cached.
- **Examples overhaul** — fixed Compose `env_file`; standardized `.env.example`; added `AGENTS.md`, `llms.txt`, OpenAPI spec.
- **REST API** — `/v1/agent/{code}/speak`, `/v1/agent/{code}/add-context`; consistent error codes.
- **SDK** — `livekit-plugins-bithuman` Expression support; `bithuman.AvatarSession` unified cloud/CPU/GPU; animal mode for Essence.

## January 2026

- **Essence Avatar** — CPU-only `.imx` rendering, 25 FPS, Linux / macOS / Windows.
- **Platform API** — agent generation, CRUD, file upload, dynamics/gestures.
- **Integrations** — LiveKit cloud plugin, iframe embed (JWT), webhooks, Flutter example.

> **Note** Feature requests and bugs: [GitHub](https://github.com/bithuman-product/homebrew-bithuman/issues) and [Discord](https://discord.gg/ES953n7bPA). See the full [community guide](/community).
