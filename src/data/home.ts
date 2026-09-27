// The home page's cards, in one place. src/pages/index.astro draws them and
// the home page's markdown twin (/index.md) lists them, so the page a person
// sees and the file an agent reads name the same links.
//
// Every card is one link and one short line. Longer text belongs on the page
// the card links to. No frame rate, multiple or price is typed here: speed comes
// from the generated headline (src/lib/perf-headline.ts), prices from /pricing.
import { OFFLINE_LICENSE_SENTENCE, OFFLINE_LICENSE_TERMS } from "./offline";
import { PLATFORM_PAGES } from "./platforms";
import { DEMOS } from "./demo";
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

/** The promise under the H1 (docs spec §1.1). */
export const HERO = {
  title: "Realtime talking avatars that render on the device",
  line: "Turn one portrait into a lip-synced avatar. Render it on iPhone, iPad, Android, Mac, a Linux PC with no GPU or in a WebGPU browser, or stream it from the bitHuman cloud.",
};

/** "Start building": one card per platform page. */
export const START_BUILDING: HomeCard[] = PLATFORM_PAGES.map((p) => ({ title: p.title, line: p.line, href: p.href, icon: p.icon }));

/** "Where it runs": the deployment modes, then the hardware lens, each to its
 *  own page. The offline card quotes the approved sentence and spans the row. */
export const DEPLOYMENTS: HomeCard[] = MODES.map((d) =>
  d.id === "offline"
    ? { title: d.name, line: OFFLINE_LICENSE_SENTENCE, note: OFFLINE_LICENSE_TERMS, href: d.href, icon: d.icon, badge: "Business & Enterprise", wide: true }
    : { title: d.name, line: d.line, href: d.href, icon: d.icon });

export interface ModelCard {
  title: string;
  line: string;
  href: string;
  /** Poster base path (4:5), from the live demo's avatar */
  poster: string;
  alt: string;
}

/** "Models": the current generation, shown with their live sample avatars. */
export const MODELS: ModelCard[] = [
  { title: "Essence 2", line: "A photoreal person from one portrait.", href: "/models/essence-2", poster: DEMOS["essence-2"].poster, alt: "sofia-ramirez, the Essence 2 sample avatar" },
  { title: "Expression 2", line: "Any character from one portrait: stylized, animal, robot or human.", href: "/models/expression-2", poster: DEMOS["expression-2"].poster, alt: "wise-pup, the Expression 2 sample avatar" },
];

export const MODELS_NOTE = "Essence 2 Max is available on the Enterprise plan only. Essence 1 and Expression 1 are the first generation.";

/** "Build": recipes and the pages that make an avatar yours. */
export const GUIDES: { title: string; line: string; href: string; icon: string }[] = [
  { title: "Voice agent", line: "A talking avatar on your machine with the CLI or Python.", href: "/build/voice-agent", icon: "wave" },
  { title: "Create your own avatar", line: "From one portrait to your own agent.", href: "/build/create-avatar", icon: "spark" },
  { title: "Persona", line: "Give the agent a personality and instructions.", href: "/build/persona", icon: "chat" },
  { title: "Voices", line: "Choose a voice, or bring your own provider.", href: "/build/voices", icon: "wave" },
  { title: "Claude & Cursor (MCP)", line: "Drive bitHuman from an AI assistant.", href: "/build/mcp", icon: "code" },
  { title: "Example gallery", line: "Complete apps to clone and run.", href: "/examples", icon: "grid" },
];

/** The resource row at the foot of the page. */
export const RESOURCES: { title: string; href: string; icon: string }[] = [
  { title: "API reference", href: "/api/reference", icon: "code" },
  { title: "Pricing and credits", href: "/pricing", icon: "list" },
  { title: "Downloads & versions", href: "/downloads", icon: "file" },
  { title: "Changelog", href: "/changelog", icon: "list" },
  { title: "llms.txt for AI agents", href: "/llms.txt", icon: "file" },
  { title: "Support & community", href: "/support", icon: "chat" },
];
