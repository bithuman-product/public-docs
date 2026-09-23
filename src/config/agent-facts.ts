// The corrections an AI agent needs before it writes a line of bitHuman code.
//
// WHY THIS FILE EXISTS
// --------------------
// A coding agent typically reads ONE file — /llms.txt, or /llms-full.txt when it
// ingests the corpus in a single fetch — and then acts with no human judgement in
// the loop. The mistakes it makes here are always the same handful, and every one
// of them costs a real developer a cycle: a slug that no longer exists, an omitted
// `model` field that silently creates the wrong (and differently priced) agent, a
// `render` that exits before the first frame because nothing signed in, a generate
// call issued on a free account that cannot afford it, `Authorization: Bearer`
// instead of the `api-secret` header, a `pip install` refused by a system Python.
//
// So both machine entry points open with the same block, and it lives here once.
//
// ★THE RULE THIS BLOCK KEEPS: every fact below is owned by a page, and the bullet
// links to that page. No number that /guides/pricing owns is repeated here (STYLE.md
// single-sources all pricing numbers), and no retired model name is spelled here
// (STYLE.md keeps those to the Naming & migration section of /concepts/models).
// An index that states a number the pages later change is worse than one that links.

/** The "what to get right first" section, with `site` as the link origin. */
export function agentFacts(site: string): string {
  return (
    `## What to get right first\n\n` +
    `The facts an AI agent reading only this file usually has wrong. Each one names ` +
    `the page that owns it.\n\n` +
    `- **Name the model as a lowercase, hyphenated slug.** In prose the models are ` +
    `Essence 2, Expression 2, Essence 1 and Expression 1; in a request body they are ` +
    `\`essence-2\`, \`expression-2\`, \`essence-1\` and \`expression-1\`. The \`model\` ` +
    `field also accepts the bare families \`essence\` and \`expression\` (paired with ` +
    `\`version\`) and \`auto\` — seven values in all; send one of the four explicit ` +
    `slugs unless you mean otherwise. Any other spelling returns \`400\` listing the ` +
    `seven, and the names that used to work are under "Naming & migration" on ` +
    `[Models](${site}/concepts/models#naming--migration).\n` +
    `- **Nothing defaults to Essence 2.** \`essence-2\` is the standard model for ` +
    `photorealistic people, but \`POST /v1/agent/generate\` with no \`model\` field ` +
    `creates an \`expression-1\` agent. Send \`model\` explicitly on every generate ` +
    `call: [Agents API](${site}/api/agents).\n` +
    `- **\`bithuman pull\` is anonymous; \`bithuman run\` and \`bithuman render\` are ` +
    `not.** Downloading a showcase avatar needs no account. Running or rendering one ` +
    `stops before the first frame with exit 77 until you \`bithuman login\` or export ` +
    `\`BITHUMAN_API_SECRET\`: [CLI](${site}/sdk/cli).\n` +
    `- **Creating an agent costs credits, and a free account cannot afford one.** ` +
    `Generation is billed once per agent, before any minute is served, and the free ` +
    `monthly allowance is smaller than the cheapest creation — so a generate call ` +
    `needs a paid plan or a top-up. Every number is on ` +
    `[Pricing & credits](${site}/guides/pricing).\n` +
    `- **Avatar slugs are live data — never invent one.** Read the pullable set from ` +
    `\`https://api.bithuman.ai/v1/models/showcase\` (anonymous JSON, no key) or run ` +
    `\`bithuman list\`, then use a slug from that answer; a slug you found in an older ` +
    `sample may be gone. The current set is also tabulated on [CLI](${site}/sdk/cli).\n` +
    `- **The REST header is \`api-secret\`, not \`Authorization\`.** Keep the value in ` +
    `the environment and send it as \`-H "api-secret: $BITHUMAN_API_SECRET"\`: ` +
    `[Authentication](${site}/api/authentication).\n` +
    `- **On Apple, check the device floor before anyone buys hardware.** The three ` +
    `products have different floors: \`Expression2\` runs on any Apple Silicon iPhone ` +
    `at iOS 16; \`Essence2\` on any Apple Silicon iPhone but at iOS 26; \`bitHumanKit\` ` +
    `needs an iPhone 16 Pro or newer **and two Apple entitlements Apple grants in 1–3 ` +
    `business days**. Only \`bitHumanKit\` has that floor and those entitlements — do ` +
    `not apply them to the two engines, and do not promise a same-day ` +
    `\`bitHumanKit\` demo: [Swift SDK](${site}/sdk/ios).\n` +
    `- **On mobile, an out-of-date version is the failure that does not announce ` +
    `itself — copy the pin from the page, never from memory or an older sample.** On ` +
    `Apple, SwiftPM's \`from:\` is a *floor* and SwiftPM keeps whatever ` +
    `\`Package.resolved\` already holds, so a floor below the one the page prints leaves ` +
    `a project on an older Essence 2 engine, and on that engine an iPhone under a 16 Pro ` +
    `warms up, refuses by name and stays idle-only — the face moves, it never speaks, ` +
    `and **nothing is thrown**. Raise the floor, then \`swift package update\`, because ` +
    `\`Package.resolved\` does not move on its own: ` +
    `[pin the version](${site}/sdk/ios#pin-the-version). ` +
    `On Android, older Maven coordinates still resolve, still compile and render ` +
    `**differently**, with no exception to catch — and across some releases the Kotlin ` +
    `API is byte-identical, so no compiler and no reference page can see it: ` +
    `[what an older pin changes](${site}/sdk/android#pin-the-version).\n` +
    `- **On Android the two models differ in the one thing that decides a project: the ` +
    `credential.** \`expression2-android\` reaches a first frame with no account and no ` +
    `key. \`essence2-android\` needs an api-secret in **two** places — the model store's ` +
    `resolver and \`Essence2Metering.apiSecret\` — and setting one does not arm the ` +
    `other. Both are \`arm64-v8a\` only, both need \`useLegacyPackaging = true\`, and ` +
    `they declare different \`minSdk\`: [Android SDK](${site}/sdk/android).\n` +
    `- **Self-hosting is gated by credits alone, and it runs online.** Every ` +
    `self-hosted or on-device render authenticates over the internet. Running ` +
    `completely off the internet is offline licensing — Business and Enterprise only, ` +
    `arranged through sales, not self-serve, and not offered on phones: ` +
    `[offline licensing](${site}/guides/pricing#offline-licensing).\n` +
    `- **Python installs into a virtual environment.** \`pip install bithuman\` against ` +
    `a system Python on Debian or Ubuntu is refused with ` +
    `\`error: externally-managed-environment\`; create and activate a venv first: ` +
    `[Python SDK](${site}/sdk/python).\n\n`
  );
}
