---
title: "Install the CLI"
description: "Install the bithuman CLI with one command, then verify with bithuman doctor."
section: cli
group: "Get started"
order: 2
---

## Install

One command, macOS and Linux:

```bash
curl -fsSL https://github.com/bithuman-product/homebrew-bithuman/releases/latest/download/install.sh | sh
```

This downloads the latest self-contained `bithuman` binary (the same engine that
powers the [SDKs](/sdk)) and puts it on your `PATH`.

## Verify

```bash
bithuman doctor
```

`doctor` checks your install, platform, and that everything's ready to run. Then
head to [Commands](/cli/commands) or jump straight in:

```bash
bithuman pull modern-court-jester
bithuman run
```

> **Tip** — `bithuman run` prints a local URL (e.g. `http://127.0.0.1:8088/<code>`)
> where your agent is live. See [Configuration](/cli/configuration) for cloud vs
> on-device options and [Local mode](/cli/local-mode) to run fully offline.
