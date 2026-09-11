---
title: "CLI"
description: "Install one binary and type `bithuman run` — a talking avatar at http://127.0.0.1:8088/ on macOS Apple Silicon or Linux x86_64, no account and no key for the first frame. Offline MP4 render in one more command."
section: sdk
group: "Platforms"
order: 10
label: "CLI"
---

## Install

```bash
curl -fsSL https://raw.githubusercontent.com/bithuman-product/homebrew-bithuman/main/install.sh | sh
```

What it prints when it succeeds — the last line names the engine core the
binary carries, and `bithuman version` prints the same thing later:

```text
install: version: cli-v2.6.5
install: sha256 ok
install: installed: libessence 3.1.0 ABI 7
```

One self-contained binary on your `PATH`, sha256-verified against the release.
On Apple Silicon `brew install bithuman-product/bithuman/bithuman-cli` installs
the same tarball. Published for **macOS Apple Silicon** and **Linux x86_64**
only; on an Intel Mac or a Linux ARM box the installer names the platform and
exits 1 without downloading anything
([exact output](/sdk/cli/reference#platforms-with-no-binary)).

## Get a model

Nothing to fetch for the first frame: `bithuman run` with no argument downloads
the free **Wise Pup** avatar (`A23WJF0199`, an
[Expression 2](/concepts/expression-2) identity) itself — the slice for this
platform only, sha-verified. Twenty more showcase avatars download with no
account:

```bash
bithuman avatars                  # the showcase catalogue — slug, name, model
bithuman pull marmalade           # prints ~/.cache/bithuman/showcase/marmalade.imx
```

Your own agent needs a sign-in once, then the same command:

```bash
bithuman login                    # opens your browser; the key lands in your OS keychain
bithuman pull <YOUR_AGENT_CODE>   # prints the cached path; --model essence-2 picks a family
```

## Minimal code

Two operations — there is no third:

```bash
bithuman run                                                        # 1. live avatar in your browser
bithuman render "$(bithuman pull marmalade)" -a speech.wav -o out.mp4  # 2. offline: audio in, MP4 out
```

`run` takes a path too (`bithuman run "$(bithuman pull marmalade)"`); `render`
needs a 16 kHz mono WAV — `curl -fsSLo speech.wav
https://tmoobjxlwcwvxvjeppzq.supabase.co/storage/v1/object/public/web/showcase/demo_sample.wav`
is one. `bithuman open <file>` prints what an avatar is before you render it.

## Run

Open the printed `http://127.0.0.1:8088/`, grant the microphone, talk. Without
a sign-in the avatar renders but does not answer; `bithuman login` adds the
managed conversation brain, and [local mode](/sdk/cli/local-mode) runs the
brain entirely on your own hardware instead — no LLM or TTS vendor.

`run` and `render` differ on purpose: **`render` refuses without a credential**
(exit 77, no output file) while a live `run` keeps rendering and prints
`★ UNMETERED RENDER` if the meter cannot be reached, because a metering failure
must never stop a live session. A self-hosted session is metered —
[pricing](/guides/pricing) is the authority.

## Performance

Measured 2026-09-10 from the published `cli-v2.6.5` bytes, unpaced (frames
produced as fast as the engine can, not paced to playback):

| Device | Model | fps (unpaced) | Notes |
|---|---|---:|---|
| Apple Silicon, macOS 26.6.2, CoreML on the Neural Engine | Expression 2 (Wise Pup) | 54–69 | 32-frame chunks in 465–594 ms; the model plays at 20 fps |
| Linux x86_64, 24 cores, LiteRT on CPU | Expression 2 (showcase `A08CCD3871`) | 29 | `render`: 278 frames of a 13.87 s clip in 9.5 s of whole-process wall clock |
| Linux x86_64 (Ryzen Threadripper PRO 5955WX), 8 threads | Essence 2 | 1.1 | 408 frames of 1920×1080 in 371 s; plan an offline `render`, not a live CPU session |
| Apple M4, 8 threads | Essence 2 | 2.2 | 408 frames of 1080×1920 in 187 s; the same offline `render` |

The first Essence 2 render on a machine fetches one shared audio encoder
(~377 MB, by content digest, once) into `~/.bithuman/engines/essence-2/`.

Every platform side by side, with what is on main for the next release: [Performance](/sdk/performance).

## What renders locally, and where

| Platform | Expression 2 | Essence 2 | Essence 1 |
|---|---|---|---|
| **macOS Apple Silicon** | yes — CoreML | yes (2.6.1+) | live only |
| **Linux x86_64** | yes — LiteRT on CPU | yes (2.6.1+) | live only |

Those are the only two targets with a published binary. `render` on an Essence 1
avatar exits 70 — use the [Video API](/api/video) for that family;
[Expression 1](/concepts/expression-1) is GPU-only by design and serves through
the [cloud API](/api/overview).

## Troubleshooting

| You see | It means | Do this |
|---|---|---|
| the installer names your platform and exits 1 | no binary for an Intel Mac or Linux ARM | the [web](/sdk/web), the [cloud API](/api/overview), or the Linux x86_64 binary in a container |
| `render` exits 77, no output file | no credential | `bithuman login`, or `export BITHUMAN_API_SECRET=…` ([credential order](/sdk/cli/reference#credential-resolution-order)) |
| `pull <CODE>` exits 77 | your agent code, but no sign-in | `bithuman login`, then pull again |
| `pull <CODE>` exits 66 with `404 NOT_FOUND` | not an agent on your account, and not a showcase slug | check the code under [your agents](/api/agents); `bithuman avatars` lists the public ones |
| `pull <CODE>` exits 66 with `409 MODEL_NOT_GENERATED` | the agent has no model of that family yet | [add the model](/api/agents#add-a-model-to-an-existing-agent), or `--model` the family it was created with |
| `pull <CODE>` exits 66 with `MODEL_ARTIFACT_NOT_READY` | trained, not yet published to the download store | poll: run the same `pull` again in a minute |
| `SLUG_NOT_FOUND` | the slug is not in the catalogue | `bithuman avatars` and copy a slug from it |
| `render` exits 70 on an `.imx` | an Essence 1 avatar — the CLI renders that family live only | `bithuman run <file>`, or the [Video API](/api/video) |
| `bithuman doctor` exits 1 | no credential and no brain configured yet — the check working | `bithuman login`; `run`, `pull` and `render` of a showcase file never needed it |

Every failure prints one JSON object to stderr and a
[stable exit code](/sdk/cli/reference#exit-codes); branch on the code, not the
text.

## See also

- [CLI reference](/sdk/cli/reference) — every command, flag, exit code and environment variable
- [Local mode](/sdk/cli/local-mode) — the conversation brain fully on-device
- [macOS](/sdk/macos) — the same binary through Homebrew, and the native Swift package
- [Python](/sdk/python) — the same engines as a library
- [SDK](/sdk) — every platform on one table
