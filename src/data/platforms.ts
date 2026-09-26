// Every way to run bitHuman, in one list. The path table on /, /start and /sdk,
// the cards on /start, /platforms.json and the top of /llms.txt all render from
// this file. Versions come from versions.json, never typed here.
import versions from "./versions.json";

const V = versions.versions;

export const DEMO_AGENT = { code: "A23WJF0199", slug: "wise-pup", name: "Wise Pup", model: "expression-2" };
export const EMBED_URL = `https://www.bithuman.ai/embed/${DEMO_AGENT.code}`;
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
  /** The /start card: a few lines that run as pasted, and what they print */
  card?: { lang: string; code: string; expect: string };
}

const both = ["essence-2", "expression-2"];

export const PLATFORMS: Platform[] = [
  {
    id: "web", want: "Put an avatar on a website", use: "Web embed", needs: "nothing",
    first: EMBED_SNIPPET, time: "1 min", docs: "/sdk/web", models: both,
    card: { lang: "html", code: EMBED_SNIPPET, expect: "A live avatar in your page that listens and answers. Allow the microphone when the browser asks." },
  },
  {
    id: "rest", want: "Call it from any backend", use: "REST API", needs: "API secret",
    first: `curl -X POST https://api.bithuman.ai/v1/validate -H "api-secret: $BITHUMAN_API_SECRET"`,
    time: "2 min", docs: "/api/quickstart", models: both,
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
    first: `pip install "bithuman[expression-2]"`, time: "5 min", docs: "/sdk/python", models: both,
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
    first: "curl -fsSL https://install.bithuman.ai | sh", time: "3 min", docs: "/sdk/cli", models: both,
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
    id: "apple", want: "Ship an iPhone, iPad or Mac app", use: "Apple (Swift package)", needs: "Xcode 26+, API secret",
    first: `.package(url: "https://github.com/bithuman-product/homebrew-bithuman.git", from: "${V.swift}")`,
    time: "15 min", docs: "/sdk/apple", models: both,
  },
  {
    id: "android", want: "Ship an Android app", use: "Android", needs: "arm64 device, API secret",
    first: `implementation("ai.bithuman:expression2-android:${V.expression2_android}")`,
    time: "15 min", docs: "/sdk/android", models: both,
  },
  {
    id: "livekit", want: "Add a face to a LiveKit voice agent", use: "LiveKit", needs: "API secret",
    first: 'pip install "livekit-agents[openai,silero]" livekit-plugins-bithuman python-dotenv', time: "10 min", docs: "/sdk/livekit", models: both,
  },
  {
    id: "mcp", want: "Drive it from Claude or Cursor", use: "MCP server", needs: "sign-in",
    first: "claude mcp add bithuman -- bithuman mcp", time: "2 min", docs: "/sdk/mcp", models: both,
  },
  {
    id: "offline", want: "Run fully offline (kiosk, trade show, ATM)", use: "Offline licence", needs: "Business or Enterprise plan",
    first: "Contact sales", time: "—", docs: "/guides/pricing#offline-licensing", models: both,
  },
];
