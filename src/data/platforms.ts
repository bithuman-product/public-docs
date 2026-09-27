// Every way to run bitHuman, in one list. The path table on /, /start and /platforms,
// the cards on /start, /platforms.json and the top of /llms.txt all render from
// this file. Versions come from versions.json, never typed here.
import versions from "./versions.json";
import { OFFLINE_LICENSE_COPY } from "./offline";
import { DEMOS, embedUrl } from "./demo";

const V = versions.versions;

// The sample agent every embed snippet uses: the Expression 2 showcase avatar.
const pup = DEMOS["expression-2"];
export const DEMO_AGENT = { code: pup.code, slug: pup.slug, name: pup.name, model: pup.model };
export const EMBED_URL = embedUrl(DEMO_AGENT.code);
export const EMBED_SNIPPET = `<iframe src="${EMBED_URL}" allow="microphone *" style="width:100%;height:600px;border:0"></iframe>`;

export interface Platform {
  id: string;
  /** "You want to…" */
  want: string;
  /** The product surface, as named in the sidebar */
  use: string;
  needs: string;
  /** One line a reader can copy */
  first: string;
  time: string;
  /** Platform page; its #first-frame anchor is where the card's Next goes */
  docs: string;
  models: string[];
  /** A line shown under the row (the offline row quotes the approved offline-license copy) */
  note?: string;
  /** The /start card: a few lines that run as pasted, and what they print */
  card?: { lang: string; code: string; expect: string };
}

const both = ["essence-2", "expression-2"];

export const PLATFORMS: Platform[] = [
  {
    id: "web", want: "Put an avatar on a website", use: "Web embed", needs: "nothing",
    first: EMBED_SNIPPET, time: "1 min", docs: "/platforms/web", models: both,
    card: { lang: "html", code: EMBED_SNIPPET, expect: "A live avatar in your page that listens and answers. Allow the microphone when the browser asks." },
  },
  {
    id: "rest", want: "Call it from any backend", use: "REST API", needs: "API secret",
    first: `curl -X POST https://api.bithuman.ai/v1/validate -H "api-secret: $BITHUMAN_API_SECRET"`,
    time: "2 min", docs: "/platforms/rest", models: both,
    card: {
      lang: "bash",
      code: `export BITHUMAN_API_SECRET="<your API secret>"
curl -s -X POST https://api.bithuman.ai/v1/validate -H "api-secret: $BITHUMAN_API_SECRET"
# → {"valid":true}`,
      expect: "Your API secret works. The API quickstart continues with speech, an agent and a talking video.",
    },
  },
  {
    id: "python", want: "Render or stream from Python", use: "Python", needs: "API secret",
    first: `pip install "bithuman[expression-2]"`, time: "5 min", docs: "/platforms/python", models: both,
    card: {
      lang: "bash",
      code: `python3 -m venv .venv && source .venv/bin/activate
pip install "bithuman[expression-2]"
export BITHUMAN_API_SECRET="<your API secret>"
curl -fL -o wise-pup.imx "https://api.bithuman.ai/v1/agent/A23WJF0199/model/download?model=expression-2"
curl -fsSLo speech.wav https://docs.bithuman.ai/samples/speech.wav
python -c 'import bithuman
with bithuman.open("wise-pup.imx") as a: print(sum(1 for _ in a.render("speech.wav")), "frames")'
# → 300 frames`,
      expect: "300 frames of 416×720 video: 15 seconds of speech at 20 fps.",
    },
  },
  {
    id: "cli", want: "Run it from a terminal", use: "CLI (macOS arm64, Linux x86_64 / arm64)", needs: "sign-in",
    first: "curl -fsSL https://install.bithuman.ai | sh", time: "3 min", docs: "/platforms/cli", models: both,
    card: {
      lang: "bash",
      code: `# macOS: brew install ffmpeg   ·   Debian/Ubuntu: sudo apt install -y ffmpeg
curl -fsSL https://install.bithuman.ai | sh
export PATH="$HOME/.local/bin:$PATH"
bithuman login
curl -fsSLo speech.wav https://docs.bithuman.ai/samples/speech.wav
bithuman render wise-pup speech.wav -o out.mp4
# → out.mp4: 15 s of a talking avatar`,
      expect: "out.mp4, 15 seconds of the avatar saying the sample. `bithuman run wise-pup` opens a live conversation instead.",
    },
  },
  {
    id: "apple", want: "Ship an iPhone, iPad or Mac app", use: "iOS & iPadOS (Swift package)", needs: "Xcode 26+, API secret",
    first: `.package(url: "https://github.com/bithuman-product/homebrew-bithuman.git", from: "${V.swift}")`,
    time: "15 min", docs: "/platforms/ios", models: both,
  },
  {
    id: "android", want: "Ship an Android app", use: "Android", needs: "arm64 device, API secret",
    first: `implementation("ai.bithuman:expression2-android:${V.expression2_android}")`,
    time: "15 min", docs: "/platforms/android", models: both,
  },
  {
    id: "livekit", want: "Add a face to a LiveKit voice agent", use: "LiveKit", needs: "API secret",
    first: 'pip install "livekit-agents[openai,silero]" livekit-plugins-bithuman python-dotenv', time: "10 min", docs: "/platforms/livekit", models: both,
  },
  {
    id: "mcp", want: "Drive it from Claude or Cursor", use: "MCP server", needs: "sign-in",
    first: "claude mcp add bithuman -- bithuman mcp", time: "2 min", docs: "/build/mcp", models: both,
  },
  {
    id: "offline", want: "Run fully offline (kiosk, trade show, ATM)", use: "Fully offline", needs: "Business or Enterprise plan",
    first: "Contact sales", time: "—", docs: "/deploy#fully-offline", models: both,
    note: OFFLINE_LICENSE_COPY,
  },
];

/** The platform pages, as the /platforms hub and the home page show them:
 *  one reason line, where the avatar renders, and the artifact whose current
 *  version the card names (from versions.json). */
export interface PlatformPage {
  id: string;
  title: string;
  href: string;
  icon: string;
  group: "Apps" | "Code & terminal" | "Agents & APIs";
  line: string;
  renders: import("./labels").Renders[];
  artifacts: import("./labels").Artifact[];
  /** Time to a first result, from the platform's first-frame steps */
  time?: string;
}

export const PLATFORM_PAGES: PlatformPage[] = [
  { id: "ios", title: "iOS & iPadOS", href: "/platforms/ios", icon: "phone", group: "Apps",
    line: "One Swift package. The avatar renders on the iPhone or iPad.", renders: ["device"], artifacts: ["swift"], time: "15 min" },
  { id: "macos", title: "macOS", href: "/platforms/ios#on-a-mac", icon: "laptop", group: "Apps",
    line: "The same Swift package in a Mac app, or from a terminal with swift run.", renders: ["device"], artifacts: ["swift"], time: "15 min" },
  { id: "android", title: "Android", href: "/platforms/android", icon: "android", group: "Apps",
    line: "One Maven Central dependency. The avatar renders on the phone.", renders: ["device"], artifacts: ["expression2_android", "essence2_android"], time: "15 min" },
  { id: "flutter", title: "Flutter", href: "/platforms/android#flutter", icon: "flutter", group: "Apps",
    line: "The Flutter plugin, on Android today.", renders: ["device"], artifacts: ["flutter_plugin"] },
  { id: "web", title: "Web", href: "/platforms/web", icon: "globe", group: "Apps",
    line: "One iframe on any page. The avatar renders in the cloud, or in the tab with WebGPU.", renders: ["cloud", "browser"], artifacts: [], time: "1 min" },
  { id: "python", title: "Python", href: "/platforms/python", icon: "braces", group: "Code & terminal",
    line: "Open an avatar, push audio, get frames, on macOS or a Linux PC with no GPU.", renders: ["server", "no-gpu"], artifacts: ["python"], time: "5 min" },
  { id: "cli", title: "CLI", href: "/platforms/cli", icon: "terminal", group: "Code & terminal",
    line: "A live avatar or an MP4 from the terminal, on macOS or a Linux PC with no GPU.", renders: ["server", "no-gpu"], artifacts: ["cli"], time: "3 min" },
  { id: "livekit", title: "LiveKit", href: "/platforms/livekit", icon: "wave", group: "Agents & APIs",
    line: "Give a LiveKit voice agent a face, rendered on your server or in the bitHuman cloud.", renders: ["server", "cloud"], artifacts: ["livekit_plugin"], time: "10 min" },
  { id: "rest", title: "REST API", href: "/platforms/rest", icon: "code", group: "Agents & APIs",
    line: "Agents, speech, live sessions and talking video over HTTPS.", renders: ["cloud"], artifacts: [], time: "2 min" },
];
