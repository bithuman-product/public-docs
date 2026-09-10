---
title: "Verified transcript — Linux x86_64"
description: "Every command on this page was executed on a real Linux x86_64 box against CLI 2.6.4 for the install and version blocks, 2.6.1 for the rest (and 2.5.1 where the output has not changed) and the output pasted back unedited, including the exit codes that are not zero."
section: sdk
group: "Command line"
order: 31.5
label: "Verified transcript"
---

## What this page is

A session run on the host named below, first on 2026-09-02 against **CLI
2.5.1** and re-run on 2026-09-07 against **CLI 2.6.1** — from a fresh home
directory and an empty environment, so nothing left over from an earlier
install could help. The [Install](#install) and `--version` blocks were run
again later the same day against **CLI 2.6.4**, the current release; nothing
else on this page changed between 2.6.1 and 2.6.4 except what the
[2.6.2](/changelog#cli-262--self-hosted-sessions-on-macos-are-metered-and-the-help-tells-the-truth-2026-09-07)
[2.6.3](/changelog#cli-263--a-live-self-hosted-session-is-billed-on-wall-clock-2026-09-07)
and [2.6.4](/changelog#cli-264--a-rejected-key-gets-300-seconds-then-the-session-stops-2026-09-07)
changelog entries list — a self-hosted session is now metered on macOS too (and an Essence 2
session on either platform), `run --help` no
longer says "no local runtime yet", and the Linux tarball's `built_at` is the
commit time rather than a date in the future. Every block is the command as you would type it and the
bytes it actually printed — including the exit codes that are **not** zero,
which are the interesting ones. Blocks whose output did not change between
the two releases keep the 2.5.1 capture and say so.

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
| CLI | 2.6.4 for Install and `--version`; 2.6.1 (essence engine 2.3.8, ABI 7) elsewhere — 2.5.1 where a block says so |
| `ffmpeg` | 8.0.1 on `PATH` |

> **One section was measured elsewhere.** The
> [Essence 2 render](#essence-2--exit-0-on-261-on-linux-and-on-macos) is
> the flow `cli-v2.6.1` was released to add. It was run during the release
> verification on this Linux host *and* on an Apple Silicon Mac, from the
> published tarball alone. Its numbers are reported below; it is the only
> block on this page whose stdout is not pasted.

## Install

The universal installer, unpinned, exactly as [Install](/sdk/cli/install)
prints it. Run 2026-09-07 into a fresh home directory:

```bash
curl -fsSL https://raw.githubusercontent.com/bithuman-product/homebrew-bithuman/main/install.sh | sh
```

```text
install: querying latest release...
install: version: cli-v2.6.4
install: target:  x86_64-unknown-linux-gnu
install: install dir: /home/you/.local/bin
install: downloading https://github.com/bithuman-product/homebrew-bithuman/releases/download/cli-v2.6.4/bithuman-x86_64-unknown-linux-gnu.tar.gz
install: verifying sha256...
install: sha256 ok
install: extracting...
install: installed expression2-model (local realtime render host)
install: installed engines/ (linux-x64-1.0.0.engine )
install:
install: installed: libessence 2.3.8 ABI 7
install:   -> /home/you/.local/bin/bithuman
install:
install: Note: /home/you/.local/bin is not on your PATH.
install: Add this to your shell profile (~/.zshrc, ~/.bashrc, ~/.profile):
install:
install:     export PATH="/home/you/.local/bin:$PATH"
install:
install: Then restart your shell, or run:
install:     export PATH="/home/you/.local/bin:$PATH"
rc=0
```

The `PATH` note appears because this was a fresh home directory with no
`~/.local/bin` on the path; on a machine that already has it the installer ends
with `Run 'bithuman --help' to get started.` instead.

The installer resolves the newest `cli-v*` release itself — pin one with `BITHUMAN_VERSION=cli-v2.6.4`
if you need a fixed version, and redirect the install with
`BITHUMAN_INSTALL_DIR`.

`install: sha256 ok` is a real check: the installer downloads the `.sha256`
sidecar and aborts on a mismatch. If a release has no sidecar it prints
`no sha256 sidecar published; skipping integrity check` instead — worth reading,
because the two lines look similar and mean opposite things. The digest it
checked against is the one published beside the tarball:
`42094b2c912b3b3b4be364aed18893892d247d1e1070c9bb82225fa5e7f26f1a`.

### Negative control — the two targets that will not install

The installer derives its target from `uname -s` / `uname -m` and asks the
release for `bithuman-<arch>-<os>.tar.gz`. Only two of those tarballs are
published. Running the same script with `uname` reporting a different machine
shows exactly what a developer on that machine sees — and as of 2.6.1 the
installer names the two tarballs the release *does* carry and what to do
instead:

```text
install: querying latest release...
install: version: cli-v2.6.4
install: target:  aarch64-unknown-linux-gnu
install: install dir: /home/you/.local/bin
install: error: the bithuman CLI is NOT published for aarch64-unknown-linux-gnu.
install: error:
install: error:   release : cli-v2.6.4
install: error:   wanted  : bithuman-aarch64-unknown-linux-gnu.tar.gz
install: error:   release carries:
install: error:     bithuman-aarch64-apple-darwin.tar.gz
install: error:     bithuman-x86_64-unknown-linux-gnu.tar.gz
install: error:
install: error:   aarch64 Linux was published through cli-v2.3.27 and dropped at cli-v2.4.0,
install: error:   when the tarball began vendoring the expression-2 render engine and only an
install: error:   x86_64 Linux engine was built. Options, in order of preference:
install: error:     * ★USE THE PYTHON LIBRARY — it supports aarch64 Linux today:
install: error:           pip install bithuman        # docs.bithuman.ai
install: error:       Same engine, in your process; it is a library, not this command.
install: error:     * use an x86_64 Linux host (or run the x86_64 build under emulation);
install: error:     * pin the last aarch64 release — note it predates engine vendoring, so
install: error:       `bithuman run` cannot render locally on it:
install: error:           BITHUMAN_VERSION=cli-v2.3.27 sh install.sh
install: error:     * tell us you need it: hello@bithuman.ai
install: error:
install: error:   Full asset list: https://github.com/bithuman-product/homebrew-bithuman/releases/tag/cli-v2.6.4
rc=1
```

```text
install: querying latest release...
install: version: cli-v2.6.4
install: target:  x86_64-apple-darwin
install: install dir: /home/you/.local/bin
install: error: the bithuman CLI is NOT published for x86_64-apple-darwin.
install: error:
install: error:   release : cli-v2.6.4
install: error:   wanted  : bithuman-x86_64-apple-darwin.tar.gz
install: error:   release carries:
install: error:     bithuman-aarch64-apple-darwin.tar.gz
install: error:     bithuman-x86_64-unknown-linux-gnu.tar.gz
install: error:
install: error:   Intel Macs are not built, and no other channel serves one either.
install: error:   On Apple Silicon this installs normally. Options:
install: error:     * run on an Apple Silicon Mac or an x86_64 Linux host;
install: error:     * tell us you need it: hello@bithuman.ai
install: error:
install: error:   Full asset list: https://github.com/bithuman-product/homebrew-bithuman/releases/tag/cli-v2.6.4
rc=1
```

Both exit **1**, before any download starts. The full platform picture, counted
from the release assets, is on
[Install](/sdk/cli/install#which-platforms-actually-have-a-binary).

## The part that needs no credential

`--version`, `list`, `pull` of a showcase avatar, and `info` all work signed
out. This whole section was run with `BITHUMAN_API_SECRET` unset, on 2.6.1.

```bash
bithuman --version
```

```text
libessence 2.3.8 ABI 7
bithuman    2.6.4
build       01325a3053c2 x86_64-unknown-linux-gnu/release 2026-09-07T22:36:48Z a999bbef614d
engine      linux 1.0.0 adc2a18da787
rc=0
```

Two lines are new since 2.5.1: `build` names the commit and target the binary
was built from — the same values as the `PROVENANCE.json` inside the tarball —
and `engine` names the Expression 2 render engine it shipped with.

```bash
bithuman list
```

```text
 SLUG                            NAME                            MODEL     SIZE     STATUS
 thrift-coach-bargain-buddy      Thrift Coach & Bargain Buddy    essence   75 MB    —
 energetic-audio-story-buddy     Energetic Audio Story Buddy     essence   94 MB    —
 fairy-tale-grandmother-avatar   Fairy-Tale Grandmother Avatar   essence   111 MB   —
 modern-court-jester             Modern Court Jester             essence   79 MB    —
 planning-nebula                 Planning Nebula                 essence   48 MB    —
rc=0
```

Every showcase avatar in that catalog is Essence 1. `pull` writes the file and
prints its path on stdout and nothing else, so it pipes cleanly:

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
rc=0
```

### Negative controls for the two commands above

Both fail with **66**, not with a stack trace:

```bash
bithuman info speech.wav          # not a model file at all
```

```text
error: not a usable avatar: speech.wav
rc=66
```

(2.5.1 said `not an IMX container: speech.wav (expected magic 'IMX\0' at
offset 0)` here; 2.6.1 says the same thing in the CLI's four-word refusal
vocabulary — this is `InvalidAvatar`.)

```bash
bithuman pull not-a-real-avatar   # slug that is not in the manifest
```

```text
error: slug 'not-a-real-avatar' not found in manifest. Try `bithuman list`.
rc=66
```

A third control, because a flag that is silently ignored is worse than one
that is refused: `--model` is for your own agent codes, and on a showcase slug
it is **parsed and refused on its meaning** (`rc=66`), where an unknown flag
exits `rc=2`. A page that showed only the first line could not tell you which
one you were getting:

```bash
bithuman pull planning-nebula --model essence-2
```

```text
error: --model applies to YOUR agent codes (e.g. `bithuman pull A24EKJ8433 --model expression-2`), not to the showcase slug 'planning-nebula' — showcase avatars have a single published artifact
rc=66
```

```bash
bithuman pull planning-nebula --zzz-nope
```

```text
error: unexpected argument '--zzz-nope' found

  tip: to pass '--zzz-nope' as a value, use '-- --zzz-nope'
rc=2
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

Now render **signed out** — the negative control for every render below
(captured on 2.5.1; the gate is unchanged, and 2.6.1's own `--help` names it
`NotAuthorised`):

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

This is the section worth reading before you plan a pipeline. All three
families were driven with the **same** `speech.wav` through the same CLI, so
the differences are the engine, not the input.

| Family | File `pull` gives you | `render` on Linux x86_64 | rc |
| --- | --- | --- | --- |
| Expression 2 | `<code>.avatar` | **Works** — writes a real MP4 (2.5.1 and 2.6.1) | `0` |
| Essence 2 | `<code>.imx` | **Works as of 2.6.1** — writes a real MP4; 2.5.1 and 2.6.0 refused it | `0` |
| Essence 1 | `<code>.imx` | Fails — the MP4 muxing step | `70` |

### Expression 2 — rc=0, real frames

Captured on 2.5.1 (2026-09-02); 2.6.1's own `render --help` reports the same
result — `exit 0 with ceil(seconds x 20) frames, every frame decoded` — on
Linux x86_64 and on macOS arm64.

```bash
bithuman pull A55NVK9945 --model expression-2
```

```text
already cached at /home/you/.cache/bithuman/agents/A55NVK9945/A55NVK9945.avatar (pass --force to re-download)
recognized: IMX v2 container — expression-2: needs the local Apple render engine; cloud-served live
/home/you/.cache/bithuman/agents/A55NVK9945/A55NVK9945.avatar
rc=0
```

> **That second line was wrong, and the render below is the proof.**
> This page is a verbatim capture, so the sentence stays as it was printed —
> but it was false on Linux even as it was printed. **The model renders locally
> on this machine**, through the vendored `expression2-model` host the
> installer stages next to the `bithuman` binary; the very next command on this
> page does exactly that. There is no Apple engine on Linux to install, nothing
> was missing, and `bithuman engine install` — which the sentence recommends —
> fetches the shared `.engine` runtime, a different artifact.
>
> Fixed in the CLI on 2026-09-10. A build carrying the fix answers
> `recognized: expression-2 (Expression 2) — run it with: bithuman run <path>`,
> and `pull --json` reports `"runnable_locally": true`. Until that build is
> released, read the captured line as "this model renders here", and ignore the
> advice in it.

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

### Essence 2 — exit 0 on 2.6.1, on Linux and on macOS

This is the section `cli-v2.6.1` changed. Through 2.5.1 and 2.6.0 the Essence 2
runtime was not in the tarball, and `render` exited **69** for every Essence 2
file on every platform. In 2.6.1 the runtime ships **inside the CLI on both
platforms**, and the flow below was run from the published tarball alone — a
fresh home directory, an empty environment, nothing staged by hand — on this
Linux x86_64 host and on an Apple Silicon Mac, on 2026-09-07:

```bash
MODEL=$(bithuman pull A31BSK9325 --model essence-2)   # prints the cached <code>.imx path on stdout
bithuman render "$MODEL" -a speech.wav -o e2.mp4
```

What was measured, on both machines:

- **`rc=0`**, and `e2.mp4` is a real file. A **5-second** clip produced
  **125 frames at 25 fps** — `ceil(seconds × 25)`, which is what 2.6.1's own
  `render --help` promises for this family — with the avatar's own recorded
  mouth on every speech frame.
- **The first Essence 2 render downloads the shared audio encoder** —
  about **377 MB**, one time per machine — from the public release coordinate,
  checked by content digest, into `~/.bithuman/engines/essence-2/`. Every
  later render reuses it. There is no environment variable to set and no
  extra install step; the download is part of `render`.
- **The first play performs a licence check with the cloud**, so it needs the
  same sign-in `pull <AGENT_CODE>` needs (`bithuman login`, or
  `BITHUMAN_API_SECRET` in CI). Signed out, it is the `rc=77` gate above.
- `pull --model essence-2` now names the file **`<code>.imx`**. Earlier
  releases wrote `<code>.lebundle.imx` — `lebundle` is a legacy name kept for
  compatibility, and a file you already have under that name still opens; see
  [the `.imx` container](/concepts/avatars-imx).

The same file also serves live from your own machine:

```bash
bithuman run "$MODEL"
```

`run` stood up its local server and answered **HTTP 200** on the URL it
printed, on both machines. (Pass the **path**; passing the bare agent code
instead routes an `essence-2` agent to a cloud session, as `bithuman run --help`
states.)

**Negative control — an incomplete model file.** Essence 2 is fail-closed: if
the downloaded model file is incomplete (a required model member is missing),
`bithuman render` refuses with **exit 69** and writes **no output file** — it
never substitutes a generated mouth for the one the avatar recorded. That is a
refusal of the file, not a missing runtime: on 2.6.1 the runtime is in the
tarball, and the fix is a complete model file (re-`pull` with `--force`, or
contact [hello@bithuman.ai](mailto:hello@bithuman.ai) with the agent code if
the artifact needs rebuilding on our side), not a file copied in beside the
binary.

Writing the MP4 needs `ffmpeg` on `PATH` (or `$BITHUMAN_FFMPEG`) for Essence 2
and Expression 2, and `--target-size` applies to Essence 1 only — the
second-generation engines emit their native size.

### Essence 1 — rc=70, still

Captured on 2.5.1 (2026-09-02). 2.6.1's own `render --help` still reports
**exit 70** for this family, on both platforms.

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
against `cli-v2.4.0`, so the warning on
[Commands](/sdk/cli/commands#bithuman-render--offline-mp4) still covers the
current release.

It is not your WAV. The controls that rule the input out:

- the identical `speech.wav` renders fine through Expression 2 above (`rc=0`)
  and through Essence 2 on 2.6.1;
- `Examples/python/local-essence/speech.wav` from bitHuman's own repository
  fails identically (`rc=70`);
- a second showcase model, `modern-court-jester.imx`, fails identically
  (`rc=70`).

Same audio, same binary, three families: two write an MP4 and one does not. To
produce an MP4 from Essence 1 today, use the [Video API](/api/video).

## Exit codes seen on this page

| rc | Meaning | Seen on |
| --- | --- | --- |
| `0` | Success | `--version`, `list`, `pull`, `info`, Expression 2 `render`, Essence 2 `render` (2.6.1) |
| `1` | Installer could not download a tarball for this target | `install.sh` on Linux ARM / Intel Mac |
| `2` | Bad arguments — a flag the command does not have | `pull --zzz-nope` |
| `66` | Bad input or a server refusal carrying the API's error | `info` on a non-model, `pull` of an unknown slug, `--model` on a showcase slug |
| `69` | An avatar this build cannot render (`NotSupported`) — on 2.6.1, an Essence 2 file with a required member missing; no file is written | Essence 2 `render` on an incomplete model file |
| `70` | The engine ran and the encode failed | Essence 1 `render` |
| `77` | `BE_ERR_NO_AUTH` — no credential | any `render`, `pull <AGENT_CODE>` |

## What this page does not cover

Marked UNVERIFIED because they cannot be executed on a headless Linux box:

- **macOS, beyond the Essence 2 flow.** The Essence 2 `pull` / `render` /
  `run` sequence above was run on an Apple Silicon Mac during the 2.6.1
  release verification and again on the published 2.6.2, 2.6.3 and 2.6.4
  tarballs (2.6.4: `pull` and a metered `run`, on the grace proof);
  every other block on this page is Linux only. The Apple Silicon tarball
  for 2.6.4 is published (HTTP 200, sha256
  `ed827aaa0b3918100e6c6776ca0527d7b7cabb8e4618f3ce91ef437f205f1bbc`).
- **A live conversation.** `bithuman run` on the Essence 2 file answered
  HTTP 200 from its local server; a browser session with a microphone and a
  brain was not driven from here.
- **Code signing / notarization.** The 2.6.4 macOS tarball is Developer ID
  signed and notarized; verified quarantined on an Apple Silicon Mac
  (`spctl`: `accepted`, `source=Notarized Developer ID`, and the quarantined
  binary runs) — a macOS property, not checkable from Linux.
- **Windows.** No binary exists to test.

## Next steps

- [Install the CLI](/sdk/cli/install) — the full platform matrix
- [Commands](/sdk/cli/commands) — every subcommand and flag
- [Configuration](/sdk/cli/configuration) — environment variables and cache layout
