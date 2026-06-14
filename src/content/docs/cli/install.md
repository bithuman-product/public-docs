---
title: "Install the CLI"
description: "Install the bitHuman CLI with one command, then verify with bithuman doctor."
section: cli
group: "Get started"
order: 2
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

It's the same engine that powers the [SDKs](/sdk).

> **Note** — `pip install bithuman-cli` also works, but **only on macOS Apple
> Silicon** (there are no Linux or Intel-Mac wheels). On Linux, use the universal
> installer above. The separate `bithuman` PyPI package is the Python *library*,
> not the CLI — see [Python SDK](/sdk/python).

## Sign in

```bash
bithuman login
```

This opens your browser to sign in to bitHuman. Approve the request and you're
done — `bithuman login` mints a per-device key, scoped to your account, and
stores it in your OS keychain so every other command just works. No copying
secrets, no `export`. On an SSH or headless box (no browser to open), use
`bithuman login --device` and enter the short code it prints. See
[Commands → Signing in](/cli/commands#signing-in) for logout and `auth status`.

> **Tip** — Prefer to manage the credential yourself (CI, automation)? Skip
> login and set `BITHUMAN_API_SECRET` directly — see
> [Configuration](/cli/configuration). Both paths are fully supported.

## Verify

```bash
bithuman doctor
```

`doctor` checks your install, platform, sign-in, and that everything's ready to
run. Then head to [Commands](/cli/commands) or jump straight in:

```bash
bithuman pull modern-court-jester
bithuman run ~/.cache/bithuman/showcase/modern-court-jester.imx
```

> **Tip** — `bithuman run` prints a local URL (e.g. `http://127.0.0.1:8088/<code>`)
> where your agent is live. See [Configuration](/cli/configuration) for cloud vs
> on-device options and [Local mode](/cli/local-mode) to run fully offline.
