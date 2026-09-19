---
title: "CLI — macOS and Linux"
description: "Install one binary, sign in once, and `bithuman run` puts a talking avatar at http://127.0.0.1:8088/ on macOS Apple Silicon or Linux x86_64. Offline MP4 render in one more command."
section: sdk
group: "Platforms"
order: 10
label: "CLI (macOS & Linux)"
---

**This is the surface you use without writing code.** One binary: type
`bithuman run` and talk to an avatar. If you want to *program* against the
models instead, that is the [Python library](/sdk/python) — a different
surface for a different purpose, installed a different way.

## Install

```bash
curl -fsSL https://raw.githubusercontent.com/bithuman-product/homebrew-bithuman/main/install.sh | sh
```

`bithuman render` writes the MP4 through `ffmpeg` — `brew install ffmpeg` on macOS, `sudo apt install -y ffmpeg` on Linux. `bithuman run` spawns `livekit-server` from your `PATH` — `brew install livekit` on macOS, `curl -sSL https://get.livekit.io | bash` on Linux.

That one command is the install on both platforms. It puts a single
self-contained binary in `~/.local/bin` (set `BITHUMAN_INSTALL_DIR` to put it
elsewhere), checksum-verified against the release.
[`install.bithuman.ai`](https://install.bithuman.ai) serves the same script, so
`curl -fsSL https://install.bithuman.ai | sh` is the shorter spelling of the
line above.

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
libessence  2.11.3 ABI 7         # the engine inside, and the ABI it speaks
bithuman    2.6.23               # the CLI itself
build       …                    # commit, target and build time
engine      …                    # the platform engine it loaded
```

The two numbers move independently and the installer always fetches the newest
CLI, so read yours rather than this page's — the shape is the contract, the
digits are a snapshot (taken 2026-09-19 from the installer's own download).

Published for **macOS Apple Silicon** and **Linux x86_64** only; on an
Intel Mac or a Linux ARM box the installer names the platform and stops without
downloading anything ([exact output](/sdk/cli/reference#platforms-with-no-binary)).

## Authentication and configuration

`bithuman login` opens a browser and stores a per-device key on this machine;
`bithuman login --device` prints a code instead, for an SSH session. In a
script or in CI, set `BITHUMAN_API_SECRET` — a key is free at
[your API keys](https://www.bithuman.ai/developer/api-keys). Which one wins when both are present, and every other
variable the binary reads, is on the
[CLI reference](/sdk/cli/reference#credential-resolution-order).

A showcase `pull` and `run` are the exception: those never needed an account.

## Get a model

A showcase avatar downloads with no account — twenty to pick from — and your
own agents come by code; sign in once for `render` and for your own agents:

```bash
bithuman login                    # opens your browser; stores a per-device key on this machine
bithuman avatars                  # the showcase catalogue — slug, code, name, model
bithuman pull wise-pup            # prints ~/.cache/bithuman/showcase/wise-pup.imx
```

A showcase pull is anonymous — `login` is for `render` and for your own agents:
`bithuman pull <YOUR_AGENT_CODE> --model essence-2` prints
`~/.cache/bithuman/agents/<YOUR_AGENT_CODE>/<YOUR_AGENT_CODE>.imx` (`--model` picks a family
when the agent has more than one).

> **The bare `bithuman run` needs cli-v2.6.23.** From that release it is
> `bithuman run wise-pup` — the same resolver, the same cache, the same session
> (measured on 2026-09-19 on Linux x86_64, fresh `$HOME`: the embedded
> `livekit-server` and the brain come up and the session URL prints, with no
> `~/.bithuman/avatars/` directory left behind). On **cli-v2.6.22** it does not
> work: it fetches the Wise Pup lane into a *directory* and hands that to a
> loader that wants a file, stopping at
> `error: model '~/.bithuman/avatars/A23WJF0199' is not a file`, exit **66**.
> `bithuman run "$(bithuman pull wise-pup)"` runs on either — that is the path
> this page teaches everywhere else.

## Minimal code

Two operations — there is no third:

```bash
bithuman run "$(bithuman pull wise-pup)"                                # 1. live avatar in your browser
bithuman render "$(bithuman pull wise-pup)" -a speech.wav -o out.mp4   # 2. offline: audio in, MP4 out
```

`render` needs a mono WAV — `curl -fsSLo speech.wav
https://tmoobjxlwcwvxvjeppzq.supabase.co/storage/v1/object/public/web/showcase/demo_sample.wav`
is one (24 kHz, 15 s). `bithuman info <file>` prints what an avatar is before you render it.

## Run

**Sign in first.** `bithuman login` opens a browser and stores a per-device
key; `bithuman login --device` prints a code for an SSH session.

From 2.6.20, every render path needs a credential, on both platforms. With
none, `bithuman render` and `bithuman run` each stop before the first frame —
exit 77, in a second or two, having written nothing. `render` says *"not signed
in, or the credential is not valid — run `bithuman login`, or set
BITHUMAN_API_SECRET"*; `run` refuses on the same terms. Both name the same two
remedies, and no environment variable renders for free.

Upgrade if you are on anything older: through 2.6.19 a Linux `bithuman run`
with no credential rendered indefinitely, and through 2.6.22 the Linux
`--offscreen` render was the one path left open — it rendered with no
credential, and unmetered with one. From 2.6.23 it exits 77 `METERING_REFUSED`
before the first frame like every other path, and the host meters (measured on
the published Linux tarball, fresh `$HOME`). Every render is metered either
way, and [pricing](/guides/pricing) is the authority.

Then open the printed `http://127.0.0.1:8088/<CODE>`. From 2.6.22 an
[Expression 2](/concepts/expression-2) avatar — what the showcase slugs are —
is **a live session with the brain**: `run` spawns an embedded `livekit-server`
(it must be on your `PATH`, see the prerequisites above), builds the
conversation brain on first run (a one-time ~200 MB pip install, one to two
minutes) and prints the session URL. From 2.6.23 `bithuman run` with no
argument is `bithuman run wise-pup` and reaches the same session; on 2.6.22 it
fetched Wise Pup and then exited 66 `MODEL_NOT_FOUND` (both measured on Linux
x86_64).
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
| `pull <CODE>` fails with `404 NOT_FOUND` | not an agent on your account, and not a showcase slug | check the code under [your agents](/api/agents); `bithuman avatars` lists the public ones |
| `pull <CODE>` fails with `409 MODEL_NOT_GENERATED` | the agent has no model of that family yet | [add the model](/api/agents#add-a-model-to-an-existing-agent), or `--model` the family it was created with |
| `pull <CODE>` fails with `MODEL_ARTIFACT_NOT_READY` | trained, not yet published to the download store | run the same `pull` again in a minute |
| `SLUG_NOT_FOUND` | the slug is not in the catalogue | `bithuman avatars` and copy a slug from it |
| the first Essence 2 `render` on a machine pauses before the first frame | it fetches one shared audio encoder (~377 MB) into `~/.bithuman/engines/essence-2/`, once | wait; every later render skips it |
| `Error: No available formula` from `brew` | the tap is not known to Homebrew yet | `brew tap bithuman-product/bithuman`, then install again |
| `No matching distribution found for bithuman` | an Intel Mac, or macOS older than 14 | Apple Silicon, or the [web](/sdk/web) / the [cloud API](/api/overview) |
| `bithuman doctor` reports not ready | no credential and no brain configured yet — the check working | `bithuman login`; a showcase `pull` and `run` never needed it |

Every failure prints one JSON object to stderr with a stable code — the
[reference](/sdk/cli/reference#exit-codes) lists them.

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
