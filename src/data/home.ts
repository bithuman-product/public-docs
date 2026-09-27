// The home page's cards, in one place. src/pages/index.astro draws them and
// the home page's markdown twin (/index.md) lists them, so the page a person
// sees and the file an agent reads name the same links.
//
// Every card is one link and one short line. Longer text belongs on the page
// the card links to. No frame rate, multiple or price is typed here: speed comes
// from the generated headline (src/lib/perf-headline.ts), prices from /guides/pricing.

export interface HomeCard {
  title: string;
  line: string;
  href: string;
  /** A name from src/components/Icon.astro */
  icon: string;
  /** A short plan or availability label shown as a chip */
  badge?: string;
}

/** "Start building": one card per platform, linking its first page. */
export const START_BUILDING: HomeCard[] = [
  { title: "iOS & iPadOS", line: "One Swift package. The avatar renders on the device.", href: "/sdk/apple", icon: "phone" },
  { title: "macOS", line: "A talking avatar on a Mac from one Swift file.", href: "/examples/macos-expression2", icon: "laptop" },
  { title: "Android", line: "One Maven Central dependency. Renders on the phone.", href: "/sdk/android", icon: "android" },
  { title: "Web", line: "One iframe on any page. Nothing to install.", href: "/sdk/web", icon: "globe" },
  { title: "Python", line: "Open an avatar, push audio, get frames.", href: "/sdk/python", icon: "braces" },
  { title: "CLI", line: "A live avatar or an MP4 from the terminal.", href: "/sdk/cli", icon: "terminal" },
  { title: "LiveKit", line: "Give a LiveKit voice agent a face.", href: "/sdk/livekit", icon: "wave" },
  { title: "REST API", line: "Agents, speech and talking video over HTTPS.", href: "/api/quickstart", icon: "code" },
];

/** "Choose your deployment": where the avatar renders. */
export const DEPLOYMENTS: HomeCard[] = [
  { title: "Cloud", line: "bitHuman renders and streams it. Use the API, an embed or LiveKit.", href: "/api", icon: "cloud" },
  { title: "Self-hosted", line: "The CLI or Python on your own Mac or Linux machine.", href: "/guides/self-hosting", icon: "server" },
  { title: "On-device", line: "Inside your app on iPhone, iPad, Mac, Android or a WebGPU browser.", href: "/concepts/models#where-each-model-runs", icon: "devices" },
  { title: "Offline", line: "Kiosks, trade shows and ATMs with no network, under an offline license.", href: "/guides/pricing#offline-licensing", icon: "offline", badge: "Business & Enterprise" },
];

export interface ModelCard {
  title: string;
  line: string;
  href: string;
  image: { src: string; width: number; height: number; alt: string };
}

/** "Models": the current generation. */
export const MODELS: ModelCard[] = [
  {
    title: "Essence 2", line: "A photoreal person from one portrait.", href: "/concepts/essence-2",
    image: { src: "/examples/android/essence2.webp", width: 540, height: 1005, alt: "sofia-ramirez, a sample Essence 2 avatar" },
  },
  {
    title: "Expression 2", line: "Any character from one portrait: stylized, animal, robot or human.", href: "/concepts/expression-2",
    image: { src: "/examples/ios/hero.webp", width: 416, height: 720, alt: "wise-pup, a sample Expression 2 avatar" },
  },
];

export const MODELS_NOTE = "Essence 2 Max is available on the Enterprise plan only and runs in the bitHuman cloud. Essence 1 and Expression 1 are the first generation.";

/** "Popular guides". */
export const GUIDES: { title: string; href: string }[] = [
  { title: "Create your own avatar", href: "/guides/building-avatars" },
  { title: "Write an agent persona", href: "/guides/persona" },
  { title: "Choose a voice provider", href: "/guides/voice-providers" },
  { title: "Talk to an avatar on your machine", href: "/guides/local-voice-avatar" },
  { title: "Drive it from Claude or Cursor (MCP)", href: "/sdk/mcp" },
  { title: "Pricing and credits", href: "/guides/pricing" },
];

/** The resource row at the foot of the page. */
export const RESOURCES: { title: string; href: string; icon: string }[] = [
  { title: "API reference", href: "/api/reference", icon: "code" },
  { title: "Examples", href: "/examples", icon: "grid" },
  { title: "Changelog", href: "/changelog", icon: "list" },
  { title: "llms.txt for AI agents", href: "/llms.txt", icon: "file" },
  { title: "Support", href: "/community", icon: "chat" },
];
