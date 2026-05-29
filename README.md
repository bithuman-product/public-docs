# bitHuman public docs

Source for [docs.bithuman.ai](https://docs.bithuman.ai). Built with
[Astro Starlight](https://starlight.astro.build/) — same framework
OpenAI uses for [developers.openai.com](https://developers.openai.com/).

## Local dev

```bash
npm install
npm run dev      # http://localhost:4321
```

Requires **Node 22+** (uses Astro 6).

## Structure

```
src/
  content/docs/      Markdown pages (Get started, Guides, SDKs, Examples, ...)
  openapi/           openapi.yaml — auto-renders to /api/operations/*
  styles/            Custom theme (coral accent on monochrome)
  assets/            Logo (light/dark)
public/
  favicon.png        Site favicon
  images/            Inline images referenced from Markdown
```

## Adding a new endpoint

1. Edit `src/openapi/bithuman.yaml` (OpenAPI 3.1).
2. `npm run build` — new page lands under `/api/operations/<operationId>/`.

No hand-written API page maintenance.

## Deploy

GitHub push → Vercel preview → DNS swap on `docs.bithuman.ai`.
