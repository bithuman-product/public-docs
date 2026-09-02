# HELD — Expression 2 Android AAR 0.2.0

**Destination:** `src/content/docs/sdk/android.md`, replacing the
"Where Expression 2 on Android stands" block.

**Release condition — all three must hold before any of this is moved into
`src/content/docs/`:**

1. The Expression 2 AAR resolves for an **anonymous** consumer build from a
   **public** repository. Today it does not: it is published to a private
   registry and an anonymous Gradle build gets **HTTP 401**, not a missing
   artifact.
2. ★ **Do not publish the current coordinate.** The repository it lives in is
   private; printing the coordinate on a public page hands every reader a 401
   and reads as a broken SDK rather than an unreleased one. The page keeps
   saying "not published publicly" until (1) changes, and the coordinate and
   version go in **on the day it does**, not before.
3. A **sustained** frame-rate measurement exists (see "The numbers" below —
   every figure held here is a **cooled** reading and the sustained number does
   not exist).

---

## ★ Upgrading from 0.1.x is a binary-incompatible break

**This is the first thing a reader must meet on the page — not a footnote, not
a "Migration" section at the bottom.** Whoever moves this file must keep it
above the install snippet and above the frame-rate tables.

`Expression2Options.overlapDecoder` changed from a non-null `Boolean` to a
**nullable** one, so that `null` can mean *let the library choose* alongside an
explicit `true` / `false`. On the JVM that changes the getter's signature:

```text
0.1.x   getOverlapDecoder()Z                        // primitive boolean
0.2.0   getOverlapDecoder()Ljava/lang/Boolean;      // boxed, may be null
```

A JVM method's return type is **part of its signature**. Two different callers
break in two different ways, and neither is caught by a compiler:

### 1. Code you do not recompile throws `NoSuchMethodError`

Any class file already compiled against 0.1.x — your own library module, a
third-party wrapper, anything you consume as a binary — is linked to
`getOverlapDecoder()Z`. That method no longer exists. Dropping 0.2.0 onto a
build without recompiling every consumer of this type gives you
`java.lang.NoSuchMethodError` **at the call site, at runtime**, on a device, in
a build that compiled and installed cleanly.

**Recompile everything that touches `Expression2Options`.** A Gradle version
bump alone is not enough if any consumer is consumed as a prebuilt artifact.

### 2. Java source that *does* recompile still compiles — and NPEs

This is the dangerous half. In Java:

```java
// Compiles clean against BOTH 0.1.x and 0.2.0. Correct on one, a crash on the other.
boolean b = opts.getOverlapDecoder();
```

Against 0.2.0 that is `Boolean` auto-unboxed to `boolean`, which javac accepts
silently. When the value is `null` — which is now the **default**, meaning
"choose automatically" — the unboxing throws
`java.lang.NullPointerException`. There is no warning, no deprecation, no
red squiggle: the build is green and the crash is on the handset.

**Fix it at the source, in one of two ways:**

```java
// Explicit: honour the tri-state.
Boolean overlap = opts.getOverlapDecoder();
if (overlap == null) {
    // library chooses
} else if (overlap) {
    // ...
}

// Or collapse it, if your code genuinely wants a two-state answer:
boolean b = Boolean.TRUE.equals(opts.getOverlapDecoder());
```

Kotlin callers are safer but not free: `opts.overlapDecoder` is now
`Boolean?`, so a `if (opts.overlapDecoder)` stops compiling and the compiler
tells you. That is the intended experience — it is Java callers who get no
signal at all.

### Why the type changed

`overlapDecoder` used to be a plain on/off switch defaulting to off. It is now
tri-state — `true`, `false`, or `null` for **AUTO**, where the library picks per
device. Making the "let the library decide" case representable is what forced
the nullable type, and the boxed getter is a consequence of that, not a
gratuitous API churn.

### Checklist

- [ ] Recompile **every** module that references `Expression2Options`, including
      prebuilt/AAR consumers, or expect `NoSuchMethodError`.
- [ ] Grep Java sources for `getOverlapDecoder()` assigned to a `boolean`.
      Every one of them is a latent `NullPointerException`.
- [ ] Decide what your app wants when the value is `null` (AUTO) rather than
      letting an unboxing decide for you.

---

## The numbers — held until a sustained reading exists

★ **Every figure below is a COOLED reading and must not be published as a
frame rate a conversation will hold.** They were taken on 405-frame arms — a few
seconds of render — and this SoC's clocks fall **3.53 → 2.23 GHz within about
12 seconds**, so a 405-frame arm measures the thermal state, not the engine.
The page's existing rule is already the right one and applies unchanged: *plan
around the plateau, not the cold window.*

Measured on a **Galaxy S25+ / Snapdragon 8 Elite (SM8750)**, 405-frame cooled
arms, Thermal Status 0, on AC, 4 threads, harness noise floor **1.66%**:

| Change | Cooled, before → after | Ratio |
|---|---|---|
| `overlapDecoder` off → on | 30.13 → **45.2 fps** | 1.50× |
| `qnnOptions` stale → correct | 20.55 → **29.85 fps** | 1.45× |

The `qnnOptions` fix also flips this configuration's real-time gate from
**0.9657 (fail)** to **0.6605 (pass)**.

★ **The two rows do not compose.** They are separate arms with different
baselines (30.13 vs 20.55 fps). Nobody has measured the two fixes stacked. Do
not multiply them, and do not quote a combined figure.

★ **What the published page needs before these go in:** a sustained plateau on
the same protocol the current page uses for `overlapDecoder = false` — hundreds
of seconds of continuous speech from a cooled start, plateau window stated, and
reproduced across two independent runs. Until that exists, the page's
**RTF 0.8732 · 22.90 fps** plateau row stays as the number a reader plans
against, and these belong here.
