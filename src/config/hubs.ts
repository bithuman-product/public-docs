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
  section?: "platforms" | "build" | "overview";
}

export const HUBS: HubMeta[] = [
  {
    route: "",
    file: "src/pages/index.astro",
    name: "bitHuman docs",
    description:
      "Build real-time talking avatars that render on iPhone, iPad, Android, Mac, a Linux PC with no GPU, or the browser. Quickstarts, SDKs, API and measured performance.",
  },
  {
    route: "start",
    file: "src/pages/start.astro",
    name: "Quickstart",
    description: "Talk to a live avatar, get an API secret, and run your first avatar on the platform you choose.",
  },
  {
    route: "api/reference",
    file: "src/openapi/bithuman.yaml",
    name: "API reference",
    description:
      "Every endpoint in the bitHuman OpenAPI spec: agents, voice, talking video, embedding, billing and webhooks. The same contract is served raw at /api/openapi.yaml.",
  },
  {
    route: "platforms",
    file: "src/pages/platforms/index.astro",
    name: "Platforms",
    description:
      "Every platform bitHuman runs on: iOS & iPadOS, macOS, Android, Flutter, the web, Python, the CLI, LiveKit and the REST API, with where the avatar renders and the time to a first result.",
    section: "platforms",
  },
  {
    route: "build",
    file: "src/pages/build/index.astro",
    name: "Guides",
    description: "Create your own avatar, give it a persona and a voice, and follow recipes for a voice agent and for Claude and Cursor. Then browse the example gallery.",
    section: "build",
  },
  {
    route: "resources",
    file: "src/pages/resources/index.astro",
    name: "Resources",
    description: "Downloads and versions, the changelog, news, troubleshooting, support, legal, and machine-readable files for AI agents.",
    section: "overview",
  },
];

export function hubMeta(route: string): HubMeta {
  const h = HUBS.find((x) => x.route === route);
  if (!h) throw new Error(`no hub metadata for route "/${route}" — add it to src/config/hubs.ts`);
  return h;
}

// The two code samples /start prints, from src/data/platforms.ts, so
// /llms-full.txt carries the same bytes the page renders.
import { PLATFORMS, EMBED_SNIPPET } from "../data/platforms";
export const START_EMBED = EMBED_SNIPPET;
export const START_CLI = PLATFORMS.find((p) => p.id === "cli")!.card!.code;
