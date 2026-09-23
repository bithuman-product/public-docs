// The static (non-collection) pages, in one place: the route each one serves,
// the source file that renders it (the sitemap's last-modified date comes from
// that file's last commit), the short name an index shows for it, and the one
// description the page itself publishes as its <meta name="description">.
//
// Every consumer reads THIS list — the hub .astro pages for their meta
// description, /sitemap.xml for the routes, /llms.txt for the index line and
// /llms-full.txt for the section — so the page and the indexes cannot describe
// the same URL differently. Before 2026-09-20 the nine hubs were bare URLs in
// /llms.txt and absent from /llms-full.txt altogether: an agent that ingested
// only the full file never saw /start's four-step CLI sample.

export interface HubMeta {
  /** Route without leading slash; "" is the home page. */
  route: string;
  /** Source file rendering the route — must match src/pages/ (no phantom routes). */
  file: string;
  /** The name an index shows. */
  name: string;
  /** The page's own meta description, verbatim. */
  description: string;
  /** Collection section whose pages this hub lists, if it is a section hub. */
  section?: "api" | "sdk" | "guides" | "concepts" | "resources";
}

export const HUBS: HubMeta[] = [
  {
    route: "",
    file: "src/pages/index.astro",
    name: "bitHuman docs",
    description:
      "Build real-time AI avatars — hosted by us over a REST API, or rendered on your own hardware with the CLI and the Python, Apple, Android and Web SDKs. One credit balance for all of it.",
  },
  {
    route: "start",
    file: "src/pages/start.astro",
    name: "Get started",
    description: "Go from zero to a talking, listening avatar — see one work with no setup, then pick how you run it.",
  },
  {
    route: "api",
    file: "src/pages/api/index.astro",
    name: "API Platform",
    description:
      "Generate, manage, and animate realtime visual agents over REST — voice, gestures, files, and embedding, all from api.bithuman.ai. We host everything; you just call the endpoints.",
    section: "api",
  },
  {
    route: "api/reference",
    file: "src/openapi/bithuman.yaml",
    name: "REST API reference",
    description:
      "Every endpoint in the bitHuman OpenAPI spec — agents, voice, talking video, embedding, billing, webhooks — with try-it-out. The same contract is served raw at /api/openapi.yaml.",
  },
  {
    route: "sdk",
    file: "src/pages/sdk/index.astro",
    name: "SDK",
    description:
      "Run bitHuman on your own hardware — one page per platform: the CLI on macOS and Linux, Python, Apple, Android and the Web.",
    section: "sdk",
  },
  {
    route: "guides",
    file: "src/pages/guides/index.astro",
    name: "Guides",
    description: "Build, customize, and deploy realtime visual agents — from a first avatar to production.",
    section: "guides",
  },
  {
    route: "concepts",
    file: "src/pages/concepts/index.astro",
    name: "Concepts",
    description: "The mental model behind bitHuman — one engine, one .imx format, one push/drain loop, one model family.",
    section: "concepts",
  },
  {
    route: "resources",
    file: "src/pages/resources/index.astro",
    name: "Resources",
    description: "Everything around building with bitHuman — downloads, changelog, examples, and the community.",
    section: "resources",
  },
  {
    route: "showcase",
    file: "src/pages/showcase/index.astro",
    name: "Showcase",
    description: "Real teams shipping realtime visual agents with bitHuman — museums, enterprise, retail, and more.",
  },
];

export function hubMeta(route: string): HubMeta {
  const h = HUBS.find((x) => x.route === route);
  if (!h) throw new Error(`no hub metadata for route "/${route}" — add it to src/config/hubs.ts`);
  return h;
}

// The two code samples /start prints. They live here so /llms-full.txt carries
// the same bytes the page renders.
export const START_EMBED = `<!-- Paste into any page. No API secret, no install. -->
<iframe
  src="https://bithuman.ai/embed/A78WKV4515"
  allow="microphone *; camera *; autoplay *"
  style="width: 100%; height: 600px; border: 0;"
></iframe>`;

// The canonical CLI happy path — the same four steps /sdk/cli teaches.
export const START_CLI = `# 1 · install (macOS Apple Silicon or Linux x86_64; \`run\` also needs livekit-server on PATH — see the CLI page)
curl -fsSL https://install.bithuman.ai | sh

# 2 · sign in (opens your browser)
bithuman login

# 3 · grab an avatar
bithuman pull wise-pup            # prints ~/.cache/bithuman/showcase/wise-pup.imx

# 4 · run it
bithuman run wise-pup
# → open the printed http://127.0.0.1:8088/<CODE> URL — a live session, brain included`;
