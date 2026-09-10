---
title: "bitHuman CLI"
description: "Two commands to a talking avatar on your own machine — install the binary, run it. macOS Apple Silicon and Linux x86_64, no account and no API key for the first frame."
section: sdk
group: "Platforms"
order: 10
label: "CLI"
---

## Two commands

```bash
curl -fsSL https://raw.githubusercontent.com/bithuman-product/homebrew-bithuman/main/install.sh | sh
bithuman run
```

That is the whole quickstart. The installer picks your platform, verifies the
release's sha256 and drops one self-contained binary on your `PATH`.
`bithuman run` with no arguments downloads the free **Wise Pup** avatar
(`A23WJF0199`, an [`expression-2`](/concepts/expression-2) identity) and renders
it live at `http://127.0.0.1:8088/`. **No account, no sign-in, no API key.**

Run 2026-09-10 on Linux x86_64 and again on macOS 26.6.2 (Apple Silicon), from
the published bytes, with no credential in the environment:

```text
install: querying latest release...
install: version: cli-v2.6.5
install: verifying sha256...
install: sha256 ok
install: installed: libessence 3.1.0 ABI 7

  ◆ first run — fetching the Wise Pup lane (A23WJF0199.imx, this platform only) …
  fetched litert lane: 4 members, 63.6 MB (sha-verified)
  ◆ expression-2 · 416x720 @20fps · warm 881 ms
  ◆ expression-2 preview at http://127.0.0.1:8088/  (Ctrl-C to stop)
```

macOS fetches a smaller, CoreML slice of the same avatar — `12 members, 26.3 MB`
— and renders it at the same 20 fps. That rate is
[`expression-2`'s own frame rate](/concepts/expression-2), not a limit of this
machine.

> **On Apple Silicon, `brew install bithuman-product/bithuman/bithuman-cli`
> installs the same release** — the formula points at the same tarball. The curl
> line above is the one that works on both platforms, so it is the one this page
> teaches.

## Give it a voice

`bithuman run` on its own renders. To make the avatar listen and answer, sign in
once and add a conversation brain:

```bash
bithuman login          # opens your browser; the key lands in your OS keychain
bithuman run
# → open the printed http://127.0.0.1:8088/ URL, grant the mic, talk
```

`bithuman login` mints a per-device key so no other command needs
`export BITHUMAN_API_SECRET` (that path still works for CI —
[reference](/sdk/cli/reference#environment-variables)). The brain runs as a
Python worker the binary launches; signing in gives you the managed one. To run
the brain **entirely on your own hardware** instead — whisper.cpp, llama.cpp,
Supertonic, no LLM or TTS vendor — see [local mode](/sdk/cli/local-mode).

## Render a clip to a file

```bash
bithuman render <avatar-file> --audio speech.wav --output out.mp4
```

Measured 2026-09-10 on Linux x86_64, against the public showcase identity
`A08CCD3871.avatar` and a 13.87 s 16 kHz WAV: **exit 0, 278 frames at 20 fps,
2.9 MB, 9.5 s of wall clock** — faster than real time.

**`render` needs a credential and `run` does not, and that difference is
deliberate.** With no key, `render` refuses before it opens the model —
`exit 77`, no output file. A live `run` renders anyway behind a loud
`★ UNMETERED RENDER` line, because a metering failure must never stop a live
session. Both were re-run today. What a self-hosted session costs is on
[pricing](/guides/pricing).

## Use your own avatar

```bash
bithuman login
bithuman pull <YOUR_AGENT_CODE>       # prints the cached path on stdout
bithuman run <path>
```

`bithuman pull` is free and takes a showcase slug too — `bithuman pull
modern-court-jester`. `bithuman list` browses the catalogue with no credential
at all. To create an agent of your own, see [Agents](/api/agents).

## What renders locally, and where

| Platform | `expression-2` | `essence-2` | `essence-1` |
| --- | --- | --- | --- |
| **macOS (Apple Silicon)** | Yes — CoreML | Yes (2.6.1+) | Yes, live only |
| **Linux x86_64** | Yes — LiteRT on CPU | Yes (2.6.1+) | Yes, live only |

Those are the only two targets with a published binary; an Intel Mac or a Linux
ARM box has none, and the installer says so and exits 1 rather than downloading
anything — [the exact output](/sdk/cli/reference#platforms-with-no-binary).
`bithuman render` on an `essence-1` avatar still exits 70; use the
[Video API](/api/video) for that family.
[`essence-2-max`](/concepts/essence-2-max) and
[`expression-1`](/concepts/expression-1) are GPU-only by design and serve
through the [cloud API](/api/overview).

The first `essence-2` render on a machine fetches one shared audio encoder
(~377 MB, by content digest, once) into `~/.bithuman/engines/essence-2/`.
Nothing to stage by hand.

## Check the install

```bash
bithuman doctor
```

`doctor` reports the binary, the host, the credential and the brain. **It exits
1 until both a credential and a brain are configured** — that is the check
working, not a broken install. Rendering and pulling do not need either.

## Next

- [CLI reference](/sdk/cli/reference) — every command, every flag, every environment variable, every exit code
- [Local mode](/sdk/cli/local-mode) — the conversation brain, fully on-device
- [Verified transcript](/sdk/cli/verified) — each command re-run on a clean host with its real exit code, including the failure arms
- [Python SDK](/sdk/python) — the same engine, in your own process
