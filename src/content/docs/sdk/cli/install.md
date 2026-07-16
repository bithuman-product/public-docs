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

**macOS (Apple Silicon) or Linux** — universal installer (detects your platform
and drops the right self-contained `bithuman` binary on your `PATH`; no
Intel-Mac build is published):

```bash
curl -fsSL https://raw.githubusercontent.com/bithuman-product/homebrew-bithuman/main/install.sh | sh
```

It's the same engine that powers the [language SDKs](/sdk).

> **Note** — `pip install bithuman-cli` also works, but **only on macOS Apple
> Silicon** (there are no Linux or Intel-Mac wheels). On Linux, use the universal
> installer above. The separate `bithuman` PyPI package is the Python *library*,
> not the CLI — see [Python SDK](/sdk/python).

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
run. Then head to [Commands](/sdk/cli/commands) or jump straight in:

```bash
bithuman pull modern-court-jester
bithuman run ~/.cache/bithuman/showcase/modern-court-jester.imx
```

> **Tip** — `bithuman run` prints a local URL (e.g. `http://127.0.0.1:8088/<code>`)
> where your agent is live. See [Configuration](/sdk/cli/configuration) for cloud vs
> on-device options and [Local mode](/sdk/cli/local-mode) to run fully offline.
