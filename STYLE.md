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
- The generated clip is the **"identity video"**, defined once (on `/concepts/models-v2`):
  generated internally from your portrait, 10 seconds, first and last frames match so it
  loops seamlessly. Banned synonyms: source video, source footage, driver video, real
  footage (except when quoting a verbatim server message, with a link).
- Runtimes: GPU, CPU, Apple Neural Engine (spelled out; "ANE" only in slugs/tables after a
  first definition). Apple Silicon (capital S), macOS, WebRTC, WebGPU, on-device,
  self-hosted.

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
