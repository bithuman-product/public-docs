---
title: "Authentication"
description: "Get an API secret, set it for the right surface, and understand how it is exchanged for short-lived runtime tokens."
section: api
group: "Get started"
order: 3
---

## One credential, two names

bitHuman uses a single shared credential per account that authenticates every
SDK and the REST API. There are two equivalent environment-variable names
depending on which surface you're using:

- **`BITHUMAN_API_SECRET`** — Python SDK, REST API, LiveKit plugin, Kotlin SDK,
  and CLI.
- **`BITHUMAN_API_KEY`** — Swift SDK on Apple platforms. Same value, different
  name to match Apple convention.

> **Tip** You only need a key when an **avatar is rendering**. Audio-only voice
> agents (Swift `VoiceChat` with no `config.avatar`) run fully offline without
> one — see [pricing](/api/billing) for what's free vs. metered.

## Get a key

1. Sign in at [bithuman.ai](https://www.bithuman.ai) (free tier, no credit
   card).
2. Go to [Developer → API Keys](https://www.bithuman.ai/#developer).
3. Click **Create new key**, name it (e.g. `production-mac`), and copy the
   value. **You won't be able to view it again** — store it somewhere durable.

## Sign in from the CLI

If you use the [CLI](/cli), you don't have to copy a key by hand. Run:

```bash
bithuman login
```

This opens your browser, you sign in to your bitHuman account and approve
the request, and the CLI mints a **per-device API key** — scoped to your
account and aliased `cli@<hostname>` — then stores it in your OS keychain.
From then on every CLI command (and any SDK process that inherits the
environment) authenticates automatically; there's nothing to `export`.

On SSH or headless hosts where the browser can't reach the machine, use
`bithuman login --device` and enter the short code it prints from any
browser. See [CLI → Signing in](/cli/commands#signing-in).

Because each device gets its own key, it's individually **revocable** — run
`bithuman logout` on that machine, or revoke the `cli@<hostname>` key from
[Developer → API Keys](https://www.bithuman.ai/#developer). Revoking one
device leaves your other keys untouched.

> **CI, containers, automation** — keep setting `BITHUMAN_API_SECRET`
> directly (next section). That path is fully supported and is what you want
> anywhere there's no browser or interactive shell. `bithuman login` is a
> convenience for interactive machines, not a replacement for it.

## Verify it works

```bash
curl -X POST https://api.bithuman.ai/v1/validate \
  -H "api-secret: YOUR_KEY"
```

A `200` with `{"valid": true}` means you're good. If you have the CLI installed,
`bithuman doctor` also checks the credential, brain selection, caches, and host
capabilities.

## Set it for each surface

**REST API** — `api-secret` header on every request:

```bash
curl -X POST https://api.bithuman.ai/v1/agent/A78WKV4515/speak \
  -H "api-secret: $BITHUMAN_API_SECRET" \
  -H "content-type: application/json" \
  -d '{"message": "Hello"}'
```

**Python SDK** — env var, or pass directly:

```python
runtime = await AsyncBithuman.create(
    model_path="avatar.imx",
    api_secret="your_key",
)
```

**Swift SDK** — env var or config; never hardcode in source:

```swift
// development: env var
config.apiKey = ProcessInfo.processInfo.environment["BITHUMAN_API_KEY"]
// production: fetch from your backend via Keychain
config.apiKey = await fetchFromBackend()
```

For DMG distribution, bake the key into Info.plist via a build script. For App
Store, fetch from your own backend via Keychain on first launch — don't bundle.

## api-secret vs. runtime tokens

The long-lived `api-secret` is never sent to the avatar engine or any third
party. It only ever travels to `api.bithuman.ai` over TLS. The streaming runtime
is authorized by a separate, short-lived **runtime token**:

1. Your code provides the API secret to the SDK or REST request.
2. The SDK exchanges it for a short-lived runtime token at
   `POST /v1/runtime-tokens/request`.
3. That token authorizes the avatar engine (heartbeat + frame production) for
   your account.
4. Tokens auto-renew roughly every 60 seconds via the heartbeat.
5. Bad keys fail at step 2 — fast — before any user-visible work.

The runtime token is **not** an api-secret. It can't mint other tokens; it just
authorizes the runtime to compute frames on behalf of your account. It is
**account-scoped** (not per-session or per-agent): HS256-signed with a short
~5-minute TTL, carrying `iss=bitHuman`, `sub=<user_id>`, and a constant
`aud=bithuman-runtime` claim — there is no agent or session claim. The SDKs and
LiveKit plugin handle this loop for you — you rarely call
`/v1/runtime-tokens/request` directly. For browser embeds, use the more constrained
[embed token flow](/api/embedding) instead.

## Audio-only Swift mode is unmetered

If you only want on-device voice chat (no lip-synced avatar), skip the API key
entirely:

```swift
var config = VoiceChatConfig()
config.systemPrompt = "You are a helpful assistant."
config.voice = .preset("Aiden")
// no config.avatar = ...

let chat = VoiceChat(config: config)
try await chat.start()  // does not authenticate
```

This mode runs fully offline (after first-launch weight downloads), bills
nothing, and doesn't require a key.

## Rotating keys

Rotate from the [Developer dashboard](https://www.bithuman.ai/#developer).
Rotation invalidates the old key immediately — there's no overlap window. Live
sessions using the old key fail their next heartbeat (within ~60 s) and pause;
restart with the new key to resume. Rotate during a maintenance window if you
have production sessions running.

## Common errors

| Error | Cause | Fix |
|---|---|---|
| `401` `MISSING_AUTH` | `api-secret` header absent | Add the header on every request. |
| `401` `UNAUTHORIZED` | `api-secret` header present but invalid | Re-verify the secret with `/v1/validate`; rotate if needed. |
| `Authentication failed` (Python) | Wrong/missing `BITHUMAN_API_SECRET` | Verify with the `curl /v1/validate` recipe. |
| `VoiceChatError.missingAPIKey` (Swift) | Avatar mode without `apiKey` set | Set `config.apiKey` or export `BITHUMAN_API_KEY`. |
| Heartbeat silent after 5 min | Network dropped on-device | Reconnect; the SDK pauses the avatar after the grace window and resumes when heartbeats succeed. |

See the full [error reference](/api/errors).
