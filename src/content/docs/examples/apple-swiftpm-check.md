---
title: "Apple — check before you ship"
description: "Preflight the macOS and iOS rail from any machine: will the SwiftPM package resolve, which wheel does pip pick on a Mac, and what is actually inside the shipped Expression2 binary. Every transcript here was produced by running the snippet."
section: examples
group: "Examples"
order: 17
---

## What this page is

Three checks for the Apple rail that you can run **from any operating system**,
before you open Xcode. Each has a control arm.

> **Provenance, and the honest limit.** The transcripts below were produced by
> running the snippets exactly as printed, on Ubuntu 26.04 / Python 3.14 /
> curl 8.18, on 2026-09-02. Exit codes are real.
>
> **No Mac was involved.** Everything on this page inspects Apple artifacts
> *without executing them* — a resolve preflight, a wheel resolution, a binary
> inspection. The Swift snippets in the last section were **not compiled or
> run** and are marked **UNVERIFIED** individually. If a page ever shows you a
> Swift transcript, ask which Mac produced it.

---

## Check 1 — will the SwiftPM package resolve?

Xcode's failure here is slow and unhelpful. The check is fast: read the manifest
at the tag you would pin, fetch every `binaryTarget` URL it declares, and
compare sha256 against the pinned `checksum:` — which is exactly what SwiftPM
does.

```bash
#!/usr/bin/env bash
# SwiftPM preflight for bitHumanKit / Expression2 — runs on ANY OS.
# It does exactly what SwiftPM does before Xcode ever opens: read the
# manifest at the tag you would pin, fetch every binaryTarget URL it
# declares, and check the sha256 against the pinned `checksum:`.
#   ./swiftpm-preflight.sh          # the tag you should pin
#   TAG=v9.9.9 ./swiftpm-preflight.sh   # control: a tag that does not exist
set -u
REPO=https://raw.githubusercontent.com/bithuman-product/homebrew-bithuman
TAG=${TAG:-v2.5.1}
curl -fsS --max-time 60 "$REPO/$TAG/Package.swift" -o Package.swift \
  || { echo "Package.swift @ $TAG: NOT FETCHABLE (rc=$?)"; exit 1; }
echo "manifest        $TAG  ($(wc -l < Package.swift) lines)"
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
  code=$(curl -sSL -o "$name.zip" -w '%{http_code}' --max-time 600 "$url")
  if [ "$code" != 200 ]; then echo "HTTP $code   $name  <- $url"; rc=1; continue; fi
  got=$(sha256sum "$name.zip" | cut -d' ' -f1)
  size=$(wc -c < "$name.zip")
  if [ "$want" = "$got" ]; then printf 'OK  %-28s %8.1f MB  sha256 matches manifest\n' "$name" "$(echo "$size/1048576" | bc -l)"
  else echo "BAD CHECKSUM $name want=$want got=$got"; rc=1; fi
done < targets.tsv
exit $rc
```

```text
### ARM 1 — the tag you pin
manifest        v2.5.1  (235 lines)
OK  bitHumanKit                      53.0 MB  sha256 matches manifest
OK  Expression2                       0.3 MB  sha256 matches manifest
OK  BithumanEngineProtocolBinary      0.1 MB  sha256 matches manifest
rc=0

### ARM 2 — control: a tag that does not exist
curl: (22) The requested URL returned error: 404
Package.swift @ v9.9.9: NOT FETCHABLE (rc=22)
rc=1

### ARM 3 — control: the 0.8.x numbers that predate this repo
curl: (22) The requested URL returned error: 404
Package.swift @ 0.8.2: NOT FETCHABLE (rc=22)
rc=1
```

Three things the passing arm tells you that a "just add the package" instruction
does not:

- **The tags carry a `v`.** The git tags are `v2.5.1`, `v2.5.0`, `v2.4.0`; SwiftPM
  reads those as semver, so `from: "2.5.1"` in `Package.swift` is right *and*
  `raw.githubusercontent.com/.../2.5.1/...` is a 404. Both are true at once.
- **`bitHumanKit.xcframework.zip` downloads from the `v2.4.0` release even
  though you pin `2.5.1`.** That is deliberate — see below.
- **`Expression2` is 0.3 MB.** The whole engine binary. That is your first clue
  that the model weights are somewhere else; check 3 confirms it.

### The two-tag layout, and why it is not a mistake

`Package.swift` at `v2.5.1` declares two bases: `releaseTag = "v2.4.0"` for the
umbrella and `expression2Tag = "v2.5.0"` for the Expression 2 binaries. A single
shared tag would re-point `bitHumanKit.xcframework.zip` at a release that does
not carry it. Ask the releases directly — one byte each, so it costs nothing:

```bash
B=https://github.com/bithuman-product/homebrew-bithuman/releases/download
for f in v2.4.0/bitHumanKit.xcframework.zip \
         v2.5.0/Expression2.xcframework.zip \
         v2.5.0/BithumanEngineProtocol.xcframework.zip \
         v2.5.0/bitHumanKit.xcframework.zip; do
  printf '%-46s -> ' "$f"
  curl -sSL -o /dev/null -w '%{http_code}\n' -r 0-0 "$B/$f"
done
```

```text
v2.4.0/bitHumanKit.xcframework.zip             -> 206
v2.5.0/Expression2.xcframework.zip             -> 206
v2.5.0/BithumanEngineProtocol.xcframework.zip  -> 206
v2.5.0/bitHumanKit.xcframework.zip             -> 404
```

`206` is a satisfied range request — the asset is there. The `404` on the last
line is what the single-tag version of this manifest would have pointed every
existing consumer at. SwiftPM reads absolute asset URLs out of whichever
manifest it resolves, so an asset does not have to live on the resolved tag.
**Pin `2.5.1`.**

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
   ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ 27.7/27.7 MB 106.6 MB/s  0:00:00
Saved ./wheels/bithuman-2.10.0-cp312-cp312-macosx_14_0_arm64.whl
Successfully downloaded bithuman
resolved: bithuman-2.10.0-cp312-cp312-macosx_14_0_arm64.whl
engines inside it:
  bithuman/_core.cpp                                       36.8 KB
  bithuman/_core.cpython-312-darwin.so                   2338.9 KB
  bithuman/.dylibs/libonnxruntime.1.27.0.dylib          18786.3 KB
  bithuman/lib/lible_core.dylib                           814.9 KB
rc=0

### ARM 2 — control: an Intel Mac (macosx_13_0_x86_64)
   ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ 3.5/3.5 MB 34.2 MB/s  0:00:00
Saved ./wheels/bithuman-1.10.7-cp312-cp312-macosx_10_13_x86_64.whl
Successfully downloaded bithuman
resolved: bithuman-1.10.7-cp312-cp312-macosx_10_13_x86_64.whl
engines inside it:
rc=0
```

**Arm 2 is the trap, and it exits 0.** On an Intel Mac `pip install bithuman`
does not fail — it silently resolves **1.10.7**, a release from a different
generation, with none of the engine libraries in it. There is no macOS x86_64
wheel for 2.x: the current wheels are `macosx_14_0_arm64` for cp310–cp314, plus
manylinux x86_64/aarch64. **Apple Silicon, macOS 14 or newer.** Pin
`bithuman>=2.10` if you want the resolver to say so out loud.

The arm-1 listing is also how you can tell that the wheel is self-contained: it
vendors its own `libonnxruntime.1.27.0.dylib` next to the engine, so it does not
depend on whatever ONNX Runtime is on the machine.

> **`lible_core.dylib` is a retired name you will see on disk.** `le` is the old
> internal spelling for what is now [**Essence 2**](/concepts/essence-2). The
> filename inside the wheel is a frozen carrier and is not being renamed; you
> will meet it in stack traces and `otool` output. Same family as
> `libelevate-web` in the [browser bundle URL](/examples/browser-webgpu-check).

---

## Check 3 — what is actually inside the shipped `Expression2` binary?

Unzip it and look. This answers three questions people keep asking us by email.

```bash
#!/usr/bin/env bash
# What is actually inside the shipped Expression2 binary — runs on any OS.
# Answers: which CoreML compute units it accepts, which env vars it reads,
# and whether any model weights ship with it.
set -eu
TAG=${TAG:-v2.5.1}
URL=https://github.com/bithuman-product/homebrew-bithuman/releases/download/$TAG/Expression2.xcframework.zip
curl -fsSL --max-time 300 "$URL" -o Expression2.zip
unzip -qo Expression2.zip
BIN=Expression2.xcframework/macos-arm64/Expression2.framework/Expression2
echo "slices:"; ls -1 Expression2.xcframework | grep -- '-'
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
binary: 284984 bytes   (whole .xcframework: 1.1M)

CoreML compute-unit tokens it accepts:
  cpuAndNE
  cpuOnly
env vars it reads:
  BITHUMAN_EMBODY_DIR
  BITHUMAN_EXPRESSION2_DIR
  EMBODY_DEBUG_FAIL_PREDICT
  EXPRESSION2_ATOK_CU
  EXPRESSION2_DEBUG_FAIL_PREDICT
  EXPRESSION2_DUMP_DIR
  EXPRESSION2_GRAPH_LIVENESS
  EXPRESSION2_MLMODELC_CACHE
  EXPRESSION2_SHARED_W2V
  EXPRESSION2_SHARPEN
  EXPRESSION2_STUDENT_CU
  EXPRESSION2_W2V_CU
model weights shipped with the code:
  (nothing listed above = code only, no weights)
rc=0
```

### What the three answers mean

**1. There are no weights.** 285 KB of arm64 code across three slices and not
one `.mlpackage`. `Expression2Engine()` takes no model path — it looks for a
per-identity CoreML bundle in `$BITHUMAN_EXPRESSION2_DIR` or your app bundle,
and `isReady` stays `false` until it finds one. That is the expected state on a
clean machine, not a misconfiguration. See
[Swift SDK → Expression 2 on-device](/sdk/swift#expression-2-on-device) for how
to get a bundle.

**2. The compute unit is a knob, per model, and it is Apple's spelling.** The
three `*_CU` variables select the CoreML compute units for the three graphs —
`EXPRESSION2_W2V_CU` (the 46 MB speech front-end), `EXPRESSION2_ATOK_CU` (audio
tokenizer), `EXPRESSION2_STUDENT_CU` (the per-frame student). The tokens the
shipped v2.5.0 binary carries are **`cpuAndNE`** and **`cpuOnly`** — Apple's
own `MLComputeUnits` vocabulary, which we do not rename. Note what is *absent*:
`cpuAndGPU` does not appear in this binary, even though it is the value our own
Apple serve host sets for two of its members. The on-device default is
`cpuAndNE`, and on a real iPhone 15 measurement 577 of 611 operations landed on
the Neural Engine.

> **We target Apple Silicon, not one unit inside it.** Which unit runs the work
> is a measured, per-model choice — the Neural Engine for one model, the GPU or
> the CPU for another — and it changes when the measurement changes.
> `MLComputeUnits.cpuAndNeuralEngine`, `cpuAndNE`, `cpuAndGPU` are **Apple's**
> API identifiers and keep Apple's spelling. See [Swift SDK →
> Compute units](/sdk/swift#compute-units-are-a-measured-choice).

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
2026-09-03. Add the package
(`https://github.com/bithuman-product/homebrew-bithuman.git`, from `2.5.1`),
attach the `Expression2` product, then:

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

# control — ask for `Expression`, the product the old manifest advertised
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

**UNVERIFIED.** Point the engine at a bundle and pick a compute unit:

```bash
export BITHUMAN_EXPRESSION2_DIR="$HOME/expression2-bundles/<identity>"
export EXPRESSION2_W2V_CU=cpuOnly        # tokens: cpuAndNE | cpuOnly
```

**Needs a credential?** No — for `Expression2` and for on-device voice chat
without an avatar. `bitHumanKit`'s lip-synced avatar mode does: export
`BITHUMAN_API_KEY` (the Swift rail's spelling; every other surface reads
`BITHUMAN_API_SECRET` — same value) before `chat.start()`, or it throws
`.missingAPIKey`. Audio-only voice runs keyless and unmetered.

## Where to go next

- [Swift SDK](/sdk/swift) — the full Apple rail, what ships and what does not.
- [Browser — check before you ship](/examples/browser-webgpu-check) — the same
  treatment for the browser path.
- [Swift / iOS — Hello, avatar](/examples/swift-ios-hello) — the walkthrough app.
