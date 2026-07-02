---
title: "Community"
description: "Where to find bitHuman online, get help, and contribute SDKs and integrations."
section: resources
group: "Resources"
order: 3
---

## Where to find us

- **GitHub** — [github.com/bithuman-product/homebrew-bithuman](https://github.com/bithuman-product/homebrew-bithuman). The public SDK source, runnable examples, and the source for these docs. File feature requests and bugs in [Issues](https://github.com/bithuman-product/homebrew-bithuman/issues).
- **Discord** — [discord.gg/ES953n7bPA](https://discord.gg/ES953n7bPA). The fastest way to get help, share what you're building, and talk to the team.
- **X (Twitter)** — [@bithuman_ai](https://x.com/bithuman_ai). Release news and announcements.
- **Status** — [status.bithuman.ai](https://status.bithuman.ai). Live platform and API status.

## How to contribute

There are three kinds of contributions, each with its own path.

### Small changes — open a PR

Bug fixes, doc improvements, and internal refactors go straight to a pull request against [`homebrew-bithuman`](https://github.com/bithuman-product/homebrew-bithuman). No RFC needed.

### Platform-level changes — open an RFC

The RFC ("request for comments") process is for changes that:

- Affect the public API of the engine, an SDK, or a published artifact
- Introduce a new public surface (subcommand, env var, file format)
- Change semantic versioning expectations
- Add an integration that consumes the SDK

Copy `templates/rfc-template.md` and fill in:

1. **Summary** — what is this and why now (1–2 sentences)
2. **Motivation** — concrete use case; existing pain
3. **Proposal** — API shape, file layout, command syntax (code examples preferred)
4. **Alternatives considered** — what else could work; why this is the choice
5. **Impact** — breaking changes, migration path, deprecations
6. **Open questions** — what's still uncertain

Open it as a PR against `docs/rfcs/0NNN-short-name.mdx`. Discussion happens in the PR comments; resolution happens when a maintainer merges it (accepted) or closes it (declined or deferred).

Smaller-scope decisions (which library to pick, naming choices, internal patterns) are recorded as Architecture Decision Records (ADRs) in `docs/decisions/000N-<topic>.md` with: Title, Date, Status (proposed / accepted / superseded), Context, Decision, Consequences. ADRs are committed alongside the change they describe.

### Adding a new language SDK

A bitHuman SDK is a thin language binding over **libessence**, the portable C ABI that drives audio-in / frames-out. Python and Rust are the canonical examples — both wrap the same C entry points, ship the same parity test corpus, and publish to their language's package index.

Every binding calls the same `libessence` C entry points (`be_fixture_load`, `be_runtime_create`, `be_runtime_tick_compose`, `be_runtime_close`, and the streaming `be_runtime_push_audio` / `be_runtime_pull_frame`). The binding's job is to marshal language-native audio buffers in, expose the BGR frame as the language-native image type, and surface errors idiomatically.

**The parity contract.** Every binding ships the same test corpus: a 122-tick speech clip, checked against a recorded `cluster_idx` sequence. A new binding is "done" when this assertion holds in CI:

```python
assert produced_cluster_idx == golden_cluster_idx  # 0/122 mismatches
```

Publishing channels per language:

| Language | Index | How |
|---|---|---|
| Python | PyPI | `cibuildwheel` matrix → `twine upload` |
| Rust | crates.io | `cargo publish` (after tag push) |
| Swift | SwiftPM | binary xcframework on the public repo + `Package.swift` |
| JS/TS | npm | `npm publish --access public` |

Checklist for a new binding:

- [ ] Binding builds against `libessence.a` on all supported triples
- [ ] Parity corpus passes (0/122 mismatches)
- [ ] `README.md` shows install + 10-line hello-world
- [ ] CI matrix entry runs the parity harness
- [ ] Publish step wired to the language's package index
- [ ] Doc page added under the SDK section

Open an RFC first if the binding introduces a new public concept (streaming model, callback shape, etc.).

### Adding an integration

An **integration** is code that *consumes* a bitHuman SDK to plug it into a third-party framework — a LiveKit plugin, a Pipecat processor, a LangChain tool, a Discord bot. It doesn't extend the engine; it wraps it for a specific runtime.

Integrations live **upstream**, in the framework's own repo. bitHuman maintains a **contract test** in the public SDK repo that verifies our SDK exposes everything the upstream plugin uses, so breakage is caught before users hit it. The pattern is:

```
homebrew-bithuman/
  integrations/
    <integration-name>/
      README.md             # what this integration is + upstream link
      contract_test.py      # asserts SDK surface the plugin imports
      compat.yaml           # known-compatible upstream versions
```

The recommended rule when an upstream framework is slow to relax a version pin: **don't block users on upstream.** Ship an inline fallback in `bithuman-cli` and remove it once the upstream merge lands — which is exactly what happened with `livekit-plugins-bithuman` while [livekit/agents#5882](https://github.com/livekit/agents/pull/5882) is open.

Checklist for a new integration:

- [ ] RFC opened + accepted
- [ ] `integrations/<name>/README.md` written
- [ ] `contract_test.py` runs in CI and exits non-zero on drift
- [ ] `compat.yaml` lists at least one known-compatible upstream version
- [ ] Upstream PR open (or upstream release shipped)
- [ ] Doc page links to install instructions
- [ ] If upstream is blocked: inline fallback added to `bithuman-cli`
