<!-- Shared by /platforms/ios and /platforms/macos (```partial swift-auth). -->
The engines check an API secret when a session starts. Set `BITHUMAN_API_SECRET` in the scheme's environment, or pass it in code before you create an engine: `Expression2Credential.set(secret)` or `Essence2Credential.set(secret)` ([Your API secret](/start/api-secret)).

The scheme's environment is for local builds. A shipped app fetches its secret from your backend and keeps it in the Keychain ([What a shipped app holds](/start/api-secret#what-a-shipped-app-holds)).
