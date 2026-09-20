---
title: "Failure states on a phone"
description: "What the on-device SDKs actually throw when the network is gone, a download is interrupted, a model is corrupt or a key is rejected — measured on a Galaxy S25+ against ai.bithuman:expression2-android:0.3.1 and on Apple Silicon against Expression2 2.6.3, with the exact exception text and the handling each state needs."
section: examples
group: "Examples"
order: 18
---

Every page that shows you a working render shows the happy path. This page is the
other one: what the on-device SDK does when the phone is offline, when a model
download is cut in half, and when an agent code is wrong.

Each state below was produced against
**`ai.bithuman:expression2-android:0.3.1`** — the version current that day —
on a physical Galaxy S25+; the model-store behaviour is unchanged through the
release [the Android SDK page](/sdk/android) names today.

The short version: **the store fails fast and never hands the engine bytes it did
not verify.** There is one exception to that, at the bottom, and it is the one
worth knowing about.

## No network

`Expression2ModelStore.fetch()` is the only call that touches the network. What
it does when there is none depends entirely on whether the model is already on
the device — and the difference is not subtle.

### Cold cache: it throws

With the cache evicted and the handset in airplane mode, `fetch()` throws
`ai.bithuman.expression2.Expression2Exception` — `cannot reach the model mirror
for <CODE> (https://.../web_manifest.json)` — with
`java.net.UnknownHostException` at the head of the cause chain.

**It does not hang and it does not retry.** A name that does not resolve is not a
transient condition, so the retry budget is never entered — you get the answer at
the speed of `getaddrinfo`, with `UnknownHostException` intact at the head of the
cause chain.

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

In airplane mode with the model already installed, `fetch()` returns a verified
model **in 25 ms with the radios off**, and the render completes. This is the
property the on-device SDK exists for: after the first successful fetch, **no
part of a render needs the network**. There is no licence ping, no metering call,
and nothing to time out.

So the only thing your app has to get right is the first fetch. Once
`fetch()` has returned once, offline is not a state you need to handle.

## An interrupted download

This is the state that becomes a support ticket, so it is worth being precise
about what is left on disk.

Cancel the transfer part-way through the largest member and `fetch()` throws
with a message ending `cancelled`, leaving a directory holding a `.lock` and a
`.part` file.

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

**The correct handling is to call `fetch()` again.** It resumes — and the resume
is real: a corrupt partial is caught by the SHA-256 in `web_manifest.json`,
which fails the member with `failed its checksum`, and the bad bytes are deleted
rather than kept. The next `fetch()` downloads cleanly.

**So an interrupted download is self-healing, and needs no recovery code.** Call
`fetch()` again; at worst you pay for the bytes you already have twice.

## A wrong agent code

Two different mistakes produce two different failures, and one of them is not
what you would guess.

### A code that is not a code

```text
'../../etc/passwd' is not a valid agent code
```

Thrown before any network. The code becomes a path segment and a directory name,
so anything outside `[A-Za-z0-9_-]{1,64}` is rejected at the door.

### A code that does not exist

```text
GET https://.../expression2-web/A00XXX0000/v1/web_manifest.json
  returned HTTP 400 — this identity has no LiteRT bundle published on this mirror.
  {"statusCode":"404","error":"not_found","message":"Object not found","code":"NoSuchKey"}
```

One request, no retry — an HTTP 400 is a decision, not an outage, so the
retry budget is not spent on it. Note that the mirror answers **400** for a
missing object while its body says `404`; the SDK quotes both rather than
picking one.

### A code that exists but is not mirrored

Here is the part worth internalising. `A80HVD8577` is a real agent code — it is
the example code used throughout [the API reference](/api/overview). It is simply
not published on the Expression 2 mirror, and it fails with exactly the message
above.

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
It deliberately does not re-hash the whole model on every call. So a member
whose bytes change *in place*, keeping its length, is not detected: `cached()`
says yes, `create()` succeeds, and frames come out of a model whose real digest
no longer matches the one recorded beside it.

This is a narrow state — it needs bytes to rot underneath a file whose length is
unchanged, which is storage corruption rather than anything your code does — but
it has a sharp edge:

### `force = true` does not repair it

`fetch(code, force = true)` reads as "download it again regardless", and its own
documentation says it re-downloads even if the cached copy verifies. It does not:
`force` re-reads the manifest and re-runs the per-member download, but each
member still short-circuits on the length and sidecar check that the corrupt file
passes. `force` is useful for picking up a *changed* manifest; it is not a repair
tool.

This one is a defect rather than a design choice, and the fix — `force` discards
a stale partial file before re-fetching — is written. `0.3.1`, the version this
page measures, behaves exactly as described above; this page does not measure
whether a later AAR carries the fix. Use `evict()` then `fetch()`, which is the
correct repair on every version, before and after that fix ships.

**The repair that works is `evict()` then `fetch()`:**

```kotlin
val store = Expression2ModelStore(context)
store.evict(agentCode)          // removes members, sidecars and manifest
val model = store.fetch(agentCode)   // re-downloads and re-verifies
```

Wire that to whatever your app calls "reset" or "re-download", rather than
`force = true`.

## One more thing on disk

A failed lookup leaves a directory behind: after fetching a code that does not
exist, the cache root holds one directory for it, containing only a `.lock` file.

It costs nothing, but `listCached()`
returns directories, so a UI that renders "your downloaded avatars" straight from
`listCached()` will show a phantom entry for every mistyped code. Filter on
`bytesOnDisk > 0`, or call `cached(code) != null`, before showing an identity as
installed.

## Reference

Every failure on this rail is
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

The states below were **re-driven on 2026-09-20** against the published
**`Expression2` 2.6.3** — the engine a `from: "2.11.0"` dependency resolves today
(`homebrew-bithuman`, the version [the Swift SDK page](/sdk/ios) pins) — on Apple
Silicon, against a container as the download door serves it (17 members,
198,632,867 bytes). Two rows are older and say so. The container reader, the
member staging and the load path are the same Swift code in every slice of that
xcframework; the CoreML compile is the part that is per-device, and it is called
out where it matters.

### No network

There is no `fetch()` on this rail, so "offline" is only ever a question about
**render** time — and there it is not a question at all. Under a sandbox that
denies the process all network access, the render is **byte-identical to the
networked run** — same frames, same pixel digest. Nothing on the Apple render
path opens a socket. Once the `.avatar` is on the device, `create()`, `feed()`
and `pull()` are local, and offline is not a state you have to handle.

### An interrupted download

On Android a half-finished download leaves a `.part` the store knows about. Here
it leaves a truncated container, and the container reader catches it before any
member reaches the engine:

```text
Expression2ContainerError | .../half.avatar: truncated container — ran off the
  end at offset 6842536 reading member "combined_litert.tflite". The file is
  incomplete (a partial download writes exactly this).
```

A file that is not a container at all is rejected even earlier, on its first
bytes: `Expression2ContainerError` names the file, prints the four bytes it
actually found, and says they are not what a bitHuman container starts with.

```text
Expression2ContainerError | .../err.avatar: not an IMX\0 container — first bytes
  are [3c 21 64 6f]. The container GET /v1/agent/{code}/model/download vends
  begins "IMX\0".
```

> **`members(of:)` catches the HTML error page but NOT a truncation.** Measured
> 2026-09-20 on `Expression2` 2.6.3: the table of contents sits at the *head* of
> the file, so `members(of:)` reads it and returns **17 members in 0.3 ms** for a
> container cut to 50%, to 99%, and even for its **first 2 KB**. The truncation
> surfaces only when a member's bytes are actually read — by `read`, by `unpack`,
> or by `create(avatarContainer:…)`, each of which throws the message above.
> So the cheap integrity gate is a **`Content-Length` comparison** against the
> download; `members(of:)` is the gate for *"is this a container at all"*, and
> staging is what proves it is a whole one.

### A missing shared engine

The commonest real-world Apple failure is not corruption, it is forgetting that
the `.avatar` does not carry the shared graphs. `missingMembers()` answers that
before you try to start:

```text
Expression2LoadError | expression-2 avatar is missing
  w2v_frontend_cpuAndNE.mlpackage — re-provision the member(s) ..., or pass
  `sharedEngineDir:` if the shared graphs live in a second directory.
```

Use it as a pre-flight — it is a directory listing, it costs nothing, and it
turns a load exception into a message you can act on:

```swift
let missing = Expression2Engine.missingMembers(avatarDir: dir, sharedEngineDir: shared)
guard missing.isEmpty else { throw SetupError.needsEngineInstall(missing) }
```

### A corrupt member: two different answers

This is where the Apple rail differs from Android in a way worth knowing before
you ship. When a staged member's bytes change while its length does not, the
answer depends entirely on *which* member.

Corrupt the decoder's **structure** (`model.mlmodel`) and CoreML refuses to
compile it, with a load error that names the stage that failed — `a member is
present but unloadable (CoreML compile failure or an I/O-contract mismatch)`.

Corrupt the same decoder's **weights** (`weight.bin`) and nothing refuses
anything: `missingMembers()` is satisfied, `create()` succeeds, frames come out —
and the pixels are not the ones the clean container produces. **This is the one
Apple state that fails silently, and it does not fail safe: it delivers a
different face.** CoreML validates the model graph, not the numbers in it, and
nothing else on this rail checks the numbers either.

Still true on 2.6.3, and measured rather than asserted: flipping 4,096 bytes in
the middle of `weight.bin` (length unchanged) gave `create()` in 1.8 s, the same
**326 frames** as the clean container at the same wall clock, and a frame digest
of `031d3f04…` against the clean run's `7a31a1dc…` — which two clean runs
reproduce exactly. Nothing in the API said a word.

That is the gap: the shipped 2.6.3 surface
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

Run it after staging and before `create()`: it returns the members that do not
match, it costs well under a second for the whole container, and it is the only
thing standing between a rotted cache and a wrong face.

> **Reported as an SDK gap.** This belongs in the SDK, not in your app. It is
> filed against `Expression2` as a missing public verification call; until a
> release carries one, the code above is the workaround, and it uses only shipped
> API.

### Four fifths of your download is for the other platform

A container holds 17 members, and the largest of them —
`combined_litert.tflite` — is the Android LiteRT model. The Apple engine never
opens it.

So **80% of every `.avatar` an iPhone downloads is a model it will never load.**
Budget the download and the disk for 198 MB, not for the 40 MB Apple uses, and do
not be surprised by the size on a cellular connection.

### A rejected key

On this rail the key is checked at the door, not on the device. The same URL,
varying only the header:

```text
# no header, for a code that needs one
HTTP/2 401  {"error":{"code":"MISSING_AUTH","httpStatus":401,"message":"This agent's model
             requires a credential: send the api-secret header or Authorization:
             Bearer <api-secret | runtime token>"},"status":"error","status_code":401}

# a key that is not a key
HTTP/2 401  {"error":{"code":"UNAUTHORIZED","httpStatus":401,
             "message":"Invalid api-secret"},"status":"error","status_code":401}

# a valid key, for a code it cannot see
HTTP/2 404  {"error":{"code":"NOT_FOUND","httpStatus":404,
             "message":"Agent not found for code: …"},"status":"error","status_code":404}

# a valid key, for a code it owns
HTTP/2 302  location: https://…/storage/v1/object/sign/models-downloads/expression-2/<CODE>.avatar?…

# NO header at all, for a free-gallery code
HTTP/2 302  location: https://…/storage/v1/object/sign/models-downloads/…?…
```

★ **`401` is not the answer to "no key" — it is the answer to "no key, and this
one needs one".** A free-gallery identity answers **`302` anonymously**, which is
the whole of [Route A](/examples/swift-ios-expression2) and is easy to mistake for
"the endpoint is open". Test your handling against *your own* code, not a gallery
one. (Measured 2026-09-20; the `"type"` field these bodies used to carry is gone,
so switch on `error.code`, never on `type`.)

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

A render driven for well past five minutes with a deliberately *invalid*
`BITHUMAN_API_SECRET` in the environment never slowed and never refused.
Combined with the sandbox result above — no sockets on the render path — the
conclusion is not "the grace failed to fire"; it is that **there is nothing on
the device to fire it**. The engine consults no key and no meter.

That is consistent with the rail's design, and the enforcement point is real: you
cannot obtain the `.avatar` without a valid key, as the `401`s above show. But
plan for it honestly — **once a device holds a container, that device can render
from it offline, indefinitely, with no key.** If your product needs per-session
entitlement, it has to come from your own backend gating the *download*, not from
the SDK.

### Apple reference

`Expression2` 2.6.3 on Apple Silicon, re-driven 2026-09-20 except where a row
says otherwise.

| State | Time to fail | What you get | What to do |
| --- | --- | --- | --- |
| Offline, model on device | — | renders, identical digest *(2.11.2; not re-driven)* | nothing; no socket is opened |
| Not a container | 0.7 ms | `Expression2ContainerError`, first-bytes message | you saved an error page; check the HTTP status first |
| Truncated container, `members(of:)` | — | **no error — 17 members in 0.3 ms**, even on the first 2 KB | compare `Content-Length`; `members(of:)` is not this gate |
| Truncated container, staging or `create(avatarContainer:…)` | 67–87 ms | `Expression2ContainerError`, names the member and the offset | re-download |
| Shared engine missing | 0.6 ms | `Expression2LoadError`, names the member | `bithuman engine install mac`; pre-flight `missingMembers()` |
| Member structure corrupt | 379 ms | `Expression2LoadError`, `decoder=missing-decp2` | re-stage from the container |
| Member weights corrupt | **never** | 326 frames, no error, digest `031d3f04…` vs `7a31a1dc…` — a **different face** | verify against `manifest.json` — nothing else will |
| One-call `create(avatarContainer:…)`, clean container | — | opens on iOS *and* macOS (2.0 s on an M4) | either this or stage by hand |
| No `api-secret`, code needs one | at the door | `401 MISSING_AUTH` | send the header |
| No `api-secret`, free-gallery code | at the door | **`302` — it downloads** | do not read `302` as "my key worked" |
| Bad `api-secret` | at the door | `401 UNAUTHORIZED`, `"Invalid api-secret"` | fix the key |
| Key cannot see the code | at the door | `404 NOT_FOUND`, `"Agent not found for code: …"` | not necessarily a bad code — may not be this account's |
| Invalid key, render running | never refuses | 5,429 frames over 330 s *(2.11.2; not re-driven)* | expected: on-device render is unmetered |

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
