---
title: "Install the CLI"
description: "Install the bithuman CLI via Homebrew, the universal curl installer, or PyPI — then verify with bithuman doctor."
section: cli
group: "Get started"
order: 2
---

## Three install channels, one binary

The same Rust binary ships through all three channels — byte-identical.
Pick whichever fits your environment.

**macOS Homebrew** — recommended on Apple Silicon:

```bash
brew tap bithuman-product/bithuman
brew install bithuman-cli
```

**Universal installer** — macOS + Linux, no Python required:

```bash
curl -fsSL https://github.com/bithuman-product/homebrew-bithuman/releases/latest/download/install.sh | sh
```

**PyPI sibling wheel** — Python-friendly install:

```bash
pip install bithuman-cli
```

The `pip install bithuman-cli` path supports Python 3.10–3.14 on macOS
arm64 and Linux x86_64 / aarch64.

> **Note** The `bithuman` package on PyPI is the Python SDK / library
> (`from bithuman import AsyncBithuman`) — it does not ship the CLI. The
> CLI is the separate `bithuman-cli` package. `brew install bithuman`
> still resolves via a deprecated alias.

## Verify the install

Print the engine, ABI tag, and CLI versions:

```bash
bithuman --version
# libessence 1.19.1 ABI 7
# bithuman    2.3.0
```

Then run the full host, auth, and cache check:

```bash
bithuman doctor
```

## What `doctor` checks

`bithuman doctor` is the first thing to run when something does not work.
It reports:

- **Versions** — `libessence` engine, ABI tag, and CLI binary version.
- **Host** — OS, arch, total RAM, with a hint on whether the box is big
  enough for [local mode](/cli/local-mode).
- **Auth + brain selection** — whether `BITHUMAN_API_SECRET` is set
  (avatar auth) and which brain is selected (cloud OpenAI, on-device, or
  neither).
- **Brain availability** — for cloud, whether `OPENAI_API_KEY` is set;
  for local, whether the `[local]` extra is installed and weights are
  downloadable.
- **Caches** — sizes of `~/.cache/bithuman` (avatars + showcase), the
  brain venv, and `~/.cache/huggingface` + `~/.cache/supertonic`
  (local-mode model downloads).

It exits `0` only if **both** avatar auth and a brain path are
configured, so it composes cleanly in CI:

```bash
bithuman doctor && bithuman run avatar.imx
```

## Next steps

- [Commands](/cli/commands) — full subcommand and flag reference
- [Configuration](/cli/configuration) — environment variables and cache layout
- [Local mode](/cli/local-mode) — install the `[local]` extra for the on-device brain
