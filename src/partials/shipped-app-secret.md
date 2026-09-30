<!-- Shared by /start/api-secret (What a shipped app holds) and /build/companion-app (```partial shipped-app-secret). The platform pages link to it. -->
The Swift package and the Android SDK authenticate with your API secret, so every copy of an app you distribute carries it. Treat that secret as exposed: whoever extracts it can call the API as your account, spend your credits and create more secrets.

- Fetch the secret from your backend when the app starts. Never compile it into a build you ship.
- Give each app its own secret, so you can rotate one without touching the others ([API secrets](https://www.bithuman.ai/developer/api-keys)).
- Watch your [balance](/api/billing#check-credit-balance), and rotate the secret at once if usage looks wrong.
