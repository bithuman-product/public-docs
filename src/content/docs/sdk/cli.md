---
title: "CLI — macOS and Linux"
description: "Install one binary, sign in once, and bithuman run puts a talking avatar at http://127.0.0.1:8088/ on macOS Apple Silicon or Linux x86_64. Offline MP4 render in one more command."
section: sdk
group: "Platforms"
order: 10
label: "CLI (macOS & Linux)"
---

**This is the surface you use without writing code.** One binary: type
`bithuman run` and talk to an avatar. If you want to *program* against the
models instead, that is the [Python library](/sdk/python) — a different
surface for a different purpose, installed a different way.

## Before you start

| You need | For what | Check it |
|---|---|---|
| macOS 14+ on Apple Silicon, or Linux x86_64 | the only two platforms with a binary | `uname -sm` |
| A bitHuman sign-in | `run` and `render`. Browsing and downloading need none | `bithuman account` (exit 0 = signed in) |
| `ffmpeg` on `PATH` | `bithuman render` writes its MP4 through it | `ffmpeg -version` |
| `livekit-server` on `PATH` | `bithuman run` spawns it for the live session | `command -v livekit-server` |
| 118–190 MB per avatar, plus ~377 MB once for Essence 2 | the download and the shared audio encoder | `bithuman doctor` prints cache sizes |

## Install

Install the two tools the CLI calls out to, then the CLI itself. One block per
platform, in this order:

```bash
# macOS (Apple Silicon)
brew install ffmpeg
brew install livekit
curl -fsSL https://install.bithuman.ai | sh
```

```bash
# Linux x86_64 (Debian and Ubuntu package names)
sudo apt install -y ffmpeg
curl -sSL https://get.livekit.io | bash
curl -fsSL https://install.bithuman.ai | sh
```

The last line is the install on both platforms. It puts the CLI and its
runtime in `~/.local/bin` (set `BITHUMAN_INSTALL_DIR` to put it elsewhere),
checksum-verified against the release. The tap serves the same script from
[`raw.githubusercontent.com/bithuman-product/homebrew-bithuman/main/install.sh`](https://raw.githubusercontent.com/bithuman-product/homebrew-bithuman/main/install.sh),
so `curl -fsSL https://install.bithuman.ai | sh` is the shorter spelling of
the same bytes.

If the installer's last line tells you to, put its directory on your `PATH` for
this shell and for the next one:

```bash
export PATH="$HOME/.local/bin:$PATH"
echo 'export PATH="$HOME/.local/bin:$PATH"' >> ~/.zshrc   # or ~/.bashrc
```

> **There is no pip install for the CLI.** `bithuman` on PyPI is the
> [Python library](/sdk/python) — it is the only bitHuman package on PyPI, and
> it installs no command. The CLI and its [MCP server](/guides/mcp-server) come
> from the installer above or from Homebrew, whose formula is named
> `bithuman-cli`. A `bithuman-cli` wheel existed on PyPI until 2026-09-15 and
> was removed. If you find a package on PyPI with a bitHuman-like name that is
> not `bithuman`, it is not ours.

**On Apple Silicon only**, Homebrew is an alternative: `brew install
bithuman-product/bithuman/bithuman-cli` installs the same tarball. The formula
declares `arch: :arm64` and `macos: :sonoma`, so it is not an option on Linux
or on an Intel Mac — on Linux the installer above is the only route. Use one or
the other, not both. Either way `bithuman --version` tells
you what you got:

```text
$ bithuman --version
libessence  2.11.6 ABI 7         # the engine inside, and the ABI it speaks
bithuman    2.7.0                # the CLI itself
build       …                    # commit, target and build time
engine      …                    # the platform engine it loaded
```

The two numbers move independently and the installer always fetches the newest
CLI, so read yours rather than this page's — the shape is the contract, the
digits are a snapshot (taken 2026-09-20 from the installer's own download).

Published for **macOS Apple Silicon** and **Linux x86_64** only; on an
Intel Mac or a Linux ARM box the installer names the platform and stops without
downloading anything ([exact output](/sdk/cli/reference#platforms-with-no-binary)).

## Minimal code

Two operations — there is no third. Both need a credential
([Authentication](#authentication)); the `pull` inside them does not:

```bash
# 1. live avatar in your browser — prints http://127.0.0.1:8088/<CODE>
bithuman login
bithuman run wise-pup
```

```bash
# 2. offline: audio in, MP4 out
bithuman login
curl -fsSLo speech.wav "https://tmoobjxlwcwvxvjeppzq.supabase.co/storage/v1/object/public/web/showcase/demo_sample.wav"
bithuman render "$(bithuman pull wise-pup)" -a speech.wav -o out.mp4
```

`speech.wav` there is 24 kHz mono, 15.0 seconds — `render` takes any format
`ffmpeg` reads for the second-generation engines. `bithuman open <file>` prints
what an avatar is, with no account and no charge, before you render it.

## Get a model

`bithuman list` prints the catalogue and needs no account; `bithuman pull`
downloads one identity and prints the path it wrote — and only the path, so it
captures into a variable:

```bash
bithuman list                     # slug, code, name, model, size
MODEL=$(bithuman pull wise-pup)   # 189 MB, anonymous — prints the cached path
echo "$MODEL"                     # ~/.cache/bithuman/showcase/wise-pup.imx
```

Your own agents come by code and need a credential ([Authentication](#authentication)):
`bithuman pull <YOUR_AGENT_CODE> --model essence-2` prints
`~/.cache/bithuman/agents/<YOUR_AGENT_CODE>/<YOUR_AGENT_CODE>.imx` (`--model` picks a family
when the agent has more than one).

A second `pull` of the same identity re-downloads it when the published file changed since it
was cached (the cached file's length is compared with the published one; when that cannot be
asked, the cached file is kept) — for an agent code today, and for a showcase slug from
cli-v2.6.26. `--force` re-downloads regardless; `bithuman run <slug>` uses the file already
pulled, so `pull` again to pick up a change.

### The showcase catalogue

`bithuman list` served 35 identities on 2026-09-21 — six
[Essence 2](/concepts/essence-2), the rest [Expression 2](/concepts/expression-2).
Every one downloads with no account. These are the six `essence-2` slugs, with
the size `bithuman list` prints:

| Slug | Agent code | Size |
|---|---|---|
| `warm-clear-professional-presenter` | `A21SKT4314` | 148 MB |
| `afro-latina-astrophysics-mentor` | `A23KSG5258` | 145 MB |
| `calm-product-specialist-advisor` | `A24EKJ8433` | 137 MB |
| `sofia-ramirez` | `A52DHS2219` | 148 MB |
| `kwame-warm-museum-guide` | `A62SJB3901` | 148 MB |
| `executive-coach-for-clear-decisions` | `A80HVD8577` | 118 MB |

The `expression-2` rows are 188–190 MB each and include `wise-pup`
(`A23WJF0199`, the default), `shelly-tidewater` (`A02HCY0444`) and
`energetic-audio-story-buddy` (`A74NWD9723`). The catalogue moves, so treat
this as a snapshot and `bithuman list` as the authority — a slug that is not in
it fails with `SLUG_NOT_FOUND`, exit 66. Without the CLI, the same catalogue is
one anonymous request: `curl -fsS https://api.bithuman.ai/v1/models/showcase`,
whose `models[]` rows carry `slug`, `agent_code`, `model`, `size` and the `url`
to download.

> **`run` takes the slug too.** `bithuman run wise-pup` resolves the slug
> itself — the same resolver, the same cache and the same session as pulling
> first (measured on the published cli-v2.6.26 Linux x86_64 tarball, fresh
> `$HOME`: the embedded `livekit-server` and the brain come up and the session
> URL prints) — and the bare `bithuman run` is `bithuman run wise-pup`. A path
> works as well: `bithuman run ~/.cache/bithuman/showcase/wise-pup.imx`.

## Authentication

```bash
bithuman login            # opens a browser, stores a per-device key
bithuman login --device   # SSH or headless: prints a code to enter elsewhere
bithuman account          # exit 0 signed in, 77 not — the check to script
```

In a script or in CI, set `BITHUMAN_API_SECRET` instead — a key is free at
[your API keys](https://www.bithuman.ai/developer/api-keys). Which one wins when
both are present, and every other variable the binary reads, is on the
[CLI reference](/sdk/cli/reference#credential-resolution-order).

## What needs an account, and what does not

| Command | Account | What it costs |
|---|---|---|
| `bithuman list` | no | nothing |
| `bithuman pull <slug>` | no | nothing — a showcase download is anonymous |
| `bithuman open <file>` | no | nothing |
| `bithuman pull <YOUR_AGENT_CODE>` | **yes** | nothing; the download itself is free |
| `bithuman render` | **yes** | metered — [pricing](/guides/pricing) |
| `bithuman run` | **yes** | metered — [pricing](/guides/pricing) |

Sign in **before** you render, not after: with no credential `render` and `run`
each stop before the first frame with exit 77 and write nothing, however long
the download took.

> The footer `bithuman list` prints — *"every model above is pre-baked and
> free — no account needed"* — is about the `pull` line above it. The
> `bithuman render` line in that same footer does need a sign-in.

## Run

**Sign in first.** `bithuman login` opens a browser and stores a per-device
key; `bithuman login --device` prints a code for an SSH session.

From 2.6.20, every render path needs a credential, on both platforms. With
none, `bithuman render` and `bithuman run` each stop before the first frame —
exit 77, in a second or two, having written nothing. `render` says *"not signed
in, or the credential is not valid — run `bithuman login`, or set
BITHUMAN_API_SECRET"*; `run` refuses on the same terms. Both name the same two
remedies, and no environment variable renders for free.

That includes the Linux `--offscreen` render, which exits 77
`METERING_REFUSED` before the first frame with no credential and is metered
with one (measured on the published Linux tarball, fresh `$HOME`). Every render
is metered, and [pricing](/guides/pricing) is the authority; what each release
changed is in the [changelog](/changelog).

Then open the printed `http://127.0.0.1:8088/<CODE>`. An
[Expression 2](/concepts/expression-2) avatar — what most showcase slugs are —
is **a live session with the brain**: `run` spawns an embedded `livekit-server`
(it must be on your `PATH`, see [Install](#install)), builds the
conversation brain on first run (a one-time ~200 MB pip install, one to two
minutes) and prints the session URL. `bithuman run` with no argument is
`bithuman run wise-pup` and reaches the same session.
`run` serves localhost only; `--host` takes a LAN or tailnet address to expose
it. `--host 0.0.0.0` needs `--allow-public-bind` as well — without it the CLI
exits 2 and binds nothing, rather than putting the session on every interface.
`bithuman login` also adds the managed conversation brain, and
[local mode](/sdk/cli/local-mode) runs the brain entirely on your own hardware
instead — no LLM or TTS vendor. A self-hosted session on your own
agent is metered — [pricing](/guides/pricing) is the authority.

## Performance

Measured frame rates for every platform are on the
[performance page](/sdk/performance).

## Troubleshooting

| You see | It means | Do this |
|---|---|---|
| the installer names your platform and stops | no binary for an Intel Mac or Linux ARM | the [web](/sdk/web), the [cloud API](/api/overview), or the Linux x86_64 binary in a container |
| `bithuman: command not found` after the install | `~/.local/bin` is not on your `PATH` | `export PATH="$HOME/.local/bin:$PATH"` — the installer prints the same line |
| `render` exits 69: `ffmpeg not found` | `ffmpeg` is not on your `PATH` — a script or CI shell often lacks Homebrew's `/opt/homebrew/bin` | `brew install ffmpeg` (macOS) or `sudo apt install -y ffmpeg` (Linux); in a script, `export PATH="/opt/homebrew/bin:$PATH"` or set `BITHUMAN_FFMPEG` |
| `render` refuses with `NOT_SIGNED_IN`, no output file | no credential — `render` is billed | `bithuman login`, or `export BITHUMAN_API_SECRET=…` ([credential order](/sdk/cli/reference#credential-resolution-order)) |
| `run` refuses with `NOT_SIGNED_IN`, exit 77, nothing served | no credential — `run` is billed too, from 2.6.20. A credential the service *rejects* is a different answer: exit **1**, `sign-in failed: auth required (BE_ERR_NO_AUTH)` | `bithuman login`, or `export BITHUMAN_API_SECRET=…` |
| `run --host 0.0.0.0` exits 2 with `PUBLIC_BIND_REFUSED` and nothing listening | binding every interface has to be deliberate | a LAN or tailnet address in `--host`, or add `--allow-public-bind` if you meant it |
| `pull <CODE>` refuses without a sign-in | your own agent code needs a credential; a showcase slug never does | `bithuman login`, then pull again |
| `pull <CODE>` fails with `404 NOT_FOUND` | not an agent on your account, and not a showcase slug | check the code under [your agents](/api/agents); `bithuman list` lists the public ones |
| `pull <CODE>` fails with `409 MODEL_NOT_GENERATED` | the agent has no model of that family yet | [add the model](/api/agents#add-a-model-to-an-existing-agent), or `--model` the family it was created with |
| `pull <CODE>` fails with `MODEL_ARTIFACT_NOT_READY` | trained, not yet published to the download store | run the same `pull` again in a minute |
| `SLUG_NOT_FOUND`, exit 66 | the slug is not in the catalogue — it was retired, or mistyped | `bithuman list` and copy a slug from it, or take one from [the table above](#the-showcase-catalogue) |
| the first Essence 2 `render` on a machine pauses before the first frame | it fetches one shared audio encoder (~377 MB) into `~/.bithuman/engines/essence-2/`, once | wait; every later render skips it |
| `Error: No available formula` from `brew` | the tap is not known to Homebrew yet | `brew tap bithuman-product/bithuman`, then install again |
| `pip install bithuman` stops at `bithuman 2.11.6 has NO WHEEL for this platform.` | an Intel Mac, or macOS older than 14 — pip installed nothing | Apple Silicon, or the [web](/sdk/web) / the [cloud API](/api/overview) |
| `bithuman doctor` reports not ready | no credential and no brain configured yet — the check working | `bithuman login`; a showcase `pull` never needed it |
| `bithuman login --device --json` prints coloured text and `jq` fails on it | `login` is the one command that does not keep the `--json` contract on `cli-v2.6.26` — measured 2026-09-22 | sign in with `printf %s "$KEY" \| bithuman login --with-token --json`, which does; [why](/sdk/cli/reference#login-does-not-keep-this-contract-yet) |

With `--json`, every failure prints one JSON object to stderr with a stable
code; without it the same failure is prose, and the exit code is the contract —
the [reference](/sdk/cli/reference#exit-codes) lists them. Three codes share
exit 77: `NOT_SIGNED_IN` (`run`, `render`), `NOT_AUTHENTICATED` (account
commands) and `METERING_REFUSED` (`run --offscreen`).

### What renders locally, and where

| Family | macOS Apple Silicon and Linux x86_64 |
|---|---|
| [Expression 2](/concepts/expression-2) (`.avatar` or `.imx` — the same container) | `run` and `render` |
| [Essence 2](/concepts/essence-2) (`.imx`) | `run` and `render` |
| [Essence 1](/concepts/essence-1) (`.imx`) | `run` only — `render` refuses it; use the [Python SDK](/sdk/python) or the [Video API](/api/video) for a file |
| [Expression 1](/concepts/expression-1) | neither — GPU-only by design, served through the [cloud API](/api/overview) |

## Examples and source

- [`api/cli`](https://github.com/bithuman-product/bithuman-examples/tree/main/api/cli) — shell scripts that drive a live stream, an
  offline render and the REST API.
- [Examples](/examples) — every runnable project, by language.
- [Homebrew tap](https://github.com/bithuman-product/homebrew-bithuman) — the installer and the released binaries.

## See also

- [CLI reference](/sdk/cli/reference) — every command, flag, exit code and environment variable
- [Local mode](/sdk/cli/local-mode) — the conversation brain fully on-device
- [iOS & macOS in Swift](/sdk/ios) — the native package; its `Expression2` product builds for Apple Silicon Macs too
- [Python](/sdk/python) — the same engines as a library
- [SDK](/sdk) — every platform on one table
