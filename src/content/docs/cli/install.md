---
title: "Install the CLI"
description: "Install the bithuman CLI with one command, then verify with bithuman doctor."
section: cli
group: "Get started"
order: 2
---

## Install

**macOS (Apple Silicon)** — Homebrew:

```bash
brew install bithuman-product/bithuman/bithuman-cli
```

**macOS or Linux** — universal installer (detects your platform and drops the
right self-contained `bithuman` binary on your `PATH`):

```bash
curl -fsSL https://raw.githubusercontent.com/bithuman-product/homebrew-bithuman/main/install.sh | sh
```

It's the same engine that powers the [SDKs](/sdk).

> **Note** — `pip install bithuman-cli` also works, but **only on macOS Apple
> Silicon** (there are no Linux or Intel-Mac wheels). On Linux, use the universal
> installer above. The separate `bithuman` PyPI package is the Python *library*,
> not the CLI — see [Python SDK](/sdk/python).

## Verify

```bash
bithuman doctor
```

`doctor` checks your install, platform, and that everything's ready to run. Then
head to [Commands](/cli/commands) or jump straight in:

```bash
bithuman pull modern-court-jester
bithuman run ~/.cache/bithuman/showcase/modern-court-jester.imx
```

> **Tip** — `bithuman run` prints a local URL (e.g. `http://127.0.0.1:8088/<code>`)
> where your agent is live. See [Configuration](/cli/configuration) for cloud vs
> on-device options and [Local mode](/cli/local-mode) to run fully offline.
