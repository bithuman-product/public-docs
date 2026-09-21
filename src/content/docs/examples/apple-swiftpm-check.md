---
title: "Apple — check before you ship"
description: "Preflight the macOS and iOS rail from any machine, before you open Xcode: which tag your SwiftPM pin actually resolves and whether its binaries match their checksums, which bithuman wheel pip picks on a Mac, and what is really inside the shipped Expression2 binary. Every transcript was produced by running the snippet."
section: examples
group: "Examples"
order: 17
---

## What this page is

Three checks for the Apple rail that you can run **from any operating system**,
before you open Xcode. Each has a control arm that must fail, so a passing run
means something.

**Prerequisites:** `bash`, `curl`, `git`, `python3`, `unzip`, `sha256sum` and
`strings` (from binutils). Nothing is installed, nothing is signed in, and no
credential is used. Check 1 downloads about 260 MB, check 2 about 34 MB, check 3
about 0.6 MB.

> **Provenance, and the honest limit.** Every transcript in checks 1-3 was
> produced by running the snippet exactly as printed, on Ubuntu 26.04 / Python 3.14.4 /
> pip 25.1.1 / curl 8.18.0 / git 2.53.0, on **2026-09-21**. Exit codes are
> real.
>
> **No Mac was involved in checks 1–3.** They inspect Apple artifacts *without
> executing them* — a resolve preflight, a wheel resolution, a binary
> inspection. The last section is the exception and says so: it was built and
> run on a Mac on 2026-09-03, against the tag current that day.

---

## Check 1 — what does my pin resolve, and do the binaries match?

Xcode's failure here is slow and unhelpful. The check is fast, and it starts
where a developer starts: with the `from:` pin you would write. It resolves the
tag that pin picks, reads the manifest there, fetches every `binaryTarget` URL
and compares sha256 against the pinned `checksum:` — exactly what SwiftPM does.

```bash
#!/usr/bin/env bash
# SwiftPM preflight for the bitHuman Swift package. Runs on ANY OS — no Xcode,
# no Mac. It does what SwiftPM does before Xcode ever opens:
#   1. resolve the tag your `from:` pin picks (the newest tag in that major)
#   2. read Package.swift at that tag
#   3. fetch every binaryTarget URL and check its sha256 against the pinned
#      `checksum:` — the same comparison SwiftPM makes
#
#   ./swiftpm-preflight.sh              # what `from: "2.11.0"` resolves today
#   FLOOR=9.9.9 ./swiftpm-preflight.sh  # control: a pin nothing can satisfy
#   TAG=v9.9.9  ./swiftpm-preflight.sh  # control: a tag that does not exist
set -u
PKG=https://github.com/bithuman-product/homebrew-bithuman.git
RAW=https://raw.githubusercontent.com/bithuman-product/homebrew-bithuman
FLOOR=${FLOOR:-2.11.0}
TAG=${TAG:-}
if [ -z "$TAG" ]; then
  TAG=$(git ls-remote --tags --refs "$PKG" | sed 's#.*refs/tags/##' \
        | grep -E "^v${FLOOR%%.*}\.[0-9]+\.[0-9]+$" | sort -V | tail -1)
  [ -n "$TAG" ] || { echo "from: \"$FLOOR\" resolves NOTHING — no tag in major ${FLOOR%%.*}"; exit 1; }
  echo "from: \"$FLOOR\"  ->  resolves $TAG"
fi
curl -fsS --max-time 60 "$RAW/$TAG/Package.swift" -o Package.swift \
  || { echo "Package.swift @ $TAG: NOT FETCHABLE (rc=$?)"; exit 1; }
echo "manifest        $TAG  ($(wc -l < Package.swift) lines)"
echo "products it vends:"
grep -oE '\.library\(name: "[A-Za-z0-9]+"' Package.swift | cut -d'"' -f2 | sort -u | sed 's/^/  /'
python3 - <<'PY' > targets.tsv
import re
src = open("Package.swift").read()
base = dict(re.findall(r'let (\w+Base) = "([^"]+)"', src))
tags = dict(re.findall(r'let (\w+Tag) = "([^"]+)"', src))
for k, v in base.items():
    for tk, tv in tags.items():
        v = v.replace("\\(%s)" % tk, tv)
    base[k] = v
for name, url, chk in re.findall(
        r'\.binaryTarget\(\s*name:\s*"([^"]+)",\s*url:\s*"([^"]+)",\s*checksum:\s*"([0-9a-f]+)"', src):
    for k, v in base.items():
        url = url.replace("\\(%s)" % k, v)
    print("%s\t%s\t%s" % (name, url, chk))
PY
rc=0
while IFS=$'\t' read -r name url want; do
  code=$(curl -sSL -o "$name.zip" -w '%{http_code}' --max-time 900 "$url")
  if [ "$code" != 200 ]; then echo "HTTP $code   $name  <- $url"; rc=1; continue; fi
  got=$(sha256sum "$name.zip" | cut -d' ' -f1)
  size=$(wc -c < "$name.zip")
  if [ "$want" = "$got" ]; then
    awk -v n="$name" -v s="$size" -v t="$(basename "$(dirname "$url")")" \
      'BEGIN { printf "OK  %-28s %7.1f MB  sha256 matches, from %s\n", n, s/1048576, t }'
  else echo "BAD CHECKSUM $name want=$want got=$got"; rc=1; fi
done < targets.tsv
exit $rc
```

```text
### ARM 1 — the pin a consumer writes
from: "2.11.0"  ->  resolves v2.13.8
manifest        v2.13.8  (798 lines)
products it vends:
  BithumanEngineProtocol
  bitHumanKit
  Essence2
  Expression2
OK  bitHumanKit                     53.0 MB  sha256 matches, from v2.4.0
OK  Expression2Binary                0.5 MB  sha256 matches, from v2.6.3
OK  BithumanEngineProtocolBinary     0.2 MB  sha256 matches, from v2.6.3
OK  UnifiedModelHeaderBinary         0.2 MB  sha256 matches, from v2.6.3
OK  libessence2                    163.3 MB  sha256 matches, from essence2-v1.9.0
OK  onnxruntime                     44.1 MB  sha256 matches, from essence2-v1.9.0
rc=0

### ARM 2 — control: a tag that does not exist
curl: (22) The requested URL returned error: 404
Package.swift @ v9.9.9: NOT FETCHABLE (rc=22)
rc=1

### ARM 3 — control: a pin nothing can satisfy
from: "9.9.9" resolves NOTHING — no tag in major 9
rc=1
```

Four things the passing arm tells you that "just add the package" does not:

- **`from: "2.11.0"` resolves `v2.13.8` today.** `from:` is a floor, not a pin:
  SwiftPM takes the newest tag below the next major. Write the floor, then run
  this to see what you actually get.
- **The tags carry a `v`.** The git tags are `v2.13.8`, `v2.13.7`, `v2.4.0`;
  SwiftPM reads them as semver, so `from: "2.11.0"` in `Package.swift` is right
  *and* `raw.githubusercontent.com/.../2.13.8/Package.swift` is a 404. Both are
  true at once.
- **The six binaries come off three different releases** — `v2.4.0`, `v2.6.3`
  and `essence2-v1.9.0` — even though you resolved `v2.13.8`. That is
  deliberate; see below.
- **`Expression2Binary` is 0.5 MB.** The whole engine. That is your first clue
  that the model weights are somewhere else; check 3 confirms it.

### The control that matters most: can the checksum compare go red?

Arms 2 and 3 prove the *fetch* can fail. They do not prove the *comparison*
can. Flip one hex digit of one pinned checksum and re-run the compare against
the same downloaded bytes:

```bash
sed 's/3722710998831779acc33e5f1c8e60a8af6ef6879764c26d9f1cbae717b78aea/4722710998831779acc33e5f1c8e60a8af6ef6879764c26d9f1cbae717b78aea/' \
    Package.swift > Package.mutated.swift
# …then run the same fetch-and-compare loop over Package.mutated.swift
```

```text
### ARM 4 — control: one hex digit changed in the pinned checksum
BAD CHECKSUM Expression2Binary want=472271099883… got=372271099883…
rc=1
```

So the six `OK` lines above are a finding, not a script that prints `OK`.

### Three release tags, and why that is not a mistake

`Package.swift` at `v2.13.8` declares three bases: `releaseTag = "v2.4.0"` for
the umbrella, `expression2Tag = "v2.6.3"` for the Expression 2 binaries, and
`essence2Tag = "essence2-v1.9.0"` for the two under `Essence2`. A single shared
tag would re-point `bitHumanKit.xcframework.zip` at a release that does not
carry it. Ask the releases directly — one byte each, so it costs nothing:

```bash
B=https://github.com/bithuman-product/homebrew-bithuman/releases/download
for f in v2.4.0/bitHumanKit.xcframework.zip \
         v2.6.3/Expression2.xcframework.zip \
         v2.6.3/UnifiedModelHeader.xcframework.zip \
         essence2-v1.9.0/libessence2.xcframework.zip \
         v2.13.8/bitHumanKit.xcframework.zip; do
  printf '%-48s -> ' "$f"
  curl -sSL -o /dev/null -w '%{http_code}\n' -r 0-0 "$B/$f"
done
```

```text
v2.4.0/bitHumanKit.xcframework.zip               -> 206
v2.6.3/Expression2.xcframework.zip               -> 206
v2.6.3/UnifiedModelHeader.xcframework.zip        -> 206
essence2-v1.9.0/libessence2.xcframework.zip      -> 206
v2.13.8/bitHumanKit.xcframework.zip              -> 404
```

`206` is a satisfied range request — the asset is there. The `404` on the last
line is what a single-tag manifest would have pointed every existing consumer
at. SwiftPM reads absolute asset URLs out of whichever manifest it resolves, so
an asset does not have to live on the resolved tag.

**Write `from: "2.11.0"`** and let it resolve forward; the products you attach
are on [Swift SDK → Install](/sdk/ios#install).

---

## Check 2 — which `bithuman` wheel will pip pick on a Mac?

`pip download` resolves for a target platform without installing anything, so
you can answer this from Linux, from CI, from a Windows box.

```bash
#!/usr/bin/env bash
# Which bithuman wheel will pip pick on a Mac? Runs on any OS — `pip download`
# resolves for a target platform without installing anything.
set -u
PLAT=${PLAT:-macosx_14_0_arm64}          # Apple Silicon, macOS 14+
PY=${PY:-3.12}
rm -rf wheels && mkdir wheels
python3 -m pip download --no-deps --no-cache-dir --only-binary=:all: \
        --platform "$PLAT" --python-version "$PY" -d wheels bithuman 2>&1 | tail -3
rc=$?
whl=$(ls wheels/*.whl 2>/dev/null | head -1) || true
[ -n "${whl:-}" ] || { echo "no wheel resolved"; exit 1; }
echo "resolved: $(basename "$whl")"
echo "engines inside it:"
unzip -l "$whl" | grep -E 'lible_core|libessence|libonnxruntime|_core\.' | awk '{printf "  %-52s %8.1f KB\n", $4, $1/1024}'
exit $rc
```

```text
### ARM 1 — Apple Silicon Mac (macosx_14_0_arm64)
   ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ 31.8/31.8 MB 97.8 MB/s eta 0:00:00
Saved ./wheels/bithuman-2.11.6-cp312-cp312-macosx_14_0_arm64.whl
Successfully downloaded bithuman
resolved: bithuman-2.11.6-cp312-cp312-macosx_14_0_arm64.whl
engines inside it:
  bithuman/_core.cpython-312-darwin.so                   2364.0 KB
  bithuman/.dylibs/libonnxruntime.1.26.0.dylib          36421.0 KB
  bithuman/lib/lible_core.dylib                          1289.7 KB
rc=0

### ARM 2 — control: an Intel Mac (macosx_13_0_x86_64), wheels only
   ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ 2.2/2.2 MB 109.7 MB/s eta 0:00:00
Saved ./wheels/bithuman-1.5.0-cp312-cp312-macosx_10_13_x86_64.whl
Successfully downloaded bithuman
resolved: bithuman-1.5.0-cp312-cp312-macosx_10_13_x86_64.whl
engines inside it:
rc=0
```

**Arm 2 is the trap, and it exits 0** — but only because the script passes
`--only-binary=:all:`, which many CI templates do: told to consider wheels
alone, pip walks back to the newest Intel-Mac wheel PyPI still has, a 1.x
release from a different generation with none of the engine libraries in it.
There is no macOS x86_64 wheel for 2.x: the current wheels are
`macosx_14_0_arm64` for cp310–cp314, plus manylinux x86_64/aarch64. **Apple
Silicon, macOS 14 or newer.** Pin `bithuman>=2.10` if you want the resolver to
say so out loud.

A plain `pip install bithuman` on that Intel Mac no longer falls into the trap.
Since 2026-09-20 the release also carries a source distribution — 2 kB, no
engine — that exists only to refuse, and pip prefers the newest version that has
*any* distribution, so it picks 2.11.6 and the build stops at the guard's first
line. The third arm is the same resolve without `--only-binary`:

```bash
python3 -m pip download --no-deps --no-cache-dir --platform macosx_13_0_x86_64 \
        --python-version 3.12 -d wheels bithuman 2>&1 | grep -E 'Downloading|NO WHEEL|^error:' | uniq
echo "rc=${PIPESTATUS[0]}"
```

```text
### ARM 3 — the same Intel Mac, sdist allowed (what `pip install bithuman` does)
  Downloading bithuman-2.11.6.tar.gz (2.1 kB)
        bithuman 2.11.6 has NO WHEEL for this platform.
error: subprocess-exited-with-error
rc=1
```

Before that date the plain install did what arm 2 does — it resolved an old 1.x
silently and exited 0. Now it names the supported set, says that nothing was
installed, and exits 1.

The arm-1 listing is also how you can tell the wheel is self-contained: it
vendors its own `libonnxruntime.1.26.0.dylib` next to the engine, so it does not
depend on whatever ONNX Runtime is on the machine.

> **One more thing, if you are on a stock Debian or Ubuntu box.** `pip install`
> into the system Python fails there with
> `error: externally-managed-environment`. Make a virtual environment first:
> `python3 -m venv .venv && . .venv/bin/activate`. `pip download` above needs
> none of that — it only writes files into a directory.

> **`lible_core.dylib` is a retired name you will see on disk.** `le` is the old
> internal spelling for what is now [**Essence 2**](/concepts/essence-2). The
> filename inside the wheel is a frozen carrier and is not being renamed; you
> will meet it in stack traces and `otool` output. The browser bundle had the
> same problem and it is now fixed at the source: that URL is `essence2-web`
> today, and the old path still serves the same bytes forever — see the
> [browser bundle check](/examples/browser-webgpu-check).

---

## Check 3 — what is actually inside the shipped `Expression2` binary?

Unzip it and look. This answers three questions people keep asking us by email.

```bash
#!/usr/bin/env bash
# What is actually inside the shipped Expression2 binary — runs on any OS.
# Answers: which CoreML compute units it accepts, which env vars it reads,
# and whether any model weights ship with it.
# TAG is the Expression 2 release the current manifest points at
# (`expression2Tag` in Package.swift — check 1 prints it as "from v2.6.3").
set -eu
TAG=${TAG:-v2.6.3}
URL=https://github.com/bithuman-product/homebrew-bithuman/releases/download/$TAG/Expression2.xcframework.zip
curl -fsSL --max-time 300 "$URL" -o Expression2.zip
rm -rf Expression2.xcframework && unzip -qo Expression2.zip
BIN=Expression2.xcframework/macos-arm64/Expression2.framework/Expression2
echo "slices:"; ls -1 Expression2.xcframework | grep -v Info.plist | sed 's/^/  /'
echo "binary: $(wc -c < "$BIN") bytes   (whole .xcframework: $(du -sh Expression2.xcframework | cut -f1))"
echo
echo "CoreML compute-unit tokens it accepts:"
strings -n 4 "$BIN" | grep -x -E 'cpuAndNE|cpuOnly|cpuAndGPU|all' | sort -u | sed 's/^/  /'
echo "env vars it reads:"
strings -n 6 "$BIN" | grep -x -E '(BITHUMAN|EXPRESSION2|EMBODY)_[A-Z0-9_]+' | sort -u | sed 's/^/  /'
echo "model weights shipped with the code:"
find Expression2.xcframework \( -name '*.mlmodelc' -o -name '*.mlpackage' -o -name '*.bin' -o -name '*.weights' \) | sed 's/^/  /'
echo "  (nothing listed above = code only, no weights)"
```

```text
slices:
  ios-arm64
  ios-arm64-simulator
  macos-arm64
binary: 528512 bytes   (whole .xcframework: 2.3M)

CoreML compute-unit tokens it accepts:
  cpuAndNE
  cpuOnly
env vars it reads:
  BITHUMAN_EMBODY_DIR
  BITHUMAN_EXPRESSION2_DIR
  EMBODY_DEBUG_FAIL_PREDICT
  EXPRESSION2_ATOK_CU
  EXPRESSION2_AUDIO_PREPROC
  EXPRESSION2_CTX_SEED
  EXPRESSION2_DEBUG_FAIL_PREDICT
  EXPRESSION2_DECP2_V3_CU
  EXPRESSION2_DUMP_DIR
  EXPRESSION2_GRAPH_LIVENESS
  EXPRESSION2_MLMODELC_CACHE
  EXPRESSION2_MLMODELC_CACHE_KEEP
  EXPRESSION2_ONSET
  EXPRESSION2_SHARED_W2V
  EXPRESSION2_SHARPEN
  EXPRESSION2_STUDENT_CU
  EXPRESSION2_W2V_CU
model weights shipped with the code:
  (nothing listed above = code only, no weights)
rc=0
```

### What the three answers mean

**1. There are no weights.** 528 KB of arm64 code across three slices and not
one `.mlpackage`. The engine looks for a per-identity CoreML bundle — the
container you download, or a directory you unpacked — and `isReady` stays
`false` until it finds one. That is the expected state on a clean machine, not a
misconfiguration. See [Swift SDK → Get a model](/sdk/ios#get-a-model) for the
three anonymous downloads that give it one.

**2. The compute unit is a knob, per model, and it is Apple's spelling.** The
`*_CU` variables select the CoreML compute units for the graphs —
`EXPRESSION2_W2V_CU` (the speech front end), `EXPRESSION2_ATOK_CU` (audio
tokenizer), `EXPRESSION2_STUDENT_CU` (the per-frame student). The tokens this
binary carries are **`cpuAndNE`** and **`cpuOnly`** — Apple's own
`MLComputeUnits` vocabulary, which we do not rename. Note what is *absent*:
`cpuAndGPU` does not appear, even though it is the value our own Apple serve
host sets for two of its members.

> **We target Apple Silicon, not one unit inside it.** Which unit runs the work
> is a measured, per-model choice — the Neural Engine for one model, the GPU or
> the CPU for another — and it changes when the measurement changes.
> `MLComputeUnits.cpuAndNeuralEngine`, `cpuAndNE`, `cpuAndGPU` are **Apple's**
> API identifiers and keep Apple's spelling.

**3. `EMBODY` is a retired name still in the binary.** `BITHUMAN_EMBODY_DIR` and
`EMBODY_DEBUG_FAIL_PREDICT` are the pre-rename spellings of the `EXPRESSION2_*`
pair beside them, and the engine's log lines are still prefixed `[embody]` — so
that is what you will see in Console.app:

```text
[embody] warmUp done in %.1fs
[embody] dec_p2 per-identity decoder ACTIVE (%@)
[embody] shared w2v loaded ONCE for this process (EXPRESSION2_SHARED_W2V)
[embody] %@ loaded on %@ and COMPUTES NOTHING (%@)
```

`embody` is [deprecated](/concepts/models-v2) — the product is **Expression
2** — but grep your logs for `[embody]`, not `[expression2]`. **Set
`BITHUMAN_EXPRESSION2_DIR`**, not the `EMBODY` one.

---

## The Swift code — COMPILED AND RUN

The transcripts above come from Linux. This section does not: it was resolved,
built and executed on **macOS 26.6.2, Xcode 26.4.1, Apple Silicon** on
**2026-09-03**, against the then-current tag `v2.5.1`. It has not been re-run
since, and it is labelled rather than refreshed.

```swift
import Expression2

let engine = Expression2Engine()
engine.warmUp()
print(engine.isReady)      // false on a clean machine — see check 3
engine.feed(samples)       // [Float] PCM
while let (frame, speech) = engine.pull() {
    // frame: [UInt8], engine.width x engine.height
}
```

What that actually did, rc read directly rather than through a pipe:

```text
swift package resolve   rc=0   Computed homebrew-bithuman at 2.5.1
                               3 binary artifacts fetched
swift build             rc=0   Build complete
./.build/debug/App      rc=0   EXPRESSION2 OK isReady=false w=416 h=720

# control — ask for `Expression`, a product the package does not vend
swift package resolve   rc=0   ← resolve does NOT check product names
swift build             rc=1   error: product 'Expression' required by package
                               'consumer' target 'App' not found in package
                               'homebrew-bithuman'.
# restore the correct product name
swift build             rc=0
```

Two things worth taking from the control arm. The engine really does construct
and report its frame geometry (416×720) with **no model bundle present** —
`isReady=false` is the engine telling you it found no weights, not a failure to
load. And a wrong product name survives `resolve` and only dies at `build`, so a
preflight that stops at `resolve` will wave it through.

**Those calls are still in the shipped interface.** Read out of
`Expression2.framework/Modules/Expression2.swiftmodule/arm64-apple-ios.swiftinterface`
in the `v2.6.3` archive — the one check 1 fetched — on 2026-09-21:

```swift
public init()
final public func warmUp(warmSpeech: [Swift.Float]? = nil)
final public var isReady: Swift.Bool { get }
final public func feed(_ samples: [Swift.Float])
final public func flushTail()
final public func pull() -> (frame: [Swift.UInt8], speech: Swift.Bool)?
public static func create(modelPath: Foundation.URL, sharedEngineDir: Foundation.URL? = nil,
                          warmSpeech: [Swift.Float]? = nil) throws -> Expression2Engine
public static func create(avatarContainer: Foundation.URL, sharedEngineContainer: Foundation.URL? = nil,
                          sharedEngineDir: Foundation.URL? = nil, stagingDir: Foundation.URL,
                          warmSpeech: [Swift.Float]? = nil) throws -> Expression2Engine
```

The second `create` is the one to use today: it opens the `.imx` container the
download endpoint serves, with no unpacking step of your own
([minimal code](/sdk/ios#minimal-code)).

**UNVERIFIED** — not compiled or run here. Point the engine at an unpacked
bundle and pick a compute unit:

```bash
export BITHUMAN_EXPRESSION2_DIR="$HOME/expression2-bundles/<identity>"
export EXPRESSION2_W2V_CU=cpuOnly        # tokens: cpuAndNE | cpuOnly
```

**Needs a credential?** Not for any of this. Resolving the package, downloading
its binaries, and downloading a showcase identity are all anonymous — verified
in checks 1 and 2 above and on [Get a model](/sdk/ios#get-a-model), with no
account and no key. Two things do need one: downloading **your own** agent's
model, and a metered render. `bitHumanKit`'s lip-synced avatar mode reads
`BITHUMAN_API_KEY` (the Swift rail's spelling; every other surface reads
`BITHUMAN_API_SECRET` — same value) and throws `.missingAPIKey` without it.
Audio-only voice runs keyless and unmetered.

## Where to go next

- [Swift SDK](/sdk/ios) — the full Apple rail: requirements, products, models, errors.
- [Browser — check before you ship](/examples/browser-webgpu-check) — the same
  treatment for the browser path.
- [Swift / iOS — a talking avatar on the iPhone you have](/examples/swift-ios-expression2) — the app this preflight clears the way for.
- [Swift / iOS — Hello, avatar](/examples/swift-ios-hello) — the voice-agent walkthrough.
