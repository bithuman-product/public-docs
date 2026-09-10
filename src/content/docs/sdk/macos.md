---
title: "macOS"
description: "A talking avatar on an Apple Silicon Mac in two commands — the CLI renders Expression 2 and Essence 2 locally through CoreML. Plus the Python library and the native Swift package."
section: sdk
group: "Platforms"
order: 50
label: "macOS"
---

## Two commands

```bash
curl -fsSL https://raw.githubusercontent.com/bithuman-product/homebrew-bithuman/main/install.sh | sh
bithuman run
```

No account, no API key, no file to point at. The second command downloads the
free **Wise Pup** [`expression-2`](/concepts/expression-2) avatar and renders it
live at `http://127.0.0.1:8088/`.

Run 2026-09-10 on **macOS 26.6.2, Apple Silicon**, from the published bytes,
with no credential in the environment:

```text
install: version: cli-v2.6.5
install: sha256 ok
install: installed: libessence 3.1.0 ABI 7

  ◆ first run — fetching the Wise Pup lane (A23WJF0199.imx, this platform only) …
  fetched coreml lane: 12 members, 26.3 MB (sha-verified)
  ◆ expression-2 preview at http://127.0.0.1:8088/  (Ctrl-C to stop)
```

The engine's own per-chunk log — the lines with the retired `embody` prefix,
which is [a legacy name kept for compatibility](/concepts/models-v2) and the
string you grep for — reported 32 frames generated in 465–594 ms across the run,
**2.7–3.4x faster than real time**.

macOS renders Expression 2 through CoreML — the Neural Engine carries
[84–100% of the operations](/concepts/expression-2#which-apple-compute-units-run-expression-2),
which is why a Mac generates frames about 3x faster than the 20 fps the model
plays at. `brew install bithuman-product/bithuman/bithuman-cli` installs the
same release if you prefer Homebrew; the formula points at the same tarball.

Everything the CLI can do — a voice agent in the browser, an offline MP4, your
own agent's avatar — is on the [CLI page](/sdk/cli), and every flag is in the
[CLI reference](/sdk/cli/reference). Nothing on those pages is macOS-specific
except this install line.

## In your own Python

```bash
pip install bithuman
```

Verified on this Mac on 2026-09-10: `bithuman 3.0.4`, macOS 26.6.2, arm64,
Python 3.13 — the wheel resolves and imports. macOS wheels are tagged
**macOS 14+ (arm64)**; on an older macOS pip reports `No matching distribution
found`. Everything after the install is the same two calls documented on the
[Python SDK](/sdk/python) page, which is the one writer for that surface.

## In a native Mac app

The Swift package is one SwiftPM dependency and it vends the Mac slices of the
same engines:

```
https://github.com/bithuman-product/homebrew-bithuman.git
```

- **`Expression2`** — the second-generation engine, `macos-arm64` and
  `ios-arm64`. This is the product that renders a downloaded `.avatar`.
- **`bitHumanKit`** — the umbrella: an on-device voice agent (speech
  recognition, a language model, text-to-speech) with an optional avatar.
  Apple Silicon, **M3 or later**.
- **`Essence2`** — the `essence-2` engine's C interface. It builds for macOS,
  and what it does and does not open is on the Apple page.

The pin, the products, the entitlements and the measured refusals all live on
[**iOS, iPadOS & macOS**](/sdk/ios) — that page is the single writer for the
Swift package, because the two platforms share one dependency and splitting it
is how the numbers drifted apart before.

## Not on a Mac?

An **Intel Mac** has no CLI binary and no Python wheel — there has never been a
native build. Use the [cloud API](/api/reference), the
[browser](/sdk/web), or run the Linux binary in a container.

## See also

- [CLI](/sdk/cli) — the two-command quickstart in full
- [CLI reference](/sdk/cli/reference) — every command, flag and environment variable
- [Python SDK](/sdk/python) — the library surface
- [iOS, iPadOS & macOS](/sdk/ios) — the Swift package
- [Run a model on your own hardware](/guides/self-host-local) — the same route, per platform
