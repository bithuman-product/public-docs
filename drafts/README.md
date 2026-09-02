# Held drafts — NOT published

Nothing in this directory is built. Astro renders only the `docs` content
collection (`src/content/docs/**/*.md`, see `src/content.config.ts`) and the
explicit pages under `src/pages/`. A file here has no route, is not in
`sitemap.xml` / `llms.txt`, and is not scanned by `scripts/*.mjs`.

This is where a page-sized change lives while the thing it describes is not yet
true. Each file states, at the top, **the condition that has to hold before it
may be moved into `src/content/docs/`** — moving it before that condition holds
is publishing a false statement, which is the exact failure this directory
exists to prevent.
