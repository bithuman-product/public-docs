---
title: "FFmpeg / LGPL — the Android relink offer"
description: "ai.bithuman:essence2-android statically links FFmpeg 7.1 under LGPL-2.1. This is the section 6(a) offer: where the relink materials are, what is in them, and the commands that check every claim on this page. The deprecated ai.bithuman:sdk carries a section 6(c) written offer."
section: legal
group: "Legal"
order: 2
type: reference
---

> **This is an engineering reading of the licence, not legal advice.** It
> describes what the shipped artifact does and how the obligation is
> discharged. If you redistribute our AAR inside your own product, take your
> own advice about your own obligations.

The essence-2 Android AAR links **FFmpeg 7.1 statically**. That triggers
LGPL-2.1 **§6(a)**, and the materials that discharge it are published on Maven
Central beside the AAR — no request to make, nobody to ask.

**The offer:**

```text
https://repo1.maven.org/maven2/ai/bithuman/essence2-android/0.5.7/essence2-android-0.5.7-relink.zip
```

Same group, same artifact, same version as the AAR — classifier `relink`,
extension `zip`. Anyone who can download the library can download the
materials. This page names `0.5.7`, Central's `<release>` on 2026-09-15; the
offer travels with every version, so every permanent AAR from `0.2.0` on names
its own kit at the same shape of URL.

---

## Which artifact this applies to

**`ai.bithuman:essence2-android`**, with a relink kit published beside every AAR, and the
deprecated **`ai.bithuman:sdk`**, which has a written offer instead
([below](#aibithumansdk-deprecated--a-written-offer-6c)).
`ai.bithuman:expression2-android` does not carry FFmpeg, so no §6 obligation attaches to it
and no relink kit is published for it. That is correct, not a gap:

| Coordinate | FFmpeg linked in? | Relink offer |
|---|---|---|
| `ai.bithuman:essence2-android:0.5.13` | **yes** — statically, into `lible_jni.so` | **published** (below); `0.2.0` through `0.5.12` each carry their own kit at the same shape of URL |
| `ai.bithuman:expression2-android:0.4.1` | no — it carries LiteRT (Apache-2.0) | none needed |
| `ai.bithuman:sdk` 1.12.1 – 2.3.7 (deprecated) | **yes** — statically, into `libessence_jni.so` | **written offer**, §6(c) — [below](#aibithumansdk-deprecated--a-written-offer-6c) |

Measured, with the two AARs side by side — the second command is the control
that makes the first mean something:

```bash
curl -fsSL -o essence2.aar https://repo1.maven.org/maven2/ai/bithuman/essence2-android/0.5.7/essence2-android-0.5.7.aar
curl -fsSL -o expression2.aar https://repo1.maven.org/maven2/ai/bithuman/expression2-android/0.4.1/expression2-android-0.4.1.aar
unzip -q -o essence2.aar    jni/arm64-v8a/lible_jni.so    -d e2
unzip -q -o expression2.aar jni/arm64-v8a/libexpr2jni.so  -d x2
nm -D --defined-only e2/jni/arm64-v8a/lible_jni.so   | grep -cE ' T (av_|avcodec_|sws_)'
nm -D --defined-only x2/jni/arm64-v8a/libexpr2jni.so | grep -cE ' T (av_|avcodec_|sws_)'
```

```text
618
0
rc=1
```

618 FFmpeg symbols **defined** inside the essence-2 library; zero in the
expression-2 one. First run on Linux x86_64 on 2026-09-03 against the artifacts as published, and
**re-run 2026-09-14 against Central's current `<release>` on both sides —
`essence2-android:0.5.7` and `expression2-android:0.4.1`** — with the same three
lines of output.

**The `rc=1` is the second `grep -c`, and it is the expected answer.** `grep`
exits 1 when it matches nothing, so a count of zero and a non-zero exit are the
same fact stated twice. If you wrap this in `set -e` the script stops here on
the *correct* result — check the printed number, not the exit status.

---

## `ai.bithuman:sdk` (deprecated) — a written offer, §6(c)

`ai.bithuman:sdk` is the Android SDK that `ai.bithuman:essence2-android` replaced.
Seventeen versions were published, **1.12.1 through 2.3.6**. Every one of them links
FFmpeg statically into the SDK's native library under `jni/arm64-v8a/` (the file the commands
below read), and **none of them shipped a
licence notice**: not for FFmpeg and not for the other libraries listed below. That was our
omission.

**2.3.7 is the final release.** It ships the same `classes.jar` and the same native
libraries as 2.3.6, byte for byte. It adds `META-INF/NOTICE.txt`, the licence texts under
`META-INF/licenses/`, and the offer below in `META-INF/LGPL-RELINK-OFFER.txt`. Its POM
marks the coordinate deprecated and points to `ai.bithuman:essence2-android`.

**The offer.** For at least three years from the date you received any of these versions,
bitHuman will give anyone who asks, for no more than the cost of performing the
distribution:

1. the complete corresponding source code of the FFmpeg release linked into that version;
2. the rest of that native library for that version, the "work that uses the Library", as
   object code, with the link command and a script, so you can modify FFmpeg and relink.

We don't have the original build objects. We do have the source of every version,
archived under its release tag. When a request arrives, we build
the relink materials from that tagged source. To ask, write to
[hello@bithuman.ai](mailto:hello@bithuman.ai) and name the version.

**Why this is §6(c) and not the §6(a) kit that essence-2 publishes.** A kit on Central
needs the object code from the build that produced the library. For these versions that
build output was not kept, and the Android FFmpeg itself was cross-built by hand rather
than by an archived script. So we offer the materials in writing instead, as §6(c)
allows.

### What each version carries

Read from the published bytes, not from build notes:

| Versions | FFmpeg (static) | Also statically linked | Bundled beside it |
|---|---|---|---|
| 1.12.1 – 1.13.0 | FFmpeg (libavformat, libavcodec, libavutil, libswscale, libswresample). The binary carries no FFmpeg version string. | OpenSSL 3.4.0, libcurl, HDF5 1.14.5, libjpeg-turbo 3.1.91, libwebp, KISS FFT | ONNX Runtime 1.26.0, libc++ |
| 1.14.0 – 2.3.6 | The **6.1** series (`Lavf60.16.100`) | same | same |
| 2.3.7 | 2.3.6's bytes | same | same |

- libcurl carries no version string in the binary. The archived build script pins
  **8.10.1**, the same script that pins OpenSSL 3.4.0, and that version does match the
  binary.
- The FFmpeg build contains **no GPL-only or non-free component**: no x264, x265 or Xvid
  encoder wrapper, and no libpostproc. So the FFmpeg code is under LGPL-2.1-or-later.

Check it yourself. The second `grep` is the control:

```bash
curl -fsSL -o sdk.aar https://repo1.maven.org/maven2/ai/bithuman/sdk/2.3.6/sdk-2.3.6.aar
unzip -q -o sdk.aar jni/arm64-v8a/libessence_jni.so -d sdk
strings -n 5 sdk/jni/arm64-v8a/libessence_jni.so | grep -oE 'Lavf[0-9.]+|OpenSSL [0-9.]+|HDF5 library version: [0-9.]+|libjpeg-turbo version [0-9.]+' | sort -u
strings -n 5 sdk/jni/arm64-v8a/libessence_jni.so | grep -cE 'x264_encoder_open|x264_param_default|pp_postprocess'
```

```text
HDF5 library version: 1.14.5
Lavf60.16.100
libjpeg-turbo version 3.1.91
OpenSSL 3.4.0
0
```

And the 2.3.7 claim, that only notices were added:

```bash
curl -fsSL -o old.aar https://repo1.maven.org/maven2/ai/bithuman/sdk/2.3.6/sdk-2.3.6.aar
curl -fsSL -o new.aar https://repo1.maven.org/maven2/ai/bithuman/sdk/2.3.7/sdk-2.3.7.aar
for f in classes.jar jni/arm64-v8a/libessence_jni.so jni/arm64-v8a/libonnxruntime.so jni/arm64-v8a/libc++_shared.so; do
  [ "$(unzip -p old.aar $f | sha256sum)" = "$(unzip -p new.aar $f | sha256sum)" ] && echo "same  $f" || echo "DIFF  $f"
done
unzip -Z1 new.aar | grep '^META-INF/' | grep -vc '/$'
```

```text
same  classes.jar
same  jni/arm64-v8a/libessence_jni.so
same  jni/arm64-v8a/libonnxruntime.so
same  jni/arm64-v8a/libc++_shared.so
17
```

(17 = the 16 files 2.3.7 adds plus the `aar-metadata.properties` that every AAR carries.)

---

## Why §6(a) and not §6(b)

§6(b) — the "use a shared library already on the user's system" route — is not
available here, and that is a fact about the linkage rather than a preference.
FFmpeg is not a dependency of the library, it is **inside** it:

```bash
readelf -d e2/jni/arm64-v8a/lible_jni.so | grep NEEDED
```

```text
 0x0000000000000001 (NEEDED)             Shared library: [libonnxruntime.so]
 0x0000000000000001 (NEEDED)             Shared library: [libandroid.so]
 0x0000000000000001 (NEEDED)             Shared library: [liblog.so]
 0x0000000000000001 (NEEDED)             Shared library: [libdl.so]
 0x0000000000000001 (NEEDED)             Shared library: [libm.so]
 0x0000000000000001 (NEEDED)             Shared library: [libc++_shared.so]
 0x0000000000000001 (NEEDED)             Shared library: [libc.so]
rc=0
```

No `libav*`, no `libsw*`. Nothing to swap at run time, so the recipient's right
to relink has to be served with materials — which is what §6(a) asks for.

---

## What is in the kit

Fifteen files. Fetch it and check the count yourself (re-run 2026-09-14 on
`0.5.7`: HTTP 200, 15,701,210 B, the same fifteen names):

```bash
curl -fsSL -o relink.zip https://repo1.maven.org/maven2/ai/bithuman/essence2-android/0.5.7/essence2-android-0.5.7-relink.zip
unzip -Z1 relink.zip | grep -v '/$' | wc -l
```

```text
15
rc=0
```

```text
essence2-android-0.5.7-relink/
├── MANIFEST.json                       machine-readable summary + sha256 of every file
├── NOTICE.txt                          the same NOTICE that ships inside the AAR
├── README.md
├── LICENSE-LGPL-2.1.txt
├── ffmpeg/
│   ├── ffmpeg-7.1.tar.xz               the complete corresponding source, 11,011,364 B
│   ├── ffmpeg-7.1.tar.xz.sha256
│   ├── config.h                        what that build's ./configure produced
│   ├── CONFIGURATION.txt               the FFMPEG_CONFIGURATION string
│   ├── PROVENANCE.txt
│   └── build_ffmpeg_android.sh         the provisioning script
├── objects/
│   └── lible_jni_relink.a              the "work that uses the Library", as object code
├── link/
│   ├── link_command.txt                the real link command, lifted from the build
│   ├── link_command.raw.txt
│   └── relink.sh                       substitutes your FFmpeg prefix and relinks
└── verify/
    └── undefined_ffmpeg_symbols.txt    the 30-symbol surface your build must resolve
```

**No patches are applied to FFmpeg**, so "including whatever changes were used
in the work" is the empty set — and you can check that rather than take it.

### The three checks worth running

**1. The source is the real 7.1 release, unmodified.**

```bash
mkdir -p rl && unzip -q -o relink.zip -d rl
cd rl/essence2-android-0.5.7-relink/ffmpeg && sha256sum -c ffmpeg-7.1.tar.xz.sha256
```

```text
ffmpeg-7.1.tar.xz: OK
rc=0
```

**2. The object archive defines no FFmpeg and leaves exactly the documented
surface undefined.** This is what makes the relink possible: your FFmpeg
supplies these, ours does not get baked in.

```bash
cd rl/essence2-android-0.5.7-relink
nm --undefined-only objects/lible_jni_relink.a | awk '{print $NF}' | sort -u > undef.txt
nm --defined-only   objects/lible_jni_relink.a | awk '{print $NF}' | sort -u > def.txt
miss=0; dup=0
while read -r s; do grep -qx "$s" undef.txt || miss=$((miss+1)); grep -qx "$s" def.txt && dup=$((dup+1)); done \
  < verify/undefined_ffmpeg_symbols.txt
echo "listed=$(wc -l < verify/undefined_ffmpeg_symbols.txt) missing=$miss defined=$dup"
grep -qx "av_zzz_not_a_symbol" undef.txt && echo "CONTROL FAILED" || echo "control fired"
ar t objects/lible_jni_relink.a | wc -l
```

```text
listed=30 missing=0 defined=0
control fired
30
rc=0
```

All 30 symbols in the shipped list really are undefined in the archive, none of
them is defined by it, and the archive holds its 30 translation units. The
`av_zzz_not_a_symbol` line is the negative control — without it, a `grep` that
silently matched everything would print the same reassuring numbers.

**3. The offer URL in the AAR is the one that resolves.** The commitment lives
in the shipped bytes, not on this page:

```bash
unzip -p essence2.aar META-INF/NOTICE.txt | grep -o 'https://repo1[^ ]*relink.zip'
curl -o /dev/null -s -w '%{http_code}\n' -L "$(unzip -p essence2.aar META-INF/NOTICE.txt | grep -o 'https://repo1[^ ]*relink.zip')"
curl -o /dev/null -s -w '%{http_code}\n' -L "https://repo1.maven.org/maven2/ai/bithuman/essence2-android/0.5.7/essence2-android-0.5.7-relinkX.zip"
```

```text
https://repo1.maven.org/maven2/ai/bithuman/essence2-android/0.5.7/essence2-android-0.5.7-relink.zip
200
404
rc=0
```

The `relinkX` line is the control: it proves the 200 is the artifact and not
Maven Central answering 200 to everything.

---

## What is not in the kit, and why that is allowed

**Not included:** the Android NDK (the compiler) and Bionic — `libc`, `libm`,
`libdl`, `liblog`, `libandroid`. §6 exempts "anything that is normally
distributed … with the major components (compiler, kernel, and so on) of the
operating system on which the executable runs".

**Included by accompaniment:** `libonnxruntime.so` and `libc++_shared.so` are
*not* covered by that exception, and they are not omitted — they ship in the
same AAR at `jni/arm64-v8a/`, and `relink.sh` reads `libonnxruntime.so` out of
it.

**Not included, and not required:** bitHuman's own engine source. §6(a) asks for
"the complete machine-readable 'work that uses the Library', as object code
and/or source code" — object code is what is given, which is exactly what lets
this obligation be met without publishing the engine.

---

## Status of the relink itself

> **UNVERIFIED on this page.** Every command above was executed on Linux
> x86_64 on 2026-09-03 and re-executed on 2026-09-14 against Central's current
> `<release>` artifacts. **`relink.sh` was
> not run here** — it needs an Android NDK toolchain and an FFmpeg built for
> `arm64-v8a`, neither of which exists on the machine that checked this page.
> Treat the relink as *offered and materially complete* — which is what the
> commands above establish — rather than as reproduced by us today.

The AAR's own `NOTICE.txt` records that the materials were exercised end to end
before publication: an FFmpeg built from the shipped tarball with a deliberate
one-line modification was relinked into `lible_jni.so` by the shipped
`relink.sh`, and the change was observed in rendered output on a handset. That
is the artifact's claim, reproduced here as its claim.

If you exercise the offer and it does not work, that is a bug in the offer and
we want it: [hello@bithuman.ai](mailto:hello@bithuman.ai).

---

## Build facts, as recorded in `MANIFEST.json`

| Field | Value |
|---|---|
| FFmpeg version | 7.1 |
| FFmpeg licence, as `configure` selected it | LGPL version 2.1 or later |
| `--enable-gpl` / `--enable-nonfree` | `0` / `0` |
| Patches applied | `0` |
| Upstream source | `https://ffmpeg.org/releases/ffmpeg-7.1.tar.xz` |
| Source sha256 | `40973d44…7abe6` |
| NDK | 28.0.13004108 |
| Android API | 29 |
| ABI | `arm64-v8a` |
| FFmpeg symbols defined in `lible_jni.so` | 618 (re-counted in `0.5.7`'s `lible_jni.so`, 2026-09-15; unchanged from `0.5.6`) |
| FFmpeg symbols undefined in the relink archive | 30 |

The other licence texts travel inside the AAR too — `META-INF/licenses/`
carries `ffmpeg-7.1-COPYING.LGPLv2.1.txt`, `highway-1.3.0-LICENSE.txt`,
`llvm-libcxx-LICENSE.txt` and `onnxruntime-1.26.0-LICENSE.txt`. See the
[Android SDK page](/sdk/android) for the coordinates and what is measured
about the artifact itself.
