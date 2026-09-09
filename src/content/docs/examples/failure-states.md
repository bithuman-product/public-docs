---
title: "Failure states on a phone"
description: "What the on-device SDK actually throws when the network is gone, a download is interrupted, or an agent code is wrong — measured on a Galaxy S25+ against ai.bithuman:expression2-android:0.3.1, with the exact exception text and the handling each state needs."
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

## Next steps

- [Kotlin / Android — Hello, avatar](/examples/kotlin-android-hello) — the whole
  working project these states were measured against.
- [Android SDK](/sdk/android) — coordinates, the model store, and the measured
  device limits.
