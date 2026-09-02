# docs.bithuman.ai style guide

The canonical style capsule for everything under `src/content/docs` and `src/pages`.
Every PR is expected to conform; reviewers link to the rule they are enforcing.

## Naming & casing

- **bitHuman** — always, in any position ("bitHuman cloud", lowercase c).
- Models in prose: **Essence 2, Essence 2 Max, Expression 2, Essence 1, Expression 1** —
  capitalized, spaces, no hyphen. API values are backticked slugs only
  (`essence-2`, `essence-2-max`, `expression-2`): monospace = the string you type.
- Say "second-generation models" in prose; "v2" only in tables and the changelog.
- Retired and internal names (`essence-2-light`, `essence-2-quality`) live in ONE place —
  the "Naming & migration" section on `/concepts/models-v2` — everywhere else links there.
  `essence-2-quality` is described strictly as a retiring alias of `essence-2-max`;
  `essence-2-light` appears only in the 400-hint migration note. The phrase
  "platform-side flip" is banned from public prose.
- **Deprecated product names.** The product names are **essence-2** and
  **expression-2** (plus `essence-2-max`, and the first generation). `elevate`,
  `embody`, `essence-2-light`, `essence-2-quality`, `lebundle` and their variants
  are DEPRECATED and must not be used as a live product name in prose.
  ★They are NOT renamed, and nothing that carries them is deleted: a developer
  who must TYPE one — a filename they receive, a URL path, a slug a saved link
  carries — still gets it spelled exactly, with a plain statement that it is a
  legacy name kept for compatibility. Hiding a name a developer must type is
  worse than showing a retired one. The frozen carriers, which never rename:
  `<code>.lebundle.imx` (documented once on `/concepts/avatars-imx`),
  `libelevate-web` (the browser artifact path), `libelevate` / `lible_core`
  (the vendored engine and its native library, named verbatim in a runtime
  error), the `essence-2-light-gpu` / `-cpu` / `-ane` tier slugs that saved
  links still carry, and the **container engine ids** `essence2-light` /
  `essence2-quality` (unhyphenated) — the values `bithuman info` prints, that
  `--json` exposes as `engine`, and that the loader quotes verbatim in an
  error. Those are manifest values every reader parses, so they never rename;
  they are documented once on
  `/concepts/avatars-imx#the-engine-value-is-a-legacy-name` and everywhere else
  links there. A retired spelling also stays spellable in a migration
  note, a `400`-hint, or a dated changelog entry — that is how a reader with an
  old integration learns it is dead. `scripts/check-retired-model-names.mjs`
  enforces exactly this and fails on any other use.
  (`--color-elevated` is a CSS surface token, not the product — out of scope.)
- The generated clip is the **"identity video"**, defined once (on `/concepts/models-v2`):
  generated internally from your portrait, 10 seconds, first and last frames match so it
  loops seamlessly. Banned synonyms: source video, source footage, driver video, real
  footage (except when quoting a verbatim server message, with a link).
- Runtimes: GPU, CPU, **Apple** — the cloud Apple-Silicon/CoreML tier. ★Never write "Apple
  Neural Engine" for that tier. It is not a style preference: all four production serving
  agents bind `cpuAndGPU`, so the tier runs on the Mac **GPU**, and the Neural Engine is the
  SLOWER unit (2.2x) even for a graph that can use it. Naming it after the unit we chose not
  to use tells the reader something untrue about how their render runs.
  "ANE" survives ONLY inside slugs and identifiers — `essence-2-ane`, `expression-2-ane`,
  `essence-2-light-ane` — which saved links, embeds and signed share JWTs carry verbatim and
  which therefore never rename. Never expand it in prose.
  "Neural Engine" IS correct where it is measured and true: **on-device Expression 2** (its
  Apple members are fp16 — 577 of 611 placed ops, none on the GPU, on an iPhone 15) and the
  audio front end of the cloud `expression-2` tier. Do not carry the Essence 2 verdict across.
  Apple Silicon (capital S), macOS, WebRTC, WebGPU, on-device, self-hosted.

## Units & numbers

- "credits/min" (never "cr/min"); "credits" never "cr" in prose; "N credits (one-time)".
- "25 fps" lowercase, no tilde unless genuinely approximate. Durations use an en dash:
  "25–40 minutes".
- ISO dates in the changelog. Body text avoids "today" / "available now" — use the
  rollout-status note instead.

## Voice & tone

- Second person, present tense, active voice. "we" only when bitHuman acts.
- Lead with what to provide, not what's rejected.
- No jokey headings; no superlatives in reference pages.

## Examples

- Secrets only via environment variables: `-H "api-secret: $BITHUMAN_API_SECRET"` /
  `os.environ["BITHUMAN_API_SECRET"]`. Never a `YOUR_API_SECRET` literal in code.
- Every example must be runnable after one `export`.
- Canonical snippets (embed iframe, token mint, push/drain loop) live on ONE page;
  every other page links to it.

## Structure

- Page shape: What it is → When to use → How it works → Reference tables → Errors →
  Next steps.
- H2/H3 only; convert runs of bold pseudo-headings to H3s. Table cells stay under
  ~25 words; caveats belong in prose.
- A page opens with what the thing IS — never with naming history.
- Single-source facts: ALL pricing numbers live only in `/guides/pricing`; the force-tier
  table only on `/concepts/models-v2`; the device matrix only on `/concepts/architecture`.
  Everywhere else links.
