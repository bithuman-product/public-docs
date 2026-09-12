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

`bithuman render` writes the MP4 through `ffmpeg` — `brew install ffmpeg` on macOS, `sudo apt install -y ffmpeg` on Linux.

One self-contained binary in `~/.local/bin` (set `BITHUMAN_INSTALL_DIR` to put
it elsewhere), sha256-verified against the release. On Apple Silicon
`brew install bithuman-product/bithuman/bithuman-cli` installs the same
tarball. The current release is **`cli-v2.6.8`** (2026-09-12), the same version
on both platforms — this page is the one place that names it:

```text
$ bithuman --version            # Linux x86_64
libessence 3.1.3 ABI 7
bithuman    2.6.8
build       b8c58abecf01 x86_64-unknown-linux-gnu/release 2026-09-12T00:59:34Z 8aafb27ef668
engine      linux 1.0.1 76d990a19674
```

The first two lines are the same on macOS; the last two name your platform's
build. Published for **macOS Apple Silicon** and **Linux x86_64** only; on an
Intel Mac or a Linux ARM box the installer names the platform and stops without
downloading anything ([exact output](/sdk/cli/reference#platforms-with-no-binary)).

## Get a model

A showcase avatar downloads with no account — twenty to pick from — and your
own agents come by code; sign in once for `render` and for your own agents:

```bash
bithuman login                    # opens your browser; stores a per-device key on this machine
bithuman avatars                  # the showcase catalogue — slug, code, name, model
bithuman pull marmalade           # prints ~/.cache/bithuman/showcase/marmalade.imx
```

A showcase pull is anonymous — `login` is for `render` and for your own agents:
`bithuman pull <YOUR_AGENT_CODE> --model essence-2` prints
`~/.cache/bithuman/agents/<YOUR_AGENT_CODE>/<YOUR_AGENT_CODE>.imx` (`--model` picks a family
when the agent has more than one). `bithuman run` with no argument fetches the
free **Wise Pup** avatar (`A23WJF0199`, an [Expression 2](/concepts/expression-2)
identity) itself.

## Minimal code

Two operations — there is no third:

```bash
bithuman run "$(bithuman pull marmalade)"                                # 1. live avatar in your browser
bithuman render "$(bithuman pull marmalade)" -a speech.wav -o out.mp4   # 2. offline: audio in, MP4 out
```

`render` needs a 16 kHz mono WAV — `curl -fsSLo speech.wav
https://tmoobjxlwcwvxvjeppzq.supabase.co/storage/v1/object/public/web/showcase/demo_sample.wav`
is one. `bithuman info <file>` prints what an avatar is before you render it.

## Run

Open the printed `http://127.0.0.1:8088/`, grant the microphone, talk. Without
a sign-in the avatar renders but does not answer; `bithuman login` adds the
managed conversation brain, and [local mode](/sdk/cli/local-mode) runs the
brain entirely on your own hardware instead — no LLM or TTS vendor.

`render` is a billed offline render, so it needs `bithuman login` or
`BITHUMAN_API_SECRET` in the environment. A self-hosted session on your own
agent is metered — [pricing](/guides/pricing) is the authority.

## Performance

Measured frame rates for every platform are on the
[performance page](/sdk/performance).

## Troubleshooting

| You see | It means | Do this |
|---|---|---|
| the installer names your platform and stops | no binary for an Intel Mac or Linux ARM | the [web](/sdk/web), the [cloud API](/api/overview), or the Linux x86_64 binary in a container |
| `bithuman: command not found` after the install | `~/.local/bin` is not on your `PATH` | `export PATH="$HOME/.local/bin:$PATH"` — the installer prints the same line |
| `render` refuses with `NOT_SIGNED_IN`, no output file | no credential — `render` is billed | `bithuman login`, or `export BITHUMAN_API_SECRET=…` ([credential order](/sdk/cli/reference#credential-resolution-order)) |
| `pull <CODE>` refuses without a sign-in | your own agent code needs a credential; a showcase slug never does | `bithuman login`, then pull again |
| `pull <CODE>` fails with `404 NOT_FOUND` | not an agent on your account, and not a showcase slug | check the code under [your agents](/api/agents); `bithuman avatars` lists the public ones |
| `pull <CODE>` fails with `409 MODEL_NOT_GENERATED` | the agent has no model of that family yet | [add the model](/api/agents#add-a-model-to-an-existing-agent), or `--model` the family it was created with |
| `pull <CODE>` fails with `MODEL_ARTIFACT_NOT_READY` | trained, not yet published to the download store | run the same `pull` again in a minute |
| `SLUG_NOT_FOUND` | the slug is not in the catalogue | `bithuman avatars` and copy a slug from it |
| the first Essence 2 `render` on a machine pauses before the first frame | it fetches one shared audio encoder (~377 MB) into `~/.bithuman/engines/essence-2/`, once | wait; every later render skips it |
| `bithuman doctor` reports not ready | no credential and no brain configured yet — the check working | `bithuman login`; a showcase `pull` and `run` never needed it |

Every failure prints one JSON object to stderr with a stable code — the
[reference](/sdk/cli/reference#exit-codes) lists them.

### What renders locally, and where

| Family | macOS Apple Silicon and Linux x86_64 |
|---|---|
| [Expression 2](/concepts/expression-2) (`<code>.avatar` or `.imx` — the same container) | `run` and `render` |
| [Essence 2](/concepts/essence-2) (`<code>.imx`) | `run` and `render` |
| [Essence 1](/concepts/essence-1) (`<code>.imx`) | `run` only — `render` refuses it; use the [Python SDK](/sdk/python) or the [Video API](/api/video) for a file |
| [Expression 1](/concepts/expression-1) | neither — GPU-only by design, served through the [cloud API](/api/overview) |

## See also

- [CLI reference](/sdk/cli/reference) — every command, flag, exit code and environment variable
- [Local mode](/sdk/cli/local-mode) — the conversation brain fully on-device
- [macOS](/sdk/macos) — the same binary through Homebrew, and the native Swift package
- [Python](/sdk/python) — the same engines as a library
- [SDK](/sdk) — every platform on one table
