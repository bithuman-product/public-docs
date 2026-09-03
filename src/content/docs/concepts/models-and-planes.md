---
title: "Models and planes"
description: "The model x plane matrix: which of the five bitHuman models runs on which hardware lane, what GPU-only means, and what each model is for — with every command on this page executed and its real output pasted back."
section: concepts
group: "Models"
order: 0
label: "Models and planes"
---

This is the page to read before you pick a model. It answers one question —
**which model runs where** — from the single scope authority that governs it,
and it does not soften the answer anywhere.

Every shell command below was **run exactly as written** on a clean x86_64
Linux host on 2026-09-02, and the output under it is what that run actually
printed, including the exit code. Where something could not be run here — it
needs a Mac, an Android device, or a paid credential — the block says so and is
marked **UNVERIFIED**. Nothing on this page is an idealised transcript.

## The five models

| Model | What it is | What it is for |
|---|---|---|
| **essence-1** | A complete avatar identity packaged in one `.imx` file. Pre-rendered base motion, mouth region patched in real time to match audio. | The workhorse. Runs on any modern CPU, no idle timeout, custom gestures, low memory. Kiosks, edge boxes, phones, high-concurrency LiveKit fleets. |
| **essence-2** | The current photoreal renderer. Borrowed-teeth mouth synthesis against an audio-driven teacher. | The default for new photoreal work. Same reach as essence-1, much higher fidelity. |
| **essence-2-max** | essence-2's quality tier — the highest-fidelity renderer. | Offline/batch video where quality outranks cost and latency. **GPU only.** |
| **expression-1** | First-generation expressive engine: facial animation driven from a portrait image at runtime, no build step. | Existing v1 agents. **GPU only.** |
| **expression-2** | Second-generation generative engine: fully generated motion from one photo, rather than patching a pre-rendered base. | Stylized characters and creatures, and any case where the face is supplied at session time. |

These five are the only product names. `essence-2-max` is a **tier of
essence-2**, not a sixth family. If you have met the words `elevate`, `embody`,
`essence-2-light`, `essence-2-quality`, `lebundle` or `libelevate`, see
[legacy names you will still see](#legacy-names-you-will-still-see) — several of
them are still literals you have to type or read, and this page shows you which.

## The matrix

The scope below is an **owner ruling dated 2026-09-02**, encoded in one file in
the models repository (`tools/model_scope.py`) that every internal guard,
census and readiness sweep resolves through. This table reproduces that file's
cell values; it does not re-derive them.

| Model | GPU offline | GPU live | Cloud, Apple tier | macOS (your Mac) | iOS | Browser | Android | Cloud, CPU tier |
|---|---|---|---|---|---|---|---|---|
| **essence-1** | In scope | In scope | In scope | In scope | In scope | In scope | In scope | Not ruled |
| **essence-2** | In scope | In scope | In scope | In scope | In scope | In scope | In scope | Not ruled |
| **essence-2-max** | In scope | In scope | **Not applicable** | **Not applicable** | **Not applicable** | **Not applicable** | **Not applicable** | **Not applicable** |
| **expression-1** | In scope | In scope | **Not applicable** | **Not applicable** | **Not applicable** | **Not applicable** | **Not applicable** | **Not applicable** |
| **expression-2** | In scope | In scope | In scope | In scope | In scope | In scope | In scope | Not ruled |

Lane keys, in the authority's own order, so you can join this table to anything
internal you are handed: `gpu-offline`, `gpu-live`, `apple-serve`,
`apple-macos`, `apple-ios`, `web`, `android`, `cpu-modal`.

### There are three answers, and they are three different facts

**In scope** — the ruling puts this model on this lane. If the artifact is
missing here, that is a gap, and it is our bug.

**Not applicable** — the ruling puts this model **off** this lane. A missing
artifact here is **correct**. This is not "coming soon", it is not a roadmap
item, and there is no date. `essence-2-max` and `expression-1` are **GPU-only
by design**: their absence from Apple, browser and Android is the intended
shape of the product, and you should architect against a GPU for them rather
than waiting. If you need photoreal quality on a Mac, a phone or in a tab, the
model you want is **essence-2**, not essence-2-max.

**Not ruled** — the ruling enumerated four lane groups (GPU, Apple, web,
Android). bitHuman's managed **CPU serving tier** is not one of them, and it is
also the tier essence-2 and expression-2 are armed on in production today. So
the honest cell is neither "yes" nor "no". It is a serving tier inside the
managed cloud rather than a plane you target, so it does not change what you
build; it is shown because collapsing it into either of the other two answers
would be inventing a ruling nobody made.

The asymmetry between rows is deliberate and worth understanding: "GPU **only**"
is exclusive language, so it puts a model off every lane including one the
ruling never enumerated — that is why `essence-2-max` and `expression-1` read
**Not applicable** in the CPU-tier column while the all-lane models read **Not
ruled**.

## essence-1 is most of the fleet

Two thirds of every agent on the platform is **essence-1**, and it has had the
least written about it. Measured against the agent table on 2026-09-02:

| `agents.model` | Agents | Share |
|---|---|---|
| **essence-1** | 6,288 | 64.5 % |
| *(no model recorded)* | 1,858 | 19.1 % |
| **expression-1** | 1,384 | 14.2 % |
| **essence-2** | 125 | 1.3 % |
| **expression-2** | 96 | 1.0 % |
| **essence-2-max** | 2 | 0.02 % |
| **Total** | **9,753** | |

Read the second row honestly: 1,858 agents carry **no model value at all**, so
any code of yours that switches on `agents.model` must handle a null. It is not
a rounding error — it is the second-largest bucket.

The practical consequence for you: **essence-1 is the model you are most likely
to be handed**, it is fully in scope on every lane, and the entire CLI showcase
is built from it. Every avatar `bithuman list` returns today is an essence-1
identity:

```bash
bithuman list --json | python3 -c "
import json,sys
for m in json.load(sys.stdin)['models']:
    print(f\"{m['slug']:42s} model={m['model']}\")"
```

```text
thrift-coach-bargain-buddy                 model=essence
energetic-audio-story-buddy                model=essence
fairy-tale-grandmother-avatar              model=essence
modern-court-jester                        model=essence
planning-nebula                            model=essence
```

Exit code `0`. Note the value: the manifest spells it **`essence`**, not
`essence-1`. That is a frozen wire spelling — see
[legacy names](#legacy-names-you-will-still-see).

## Identify what you are holding

`bithuman info` reads a model file locally and tells you its family. It needs
**no credential and no network**, so it is the cheapest way to find out which
row of the matrix applies to a file somebody sent you.

### essence-1

```bash
bithuman pull planning-nebula
bithuman info ~/.cache/bithuman/showcase/planning-nebula.imx
```

```text
  Format:         IMX v2
  Engine:         essence1
  Family:         essence-1 (Essence 1)
  Model type:     unknown (not recorded in model)
  Model hash:     65f796ec3e9e51e9fc2dd3f938c115c3
  Created at:     2026-05-07T20:19:08.042200+00:00

  Members (9):
    manifest.json  (1003 bytes)
    audio/feature_centers.npz  (381671 bytes)
    audio_feature.f32  (217104 bytes)
    audio_encoder.onnx  (2840632 bytes)
    audio_encoder.safetensors  (11235712 bytes)
    videos/video_20251122_145930_723899_25fps.mp4  (3541597 bytes)
    lip_sync/video_20251122_145930_723899_25fps.mp4.WAV2LIP_720_b7c1ee00.h5  (409888 bytes)
    lip_sync/video_20251122_145930_723899_25fps_bases.bin  (293938 bytes)
    lip_sync/video_20251122_145930_723899_25fps_patches.bin  (31148816 bytes)

  Videos (1):
    video_20251122_145930_723899_25fps
      Resolution:        1248×704
      Frame count:       201
      Type:              LoopingVideo
      Single direction:  false
      Lip-sync:
        Cluster count:   106
        Source frames:   201
        Crop bbox:       [0, 0, 155, 145]

  Audio:
    Feature centers:    audio/feature_centers.npz
    Num clusters:       106
```

Exit code `0`. One line is elided: the leading `Path:` line, which is this
machine’s absolute path. Every other line above is verbatim.

### essence-2

An essence-2 model arrives as a `.lebundle.imx` file. This is one as the
platform delivers it, renamed on disk so the transcript carries no agent code.

```bash
bithuman info e2.lebundle.imx
```

```text
  Format:         IMX v2
  Engine:         essence2-light
  Family:         essence-2 (Essence 2)
  Model type:     unknown (not recorded in model)
  Model hash:     (none)
  Created at:     (unknown)

  Members (26):
    M.f32  (6024 bytes)
    P_hevc.mov  (2756781 bytes)
    a2x_dec.onnx  (2473874 bytes)
    a2x_enc_stream.onnx  (20755566 bytes)
    a2x_meta.json  (312 bytes)
    a2x_meta.npz  (2486 bytes)
    a2x_norm.f32  (504 bytes)
    a2x_pos.f32  (1228800 bytes)
    drive/si.i32  (4 bytes)
    drive/xd.f32  (252 bytes)
```

Exit code `0`. Two things in that output are legacy names you will meet and
cannot avoid: the **file extension `.lebundle.imx`** and the **`Engine:
essence2-light`** line. The product is **essence-2**; `Family:` is the line that
says so. (Elided: the `Path:` line, and members 11-26 of 26 — the command prints
all of them.)

### expression-2

An expression-2 model is an `.avatar` bundle. This one is a public showcase
identity, downloaded anonymously from bitHuman's showcase storage; the file
name is the agent code.

```bash
bithuman info A23WJF0199.avatar
```

```text
  Format:         IMX v2
  Engine:         expression2
  Family:         expression-2 (Expression 2)
  Model type:     unknown (not recorded in model)
  Model hash:     (none)
  Created at:     (unknown)

  Members (14):
    audiotokenizer_cpuAndNE.mlpackage/Data/com.apple.CoreML/model.mlmodel  (16040 bytes)
    audiotokenizer_cpuAndNE.mlpackage/Data/com.apple.CoreML/weights/weight.bin  (6225728 bytes)
    audiotokenizer_cpuAndNE.mlpackage/Manifest.json  (617 bytes)
    canon.bin  (299520 bytes)
    canon.f32  (299520 bytes)
    combined_litert.tflite  (155119092 bytes)
    dec_p2_cpuAndNE.mlpackage/Data/com.apple.CoreML/model.mlmodel  (29085 bytes)
    dec_p2_cpuAndNE.mlpackage/Data/com.apple.CoreML/weights/weight.bin  (4909504 bytes)
    dec_p2_cpuAndNE.mlpackage/Manifest.json  (617 bytes)
    idle.mp4  (559148 bytes)
    manifest.json  (1951 bytes)
    student_v4_forward_frame_cpuAndNE.mlpackage/Data/com.apple.CoreML/model.mlmodel  (77375 bytes)
    student_v4_forward_frame_cpuAndNE.mlpackage/Data/com.apple.CoreML/weights/weight.bin  (14175392 bytes)
    student_v4_forward_frame_cpuAndNE.mlpackage/Manifest.json  (617 bytes)
```

Exit code `0`. This is the matrix made concrete: **one bundle carries two plane
families** — CoreML `.mlpackage`s for the Apple lane and a
`combined_litert.tflite` for the LiteRT lanes (browser, Android, CPU). The
`_cpuAndNE` in those member names is an internal build label baked in at
conversion time; it is not a statement about which compute unit executes at
runtime, and you should not read one out of it. (Elided, as above: the leading
`Path:` line.)

**Negative control** — the same command on a file that is not a model, so you
can tell a real detection from a silent one:

```bash
echo "not-a-model" > bogus.imx
bithuman info bogus.imx
```

```text
error: not an IMX container: bogus.imx (expected magic 'IMX\0' at offset 0)
```

Exit code `66`. If your bad input returns `0`, you are not running what you
think you are running.

## What a credential changes, and what happens without one

`bithuman info` is free. **`bithuman render` is not** — it needs
`BITHUMAN_API_SECRET` (or `BITHUMAN_API_KEY`), or a browser sign-in via
`bithuman login`. Get one at
[Developer → API keys](https://www.bithuman.ai/developer/api-keys).

This is what a missing credential actually looks like, on the essence-1 model
pulled above:

```bash
bithuman render ~/.cache/bithuman/showcase/planning-nebula.imx -a hello.wav -o out.mp4
```

```text
  Not signed in. Run `bithuman login` (use `--device` over SSH).
  CI/headless: set BITHUMAN_API_SECRET from your dashboard. https://www.bithuman.ai


  bithuman render: auth required (BE_ERR_NO_AUTH): set BITHUMAN_API_SECRET (or BITHUMAN_API_KEY)
  Re-run bithuman login, or check your key at https://www.bithuman.ai
```

Exit code **`77`**. The same `77` comes back for an essence-2 `.lebundle.imx`
and an expression-2 `.avatar`: the auth check runs **before** the engine is
chosen, so an unauthenticated render never reaches the model-family dispatch at
all.

`bithuman doctor` reports the same thing as a checklist and **exits `1`** on a
host with no credential — that is the designed result, not a broken install. It
exits `0` only when it can actually stand up a live avatar. Its full transcript,
and every other CLI exit code, is on
[Verified CLI transcripts](/sdk/cli/verified).

> **UNVERIFIED on this page.** A *successful* `bithuman render` — exit `0` with
> real frames — was **not run here**, because this host has no credential. The
> exit codes above (`77`, `66`, `0`) were observed here; a rendering exit `0`
> was not. It **was** run, with a credential, on
> [Verified CLI transcripts](/sdk/cli/verified), which is where the `0` / `69` /
> `70` results come from.

## The lanes, one at a time

### GPU — every model, both directions

Every one of the five models is in scope on GPU, offline and live. It is the
only lane where `essence-2-max` and `expression-1` exist at all. Start at
[self-hosted GPU](/guides/deploy-self-hosted) or the
[LiveKit plugin](/guides/deploy-livekit).

### Command line — macOS arm64 and Linux x86_64, and only those

```bash
curl -fsSL https://raw.githubusercontent.com/bithuman-product/homebrew-bithuman/main/install.sh | sh
bithuman version --json
```

```text
{"abi":7,"cli":"2.5.1","libessence":"2.3.8","schema_version":1}
```

Exit code `0` for both commands; the installer's own output is not reproduced
here — it is on [Verified CLI transcripts](/sdk/cli/verified#install). The
`cli-v2.5.1` release carries exactly **two** platform
builds — `aarch64-apple-darwin` and `x86_64-unknown-linux-gnu`. There is no
Intel-Mac build, no Windows build and no Linux-aarch64 build, and the installer
on any of those exits `1` rather than installing something that will not run.

Every CLI command, every exit code and the negative controls that go with them
are on **[Verified CLI transcripts](/sdk/cli/verified)** — a page where each
command was executed with a credential present, which this one was not. Two
results from it matter to the matrix and are worth knowing before you plan
around the CLI:

- **`bithuman render` works for expression-2 on Linux** — exit `0`, real
  frames.
- **It exits `69` for essence-2** — the family is recognised, there is no local
  native runtime for it on this host, and **copying a file in does not fix it**;
  it is an ABI mismatch. Render essence-2 through the cloud until a rebuilt
  release lands. See
  [Essence 2 — rc=69](/sdk/cli/verified#essence-2--rc69-and-a-file-copy-does-not-fix-it).


### Android — two artifacts on Maven Central, and one that is not there

As of **2026-09-03** the `ai.bithuman` group on Maven Central publishes **three**
artifacts, all resolvable anonymously:

| Coordinate | Model | `minSdk` | ABI |
|---|---|---|---|
| `ai.bithuman:expression2-android:0.3.0` | **expression-2** | 26 | `arm64-v8a` |
| `ai.bithuman:essence2-android:0.2.0` | **essence-2** | 29 | `arm64-v8a` |
| `ai.bithuman:sdk:2.3.6` | **essence-1** | 29 | `arm64-v8a` |

**All three models the ruling puts on Android now resolve.** essence-2 was
published at 2026-09-03 03:39:15 UTC; this page said the day before that its
coordinate "resolves to nothing", which was true then and is false now. The
*artifact* name `libelevate-android` was never published and never will be —
though the published essence-2 AAR does declare the Kotlin package
`ai.bithuman.elevate`, which cannot be renamed after release.

Positive and negative control, side by side — this is the check to run before
you believe any coordinate on any page, including this one:

```bash
for a in expression2-android sdk essence2-android libelevate-android; do
  printf '%s  %s\n' \
    "$(curl -sS -o /dev/null -w '%{http_code}' https://repo1.maven.org/maven2/ai/bithuman/$a/maven-metadata.xml)" "$a"
done
```

```text
200  expression2-android
200  sdk
200  essence2-android
404  libelevate-android
```

Exit code `0`, re-run 2026-09-03. Three `200`s and one `404`. ★The `404` is the
one that matters: `libelevate-android` is the permanently-absent coordinate that
keeps this check honest. If everything comes back `200` you are behind a proxy
that invents pages; if everything comes back `404` your network is blocking
Maven Central.

Gradle setup, the API of each artifact, the measured on-device frame rates and a
full outside-project build transcript are on the
[Android SDK](/sdk/android) page and
[Verifying the Android SDK](/sdk/android-verify).

> **UNVERIFIED on this page.** No Gradle build and no on-device run happened
> *here* — this host has no Android SDK and no handset. The four-way probe above
> is artifact-level verification over anonymous HTTP, which is what a dependency
> resolution does, but it is not a green build. A real anonymous Gradle
> resolve-and-compile **was** run, and its transcript is on
> [Verifying the Android SDK](/sdk/android-verify).


### Apple — macOS and iOS via Swift Package Manager

```swift
// Package.swift
.package(url: "https://github.com/bithuman-product/homebrew-bithuman", from: "2.5.0")
```

Products: `bitHumanKit`, `Expression2`, `BithumanEngineProtocol`. Platforms:
macOS 13+, iOS 16+. The binary targets are pinned by checksum, and **you can
verify that pin from any operating system**, before you ever open Xcode:

```bash
curl -sSLO https://github.com/bithuman-product/homebrew-bithuman/releases/download/v2.5.0/Expression2.xcframework.zip
sha256sum Expression2.xcframework.zip
curl -sSL https://github.com/bithuman-product/homebrew-bithuman/releases/download/v2.5.0/Expression2.xcframework.zip.sha256
curl -sSL https://raw.githubusercontent.com/bithuman-product/homebrew-bithuman/main/Package.swift | grep -A2 'name: "Expression2"' | grep checksum
```

```text
18c8e71037600a570acaf05c2c8e3e917069705191860ce4dc84a69a56dccab7  Expression2.xcframework.zip
18c8e71037600a570acaf05c2c8e3e917069705191860ce4dc84a69a56dccab7
            checksum: "18c8e71037600a570acaf05c2c8e3e917069705191860ce4dc84a69a56dccab7"
```

Exit code `0`. Three independent sources — the bytes you downloaded, the
release's published digest, and the checksum pinned in `Package.swift` — agree.
That is what SwiftPM checks for you at resolve time; running it yourself tells
you *why* a resolve failed when one does.

**Negative control:**

```bash
curl -sSL -o /dev/null -w 'HTTP=%{http_code}\n' \
  https://github.com/bithuman-product/homebrew-bithuman/releases/download/v9.9.9/Expression2.xcframework.zip
```

```text
HTTP=404
```

Exit code `0` (curl succeeded; the *server* said 404 — this is why you check the
HTTP code and not just curl's exit status).

> **UNVERIFIED on this page.** `swift build`, an Xcode run, and anything on a
> real Mac or iPhone were **not run here** — this is a Linux host. The checksum
> agreement above is real; a working app is not something this page measured.

See the [Swift SDK](/sdk/swift) page for the API.

### Browser

essence-1, essence-2 and expression-2 all render in the browser. It is a
per-session **opt-in** — append `?render=local` to a session URL — and it needs
a published per-identity web bundle, falling back to cloud rendering on its own
when there isn't one. See [browser rendering](/guides/browser-rendering).

```bash
curl -sSL -o /dev/null -w 'HTTP=%{http_code}\n' https://bithuman.ai/embed/A74NWD9723
curl -sSL -o /dev/null -w 'HTTP=%{http_code}\n' https://bithuman.ai/embed/A00ZZZ0000
```

```text
HTTP=200
HTTP=404
```

Exit code `0` for both. A real agent code serves the embed; an invented one is a
404, so a `200` here means the page really exists.

### Python — the portable path

```bash
python3 -m venv venv && ./venv/bin/pip install bithuman
./venv/bin/python -c "import bithuman; print('bithuman', bithuman.__version__)"
```

```text
bithuman 2.10.0
```

Exit code `0`. Wheels published for CPython 3.10-3.13 on macOS arm64,
`manylinux_2_28` x86_64 and `manylinux_2_28` aarch64.

The SDK is explicit about the credential, and it fails loudly rather than
rendering something wrong:

```bash
./venv/bin/python -c "
import asyncio
from bithuman import AsyncBithuman
asyncio.run(AsyncBithuman.create(model_path='planning-nebula.imx'))"
```

```text
bithuman.exceptions.BithumanError: [unknown] AsyncAvatar.create: api_secret is required (or set BITHUMAN_API_SECRET in env). Get a key at https://www.bithuman.ai/#developer
```

Exit code **`1`** (traceback trimmed to its last line). Set
`BITHUMAN_API_SECRET`, or pass `api_secret=`, and it proceeds. See the
[Python SDK](/sdk/python) page.

## Legacy names you will still see

There are two product names — **expression-2** and **essence-2** — plus
**essence-2-max** as essence-2's quality tier, and the first generation,
**essence-1** and **expression-1**. `elevate`, `embody`, `essence-2-light`,
`essence-2-quality`, `lebundle` and `libelevate` are **deprecated as words**.

Deprecating a word does not rename a wire format. Several of these are frozen
forever in file names, API fields and manifest values, and **you will have to
read or type them**. Hiding a name you have to type would be worse than showing
a retired one, so here they are:

| Literal you will meet | Where you meet it | What it means | Do you type it? |
|---|---|---|---|
| `essence` | `model` field in the showcase manifest and in `agents.model` | **essence-1** | Yes — accepted request spelling. |
| `essence2-light` | `Engine:` line from `bithuman info` | **essence-2** | No. Read-only; the `Family:` line is the answer. |
| `essence-2-light` | the `agents.model` value in the database | **essence-2** | No — write `essence-2`. Retired as a product name, frozen as a stored value. |
| `.lebundle.imx` | the file extension of an essence-2 bundle | an essence-2 model file | Yes — it is the filename you are given. |
| `elevate` | SDK request field | **essence-2-max** | Accepted for compatibility; write `essence-2-max` in new code. |
| `embody` | legacy request spelling | **expression-2** | Accepted for compatibility; write `expression-2` in new code. |
| `essence-2-quality` | internal model lists | **essence-2-max** | No — write `essence-2-max`. |
| `libelevate`, `libelevate-android` | old library and artifact names | nothing published | **No.** These were never released; the Android coordinate is `ai.bithuman:expression2-android`. |

The rule: **write the product name; accept the legacy spelling on input; expect
to read it in file names and engine strings forever.**

One more naming point, because it causes real architecture mistakes: the Apple
lane is called **Apple**, not "ANE". It is a plane, not a compute unit, and
naming it after a specific accelerator has repeatedly led people to design
around the wrong thing.

## Which model should I use?

**You need it on a Mac, an iPhone, in a browser, or on Android.** essence-1,
essence-2 or expression-2. `essence-2-max` and `expression-1` are GPU-only and
that is permanent — plan for the cloud, not for a future release.

**You want the best photoreal quality and you are rendering offline.**
essence-2-max, on GPU, via
[talking video generation](/concepts/talking-video).

**You want photoreal, everywhere.** essence-2.

**You need maximum concurrency on cheap hardware, or a 24/7 unattended
display.** essence-1. Low memory, no idle timeout, custom gestures, runs on
1-2 CPU cores.

**You want to supply the face at session time, or the character is stylized or
non-human.** expression-2.

**You are maintaining an existing v1 agent.** expression-1 on GPU, or
essence-1 anywhere. Both remain supported.

## Next steps

- [Essence 2 & Expression 2](/concepts/models-v2) — the second-generation family overview
- [Essence 2](/concepts/essence-2) · [Essence 2 Max](/concepts/essence-2-max) · [Expression 2](/concepts/expression-2)
- [Essence vs Expression](/concepts/models) — the first-generation pair in detail
- [Verified CLI transcripts](/sdk/cli/verified) — every CLI command executed, with its real exit code
- [Verifying the Android SDK](/sdk/android-verify) — an outside project resolving and compiling against both AARs
- [Android SDK](/sdk/android) · [Swift SDK](/sdk/swift) · [Python SDK](/sdk/python) · [CLI](/sdk/cli/overview)
- [Avatars and the `.imx` format](/concepts/avatars-imx) — how a model file is packaged
- [Pricing & credits](/guides/pricing) — what each model costs to run
