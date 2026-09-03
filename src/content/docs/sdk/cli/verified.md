---
title: "Verified transcript — Linux x86_64"
description: "Every command on this page was executed on a real Linux x86_64 box against CLI 2.5.1 and the output pasted back unedited, including the exit codes that are not zero."
section: sdk
group: "Command line"
order: 31.5
label: "Verified transcript"
---

## What this page is

A single uninterrupted session, run on 2026-09-02 against **CLI 2.5.1** on the
host named below. Every block is the command as you would type it and the bytes
it actually printed — including the three exit codes that are **not** zero,
which are the interesting ones.

Copy any block and run it. If your output differs from what is pasted here,
that difference is real and worth chasing; nothing on this page is an
idealised transcript.

Two edits are made to the raw bytes and nowhere else: the home directory is
written `/home/you/`, and the `curl` progress bar in the installer block is
trimmed. Session ids and file paths are otherwise verbatim.

Two conventions, because they are what make the page checkable:

- **`rc=` is the real exit status**, read straight from `$?`. `bithuman`
  distinguishes its failures by code, so the number carries information the
  message does not.
- Where a command can fail quietly, the **negative control** is run beside it —
  the same command with one thing deliberately wrong — so you can tell a
  working setup from a silently-failing one.

### The host

Everything below ran here. Timings are this box's; exit codes are not.

| | |
| --- | --- |
| OS | Ubuntu 26.04 LTS, glibc 2.43 |
| Arch | `x86_64` |
| CPU | AMD Ryzen Threadripper PRO 5955WX (16 cores / 32 threads) |
| CLI | 2.5.1 (`libessence` 2.3.8, ABI 7) |
| `ffmpeg` | 8.0.1 on `PATH` |

> **Not verified here.** macOS (any command), Windows, `bithuman run` standing
> up a live session, and code signing / notarization. This is a headless Linux
> box; those need a Mac, a browser, or both. They are marked UNVERIFIED wherever
> they come up rather than described as tested.

## Install

The universal installer, unpinned, exactly as [Install](/sdk/cli/install)
prints it:

```bash
curl -fsSL https://raw.githubusercontent.com/bithuman-product/homebrew-bithuman/main/install.sh | sh
```

```text
install: querying latest release...
install: version: cli-v2.5.1
install: target:  x86_64-unknown-linux-gnu
install: install dir: /home/you/.local/bin
install: downloading https://github.com/bithuman-product/homebrew-bithuman/releases/download/cli-v2.5.1/bithuman-x86_64-unknown-linux-gnu.tar.gz
install: verifying sha256...
install: sha256 ok
install: extracting...
install: installed expression2-model (local realtime render host)
install: installed engines/ (linux-x64-1.0.0.engine )
install:
install: installed: libessence 2.3.8 ABI 7
install:   -> /home/you/.local/bin/bithuman
install:
install: Run 'bithuman --help' to get started.
rc=0
```

The installer resolves the newest `cli-v*` release itself — pin one with `BITHUMAN_VERSION=cli-v2.5.1`
if you need a fixed version, and redirect the install with
`BITHUMAN_INSTALL_DIR`.

`install: sha256 ok` is a real check: the installer downloads the `.sha256`
sidecar and aborts on a mismatch. If a release has no sidecar it prints
`no sha256 sidecar published; skipping integrity check` instead — worth reading,
because the two lines look similar and mean opposite things.

### Negative control — the two targets that will not install

The installer derives its target from `uname -s` / `uname -m` and asks the
release for `bithuman-<arch>-<os>.tar.gz`. Only two of those tarballs are
published. Running the same script with `uname` reporting a different machine
shows exactly what a developer on that machine sees:

```text
install: version: cli-v2.5.1
install: target:  aarch64-unknown-linux-gnu
install: downloading https://github.com/bithuman-product/homebrew-bithuman/releases/download/cli-v2.5.1/bithuman-aarch64-unknown-linux-gnu.tar.gz
curl: (22) The requested URL returned error: 404
install: error: download failed.
install: error: The tarball for aarch64-unknown-linux-gnu may not be published for cli-v2.5.1.
install: error: See available assets at: https://github.com/bithuman-product/homebrew-bithuman/releases/tag/cli-v2.5.1
rc=1
```

```text
install: version: cli-v2.5.1
install: target:  x86_64-apple-darwin
install: downloading https://github.com/bithuman-product/homebrew-bithuman/releases/download/cli-v2.5.1/bithuman-x86_64-apple-darwin.tar.gz
curl: (22) The requested URL returned error: 404
install: error: download failed.
install: error: The tarball for x86_64-apple-darwin may not be published for cli-v2.5.1.
install: error: See available assets at: https://github.com/bithuman-product/homebrew-bithuman/releases/tag/cli-v2.5.1
rc=1
```

Both exit **1**. The full platform picture, counted from the release assets, is
on [Install](/sdk/cli/install#which-platforms-actually-have-a-binary).

## The part that needs no credential

`--version`, `list`, `pull` of a showcase avatar, and `info` all work signed
out. This whole section was run with `BITHUMAN_API_SECRET` unset.

```bash
bithuman --version
```

```text
libessence 2.3.8 ABI 7
bithuman    2.5.1
rc=0
```

```bash
bithuman list
```

```text
 SLUG                            NAME                            MODEL     SIZE     STATUS
 thrift-coach-bargain-buddy      Thrift Coach & Bargain Buddy    essence   75 MB    —
 energetic-audio-story-buddy     Energetic Audio Story Buddy     essence   94 MB    —
 fairy-tale-grandmother-avatar   Fairy-Tale Grandmother Avatar   essence   111 MB   —
 modern-court-jester             Modern Court Jester             essence   79 MB    ✓ downloaded
 planning-nebula                 Planning Nebula                 essence   48 MB    —
rc=0
```

Every showcase avatar in that catalog is Essence 1. `pull` writes the file and
prints its path on stdout and nothing else, so it composes:

```bash
bithuman pull planning-nebula
```

```text
/home/you/.cache/bithuman/showcase/planning-nebula.imx
rc=0
```

```bash
bithuman info ~/.cache/bithuman/showcase/planning-nebula.imx
```

```text
  Path:           /home/you/.cache/bithuman/showcase/planning-nebula.imx
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
rc=0
```

### Negative controls for the two commands above

Both fail with **66**, not with a stack trace:

```bash
bithuman info speech.wav          # not a model file at all
```

```text
error: not an IMX container: speech.wav (expected magic 'IMX\0' at offset 0)
rc=66
```

```bash
bithuman pull not-a-real-avatar   # slug that is not in the manifest
```

```text
error: slug 'not-a-real-avatar' not found in manifest. Try `bithuman list`.
rc=66
```

## Where the credential starts mattering

Make an input WAV first. This is reproducible with nothing but `ffmpeg` — a
3-second 220 Hz tone, 16 kHz mono PCM, which is what the Essence 1 path wants:

```bash
ffmpeg -hide_banner -loglevel error -y -f lavfi -i "sine=frequency=220:duration=3" \
  -ar 16000 -ac 1 -c:a pcm_s16le speech.wav
```

```text
rc=0
```

Now render **signed out** — the negative control for every render below:

```bash
bithuman render ~/.cache/bithuman/showcase/planning-nebula.imx -a speech.wav -o out.mp4
```

```text
  Not signed in. Run `bithuman login` (use `--device` over SSH).
  CI/headless: set BITHUMAN_API_SECRET from your dashboard. https://www.bithuman.ai

  bithuman render: auth required (BE_ERR_NO_AUTH): set BITHUMAN_API_SECRET (or BITHUMAN_API_KEY)
  Re-run bithuman login, or check your key at https://www.bithuman.ai
rc=77
```

**77 is `BE_ERR_NO_AUTH`** — the CLI's own sign-in gate, checked before any
model is opened. It is not a licensing message about the model you passed, and
it is not the render metering: it is the same gate `pull <AGENT_CODE>` hits.
Interactively, `bithuman login`; in CI, one export:

```bash
export BITHUMAN_API_SECRET=…        # Developer → API Keys on the dashboard
```

The rest of this page ran with that variable set. Nothing else changed.

## `bithuman render`, one family at a time

This is the section worth reading before you plan a pipeline. All three runs
below used the **same** `speech.wav` and the same CLI, so the differences are
the engine, not the input.

| Family | File `pull` gives you | `render` on Linux x86_64, CLI 2.5.1 | rc |
| --- | --- | --- | --- |
| Expression 2 | `<code>.avatar` | **Works** — writes a real MP4 | `0` |
| Essence 2 | `<code>.lebundle.imx` | Fails — no local native runtime on this host | `69` |
| Essence 1 | `<code>.imx` | Fails — the MP4 muxing step | `70` |

### Expression 2 — rc=0, real frames

```bash
bithuman pull A55NVK9945 --model expression-2
```

```text
already cached at /home/you/.cache/bithuman/agents/A55NVK9945/A55NVK9945.avatar (pass --force to re-download)
recognized: IMX v2 container — expression-2: needs the local Apple render engine; cloud-served live
/home/you/.cache/bithuman/agents/A55NVK9945/A55NVK9945.avatar
rc=0
```

```bash
bithuman render ~/.cache/bithuman/agents/A55NVK9945/A55NVK9945.avatar \
  -a speech.wav -o x2.mp4
```

```text
  engine:   expression-2 (/home/you/.local/bin/expression2-model)
  warming up…
[selfhost-meter] metering armed for identity=/home/you/.cache/bithuman/bundles/A55NVK9945.avatar product=expression-2 endpoint=https://api.bithuman.ai/v1/meter/beats session=x2-litert-ae31a6cbf0124577 enforce=OFF (fail-open)
[render-stream-host-litert] warming up identity=/home/you/.cache/bithuman/bundles/A55NVK9945.avatar threads=24 ...
INFO: Created TensorFlow Lite XNNPACK delegate for CPU.
[render-stream-host-litert] ready 416x720 @20fps  model=combined_litert.tflite
  resolved: 416x720 @20fps (warm 1219 ms)
[render-stream-host-litert] stdin closed — exiting
[selfhost-meter] beat seq=1 served=4.2s product=expression-2 delivered (final)
[selfhost-meter] session x2-litert-ae31a6cbf0124577 closed — beats delivered=1 failed=0 frames=85
  done in 3.1s (0.5 MB, 60 frames @20fps)
x2.mp4
rc=0
```

The `[selfhost-meter]` lines are the render reporting usage. `enforce=OFF
(fail-open)` means a metering endpoint that is unreachable does not stop your
render — it is not a statement that the render is free, and it is a different
thing from the `rc=77` gate above, which had already passed here.

Prove the file rather than trusting the summary line:

```bash
ffprobe -hide_banner -loglevel error \
  -show_entries stream=codec_name,width,height,nb_frames \
  -show_entries format=duration -of default=nw=1 x2.mp4
```

```text
codec_name=h264
width=416
height=720
nb_frames=60
codec_name=aac
nb_frames=48
duration=3.000000
rc=0
```

60 frames at 20 fps from 3 seconds of audio, h264 + aac in a 3.000-second
container. A longer run on the same box — 15.4 s of audio — produced 278 frames
in 8.6 s of wall clock, so this box renders Expression 2 offline at roughly
half real time. Your box will differ; the frame count will not.

`--limit N` genuinely caps the output here:

```bash
bithuman render ~/.cache/bithuman/agents/A55NVK9945/A55NVK9945.avatar \
  -a speech.wav -o x2lim.mp4 --limit 10 --json
```

```text
{"bytes":123484,"fps":20,"frames":10,"height":720,"output":"x2lim.mp4","schema_version":1,"seconds":1.279644512,"width":416}
rc=0
```

`ffprobe` on `x2lim.mp4` reports `nb_frames=10`.

### Essence 2 — rc=69, and a file copy does not fix it

```bash
bithuman pull A31BSK9325 --model essence-2
```

```text
already cached at /home/you/.cache/bithuman/agents/A31BSK9325/A31BSK9325.lebundle.imx (pass --force to re-download)
recognized: IMX v2 container — essence-2: cloud-served; no local CLI runtime yet
/home/you/.cache/bithuman/agents/A31BSK9325/A31BSK9325.lebundle.imx
rc=0
```

`.lebundle.imx` is the filename the download endpoint and `pull` hand you for
Essence 2. `lebundle` is a **legacy name kept for compatibility** — it never
renames, because saved paths and scripts carry it; see
[the `.imx` container](/concepts/avatars-imx).

```bash
bithuman render ~/.cache/bithuman/agents/A31BSK9325/A31BSK9325.lebundle.imx \
  -a speech.wav -o e2.mp4
```

```text
error: could not load lible_core.so (the native essence-2 runtime that owns the TESSERA teeth borrow). Tried: /home/you/.local/bin/lible_core.so; /home/you/.local/bin/lib/lible_core.so; /home/you/.local/bin/../lib/lible_core.so; /home/you/.bithuman/lib/lible_core.so; lible_core.so (lible_core.so: cannot open shared object file: No such file or directory)
  hint: essence-2 offline render needs the native le_core runtime (it owns the TESSERA teeth borrow). Stage it as `lible_core.so` next to the bithuman binary / in ~/.bithuman/lib, or set BITHUMAN_LIBLE_CORE. Until then run the model live with `bithuman run <YOUR_AGENT_CODE>`.
rc=69
```

`lible_core` is the native library's own frozen filename — another legacy name
that stays spelled exactly, because the loader quotes it verbatim in that error
and you would otherwise be searching for a file that does not exist under any
other name.

**The message reads like a missing file, so the obvious next move is to find
one and copy it in. That does not work, and here is the control that shows
why.** Staging a real `lible_core.so` and pointing `BITHUMAN_LIBLE_CORE` at it:

```bash
BITHUMAN_LIBLE_CORE=/path/to/lible_core.so \
  bithuman render ~/.cache/bithuman/agents/A31BSK9325/A31BSK9325.lebundle.imx \
  -a speech.wav -o e2.mp4
```

```text
error: could not load lible_core.so (…). Tried: /path/to/lible_core.so (/home/you/.local/bin/lib/libonnxruntime.so.1: version `VERS_1.26.0' not found (required by /path/to/lible_core.so)); …
rc=69
```

The file was found. It did not load. The CLI 2.5.1 tarball ships
`lib/libonnxruntime.so.1` built at **`VERS_1.20.1`**, and every `lible_core.so`
is linked against **`VERS_1.26.0`**. You can confirm both sides yourself:

```bash
strings -a ~/.local/bin/lib/libonnxruntime.so.1 | grep -E '^VERS_1\.[0-9]+\.[0-9]+$' | sort -u
```

```text
VERS_1.20.1
rc=0
```

```bash
objdump -T /path/to/lible_core.so | grep -o 'VERS_[0-9.]*' | sort -u
```

```text
VERS_1.26.0
rc=0
```

That is an ABI gap in the shipped binary, not a packaging oversight you can
work around by moving files. **Essence 2 has no offline `render` on any
platform in CLI 2.5.1.** Until a CLI ships with a matching runtime, render
Essence 2 through the [Video API](/api/video) or run it live —
`bithuman run <YOUR_AGENT_CODE>` opens a cloud session for it.

### Essence 1 — rc=70, still

```bash
bithuman render ~/.cache/bithuman/showcase/planning-nebula.imx -a speech.wav -o out.mp4
```

```text
  model:    /home/you/.cache/bithuman/showcase/planning-nebula.imx
  audio:    speech.wav
  output:   out.mp4
  target:   longest-side=1280 (aspect preserved)
  quality:  Medium

  loading fixture…
[mov,mp4,m4a,3gp,3g2,mj2 @ 0x63d423bfe880] Protocol name not provided, cannot determine if input is local or a network protocol, buffers and access patterns cannot be configured optimally without knowing the protocol
  resolved: 1280×722 (source 720×406)
  encoding via libessence (h264+aac → mp4)…
error: record_mp4 failed: file corrupt: audio_decode: avformat_open_input failed
rc=70
```

No output file is written. This is the same muxing failure first documented
against `cli-v2.4.0`, and it is **still present in 2.5.1** — re-tested on
2026-09-02, so the warning on [Commands](/sdk/cli/commands#bithuman-render--offline-mp4)
now covers this release too.

It is not your WAV. The controls that rule the input out:

- the identical `speech.wav` renders fine through Expression 2 above (`rc=0`);
- `Examples/python/local-essence/speech.wav` from bitHuman's own repository
  fails identically (`rc=70`);
- a second showcase model, `modern-court-jester.imx`, fails identically
  (`rc=70`).

Same audio, same binary, two families: one writes an MP4 and one does not. To
produce an MP4 from Essence 1 today, use the [Video API](/api/video).

## Exit codes seen on this page

| rc | Meaning | Seen on |
| --- | --- | --- |
| `0` | Success | `--version`, `list`, `pull`, `info`, Expression 2 `render` |
| `1` | Installer could not download a tarball for this target | `install.sh` on Linux ARM / Intel Mac |
| `66` | Bad input or a server refusal carrying the API's error | `info` on a non-model, `pull` of an unknown slug |
| `69` | Recognized family, no local runtime for it on this host | Essence 2 `render` |
| `70` | The engine ran and the encode failed | Essence 1 `render` |
| `77` | `BE_ERR_NO_AUTH` — no credential | any `render`, `pull <AGENT_CODE>` |

## What this page does not cover

Marked UNVERIFIED because they cannot be executed on a headless Linux box:

- **Anything on macOS.** The Apple Silicon tarball is published for 2.5.1
  (HTTP 200, confirmed) but nothing on this page was run on a Mac.
- **`bithuman run` live sessions.** The CLI's own `run --help` states the
  routing — "essence-1 downloads the `.imx` and renders locally; essence-2 /
  expression-2 (no local runtime yet) open a live CLOUD session" — and
  `bithuman pull` prints the matching line ("needs the local Apple render
  engine; cloud-served live"). That is the tool describing itself, not a live
  session measured here.
- **Code signing / notarization.** A macOS property; not checkable from Linux.
- **Windows.** No binary exists to test.

## Next steps

- [Install the CLI](/sdk/cli/install) — the full platform matrix
- [Commands](/sdk/cli/commands) — every subcommand and flag
- [Configuration](/sdk/cli/configuration) — environment variables and cache layout
