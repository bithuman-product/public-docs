---
title: "Support & community"
description: "Where to get help, report a bug, and follow bitHuman releases."
section: overview
group: "Help"
order: 40
type: reference
llms: none
help: top
---

## Get help

- **Discord**: [the bitHuman community](https://www.bithuman.ai/discord). Share what you are building and meet other developers.
- **The bitHuman app on Discord**: [what it does and what it stores](/legal/discord-app).
- **Email**: [hello@bithuman.ai](mailto:hello@bithuman.ai) for anything that should not be public.
- **Status**: [status.bithuman.ai](https://status.bithuman.ai) for live platform and API status.
- **Releases**: [@bithuman_ai](https://x.com/bithuman_ai) and the [changelog](/changelog).

When you ask for help, include the command you ran, the version (`bithuman --version`, or `pip show bithuman`), and the full error. Every SDK page ends with a Troubleshooting table that maps common messages to fixes.

## Where things live

| Repository | What it holds | Open an issue for |
|---|---|---|
| [homebrew-bithuman](https://github.com/bithuman-product/homebrew-bithuman) | SDK releases: CLI, Swift package, Flutter plugin | SDK bugs and feature requests |
| [bithuman-examples](https://github.com/bithuman-product/bithuman-examples) | Runnable example apps for every platform | An example that does not build or run |
| [public-docs](https://github.com/bithuman-product/public-docs) | The source of this site | A wrong or unclear page |

## Contribute

- **Doc fixes and examples**: open a pull request against the repository above that holds them. Small, focused changes are reviewed fastest.
- **A new feature or flag**: open an issue with the use case before you write code.
- **A new language SDK**: open an issue that names the language and what you want to build. The engine ships as a binary, so we build and support new bindings.
- **A framework integration**: Pipecat has one, maintained by bitHuman: [`pipecat-bithuman`](/platforms/pipecat). For another framework (LangChain and others), build it on a published SDK in the framework's own repository, then open an issue with the link and we will list it. The [LiveKit integration](/platforms/livekit) is the model to follow.
