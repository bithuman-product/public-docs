---
title: "FFmpeg / LGPL — the Android relink offer"
description: "ai.bithuman:essence2-android statically links FFmpeg 7.1 under LGPL-2.1. This is the section 6(a) offer: where the relink materials are, what is in them, and the commands that check every claim on this page."
section: legal
group: "Legal"
order: 2
label: "FFmpeg / LGPL (Android)"
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
https://repo1.maven.org/maven2/ai/bithuman/essence2-android/0.2.0/essence2-android-0.2.0-relink.zip
```

Same group, same artifact, same version as the AAR — classifier `relink`,
extension `zip`. Anyone who can download the library can download the
materials.

---

## Which artifact this applies to

**Only `ai.bithuman:essence2-android`.** The other two Android artifacts do not
carry FFmpeg, so no §6(a) obligation attaches to them and no relink kit is
published for them. That is correct, not a gap:

| Coordinate | FFmpeg linked in? | Relink offer |
|---|---|---|
| `ai.bithuman:essence2-android:0.2.0` | **yes** — statically, into `lible_jni.so` | **published** (below) |
| `ai.bithuman:expression2-android:0.3.0` | no — it carries LiteRT (Apache-2.0) | none needed |
| `ai.bithuman:sdk:2.3.6` | not audited on this page | — |

Measured, with the two AARs side by side — the second command is the control
that makes the first mean something:

```bash
curl -fsSL -o essence2.aar https://repo1.maven.org/maven2/ai/bithuman/essence2-android/0.2.0/essence2-android-0.2.0.aar
curl -fsSL -o expression2.aar https://repo1.maven.org/maven2/ai/bithuman/expression2-android/0.3.0/expression2-android-0.3.0.aar
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
expression-2 one. Run on Linux x86_64 on 2026-09-03 against the artifacts as
published.

**The `rc=1` is the second `grep -c`, and it is the expected answer.** `grep`
exits 1 when it matches nothing, so a count of zero and a non-zero exit are the
same fact stated twice. If you wrap this in `set -e` the script stops here on
the *correct* result — check the printed number, not the exit status.

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
 0x0000000000000001 (NEEDED)             Shared library: [libm.so]
 0x0000000000000001 (NEEDED)             Shared library: [libc++_shared.so]
 0x0000000000000001 (NEEDED)             Shared library: [libdl.so]
 0x0000000000000001 (NEEDED)             Shared library: [libc.so]
rc=0
```

No `libav*`, no `libsw*`. Nothing to swap at run time, so the recipient's right
to relink has to be served with materials — which is what §6(a) asks for.

---

## What is in the kit

Fifteen files. Fetch it and check the count yourself:

```bash
curl -fsSL -o relink.zip https://repo1.maven.org/maven2/ai/bithuman/essence2-android/0.2.0/essence2-android-0.2.0-relink.zip
unzip -Z1 relink.zip | grep -v '/$' | wc -l
```

```text
15
rc=0
```

```text
essence2-android-0.2.0-relink/
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
cd rl/essence2-android-0.2.0-relink/ffmpeg && sha256sum -c ffmpeg-7.1.tar.xz.sha256
```

```text
ffmpeg-7.1.tar.xz: OK
rc=0
```

**2. The object archive defines no FFmpeg and leaves exactly the documented
surface undefined.** This is what makes the relink possible: your FFmpeg
supplies these, ours does not get baked in.

```bash
cd rl/essence2-android-0.2.0-relink
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
15
rc=0
```

All 30 symbols in the shipped list really are undefined in the archive, none of
them is defined by it, and the archive holds the 15 translation units. The
`av_zzz_not_a_symbol` line is the negative control — without it, a `grep` that
silently matched everything would print the same reassuring numbers.

**3. The offer URL in the AAR is the one that resolves.** The commitment lives
in the shipped bytes, not on this page:

```bash
unzip -p essence2.aar META-INF/NOTICE.txt | grep -o 'https://repo1[^ ]*relink.zip'
curl -o /dev/null -s -w '%{http_code}\n' -L "$(unzip -p essence2.aar META-INF/NOTICE.txt | grep -o 'https://repo1[^ ]*relink.zip')"
curl -o /dev/null -s -w '%{http_code}\n' -L "https://repo1.maven.org/maven2/ai/bithuman/essence2-android/0.2.0/essence2-android-0.2.0-relinkX.zip"
```

```text
https://repo1.maven.org/maven2/ai/bithuman/essence2-android/0.2.0/essence2-android-0.2.0-relink.zip
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
> x86_64 on 2026-09-03 against the published artifacts. **`relink.sh` was
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
| FFmpeg symbols defined in `lible_jni.so` | 618 |
| FFmpeg symbols undefined in the relink archive | 30 |

The other licence texts travel inside the AAR too — `META-INF/licenses/`
carries `ffmpeg-7.1-COPYING.LGPLv2.1.txt`, `llvm-libcxx-LICENSE.txt` and
`onnxruntime-1.26.0-LICENSE.txt`. See the
[Android SDK page](/sdk/android) for the coordinates and what is measured
about the artifact itself.
