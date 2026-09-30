// The home page's cards, in one place. src/pages/index.astro draws them and
// the home page's markdown twin (/index.md) lists them, so the page a person
// sees and the file an agent reads name the same links.
//
// Every card is one link and one short line. Longer text belongs on the page
// the card links to. No frame rate, multiple or price is typed here: speed comes
// from the generated headline (src/lib/perf-headline.ts), prices from /pricing.
import { PLATFORM_PAGES } from "./platforms";
import { DEPLOYMENTS as MODES } from "./deployments";

export interface HomeCard {
  title: string;
  line: string;
  href: string;
  /** A name from src/components/Icon.astro */
  icon: string;
  /** A short plan or availability label shown as a chip */
  badge?: string;
  /** A second, quieter line under `line` */
  note?: string;
  /** Spans the whole row */
  wide?: boolean;
}

/** The landing's head (docs v2 SPEC §6): the H1 names the site, one sentence
 *  under it opens with the brand line (owner, 2026-09-30: "AI with character."). */
export const LANDING = {
  title: "bitHuman docs",
  line: "AI with character. Real-time talking avatars from one portrait.",
};

/** The product promise (the site JSON-LD description). */
export const HERO = {
  title: "Real-time talking avatars that render on the device",
  line: "Turn one portrait into a lip-synced avatar. Render it on iPhone, iPad, Android, Mac, a Linux PC with no GPU or in a WebGPU browser, or stream it from the bitHuman cloud.",
};

/** "Start building": one card per platform page. */
export const START_BUILDING: HomeCard[] = PLATFORM_PAGES.map((p) => ({ title: p.title, line: p.line, href: p.href, icon: p.icon }));

/** "Where it runs": the four deployment modes, each to its own page, with the
 *  short line from src/data/deployments.ts (docs v2 SPEC §6: the offline tile
 *  uses the short line; the approved offline copy stays on the pages it links). */
export const DEPLOYMENTS: HomeCard[] = MODES.map((d) => ({ title: d.name, line: d.line, href: d.href, icon: d.icon }));

export interface ModelCard {
  title: string;
  line: string;
  href: string;
  /** Poster base path (4:5): <poster>-480.{avif,webp} */
  poster: string;
  alt: string;
  /** Emphasis tags (owner, 2026-09-30: "New" and "Hot" on Essence 2 and Expression 2) */
  tags?: string[];
}

/** "Models": the current generation, each shown with one of its public
 *  showcase characters. Not the live demo's two samples: the hero above already
 *  shows those, and the owner asked for variety over one repeated face
 *  (2026-09-29: "I don't like we repeat the same image for different cards"). */
export const MODELS: ModelCard[] = [
  { title: "Essence 2", line: "A photoreal person from one portrait.", href: "/models/essence-2", poster: "/images/cast/kwame-warm-museum-guide", alt: "Kwame, an Essence 2 avatar", tags: ["New", "Hot"] },
  { title: "Expression 2", line: "Any character from one portrait: stylized, animal, robot or human.", href: "/models/expression-2", poster: "/images/cast/pip-the-red-panda-barista", alt: "Pip the red panda barista, an Expression 2 avatar", tags: ["New", "Hot"] },
];

/** The first generation, listed beside the current models (owner, 2026-09-30:
 *  "we should list all Essence versions and Expression versions"). Each line is
 *  its availability, matching src/data/models.ts MATRIX: Essence 1 has no phone
 *  build; Expression 1 renders only in the bitHuman cloud. */
export const MODELS_V1: { title: string; line: string; href: string }[] = [
  { title: "Essence 1", line: "First generation. On your own computers, in the bitHuman cloud or in a browser tab; not on phones.", href: "/models/first-generation" },
  { title: "Expression 1", line: "First generation. In the bitHuman cloud only.", href: "/models/first-generation" },
];

export const MODELS_NOTE = "Essence 2 Max is available on the Enterprise plan only.";

/** "Build": recipes and the pages that make an avatar yours. */
export const GUIDES: { title: string; line: string; href: string; icon: string }[] = [
  { title: "Voice agent", line: "A talking avatar on your machine with the CLI or Python.", href: "/build/voice-agent", icon: "wave" },
  { title: "Create your own avatar", line: "From one portrait to your own agent.", href: "/build/create-avatar", icon: "spark" },
  { title: "Persona", line: "Give the agent a personality and instructions.", href: "/build/persona", icon: "chat" },
  { title: "Voices", line: "Choose a voice, or bring your own provider.", href: "/build/voices", icon: "wave" },
  { title: "Claude & Cursor (MCP)", line: "Drive bitHuman from an AI assistant.", href: "/build/mcp", icon: "code" },
  { title: "Example gallery", line: "Complete apps to clone and run.", href: "/examples", icon: "grid" },
];
