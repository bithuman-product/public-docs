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
- **Email** — [hello@bithuman.ai](mailto:hello@bithuman.ai) for anything that does not belong in public.

## Getting help

Search these docs first — every SDK page ends in a troubleshooting table that
maps the exact message you see to the fix. If that does not cover it, post in
Discord with the command you ran, the version (`bithuman --version`, or
`python -c "from importlib.metadata import version; print(version('bithuman'))"`
for the Python library) and the full error. That is usually enough
for an answer the same day.

## Contributing

**Bug fixes, doc corrections and examples** — open a pull request against
[`homebrew-bithuman`](https://github.com/bithuman-product/homebrew-bithuman).
Nothing else is needed; small, focused PRs get reviewed fastest.

**A new feature, flag, or file format** — open an issue first and describe the
use case before writing code. That saves you building against a surface we are
already changing.

**An SDK for a language we do not publish yet** — tell us in an issue which
language and what you want to build. The engine is distributed as a binary, so a
new language binding is something we build and support rather than something you
can add from outside; knowing there is demand is what moves it up the list.

**An integration with a framework** — a LiveKit plugin, a Pipecat processor, a
LangChain tool, a Discord bot. These live in the framework's own repository and
use a published bitHuman SDK, so you can build and ship one without waiting on
us. Open an issue with the link and we will add it to the docs and keep it
working as the SDK changes. The [LiveKit integration](/sdk/livekit) is the
worked example to copy.
