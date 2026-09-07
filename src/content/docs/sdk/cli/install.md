---
title: "Install the CLI"
description: "Install the bitHuman CLI with one command, then verify with bithuman doctor."
section: sdk
group: "Command line"
order: 31
label: "Install"
---

## Install

**macOS (Apple Silicon)** — Homebrew:

```bash
brew install bithuman-product/bithuman/bithuman-cli
```

**macOS (Apple Silicon) or Linux x86_64** — universal installer (detects your
platform and drops the right self-contained `bithuman` binary on your `PATH`):

```bash
curl -fsSL https://raw.githubusercontent.com/bithuman-product/homebrew-bithuman/main/install.sh | sh
```

Run unpinned on Linux x86_64 on 2026-09-07 it resolves `cli-v2.6.2`, verifies
the published sha256, installs, and exits **0**. The whole transcript, with the
failure cases beside it, is on
[Verified transcript](/sdk/cli/verified#install).

It's the same engine that powers the [language SDKs](/sdk). As of 2.6.1 both
tarballs carry the Essence 2 runtime as well as the Expression 2 one, so both
second-generation models render locally — see
[Essence 2 on your own machine](/sdk/cli/overview#essence-2-on-your-own-machine).

`BITHUMAN_VERSION=cli-v2.6.2` pins a release; `BITHUMAN_INSTALL_DIR` moves the
install (default `~/.local/bin`, or `/usr/local/bin` as root).

> **Note** — `pip install bithuman-cli` also works, but **only on macOS Apple
> Silicon** (there are no Linux or Intel-Mac wheels). On Linux, use the universal
> installer above. The separate `bithuman` PyPI package is the Python *library*,
> not the CLI — see [Python SDK](/sdk/python).

## Which platforms actually have a binary

The installer builds a target triple from `uname` and downloads
`bithuman-<target>.tar.gz` from the release. Counted across **all 78 releases**
of the tap on 2026-09-07, exactly three targets have ever carried a tarball, and
only two of them still do:

| Your machine | Target the installer asks for | Published for `cli-v2.6.2` |
| --- | --- | --- |
| Apple Silicon Mac | `aarch64-apple-darwin` | **Yes** (36 releases, current) |
| Linux x86_64 | `x86_64-unknown-linux-gnu` | **Yes** (15 releases, current) |
| Linux ARM (`aarch64`) | `aarch64-unknown-linux-gnu` | **No** — last published `cli-v2.3.27`, 2026-07-10 |
| Intel Mac | `x86_64-apple-darwin` | **No** — never published, in any release |
| Windows | — | No binary exists |

On the bottom three rows the installer reads the release's asset list, sees no
tarball for the target, names the two it does carry, and exits **1** before
downloading anything:

```text
install: target:  aarch64-unknown-linux-gnu
install: install dir: /home/you/.local/bin
install: error: the bithuman CLI is NOT published for aarch64-unknown-linux-gnu.
install: error:
install: error:   release : cli-v2.6.2
install: error:   wanted  : bithuman-aarch64-unknown-linux-gnu.tar.gz
install: error:   release carries:
install: error:     bithuman-aarch64-apple-darwin.tar.gz
install: error:     bithuman-x86_64-unknown-linux-gnu.tar.gz
rc=1
```

The same shape appears for `x86_64-apple-darwin`. So today an Intel Mac or a
Linux ARM box **cannot install the CLI at all** — there is no flag, no fallback
and no Rosetta path. Both cases are captured in full, with the options the
installer prints, on
[Verified transcript](/sdk/cli/verified#negative-control--the-two-targets-that-will-not-install).

Two workarounds that do exist:

- **Linux ARM** — `BITHUMAN_VERSION=cli-v2.3.27` still resolves a published
  tarball: that asset returns HTTP 200 today, its sha256 verifies and it
  extracts. It is two minor releases behind and has none of the 2.4/2.5 render
  work, so treat it as a stopgap, not a supported target. **UNVERIFIED** —
  whether that 2026-07-10 binary still *runs* on a current ARM distribution was
  not tested; the check above was run from an x86_64 host, which can download
  and unpack the tarball but cannot execute it.
- **Intel Mac** — use the [cloud surfaces](/api/reference) or run the Linux
  x86_64 binary in a container; there has never been a native build to pin.

## Run it

Run with no arguments to see the engine working immediately. The CLI fetches
the free **Wise Pup** avatar (a showcase `expression-2` identity) and renders it
live on your hardware — no sign-in, no API key:

```bash
bithuman run
# → the Wise Pup avatar downloads once, then renders in real time
```

This is the out-of-the-box experience — one command from a clean install to a
running avatar. It renders locally on macOS (Apple Silicon) and Linux x86_64;
see [Local rendering by platform](/sdk/cli/overview#local-rendering-by-platform).
To make an avatar talk back, sign in and add a conversation brain, below.

## Sign in

```bash
bithuman login
```

This opens your browser to sign in to bitHuman. Approve the request and you're
done — `bithuman login` mints a per-device key, scoped to your account, and
stores it in your OS keychain so every other command just works. No copying
secrets, no `export`. On an SSH or headless box (no browser to open), use
`bithuman login --device` and enter the short code it prints. See
[Commands → Signing in](/sdk/cli/commands#signing-in) for logout and `auth status`.

> **Tip** — Prefer to manage the credential yourself (CI, automation)? Skip
> login and set `BITHUMAN_API_SECRET` directly — see
> [Configuration](/sdk/cli/configuration). Both paths are fully supported.

## Verify

```bash
bithuman doctor
```

`doctor` checks your install, platform, sign-in, and that everything's ready to
run. **It exits `1` until both a credential and a conversation brain are
configured** — that is the check working, not a broken install. Signed out on a
fresh Linux install it reports the binary and host as fine and the account as
missing:

```text
  Versions
    libessence engine     2.3.8 (ABI 7)
    CLI binary            2.6.2
    build                 2.6.2+679b9a6a7a63/adc2a18da787

  Host
    OS / arch             linux / x86_64

  Auth + brain selection
    Signed in             ✗ not signed in — run `bithuman login` (free)
    Selected              ✗ no brain available (sign in for the managed brain, or set OPENAI_API_KEY / BITHUMAN_LOCAL=1)

  ✗ not ready — fixes for what's missing:
    Sign in                 bithuman login  (free, one tap with Google)
rc=1
```

(Captured 2026-09-07 on a fresh Linux install of 2.6.2; the RAM, cache and
brain-detail lines between those sections are trimmed.)

Rendering and pulling do not need a brain — see
[Verified transcript](/sdk/cli/verified) for what works at each stage. Then head
to [Commands](/sdk/cli/commands) or jump straight in:

```bash
bithuman pull modern-court-jester
bithuman run ~/.cache/bithuman/showcase/modern-court-jester.imx
```

> **Tip** — `bithuman run` prints a local URL (e.g. `http://127.0.0.1:8088/<code>`)
> where your agent is live. See [Configuration](/sdk/cli/configuration) for cloud vs
> on-device options and [Local mode](/sdk/cli/local-mode) to run fully offline.

> **Every command on this page has been executed.** The install, the two
> platforms that 404, `pull`, `info`, `render` per family and the exit codes are
> pasted back verbatim on [Verified transcript](/sdk/cli/verified).
