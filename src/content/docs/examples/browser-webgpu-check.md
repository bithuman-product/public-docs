---
title: "Browser — check before you ship"
description: "Four copy-paste checks for in-browser rendering, covering essence-2 and expression-2: is the bundle you fetched the one we published, does this browser have a real WebGPU adapter, is WebGPU actually faster here, and which runtime tier will expression-2 pick. Every transcript on this page was produced by running the snippet."
section: examples
group: "Examples"
order: 16
---

## What this page is

Four checks you can run before you point a customer at
[`?render=local`](/guides/browser-rendering). Each one ships with a **control
arm** — a deliberately broken variant — because the failure that costs you a
day is the one that looks like success.

> ### Which family each check is about
>
> `?render=local` is **one switch**, and the **agent's model** picks the
> renderer ([the table](/guides/browser-rendering#one-switch-and-the-model-picks-the-renderer)).
> The two second-generation families both render in the browser and they do not
> share an engine, so a check that answers for one does not automatically
> answer for the other:
>
> | Check | [essence-2](/concepts/essence-2) | [expression-2](/concepts/expression-2) |
> |---|---|---|
> | 1 — bundle integrity | **yes** — this is the runtime it fetches | **no**: there is no standalone expression-2 runtime published to hash-check. Its per-identity bundles are fetched by the viewer, not by you |
> | 2 — real WebGPU adapter | **yes** | **yes** — and it is the check that decides most for this family, because the same non-fallback-adapter predicate is what the shipped expression-2 gate uses |
> | 3 — is WebGPU faster | **yes** — the transcripts are essence-2 models | **no** — it benchmarks the essence-2 bundle. Do not read its numbers onto expression-2 |
> | 4 — which runtime tier | — (essence-2 has no tier gate; its stage-to-backend map is fixed) | **yes** |
>
> ★ **expression-2 is the bigger published surface of the two in the browser** —
> **79** identities with a published web bundle against essence-2's **7**
> ([counted from the mirror](/guides/browser-webgpu#whether-it-will-work-for-your-agent)),
> so a page that covered only essence-2 was covering the smaller half.
> [essence-1](/concepts/essence-1) renders in the browser too, on WASM only and
> from its own `.imx` pipeline — none of these four checks describe it.
> [expression-1](/concepts/expression-1) has no browser renderer at all.

> **Provenance.** Every transcript below was produced by running the snippet
> exactly as printed, on Ubuntu 26.04 / Google Chrome 148.0.7778.178 /
> Python 3.14 / curl 8.18, on 2026-09-02. Exit codes are the real ones. Where a
> check cannot run on this machine it is marked **UNVERIFIED** and says why.
> Numbers you measure on your own hardware will differ; the *shape* of the
> result is what to compare.

---

## Check 1 — is the runtime you fetched the one we published?

**Applies to [essence-2](/concepts/essence-2).** There is no standalone
[expression-2](/concepts/expression-2) runtime published to hash-check.

The browser runtime is static files on `models.bithuman.ai`. There is **no API
key and no account** in this path — anyone can fetch them, and nothing on the
wire tells you they arrived intact. The bundle publishes a `manifest.json` with
a sha256 per file; check against it.

```bash
#!/usr/bin/env bash
# Verify the essence-2 browser runtime you are about to load is the one we
# published. No API key, no account: these are static, anonymous files.
#   ./verify.sh            fetch, then hash-check against the manifest
#   FETCH=0 ./verify.sh    re-check what is already on disk (control arm)
set -u
BASE=https://models.bithuman.ai/web/libelevate-web-v0.1.0
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

What it printed:

```text
### ARM 1 — as published
OK       index.js
OK       ort/ort.min.mjs
OK       ort/ort-wasm-simd-threaded.mjs
OK       ort/ort-wasm-simd-threaded.jsep.mjs
rc=0

### ARM 2 — one byte appended, no re-fetch
MISMATCH index.js
         want 459957c4a90c1ef844933a41ed52bdf7a804ed26e4aea5d0c57d6931011ae2c1
         got  41764db978510b081fdbcb6cf34accba96e54e4f3cf18f263f9ba38ec53cf244
OK       ort/ort.min.mjs
OK       ort/ort-wasm-simd-threaded.mjs
OK       ort/ort-wasm-simd-threaded.jsep.mjs
rc=1
```

Arm 2 is the control: `printf 'x' >> index.js` then `FETCH=0 ./verify.sh`. If
your run of arm 2 still prints four `OK` lines, the script is not checking what
you think it is.

> **`libelevate-web` in the URL is a retired name, and you still have to type
> it.** The published path is
> `models.bithuman.ai/web/libelevate-web-v0.1.0/…`. `libelevate` is
> [deprecated](/concepts/models-v2) — the product is **Essence 2** — but the
> URL is a frozen carrier and will not be renamed. Same for `manifest.json`'s
> `"format": "libelevate-web-manifest-v1"`. Type them as they are.

---

## Check 2 — does this browser have a REAL WebGPU adapter?

**Applies to both second-generation families.**

This is the check that matters most, because the failure is silent in the worst
way: **`navigator.gpu` exists on machines that cannot grant an adapter**. A
feature test written as `if (navigator.gpu)` passes and then the runtime dies.

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

To run it in CI instead of by hand:

```bash
#!/usr/bin/env bash
# Run webgpu-probe.html in headless Chrome and print its verdict.
# (Opening the .html in your own browser needs none of this — this script is
# only so the check is scriptable in CI. The FIFO holds the `load` event open
# so --dump-dom cannot fire before requestAdapter() has resolved.)
set -u
CHROME=${CHROME:-/usr/bin/google-chrome}
rm -f hold.fifo && mkfifo hold.fifo
( sleep 6; : > hold.fifo ) &
timeout 120 "$CHROME" --headless --no-sandbox "$@" \
  --dump-dom "file://$PWD/webgpu-probe.html?hold=hold.fifo" 2>/dev/null \
  | sed -n '/<pre id="out">/,/<\/pre>/p' | sed 's/<[^>]*>//g;s/&gt;/>/g;s/&lt;/</g;s/&amp;/\&/g'
wait
```

Three arms, three verdicts — all three printed by the script above:

```text
### A — a machine with a real GPU
  ./probe.sh --enable-unsafe-webgpu --use-angle=vulkan --enable-features=Vulkan

navigator.gpu present : true
requestAdapter()      : GPUAdapter
isFallbackAdapter     : false
REAL WebGPU adapter   : true

=> essence-2 local LIPSYNC will run (w2v on WebGPU).

### B — software (SwiftShader) adapter only
  ./probe.sh --enable-unsafe-webgpu

navigator.gpu present : true
requestAdapter()      : GPUAdapter
isFallbackAdapter     : true
REAL WebGPU adapter   : false

=> essence-2 local lipsync is OFF on this browser. Essence 2 still
   renders on wasm; you get living idle + TTS audio, no local lipsync.

### C — GPU disabled
  ./probe.sh --disable-gpu

navigator.gpu present : true
requestAdapter()      : null
REAL WebGPU adapter   : false

=> essence-2 local lipsync is OFF on this browser. Essence 2 still
   renders on wasm; you get living idle + TTS audio, no local lipsync.
```

Read arm **C** again: `navigator.gpu` is `true` and there is no adapter. That is
a machine with the GPU switched off, a locked-down VM, a blocklisted driver —
and `if (navigator.gpu)` calls it supported. Arm **B** is the second trap: an
adapter comes back, but it is Chrome's software rasteriser, where the WebGPU
execution provider runs slower than plain wasm. Both must be treated as *no
WebGPU*, which is why the probe checks `isFallbackAdapter` on **both**
`GPUAdapter` and `GPUAdapterInfo` — Chromium moved the flag between them.

---

## Check 3 — is WebGPU actually faster here?

**Applies to [essence-2](/concepts/essence-2).** It benchmarks the essence-2 bundle;
do not read its numbers onto [expression-2](/concepts/expression-2).

WebGPU is an **acceleration for one of the two models, and close to nothing
for the other**. Do not assume it. Measure it, on the hardware your users have.

This harness serves the published bundle cross-origin-isolated (wasm threads
need that), drives headless Chrome, and prints the median `session.run` time
per tier per execution provider.

```python
#!/usr/bin/env python3
"""Benchmark the published essence-2 browser models on THIS machine, both
execution providers, both tiers. Serves the page cross-origin-isolated (wasm
threads need it), drives headless Chrome, prints what the page measured."""
import http.server, json, os, socketserver, subprocess, sys, threading, time

PORT = int(os.environ.get("PORT", "8731"))
CHROME = os.environ.get("CHROME", "/usr/bin/google-chrome")
GPU = os.environ.get("GPU", "1") == "1"
result, done = {}, threading.Event()

class H(http.server.SimpleHTTPRequestHandler):
    def end_headers(self):
        self.send_header("Cross-Origin-Opener-Policy", "same-origin")
        self.send_header("Cross-Origin-Embedder-Policy", "require-corp")
        self.send_header("Cross-Origin-Resource-Policy", "same-origin")
        super().end_headers()
    def do_POST(self):
        body = self.rfile.read(int(self.headers["Content-Length"]))
        result.update(json.loads(body)); self.send_response(204); self.end_headers(); done.set()
    def log_message(self, *a): pass

srv = socketserver.ThreadingTCPServer(("127.0.0.1", PORT), H)
srv.daemon_threads = True
threading.Thread(target=srv.serve_forever, daemon=True).start()

args = [CHROME, "--headless", "--no-sandbox", "--disable-dev-shm-usage"]
args += (["--enable-unsafe-webgpu", "--use-angle=vulkan", "--enable-features=Vulkan"]
         if GPU else ["--disable-gpu"])
args += [f"http://127.0.0.1:{PORT}/bench.html?" + os.environ.get("QS", "")]
chrome = subprocess.Popen(args, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
ok = done.wait(timeout=float(os.environ.get("BENCH_TIMEOUT", "600")))
chrome.terminate()
if not ok:
    print("NO RESULT: the page never posted one", file=sys.stderr); sys.exit(1)
print(json.dumps(result, indent=2))
```

with `bench.html` beside it, and the bundle's `ort/` + `models/` directories
downloaded into `files/`
(`curl -fsS https://models.bithuman.ai/web/libelevate-web-v0.1.0/<path> -o files/<path>`):

```html
<!doctype html><meta charset="utf-8"><title>essence-2 EP benchmark</title>
<pre id="out">running…</pre>
<script type="module">
const q = new URLSearchParams(location.search);
const N = +(q.get("n") || 30), WARM = +(q.get("warm") || 5);
const ort = await import("/files/ort/ort.min.mjs");
ort.env.wasm.wasmPaths = "/files/ort/";
ort.env.wasm.numThreads = crossOriginIsolated ? Math.min(8, navigator.hardwareConcurrency || 4) : 1;

const rnd = (n) => { const a = new Float32Array(n); for (let i = 0; i < n; i++) a[i] = Math.random(); return a; };
const feeds = {
  pooled64:   new ort.Tensor("float32", rnd(64 * 32 * 32), [1, 64, 32, 32]),
  P_rgb:      new ort.Tensor("float32", rnd(3 * 512 * 512), [1, 3, 512, 512]),
  kp_driving: new ort.Tensor("float32", rnd(63), [1, 21, 3]),
  kp_source:  new ort.Tensor("float32", rnd(63), [1, 21, 3]),
};

// Warm the GPU process first: the FIRST requestAdapter() of a browser session
// resolves null while the GPU process starts, and ort-web's webgpu EP does not
// retry — it throws "Failed to get GPU adapter" and does NOT fall back to wasm.
const warmAdapter = async () => {
  if (!navigator.gpu) return "no navigator.gpu";
  let a = await navigator.gpu.requestAdapter();
  const cold = a === null;
  if (cold) a = await navigator.gpu.requestAdapter();
  return `cold=${cold} adapter=${a ? "yes" : "no"}`;
};
const adapterWarm = (new URLSearchParams(location.search).get("warmgpu") === "1")
  ? await warmAdapter() : "not warmed";

const rows = [];
for (const model of ["m4b_full_mmq", "m3c2_full_mmq"]) {
  const buf = await (await fetch(`/files/models/${model}.onnx`)).arrayBuffer();
  for (const ep of ["wasm", "webgpu"]) {
    let s;
    try {
      s = await ort.InferenceSession.create(buf, { executionProviders: [ep], graphOptimizationLevel: "all" });
    } catch (e) { rows.push({ model, ep, error: String(e).slice(0, 120) }); continue; }
    for (let i = 0; i < WARM; i++) await s.run(feeds);
    const t = [];
    for (let i = 0; i < N; i++) { const t0 = performance.now(); await s.run(feeds); t.push(performance.now() - t0); }
    t.sort((a, b) => a - b);
    const med = t[t.length >> 1];
    rows.push({ model, ep, median_ms: +med.toFixed(1), fps: +(1000 / med).toFixed(1), n: N });
    await s.release();
  }
}
const meta = { adapterWarm, threads: ort.env.wasm.numThreads, crossOriginIsolated,
               hardwareConcurrency: navigator.hardwareConcurrency, ua: navigator.userAgent };
document.getElementById("out").textContent = JSON.stringify({ meta, rows }, null, 2);
await fetch("/result", { method: "POST", body: JSON.stringify({ meta, rows }) });
</script>
```

### Arm A — without warming the GPU adapter first

```text
$ PORT=8741 ./bench.py
{
  "meta": {
    "adapterWarm": "not warmed",
    "threads": 8,
    "crossOriginIsolated": true,
    "hardwareConcurrency": 32,
    "ua": "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) HeadlessChrome/148.0.0.0 Safari/537.36"
  },
  "rows": [
    { "model": "m4b_full_mmq",  "ep": "wasm",   "median_ms": 54.8, "fps": 18.2, "n": 30 },
    { "model": "m4b_full_mmq",  "ep": "webgpu",
      "error": "Error: no available backend found. ERR: [webgpu] Error: Failed to get GPU adapter. You may need to enable flag \"--enable" },
    { "model": "m3c2_full_mmq", "ep": "wasm",   "median_ms": 22.3, "fps": 44.7, "n": 30 },
    { "model": "m3c2_full_mmq", "ep": "webgpu",
      "error": "Error: no available backend found. ERR: [webgpu] Error: Failed to get GPU adapter. You may need to enable flag \"--enable" }
  ]
}
rc=0
```

**This machine has a real WebGPU adapter** — check 2 arm A proves it — and the
WebGPU execution provider still failed. That is the cold-call race: the first
`requestAdapter()` of a browser session resolves `null` while the GPU process
starts. ONNX Runtime Web asks once, gets the `null`, and **throws. It does not
fall back to wasm.** If your page creates a WebGPU session as its first GPU
touch, this is what your users get.

### Arm B — same machine, adapter warmed first

```text
$ PORT=8742 QS="warmgpu=1" ./bench.py
{
  "meta": {
    "adapterWarm": "cold=true adapter=yes",
    "threads": 8,
    "crossOriginIsolated": true,
    "hardwareConcurrency": 32,
    "ua": "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) HeadlessChrome/148.0.0.0 Safari/537.36"
  },
  "rows": [
    { "model": "m4b_full_mmq",  "ep": "wasm",   "median_ms": 56.8, "fps": 17.6, "n": 30 },
    { "model": "m4b_full_mmq",  "ep": "webgpu", "median_ms": 23.8, "fps": 42.1, "n": 30 },
    { "model": "m3c2_full_mmq", "ep": "wasm",   "median_ms": 20.5, "fps": 48.8, "n": 30 },
    { "model": "m3c2_full_mmq", "ep": "webgpu", "median_ms": 19.8, "fps": 50.5, "n": 30 }
  ]
}
rc=0
```

Same machine, same flags, same binary as arm A. The only difference is one
`requestAdapter()` call before the session is created, and it turns four rows
from two errors into four measurements.

`"adapterWarm": "cold=true adapter=yes"` is the race, caught in the act: call
one returned `null`, call two returned the adapter. It reproduced on **3 of 3**
runs.

### Three runs, so you can see the spread

A summary of three arm-B runs — run 1 is the JSON above (`n=30`); runs 2 and 3
were `QS="warmgpu=1&n=50"`. Every run reported `"adapterWarm": "cold=true
adapter=yes"`, 8 WASM threads, cross-origin isolated, `hardwareConcurrency` 32.

| tier | EP | run 1 | run 2 | run 3 |
|---|---|---|---|---|
| **m4b** (quality) | wasm | 17.6 fps | 18.4 fps | 18.6 fps |
| **m4b** (quality) | webgpu | **42.1 fps** | **30.9 fps** | **31.0 fps** |
| **m3c2** (speed) | wasm | 48.8 fps | 35.9 fps | 32.9 fps |
| **m3c2** (speed) | webgpu | 50.5 fps | **29.2 fps** | 33.0 fps |

Run 1's WebGPU numbers are the fastest of the three on both tiers; do not take
them as the headline. The run-to-run spread on one machine is wide enough that a
single run is not evidence — which is the other reason to run this yourself
rather than quote it.

**Read the two rows differently.** On the **quality** model WebGPU is worth
1.7–2.4× and is the difference between under-realtime and comfortable. On the
**speed** model it is a wash — and in run 2 it was a *net loss* (29.2 fps
against wasm's 35.9). "WebGPU is the fast path" is not a true sentence about
this pipeline; it is true of one graph and false of the other.

---

## Check 4 — which runtime tier will expression-2 pick here? *(expression-2)*

Checks 1–3 answer for [essence-2](/concepts/essence-2). This one answers for
[expression-2](/concepts/expression-2), which is the family with **79**
published browser bundles and a **different engine** in its own worker.

expression-2 does not have one browser backend. It has a **capability gate**
that picks one of three at session start, and the answer changes with facts
about the machine you cannot see from the server:

| Condition, in this order | Runtime you get |
|---|---|
| a **real** (non-fallback) WebGPU adapter | ONNX Runtime Web, **WebGPU** |
| **no cross-origin isolation** (no COOP+COEP) | ONNX Runtime Web, **WASM, one thread** — and the LiteRT tier is impossible here, because without `SharedArrayBuffer` it throws at load. ★ But see the note below the table: on a hosted session this combination is **refused before it is reached** |
| Apple silicon | ONNX Runtime Web, **WASM** |
| x86 desktop, ≥ 10 hardware threads, **and** the identity bundle ships LiteRT members | **LiteRT.js WASM** |
| anything else | ONNX Runtime Web, **WASM** |

The rungs are ordered, so the first one that matches wins — which is why a
laptop with a real GPU never reaches the core-count question, and why a page
that forgot its COOP/COEP headers never reaches LiteRT no matter how many cores
it has.

> ★ **The one-thread rung is not what a customer gets — they get cloud.** This
> table is the runtime *picker*. On a hosted session a **page-level gate runs
> first**, and a page that is neither cross-origin isolated **nor** able to
> grant a real WebGPU adapter is **refused there**, before the session is
> minted: the viewer rewrites the URL to `?render=cloud` and the visitor gets
> working cloud video. So the one-thread row is what any caller that bypasses
> that page gate would be handed — it is defence in depth, and the probe below
> reports it because it is the picker's answer, not the customer's outcome.
> The practical reading of arms B and D is therefore: **no isolation and no
> real adapter means no browser render at all.**

Save this as `tier-probe.py` and run it. It serves one page cross-origin
isolated, drives headless Chrome, and applies the table above to what the
browser reports:

```python
#!/usr/bin/env python3
"""Which in-browser runtime tier will an expression-2 session pick on THIS
machine? Serves one page, drives headless Chrome, prints the verdict.
  ./tier-probe.py         cross-origin isolated (COOP+COEP) -- the real page
  ISOLATE=0 ./tier-probe.py   same page, headers off -- the control arm
"""
import http.server, json, os, socketserver, subprocess, sys, tempfile, threading

PORT = int(os.environ.get("PORT", "8741"))
CHROME = os.environ.get("CHROME", "/usr/bin/google-chrome")
ISOLATE = os.environ.get("ISOLATE", "1") == "1"
GPU = os.environ.get("GPU", "1") == "1"
result, done = {}, threading.Event()

PAGE = """<!doctype html><meta charset=utf-8><title>tier</title><script>
// The tier table, transcribed from the shipped gate (LITERT_MIN_CORES = 10).
const MIN_CORES = 10;
function realAdapter(a){ if(!a) return false;
  if(a.isFallbackAdapter===true) return false;
  const i=a.info||null; if(i&&i.isFallbackAdapter===true) return false; return true; }
function decide(p,webgpu,litert,isolated){
  if(webgpu) return "ort-web webgpu  (tier1: real, non-fallback adapter)";
  if(!isolated) return "ort-web wasm, 1 thread  (noiso: no COOP+COEP -> no SharedArrayBuffer; LiteRT.js would throw on load)";
  if(p.apple) return "ort-web wasm  (tier2: Apple silicon)";
  if(p.x86 && p.cores>=MIN_CORES) return litert ? "LiteRT.js wasm  (tier3: x86 desktop, "+p.cores+"T >= "+MIN_CORES+", bundle ships litert members)"
                                                : "ort-web wasm  (fallback: x86 desktop, no litert member in this bundle)";
  return "ort-web wasm  (fallback: "+(p.x86?("cores "+p.cores+" < "+MIN_CORES):"arch not x86")+")";
}
(async()=>{
  let adapter=null, err=null;
  try{ adapter = navigator.gpu ? await navigator.gpu.requestAdapter() : null; }catch(e){ err=String(e); }
  const gl=document.createElement("canvas").getContext("webgl2");
  const dbg=gl&&gl.getExtension("WEBGL_debug_renderer_info");
  const renderer=dbg?gl.getParameter(dbg.UNMASKED_RENDERER_WEBGL):"";
  const ua=navigator.userAgentData||{};
  const p={ cores: navigator.hardwareConcurrency||0,
            apple: /apple\\s*m\\d|apple gpu/i.test(renderer),
            x86: !/arm/i.test(ua.platform||"") };
  const out={ "navigator.gpu present": !!navigator.gpu,
              "adapter granted": !!adapter,
              "REAL (non-fallback) adapter": realAdapter(adapter),
              "crossOriginIsolated": crossOriginIsolated===true,
              "SharedArrayBuffer": typeof SharedArrayBuffer!=="undefined",
              "hardwareConcurrency": p.cores,
              "webgl2 renderer": renderer,
              "adapter error": err,
              "TIER (bundle WITH litert members)": decide(p,realAdapter(adapter),true,crossOriginIsolated===true),
              "TIER (bundle WITHOUT litert members)": decide(p,realAdapter(adapter),false,crossOriginIsolated===true) };
  await fetch("/r",{method:"POST",body:JSON.stringify(out)});
})();
</script>"""

class H(http.server.SimpleHTTPRequestHandler):
    def end_headers(self):
        if ISOLATE:
            self.send_header("Cross-Origin-Opener-Policy", "same-origin")
            self.send_header("Cross-Origin-Embedder-Policy", "require-corp")
        super().end_headers()
    def do_GET(self):
        b = PAGE.encode()
        self.send_response(200); self.send_header("Content-Type","text/html")
        self.send_header("Content-Length",str(len(b))); self.end_headers(); self.wfile.write(b)
    def do_POST(self):
        result.update(json.loads(self.rfile.read(int(self.headers["Content-Length"]))))
        self.send_response(204); self.end_headers(); done.set()
    def log_message(self,*a): pass

srv = socketserver.ThreadingTCPServer(("127.0.0.1", PORT), H)
srv.allow_reuse_address = True
threading.Thread(target=srv.serve_forever, daemon=True).start()
flags = ["--headless=new","--no-sandbox","--disable-dev-shm-usage",
         f"--user-data-dir={tempfile.mkdtemp(prefix='tierprobe-')}"]
flags += (["--enable-unsafe-swiftshader"] if not GPU else ["--enable-features=Vulkan","--use-angle=vulkan"])
p = subprocess.Popen([CHROME]+flags+[f"http://127.0.0.1:{PORT}/"],
                     stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
ok = done.wait(90); p.kill(); srv.shutdown()
if not ok:
    print("probe TIMED OUT"); sys.exit(2)
print(f"== arm: cross-origin isolated = {ISOLATE}")
for k,v in result.items():
    print(f"{k:38} {v}")
sys.exit(0)
```

### Arm A — a real GPU, page cross-origin isolated

```text
== arm: cross-origin isolated = True
navigator.gpu present                  True
adapter granted                        True
REAL (non-fallback) adapter            True
crossOriginIsolated                    True
SharedArrayBuffer                      True
hardwareConcurrency                    32
webgl2 renderer                        ANGLE (NVIDIA, Vulkan 1.4.329 (NVIDIA NVIDIA GeForce RTX 4090 (0x00002684)), NVIDIA)
adapter error                          None
TIER (bundle WITH litert members)      ort-web webgpu  (tier1: real, non-fallback adapter)
TIER (bundle WITHOUT litert members)   ort-web webgpu  (tier1: real, non-fallback adapter)
```

### Arm B — software adapter only, still isolated

`GPU=0 ./tier-probe.py`. Chrome grants no adapter, the WebGPU rung does not
match, and the machine drops to the x86-desktop rung — **where the identity's
own bundle decides**, which is the one input that is not about your hardware at
all:

```text
== arm: cross-origin isolated = True
adapter granted                        False
REAL (non-fallback) adapter            False
crossOriginIsolated                    True
SharedArrayBuffer                      True
hardwareConcurrency                    32
webgl2 renderer                        ANGLE (Google, Vulkan 1.3.0 (SwiftShader Device (Subzero) (0x0000C0DE)), SwiftShader driver)
TIER (bundle WITH litert members)      LiteRT.js wasm  (tier3: x86 desktop, 32T >= 10, bundle ships litert members)
TIER (bundle WITHOUT litert members)   ort-web wasm  (fallback: x86 desktop, no litert member in this bundle)
```

### Arm C — real GPU, headers off

`ISOLATE=0 ./tier-probe.py`. The WebGPU rung still matches first, so **losing
cross-origin isolation costs you nothing on a machine with a real adapter**:

```text
== arm: cross-origin isolated = False
REAL (non-fallback) adapter            True
crossOriginIsolated                    False
SharedArrayBuffer                      False
hardwareConcurrency                    32
TIER (bundle WITH litert members)      ort-web webgpu  (tier1: real, non-fallback adapter)
TIER (bundle WITHOUT litert members)   ort-web webgpu  (tier1: real, non-fallback adapter)
```

### Arm D — the control that matters: no real adapter **and** no isolation

`ISOLATE=0 GPU=0 ./tier-probe.py`. Same 32-thread machine as arm B, one HTTP
header apart, and it lands two rungs lower — **one** WASM thread:

```text
== arm: cross-origin isolated = False
REAL (non-fallback) adapter            False
crossOriginIsolated                    False
SharedArrayBuffer                      False
hardwareConcurrency                    32
TIER (bundle WITH litert members)      ort-web wasm, 1 thread  (noiso: ...)
TIER (bundle WITHOUT litert members)   ort-web wasm, 1 thread  (noiso: ...)
```

★ **Read the four arms together, because that is the control.** Same host, same
Chrome, same 32 threads — and **three different runtimes** come out of it,
selected by one GPU flag and one HTTP header. If your run gives the same answer
in all four arms, the probe is not measuring what you think it is. Arms B and D
are the pair that shows `hardwareConcurrency` on its own is worthless: 32
threads picks LiteRT in one and a single-threaded WASM tier in the other.

**What to do with the answer.** If you embed a bitHuman session in an iframe or
serve it from a page without `Cross-Origin-Opener-Policy: same-origin` and
`Cross-Origin-Embedder-Policy: require-corp`, every visitor without a real
WebGPU adapter **gets no browser render at all** — the page gate refuses them
and the session falls back to cloud rendering. They still see the avatar; you
just do not get the thing you asked for, and you pay cloud rendering for it.
That is a header you control, and it is free.

**Provenance.** These four transcripts were produced by running the script
above on 2026-09-06, Linux x86_64, Google Chrome headless, on a 32-thread host
with an NVIDIA RTX 4090. The tier table and the 10-thread constant are
transcribed from the gate the shipped viewer runs. This probe reports the
**decision**, not a frame rate — it does not fetch an identity bundle, so the
`WITH` / `WITHOUT` litert columns are both printed rather than one being
selected for you.

---

## What this tells you to do

- **Never gate on `navigator.gpu`.** Gate on an adapter that came back and is
  not a fallback — check 2 is the whole predicate.
- **Warm the adapter before you create a WebGPU session**, or handle the throw.
  There is no automatic wasm fallback underneath you.
- **Do not ship a "use WebGPU when available" switch** without check 3 on your
  own target hardware. On the speed tier you may be paying a 26 MB extra
  download for nothing.
- **wasm is the floor and it is a real floor** — it renders on every browser in
  the table, and it is what these models run on by default.
- **Send the two isolation headers.** Check 4 arms B and D are the same machine
  one header apart, and they land on different runtimes. For `expression-2` an
  un-isolated page is worse than a slow render: every visitor without a real
  WebGPU adapter is refused browser rendering outright and falls back to the
  cloud.

## Where to go next

- [Browser rendering](/guides/browser-rendering) — what actually runs where, and
  what a browser render does and does not bill.
- [Browser runtime (WebAssembly)](/sdk/wasm) — the runtime these checks fetch.
- [Apple — check before you ship](/examples/apple-swiftpm-check) — the same
  treatment for the macOS / iOS rail.
