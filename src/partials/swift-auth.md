<!-- Shared by /platforms/ios and /platforms/macos (```partial swift-auth). -->
The engines check an API secret when a session starts. Set `BITHUMAN_API_SECRET` in the scheme's environment, or pass it in code before you create an engine: `Expression2Credential.set(secret)` or `Essence2Credential.set(secret)` ([Your API secret](/start/api-secret)).

The scheme's environment is for local builds. Every copy of a shipped app carries its secret, so treat it as exposed: fetch it from your backend at startup, keep it in the Keychain, give each app its own secret, and rotate it if usage looks wrong ([What a shipped app holds](/start/api-secret#what-a-shipped-app-holds)).

Credits pay for active session time, talking or idle, billed to the second ([pricing](/pricing)).
