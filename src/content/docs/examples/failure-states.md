---
title: "Failure states on a phone"
description: "What the on-device SDKs actually throw when the network is gone, a download is interrupted, a model is corrupt or a key is rejected — measured on a Galaxy S25+ against ai.bithuman:expression2-android:0.3.1 and on Apple Silicon against Expression2 2.11.2, with the exact exception text and the handling each state needs."
section: examples
group: "Examples"
order: 18
---

Every page that shows you a working render shows the happy path. This page is the
other one: what the on-device SDK does when the phone is offline, when a model
download is cut in half, and when an agent code is wrong.

Everything below is a transcript, not a prediction. Each row was produced by a
probe app built against **`ai.bithuman:expression2-android:0.3.1`** — the version
[the Android SDK page](/sdk/android) tells you to depend on — and run on a
physical Galaxy S25+ (SM-S936U1, Android 16) on 2026-09-09. The exception class,
the message text and the millisecond timings are copied out of `logcat`.

The short version: **the store fails fast and never hands the engine bytes it did
not verify.** There is one exception to that, at the bottom, and it is the one
worth knowing about.

## The control

So the numbers below mean something, here is the same probe on a working network
with an empty cache, using [`A66GYD8664`](/sdk/android) — a published identity
that answers anonymously:

```text
FSP|fetch OK in 2542 ms model=Expression2Model
FSP|dump    canon.bin                 299520 B
FSP|dump    canon.bin.sha256              64 B
FSP|dump    combined_hexagon.tflite  158513932 B
FSP|dump    combined_hexagon.tflite.sha256 64 B
FSP|dump    web_manifest.json           8999 B
FSP|render: create OK acc=CPU init=565.3 ms
FSP|render: FRAMES=85 in 15630 ms
```

158,813,452 B of model, then 85 frames out of 4.00 s of 16 kHz speech. Every
failure state below is the same code path with one thing taken away.

## No network

`Expression2ModelStore.fetch()` is the only call that touches the network. What
it does when there is none depends entirely on whether the model is already on
the device — and the difference is not subtle.

### Cold cache: it throws in 18 ms

With the cache evicted and the handset in airplane mode (`Wi-Fi is disabled`,
`ping: Network is unreachable`):

```text
FSP|fetch THREW after 18 ms
FSP|fetch class=ai.bithuman.expression2.Expression2Exception
FSP|fetch msg=cannot reach the model mirror for A66GYD8664
  (https://…/expression2-web/A66GYD8664/v1/web_manifest.json):
  Unable to resolve host "…": No address associated with hostname
FSP|fetch cause[0]=java.net.UnknownHostException: Unable to resolve host …
FSP|fetch cause[1]=android.system.GaiException: android_getaddrinfo failed: EAI_NODATA
```

**It does not hang and it does not retry.** 18 ms is one DNS lookup that failed.
A name that does not resolve is not a transient condition, so the retry budget is
never entered — you get the answer at the speed of `getaddrinfo`, with
`UnknownHostException` intact at the head of the cause chain.

That is the string to switch on. Do not match on the message text; match on the
cause:

```kotlin
try {
    model = Expression2ModelStore(context).fetch(agentCode)
} catch (e: Expression2Exception) {
    val offline = generateSequence(e as Throwable) { it.cause }
        .any { it is java.net.UnknownHostException || it is java.net.SocketException }
    if (offline) showRetryWhenOnline() else showRealError(e)
}
```

### Warm cache: there is no failure state

The same probe, same airplane mode, with the model already installed:

```text
FSP|render: model ready at 25 ms
FSP|render: create OK acc=CPU init=546.0 ms
FSP|render: FRAMES=85 in 15699 ms
```

`fetch()` returned a verified model in **25 ms with the radios off**, and the
render completed. This is the property the on-device SDK exists for: after the
first successful fetch, **no part of a render needs the network**. There is no
licence ping, no metering call, and nothing to time out.

So the only thing your app has to get right is the first fetch. Once
`fetch()` has returned once, offline is not a state you need to handle.

## An interrupted download

This is the state that becomes a support ticket, so it is worth being precise
about what is left on disk.

The probe cancels the transfer part-way through the 158 MB member:

```text
FSP|cancel_mid tripped at 20005568 / 158813452 on combined_hexagon.tflite
FSP|cancel_mid THREW after 1041 ms
FSP|cancel_mid class=ai.bithuman.expression2.Expression2Exception
FSP|cancel_mid msg=fetch of A66GYD8664/combined_hexagon.tflite cancelled
FSP|dump  dir A66GYD8664/
FSP|dump    .lock                            0 B
FSP|dump    combined_hexagon.tflite.part  20005568 B
```

Three things are true of that directory, and together they are the answer to
"is a half-written model detected, or loaded and crashed?"

- The partial bytes are named **`combined_hexagon.tflite.part`**, not
  `combined_hexagon.tflite`. Nothing looks for a `.part`, so a truncated model
  can never be opened as a model.
- There is **no `.sha256` sidecar** beside it. The sidecar is written only after
  the digest matches, so its absence is what marks the member unverified.
- There is **no `web_manifest.json`** in the directory. The manifest is written
  last, after every member is verified, so a partial identity does not look
  installed to `cached()`.

**The correct handling is to call `fetch()` again.** It resumes:

```text
FSP|resume OK in 2069 ms model=Expression2Model
```

### Proof that it really resumes

"It succeeded on the second call" does not distinguish resuming from silently
starting over, so the probe forces the question. It interrupts the download,
then flips 65,536 bytes inside the surviving `.part` before calling `fetch()`
again. If the SDK resumes, its running digest covers the flipped bytes and the
checksum must fail. If it starts over, the call succeeds and the tamper is
invisible.

```text
FSP|poison: flipped 65536 B at offset 1000000 of .part (length still 20000704)
FSP|poison THREW after 1948 ms
FSP|poison class=ai.bithuman.expression2.Expression2Exception
FSP|poison msg=A66GYD8664/combined_hexagon.tflite failed its checksum:
  got e9f88adb0c88942c…, web_manifest.json says a4ed9834d1b2184b…
  The file has been deleted.
FSP|dump  dir A66GYD8664/
FSP|dump    .lock  0 B
```

It failed. The resume is real, the corrupt prefix was caught by the SHA-256 in
`web_manifest.json`, and the bad bytes were deleted rather than kept — the
directory is empty afterwards. The next `fetch()` downloads cleanly:

```text
FSP|resume OK in 2133 ms model=Expression2Model
```

**So an interrupted download is self-healing, and needs no recovery code.** Call
`fetch()` again; at worst you pay for the bytes you already have twice.

## A wrong agent code

Two different mistakes produce two different failures, and one of them is not
what you would guess.

### A code that is not a code

```text
FSP|badcode THREW after 4 ms
FSP|badcode class=ai.bithuman.expression2.Expression2Exception
FSP|badcode msg='../../etc/passwd' is not a valid agent code
```

4 ms, before any network. The code becomes a path segment and a directory name,
so anything outside `[A-Za-z0-9_-]{1,64}` is rejected at the door.

### A code that does not exist

```text
FSP|nocode THREW after 467 ms
FSP|nocode class=ai.bithuman.expression2.Expression2Exception
FSP|nocode msg=GET https://…/expression2-web/A00XXX0000/v1/web_manifest.json
  returned HTTP 400 — this identity has no LiteRT bundle published on this mirror.
  {"statusCode":"404","error":"not_found","message":"Object not found","code":"NoSuchKey"}
```

One request, 467 ms, no retry — an HTTP 400 is a decision, not an outage, so the
retry budget is not spent on it. Note that the mirror answers **400** for a
missing object while its body says `404`; the SDK quotes both rather than
picking one.

### A code that exists but is not mirrored

Here is the part worth internalising. `A80HVD8577` is a real agent code — it is
the example code used throughout [the API reference](/api/overview). It is simply
not published on the Expression 2 mirror:

```text
FSP|unmirrored THREW after 519 ms
FSP|unmirrored class=ai.bithuman.expression2.Expression2Exception
FSP|unmirrored msg=GET https://…/expression2-web/A80HVD8577/v1/web_manifest.json
  returned HTTP 400 — this identity has no LiteRT bundle published on this mirror.
  {"statusCode":"404","error":"not_found","message":"Object not found","code":"NoSuchKey"}
```

**That is the same class, the same status and the same sentence as a code that
never existed.** The SDK cannot tell them apart, because the mirror cannot: both
are a missing object. The message is careful not to claim your code is invalid —
it says the identity has no bundle *on this mirror* — and that is exactly the
distinction to pass on to your user. "This avatar is not available on Android"
is accurate for both; "invalid agent code" is wrong half the time.

If you need to know which it is, ask the API door, not the mirror — a real code
resolves at `/v1/agent/<CODE>` whether or not it has an Android bundle.

## The one state that fails silently

Everything above ends with an exception. This one does not.

`cached()` decides an identity is installed by comparing each member's **length**
against the manifest and its **recorded `.sha256` sidecar** against the manifest.
It deliberately does not re-hash 158 MB on every call. So a member whose bytes
change *in place*, keeping its length, is not detected. The probe overwrites
4,096 bytes in the middle of the installed member:

```text
FSP|truncate: zeroed 4096 B at the midpoint of combined_hexagon.tflite
  (length unchanged 158513932)
FSP|truncate: cached()=true
FSP|render: create OK acc=CPU init=556.2 ms
FSP|render: FRAMES=85 in 15618 ms
```

`cached()` said yes, `create()` succeeded, and 85 frames came out of a model
whose real digest no longer matches the one recorded beside it:

```text
FSP|sha: on-disk  = e76c4357a0e0df429c9808300e4cd95e2d02f0bd66f7c503f5392668daffc312
FSP|sha: sidecar  = a4ed9834d1b2184baf87cc6d73159a1d1c79f7788552441c7987fb8c09d9a753
```

This is a narrow state — it needs bytes to rot underneath a file whose length is
unchanged, which is storage corruption rather than anything your code does — but
it has a sharp edge:

### `force = true` does not repair it

`fetch(code, force = true)` reads as "download it again regardless", and its own
documentation says it re-downloads even if the cached copy verifies. Measured, it
does not:

```text
FSP|force OK in 383 ms
FSP|sha: on-disk  = e76c4357a0e0df42…   (unchanged)
FSP|sha: sidecar  = a4ed9834d1b2184b…
```

383 ms and zero bytes transferred. `force` re-reads the manifest and re-runs the
per-member download, but each member still short-circuits on the length and
sidecar check that the corrupt file passes. `force` is useful for picking up a
*changed* manifest; it is not a repair tool.

This one is a defect rather than a design choice, and it is fixed at the root: on
`bithuman-models` `main`, `fetchMember` honours the flag and discards a stale
`.part` before re-fetching, with three arms in `DoorRetryTest` covering it. No
*published* Android SDK carries that fix yet — `0.3.1`, the version this page
measures and the one [the Android SDK page](/sdk/android) tells you to depend on,
behaves exactly as transcribed above. Use `evict()` then `fetch()`, which is the
correct repair on every version, before and after that fix ships.

**The repair that works is `evict()` then `fetch()`:**

```kotlin
val store = Expression2ModelStore(context)
store.evict(agentCode)          // removes members, sidecars and manifest
val model = store.fetch(agentCode)   // re-downloads and re-verifies
```

```text
FSP|fetch OK in 2330 ms model=Expression2Model
FSP|sha: on-disk  = a4ed9834d1b2184baf87cc6d73159a1d1c79f7788552441c7987fb8c09d9a753
FSP|sha: sidecar  = a4ed9834d1b2184baf87cc6d73159a1d1c79f7788552441c7987fb8c09d9a753
```

Wire that to whatever your app calls "reset" or "re-download", rather than
`force = true`.

## One more thing on disk

A failed lookup leaves a directory behind. After fetching a code that does not
exist, the cache root holds:

```text
FSP|dump  dir A00XXX0000/
FSP|dump    .lock  0 B
```

It is empty apart from the lock file and costs nothing, but `listCached()`
returns directories, so a UI that renders "your downloaded avatars" straight from
`listCached()` will show a phantom entry for every mistyped code. Filter on
`bytesOnDisk > 0`, or call `cached(code) != null`, before showing an identity as
installed.

## Reference

Measured on a Galaxy S25+ (SM-S936U1, Android 16) against
`ai.bithuman:expression2-android:0.3.1`, 2026-09-09. Every failure is
`ai.bithuman.expression2.Expression2Exception`; the differences are the cause and
the timing.

| State | Time to fail | Distinguishing signal | What to do |
| --- | --- | --- | --- |
| Offline, cold cache | 18 ms | cause is `UnknownHostException` | retry when connectivity returns |
| Offline, warm cache | — | succeeds in 25 ms | nothing; renders work offline |
| Download interrupted | 1.0 s | message ends `cancelled`; a `.part` remains | call `fetch()` again — it resumes |
| Partial bytes corrupt | 1.9 s | message contains `failed its checksum` | call `fetch()` again — bad bytes were deleted |
| Malformed code | 4 ms | `is not a valid agent code` | fix the code; no network was used |
| Code does not exist | 467 ms | `HTTP 400` + `NoSuchKey` | tell the user the avatar is unavailable |
| Code exists, not mirrored | 519 ms | identical to the row above | same message; ask the API door to tell them apart |
| Installed member corrupt | never | none — it renders | `evict()` then `fetch()`; `force` will not do it |

### What is never a failure state

- **A render, once the model is installed.** No network call happens during
  `create()`, `feed()` or `pull()`.
- **A second `fetch()` for an installed identity.** It is a length-and-sidecar
  comparison, measured at 12–25 ms, not a download.

## The same questions on the Apple rail

Everything above is Android, where a model **store** owns the download. The Apple
rail is a different shape and therefore has different failure states: there is no
store. You call the download endpoint yourself, you get one `<CODE>.avatar`
container, and **you** stage its members. So the states below split into two
groups — what the *door* does when your key is wrong, and what the *engine* does
when the bytes on disk are wrong.

Measured 2026-09-09 against the published **`Expression2` 2.11.2**
(`homebrew-bithuman`, the version [the Swift SDK page](/sdk/ios) pins), on
Apple Silicon. The container reader, the member staging and the load path are the
same Swift code in every slice of that xcframework; the CoreML compile is the
part that is per-device, and it is called out where it matters.

### The control

One published identity, staged and rendered, so the failures below mean
something:

```text
FSP|BEGIN|ok|secretInEnv=ABSENT
FSP|STAGED|ok|members=17|108ms
FSP|MISSING_MEMBERS|ok|count=0|
FSP|ENGINE_OK|ok|416x720|isReady=true
FSP|FRAMES|ok|53|digest=4a2503b4f95919ae…|8139ms
```

Note `secretInEnv=ABSENT` in that first line. It is not an oversight, and it is
the answer to two of the questions below.

### No network

There is no `fetch()` on this rail, so "offline" is only ever a question about
**render** time. The probe was re-run under a sandbox that denies the process all
network access, with the control proving the denial is real:

```text
$ sandbox-exec -f nonet.sb curl -sS https://docs.bithuman.ai/
curl: (6) Could not resolve host: docs.bithuman.ai      # denied
$ curl -sS -o /dev/null -w '%{http_code}\n' https://docs.bithuman.ai/
200                                                     # not denied
```

Under that same denial, with no API secret in the environment:

```text
FSP|ENGINE_OK|ok|416x720|isReady=true
FSP|FRAMES|ok|53|digest=4a2503b4f95919ae…|7743ms
```

**Byte-identical to the networked run** — same 53 frames, same pixel digest.
Nothing on the Apple render path opens a socket. Once the `.avatar` is on the
device, `create()`, `feed()` and `pull()` are local, and offline is not a state
you have to handle.

### An interrupted download

On Android a half-finished download leaves a `.part` the store knows about. Here
it leaves a truncated container, and the container reader catches it before any
member reaches the engine:

```text
FSP|TRUNCATED_AVATAR|198632867 -> 99316433
FSP|STAGE_THREW|truncated|Expression2ContainerError|…/half.avatar: truncated
  container — ran off the end at offset 6842536 reading member
  "combined_litert.tflite". The file is incomplete (a partial download writes
  exactly this).
```

19 ms, and the message names the diagnosis. A file that is not a container at all
is rejected even earlier, on the magic number:

```text
FSP|STAGE_THREW|notacontainer|Expression2ContainerError|…/junk.avatar: not an
  IMX\0 container — first bytes are [41 41 41 41]. The container
  GET /v1/agent/{code}/model/download vends begins "IMX\0".
```

1 ms. So `Expression2Container.members(of:)` is a usable integrity gate on the
*shape* of the download: call it before you stage, and both a truncated transfer
and an HTML error page saved under a `.avatar` name fail there rather than deeper
in.

### A missing shared engine

The commonest real-world Apple failure is not corruption, it is forgetting that
the `.avatar` does not carry the shared graphs. `missingMembers()` answers that
before you try to start:

```text
FSP|MISSING_MEMBERS|noshared|count=1|w2v_frontend_cpuAndNE.mlpackage
FSP|ENGINE_THREW|noshared|Expression2LoadError|… : expression-2 avatar is missing
  w2v_frontend_cpuAndNE.mlpackage — re-provision the member(s) …, or pass
  `sharedEngineDir:` if the shared graphs live in a second directory.|74ms
```

Use it as a pre-flight — it is a directory listing, it costs nothing, and it
turns a load exception into a message you can act on:

```swift
let missing = Expression2Engine.missingMembers(avatarDir: dir, sharedEngineDir: shared)
guard missing.isEmpty else { throw SetupError.needsEngineInstall(missing) }
```

### A corrupt member: two different answers

This is where the Apple rail differs from Android in a way worth knowing before
you ship. The probe flips 4,096 bytes in the middle of a staged member, **keeping
its length**, and the answer depends entirely on *which* member.

Corrupt the decoder's **structure** (`model.mlmodel`) and CoreML refuses to
compile it, with a load error that names the stage that failed:

```text
FSP|ENGINE_THREW|…model.mlmodel|Expression2LoadError|… every required member is
  present and warm-up did not reach ready (decoder=missing-decp2) — a member is
  present but unloadable (CoreML compile failure or an I/O-contract mismatch).
  See the [embody] log lines for the member that refused.|287ms
```

Corrupt the same decoder's **weights** (`weight.bin`) and nothing refuses
anything:

```text
FSP|CORRUPTED_MEMBER|dec_p2_v3_all…/weights/weight.bin|off=6299664|bytes=12599328->12599328
FSP|MISSING_MEMBERS|…|count=0|
FSP|ENGINE_OK|…|416x720|isReady=true
FSP|FRAMES|…|53|digest=428e813acd8cfa5a…|7576ms
```

`missingMembers()` is satisfied, `create()` succeeds, 53 frames come out — and
the pixel digest is `428e813a…` where the clean run gave `4a2503b4…`. **This is
the one Apple state that fails silently, and it does not fail safe: it delivers a
different face.** CoreML validates the model graph, not the numbers in it, and
nothing else on this rail checks the numbers either.

That is the gap: the shipped 2.11.2 surface
(`isContainer`, `members(of:)`, `read`, `readManifest`, `unpack`,
`requiredAvatarMembers`, `missingMembers`) has **no verification call**, and
`missingMembers()` is a presence check — it passes a member that is present and
wrong.

### The verification the SDK does not do — and how to do it yourself

You do not have to accept that, because the integrity data is already in your
hands. Every container carries a `manifest.json` member whose `files{}` map
declares each member's `bytes` and `sha256`:

```jsonc
"files": {
  "dec_p2_v3": { "path": "dec_p2_v3_all.mlpackage", "bytes": 12620302, "sha256": "…" },
  "canon":     { "path": "canon.f32",               "bytes": 299520,   "sha256": "…" },
  …
}
```

Flat members are a plain SHA-256 of the file. **`.mlpackage` members are
directories**, and their digest is a rollup with one convention you have to get
right: SHA-256 over the package's files sorted by relative path, updating
`relpath` — *keeping its leading `/`* — followed by the file's bytes. Verified
against a published container, all eight members reproduce exactly:

```swift
import CryptoKit

func digest(of relPath: String, in dir: URL) throws -> String {
    let fm = FileManager.default
    let root = dir.appendingPathComponent(relPath)
    var isDir: ObjCBool = false
    guard fm.fileExists(atPath: root.path, isDirectory: &isDir) else {
        throw VerifyError.missing(relPath)
    }
    if !isDir.boolValue {                       // flat member: plain SHA-256
        return SHA256.hash(data: try Data(contentsOf: root))
            .map { String(format: "%02x", $0) }.joined()
    }
    let subs = (try fm.subpathsOfDirectory(atPath: root.path))
        .filter { sp in
            var d: ObjCBool = false
            fm.fileExists(atPath: root.appendingPathComponent(sp).path, isDirectory: &d)
            return !d.boolValue
        }
        .sorted()
    var h = SHA256()
    for sp in subs {                            // NOTE the leading "/"
        h.update(data: Data(("/" + sp).utf8))
        h.update(data: try Data(contentsOf: root.appendingPathComponent(sp)))
    }
    return h.finalize().map { String(format: "%02x", $0) }.joined()
}

/// Call this after staging and before `Expression2Engine.create`.
func verifyStaging(dir: URL, container: URL) throws -> [String] {
    let manifest = try JSONSerialization.jsonObject(
        with: Expression2Container.read("manifest.json", from: container)) as! [String: Any]
    let files = manifest["files"] as! [String: Any]
    return try files.values.compactMap { entry -> String? in
        let e = entry as! [String: Any]
        let path = e["path"] as! String
        return try digest(of: path, in: dir) == (e["sha256"] as! String) ? nil : path
    }
}
```

It has to be shown catching something, or it is decoration. Clean staging, then
the *exact* corruption that rendered silently above:

```text
# clean
FSP|CHECK|dec_p2_v3|dec_p2_v3_all.mlpackage|OK|want=32b5adabd34ee7dd|got=32b5adabd34ee7dd
FSP|VERIFY_RESULT|bad=0||86ms

# 4096 bytes flipped in dec_p2_v3_all…/weights/weight.bin, length unchanged
FSP|CHECK|dec_p2_v3|dec_p2_v3_all.mlpackage|FAIL|want=32b5adabd34ee7dd|got=5defe619b32c58bf
FSP|CHECK|student|student_v4_forward_frame_cpuAndNE.mlpackage|OK|…
FSP|VERIFY_RESULT|bad=1|dec_p2_v3_all.mlpackage|86ms
```

`bad=0` clean, `bad=1` corrupt, naming the member — **86 ms** for all 198 MB.
That is cheap enough to run on every cold start, and it is the only thing
standing between a rotted cache and a wrong face.

> **Reported as an SDK gap.** This belongs in the SDK, not in your app. It is
> filed against `Expression2` as a missing public verification call; until a
> release carries one, the code above is the workaround, and it uses only shipped
> API.

### Four fifths of your download is for the other platform

While verifying, the probe listed what a container actually holds — 17 members,
198,632,867 bytes:

| Member | Bytes | Read by Apple? |
| --- | --- | --- |
| `combined_litert.tflite` | 158,524,428 | **no** — this is the Android LiteRT model |
| `student_v4_forward_frame_cpuAndNE.mlpackage` | 14,253,384 | yes |
| `dec_p2_v3_all.mlpackage` | 12,620,302 | yes |
| `audiotokenizer_cpuAndNE.mlpackage` | 6,242,385 | yes |
| `dec_p2_cpuAndNE.mlpackage` | 4,939,205 | yes |
| `idle.mp4`, `canon.f32`, `canon.bin`, `manifest.json` | 2,052,052 | mixed |

Proof rather than inference: corrupting 4,096 bytes in the middle of
`combined_litert.tflite` and rendering gives digest `4a2503b4…` — *byte-identical
to the clean control*. The Apple engine never opens it.

So **80% of every `.avatar` an iPhone downloads is a model it will never load.**
Budget the download and the disk for 198 MB, not for the 40 MB Apple uses, and do
not be surprised by the size on a cellular connection.

### A rejected key

On this rail the key is checked at the door, not on the device. The same URL,
varying only the header:

```text
# no header
HTTP/2 401  {"error":{"type":"missing_credentials","code":"MISSING_AUTH","httpStatus":401,
             "message":"send 'Authorization: Bearer <api-secret>' (or the api-secret header)"}}

# a key that is not a key
HTTP/2 401  {"error":{"type":"invalid_credentials","code":"UNAUTHORIZED","httpStatus":401,
             "message":"invalid api secret; check the key in your dashboard or mint a new one"}}

# a valid key, for a code it cannot see
HTTP/2 404  {"error":{"code":"NOT_FOUND","message":"Agent not found for code: …",…}}

# a valid key, for a code it owns
HTTP/2 302  location: https://…/storage/v1/object/sign/models-downloads/expression-2/<CODE>.avatar?…
```

Three distinguishable answers, which is better than the Android mirror manages —
there, [a missing code and an unmirrored code are the same 400](#a-code-that-exists-but-is-not-mirrored).
Here `401` means *fix your key*, `404` means *this key cannot see that agent*, and
`302` is success. Two cautions on that last pair:

- The `404` does **not** distinguish "no such agent" from "not on this account".
  **Read the `message`; never surface a bare `404` as "invalid code".**
- The `302` points at signed storage that expires. Follow it promptly; do not
  cache the redirect target.

And one thing the door does not give you: the storage response's `ETag` is a
multipart tag (`"8fa4bda2…-4"`), **not** a digest of the file, so you cannot use
it to check the download. `Content-Length` is exact (`198632867`) and is worth
comparing; for anything stronger, use the manifest verification above.

### The five-minute grace does not apply here

The estate rule is a five-minute grace and then refusal, with a metering service
that cannot be reached never stopping a render. **Measured, neither half of that
rule has a subject on the Apple on-device rail, because nothing there meters at
all.**

A render was driven for 330 seconds with a deliberately *invalid*
`BITHUMAN_API_SECRET` in the environment:

```text
FSP|BEGIN|longkey|secretInEnv=SET
FSP|TICK|t=270s|frames=4437
FSP|TICK|t=300s|frames=4949
FSP|LONG_DONE|elapsed=330s|frames=5429|stillRendering=true
FSP|AFTER_GRACE_WINDOW|frames=64|refused=false
```

It sailed through the 300-second mark at a steady rate and delivered 64 more
frames afterwards. `refused=false`. Combined with the sandbox result above — no
sockets on the render path — the conclusion is not "the grace failed to fire"; it
is that **there is nothing on the device to fire it**. The engine consults no key
and no meter.

That is consistent with the rail's design, and the enforcement point is real: you
cannot obtain the `.avatar` without a valid key, as the `401`s above show. But
plan for it honestly — **once a device holds a container, that device can render
from it offline, indefinitely, with no key.** If your product needs per-session
entitlement, it has to come from your own backend gating the *download*, not from
the SDK.

### Apple reference

Measured 2026-09-09, `Expression2` 2.11.2, Apple Silicon.

| State | Time to fail | What you get | What to do |
| --- | --- | --- | --- |
| Offline, model on device | — | renders, identical digest | nothing; no socket is opened |
| Not a container | 1 ms | `Expression2ContainerError`, magic-number message | you saved an error page; check the HTTP status first |
| Truncated container | 19 ms | `Expression2ContainerError`, names the offset | re-download; `members(of:)` is the gate |
| Shared engine missing | 74 ms | `Expression2LoadError`, names the member | `bithuman engine install mac`; pre-flight `missingMembers()` |
| Member structure corrupt | 287 ms | `Expression2LoadError`, `decoder=missing-decp2` | re-stage from the container |
| Member weights corrupt | **never** | renders a **different face**, no error | verify against `manifest.json` — nothing else will |
| No `api-secret` | at the door | `401 MISSING_AUTH` | send the header |
| Bad `api-secret` | at the door | `401 UNAUTHORIZED` | fix the key |
| Key cannot see the code | at the door | `404 NOT_FOUND`, `"Agent not found for code: …"` | not necessarily a bad code — may not be this account's |
| Invalid key, render running | never refuses | 5,429 frames over 330 s | expected: on-device render is unmetered |

## Next steps

- [Kotlin / Android — Hello, avatar](/examples/kotlin-android-hello) — the whole
  working project these states were measured against.
- [Android SDK](/sdk/android) — coordinates, the model store, and the measured
  device limits.
- [Swift / iOS — a talking avatar on the iPhone you have](/examples/swift-ios-expression2)
  — the Apple project, file by file, that the Apple states above were measured
  against.
- [Swift SDK](/sdk/ios) — the container reader, `missingMembers()`, and the two
  error types worth catching separately.
