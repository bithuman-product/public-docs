---
title: "Serve and script the CLI"
description: "Serve live sessions, set the voice and script the CLI."
section: platforms
group: "CLI"
order: 20
type: platform-app
llms: platforms
claims: ["S2", "S3", "S4", "S6", "S10"]
next: ["/platforms/cli/troubleshooting", "/platforms/cli/reference", "/platforms/cli"]
---

## Integrate into your app

| Job | Command |
|---|---|
| List the sample avatars | `bithuman list` (the same list as `https://api.bithuman.ai/v1/models/showcase`) |
| Download one | `bithuman pull <slug>` prints the cached path; `--force` downloads again |
| Download your own agent | `bithuman pull <AGENT_CODE> --model essence-2` (needs sign-in) |
| Inspect an avatar | `bithuman open <avatar>` |
| Render | `bithuman render <avatar> in.wav -o out.mp4` (a code or name is downloaded on first use) |
| Serve a live session | `bithuman run <avatar>`; `--host <LAN address>` to expose it (`0.0.0.0` also needs `BITHUMAN_ALLOW_PUBLIC_BIND=1`) |
| Talk with your own OpenAI key | `export OPENAI_API_KEY=…` before `bithuman run` ([voice settings](#voice-settings)) |
| Run the brain on your own hardware | [local conversation brain](/platforms/cli/local-brain) |
| Drive it from an AI agent | `bithuman mcp` ([MCP server](/build/mcp)) |
| Script it | add `--json`: every failure prints one JSON object with a stable code, and the exit code is the contract ([reference](/platforms/cli/reference#exit-codes)) |

### Voice settings

`bithuman run` starts a voice agent on OpenAI Realtime ([the whole setup, and the same conversation in Python](/build/voice-agent)). Both settings are read from the environment:

| Variable | Default | What it does |
|---|---|---|
| `OPENAI_API_KEY` | — | Your OpenAI key. Without it, the voice runs on your bitHuman account at the managed voice-chat rate, 10 credits per minute ([pricing](/pricing)). |
| `BITHUMAN_INSTRUCTIONS` | a short assistant prompt | The agent's system prompt |

## Platform notes

- Essence 1 avatars work with `run` only; for a file use [Python](/platforms/python) or the [video API](/api/video). Expression 1 runs on the [cloud API](/api).
- The first Essence 2 render on a machine downloads a shared audio encoder (about 66 MB) to `~/.bithuman/engines/essence-2/` once.
- Intel Macs have no binary. On Windows (not code-signed; [Downloads](/downloads)) the CLI renders in the cloud; to render on the PC, use [Python on Windows](/platforms/windows).

## Reference

- [CLI reference](/platforms/cli/reference): every command, flag, exit code and environment variable.
- [Local conversation brain](/platforms/cli/local-brain): run the conversation fully on your hardware.
- [CLI example scripts](https://github.com/bithuman-product/bithuman-examples/tree/main/api/cli): live stream, offline render, REST.
- [Changelog](/changelog) and [Downloads & versions](/downloads).
