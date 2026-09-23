---
title: "Authentication"
description: "Get an API secret, set it for the right surface, and understand how it is exchanged for short-lived runtime tokens."
section: api
group: "Get started"
order: 2
---

## One credential, one name

bitHuman uses a single credential per account, your **API secret**, for every
SDK, the CLI and the REST API. It has one name everywhere:

- **`BITHUMAN_API_SECRET`** — the environment variable the Python SDK, the
  CLI, the LiveKit plugin, Essence 2 on Apple and Android, and the
  self-hosted containers read.
- **`api-secret`** — the HTTP header for the REST API.
- **`api_secret` / `apiSecret`** — the parameter name in each SDK.

BITHUMAN_API_KEY is still read as a deprecated alias by the CLI; when both are
set, `BITHUMAN_API_SECRET` wins. Set `BITHUMAN_API_SECRET` in anything new.

> **Tip** You only need an API secret when an **avatar is rendering**.
> Audio-only voice agents (Swift `VoiceChat` with no `config.avatar`) run fully
> offline without one — see [pricing](/api/billing) for what's free vs. metered.

## Get an API secret

1. Sign in at [bithuman.ai](https://www.bithuman.ai) (free tier, no credit
   card).
2. Go to [Developer → API Secrets](https://www.bithuman.ai/developer/api-keys).
3. Click **Create API secret**, name it (e.g. `production-mac`), and copy the
   value. **You won't be able to view it again** — store it somewhere durable.

## Sign in from the CLI

If you use the [CLI](/sdk/cli), you don't have to copy an API secret by hand.
Run:

```bash
bithuman login
```

This opens your browser, you sign in to your bitHuman account and approve
the request, and the CLI mints a **per-device API secret** — scoped to your
account and aliased `cli@<hostname>` — then stores it in `~/.bithuman/config`
(mode 600) as a `BITHUMAN_API_SECRET=` line. From then on every CLI command
authenticates automatically; there's nothing to `export`.

On SSH or headless hosts where the browser can't reach the machine, use
`bithuman login --device` and enter the short code it prints from any
browser. See [CLI → Signing in](/sdk/cli/reference#signing-in).

Because each device gets its own API secret, it's individually
**revocable** — run `bithuman logout` on that machine, or revoke the
`cli@<hostname>` secret from
[Developer → API Secrets](https://www.bithuman.ai/developer/api-keys). Revoking
one device leaves your other API secrets untouched.

> **CI, containers, automation** — keep setting `BITHUMAN_API_SECRET`
> directly (next section). That path is fully supported and is what you want
> anywhere there's no browser or interactive shell. `bithuman login` is a
> convenience for interactive machines, not a replacement for it.

## Verify it works

```bash
curl -X POST https://api.bithuman.ai/v1/validate \
  -H "api-secret: <your API secret>"
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
    api_secret=os.environ["BITHUMAN_API_SECRET"],  # or leave it out: the SDK reads it itself
)
```

**Swift, Essence 2** — `BITHUMAN_API_SECRET` in the scheme's environment, or
hand it over before the session starts; never hard-code it in source:

```swift
import Essence2

// development: the scheme's environment already carries BITHUMAN_API_SECRET
// production: fetch it from your backend or the Keychain, then:
be_essence2_set_api_secret(apiSecret)
```

**Swift, `bitHumanKit` 2.4.0** — its configuration field keeps its published
name, `apiKey`; put your API secret in it:

```swift
// development: read the one name every other surface uses
config.apiKey = ProcessInfo.processInfo.environment["BITHUMAN_API_SECRET"]
// production: fetch from your backend via Keychain
config.apiKey = await fetchFromBackend()
```

For DMG distribution, bake the API secret into Info.plist via a build script.
For App Store, fetch from your own backend via Keychain on first launch — don't
bundle.

## api-secret vs. runtime tokens

The long-lived `api-secret` is never sent to the avatar engine or any third
party. It only ever travels to `api.bithuman.ai` over TLS. There is one
exception you must handle yourself. The LiveKit plugin writes whatever it is
given as `api_secret` into LiveKit room attributes, where every participant can
read it. Give it a
[LiveKit cloud token](/sdk/livekit#keep-your-api-secret-out-of-the-room)
instead of your secret.

The streaming runtime is authorized by a separate, short-lived **runtime
token**:

1. Your code provides the API secret to the SDK or REST request.
2. The SDK exchanges it for a short-lived runtime token at
   `POST /v1/runtime-tokens/request`.
3. That token authorizes the avatar engine (heartbeat + frame production) for
   your account.
4. Tokens auto-renew roughly every 60 seconds via the heartbeat.
5. A bad API secret fails at step 2 — fast — before any user-visible work.

The runtime token is **not** an api-secret. It can't mint other tokens; it just
authorizes the runtime to compute frames on behalf of your account. It is
**account-scoped** (not per-session or per-agent): HS256-signed with a short
~5-minute TTL, carrying `iss=bitHuman`, `sub=<user_id>`, and a constant
`aud=bithuman-runtime` claim — there is no agent or session claim. The SDKs and
LiveKit plugin handle this loop for you — you rarely call
`/v1/runtime-tokens/request` directly. For browser embeds, use the more constrained
[embed token flow](/api/embedding) instead.

## Audio-only Swift mode is unmetered

If you only want on-device voice chat (no lip-synced avatar), skip the API
secret entirely:

```swift
var config = VoiceChatConfig()
config.systemPrompt = "You are a helpful assistant."
config.voice = .preset("Aiden")
// no config.avatar = ...

let chat = VoiceChat(config: config)
try await chat.start()  // does not authenticate
```

This mode runs fully offline (after first-launch weight downloads), bills
nothing, and doesn't require an API secret.

## Rotating API secrets

Rotate from the [Developer dashboard](https://www.bithuman.ai/developer/api-keys).
Create the new API secret first, move your services onto it, then revoke the old
one. Revoking invalidates it immediately — there's no overlap window. Live
sessions still using the old one fail their next heartbeat (within ~60 s) and
pause; restart them with the new API secret to resume. Rotate during a maintenance window if you
have production sessions running.

## Common errors

| Error | Cause | Fix |
|---|---|---|
| `401` `MISSING_AUTH` | `api-secret` header absent | Add the header on every request. |
| `401` `UNAUTHORIZED` | `api-secret` header present but invalid | Re-verify the secret with `/v1/validate`; rotate if needed. |
| `Authentication failed` (Python) | Wrong/missing `BITHUMAN_API_SECRET` | Verify with the `curl /v1/validate` recipe. |
| `VoiceChatError.missingAPIKey` (`bitHumanKit`) | Avatar mode without `config.apiKey` set | Set `config.apiKey` to your API secret. |
| Heartbeat silent after 5 min | Network dropped on-device | Reconnect; the SDK pauses the avatar after the grace window and resumes when heartbeats succeed. |

See the full [error reference](/api/errors).
