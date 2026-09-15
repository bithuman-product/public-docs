---
title: "Browser — check before you ship"
description: "Two copy-paste checks before you point a customer at browser rendering: does this browser have a usable GPU, and are the runtime files you serve the ones we published."
section: examples
group: "Examples"
order: 16
---

## What this page is

Two checks to run before you point a customer at
[`?render=local`](/guides/browser-rendering). Both are copy-paste and neither
needs an account or an API key.

## Check 1 — does this browser have a usable GPU?

This is the one that matters. The failure is silent in the worst way:
**`navigator.gpu` exists on machines that cannot actually grant a GPU.** A
feature test written as `if (navigator.gpu)` passes, and then lip-sync does not
run.

Save this as `webgpu-probe.html` and open it in the browser you care about:

```html
<!doctype html>
<meta charset="utf-8">
<title>bitHuman — real-WebGPU probe</title>
<style>body{font:14px/1.6 ui-monospace,SFMono-Regular,Menlo,monospace;padding:2rem}</style>
<h1>Does this browser have a REAL WebGPU adapter?</h1>
<pre id="out">running…</pre>
<script>
(async () => {
  // Headless harness only: ?hold=<url> keeps a pending image so the `load`
  // event cannot fire before requestAdapter() resolves. Ignored otherwise.
  const hold = new URLSearchParams(location.search).get("hold");
  if (hold) { const im = new Image(); im.src = hold; }

  const L = [];
  const has = typeof navigator.gpu !== "undefined";
  L.push("navigator.gpu present : " + has);

  let adapter = null, fallback = null;
  if (has) {
    const once = async () => {
      try { return (await navigator.gpu.requestAdapter()) ?? null; } catch (e) { return null; }
    };
    const first = await once();
    // Cold-call retry: the FIRST requestAdapter() of a browser session resolves
    // null while the GPU process is still starting, then succeeds on the next.
    adapter = first === null ? await once() : first;
    L.push("requestAdapter()      : " + (adapter ? "GPUAdapter" : "null"));
    if (adapter) {
      fallback = adapter.isFallbackAdapter === true ||
                 adapter.info?.isFallbackAdapter === true;
      L.push("isFallbackAdapter     : " + fallback);
    }
  }
  const real = adapter !== null && fallback === false;
  L.push("REAL WebGPU adapter   : " + real);
  L.push("");
  L.push(real
    ? "=> essence-2 local LIPSYNC will run (w2v on WebGPU)."
    : "=> essence-2 local lipsync is OFF on this browser. Essence 2 still" +
      "\n   renders on wasm; you get living idle + TTS audio, no local lipsync.");
  document.getElementById("out").textContent = L.join("\n");
})();
</script>
```

Two things trip up the obvious version of this function, and both are handled
above:

- **Retry once on `null`.** The *first* request of a browser session can come
  back empty while the GPU process is still starting, then succeed on the next
  call. A one-shot probe reports "no GPU" on hardware that has one.
- **Check both flag locations.** Chromium moved the "this is a software
  renderer" flag between two objects. Read only one and a software renderer
  reads as real — and on a software renderer this path is *slower* than not
  using it at all.

A real adapter means local lip-sync will run. Without one, an `?render=local`
session still renders — you get the living idle loop and the agent's speech —
but the lip-sync is off. [What that means for your
agent](/guides/browser-rendering#what-the-browser-needs).

### Running it in CI

Open the file in headless Chrome and read the last line. If your CI reports "no
GPU" on a machine that demonstrably has one, **suspect the launch configuration
before the driver**: on one host, with one Chrome binary and one set of flags, a
GPU was granted under one headless launcher and refused under another.

## Check 2 — are the runtime files you serve the ones we published?

Only needed if you **mirror the browser runtime onto your own origin** rather
than loading it from ours. The files are static and anonymous, so nothing on the
wire tells you they arrived intact; the bundle publishes a `manifest.json` with
a checksum per file.

```bash
#!/usr/bin/env bash
# Verify the essence-2 browser runtime you are about to load is the one we
# published. No API key, no account: these are static, anonymous files.
#   ./verify.sh            fetch, then hash-check against the manifest
#   FETCH=0 ./verify.sh    re-check what is already on disk (control arm)
set -u
BASE=https://models.bithuman.ai/web/essence2-web-v0.1.1
FILES="index.js ort/ort.min.mjs ort/ort-wasm-simd-threaded.mjs ort/ort-wasm-simd-threaded.jsep.mjs"
if [ "${FETCH:-1}" = 1 ]; then
  curl -fsS --max-time 60 "$BASE/manifest.json" -o manifest.json || { echo "manifest FETCH-FAILED"; exit 1; }
  for f in $FILES; do
    mkdir -p "$(dirname "$f")"
    curl -fsS --max-time 180 "$BASE/$f" -o "$f" || { echo "FETCH-FAILED $f"; exit 1; }
  done
fi
rc=0
for f in $FILES; do
  want=$(python3 -c 'import json,sys;print(json.load(open("manifest.json"))["files"][sys.argv[1]]["sha256"])' "$f")
  got=$(sha256sum "$f" | cut -d" " -f1)
  if [ "$want" = "$got" ]; then echo "OK       $f"
  else echo "MISMATCH $f"; echo "         want $want"; echo "         got  $got"; rc=1; fi
done
exit $rc
```

`FETCH=0 ./verify.sh` re-checks what is already on disk, so you can prove the
script works: append a byte to one of the files, run it again, and the line for
that file must change to `MISMATCH`. If it still prints `OK`, the script is not
checking what you think it is.

> **You no longer have to type `libelevate-web`.** The bundle is published at
> `models.bithuman.ai/web/essence2-web-v0.1.1/…`, named for the product,
> [Essence 2](/concepts/essence-2). The older
> `models.bithuman.ai/web/libelevate-web-v0.1.0/…` path carries the **same
> bytes** — every file has the same `sha256` in both manifests — and it is
> frozen, not redirected: saved links and already-deployed pages keep resolving
> it forever. Use the new URL in anything you write today; leave the old one
> where it already works.

## What to do with the answers

- **Never gate on `navigator.gpu`.** Gate on an adapter that came back and is
  not a software one. Check 1 is the whole predicate.
- **Send the two isolation headers** if you host the page yourself —
  `Cross-Origin-Opener-Policy: same-origin` and `Cross-Origin-Embedder-Policy:
  credentialless`. Without them the renderer is limited to one thread and runs
  several times slower, and for `expression-2` an un-isolated page is worse than
  a slow render: a visitor without a usable GPU is refused browser rendering
  outright and falls back to the cloud.
- **Measure before assuming a GPU is the fast path.** It depends on the model
  and the machine. The downloadable runtime's `demo.html` gives you the numbers
  for your own hardware — see [Browser runtime](/sdk/web).

## Where to go next

- [Browser rendering](/guides/browser-rendering) — what runs where, what it needs, and what it bills.
- [Browser runtime](/sdk/web) — the runtime these checks fetch.
- [Apple — check before you ship](/examples/apple-swiftpm-check) — the same treatment for the Apple side.
