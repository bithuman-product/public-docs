// Every way to run bitHuman, in one list. The path table on /, /start and /platforms,
// the cards on /start, /platforms.json and the top of /llms.txt all render from
// this file. Versions come from versions.json, never typed here.
import versions from "./versions.json";
import { OFFLINE_LICENSE_COPY } from "./offline";
import { DEMOS, embedUrl } from "./demo";
import { captureMedia } from "./examples.ts";

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
  /** Platform page; its #run-your-first-avatar anchor is where the card's Next goes */
  docs: string;
  models: string[];
  /** A line shown under the row (the offline row quotes the approved offline-license copy) */
  note?: string;
  /** The /start card: a few lines that run as pasted, and what they print */
  card?: { lang: string; code: string; expect: string };
  /** For agents (/platforms.json): where the avatar renders, where the conversation runs, and the credential */
  renders?: string;
  conversation?: string;
  credential?: string;
}

const both = ["essence-2", "expression-2"];

export const PLATFORMS: Platform[] = [
  {
    id: "web", want: "Put an avatar on a website", use: "Web embed", needs: "nothing",
    renders: "in the bitHuman cloud, or in the visitor's tab with WebGPU (render=local)", conversation: "on bitHuman's servers", credential: "none for a public agent; an embed token for a private one",
    first: EMBED_SNIPPET, docs: "/platforms/web", models: both,
    card: { lang: "html", code: EMBED_SNIPPET, expect: "A live avatar in your page that listens and answers. Allow the microphone when the browser asks." },
  },
  {
    id: "rest", want: "Call it from any backend", use: "REST API", needs: "API secret",
    renders: "in the bitHuman cloud", conversation: "on bitHuman's servers, or with your own provider keys", credential: "API secret, header api-secret",
    first: `curl -X POST https://api.bithuman.ai/v1/validate -H "api-secret: $BITHUMAN_API_SECRET"`,
    docs: "/platforms/rest", models: both,
    card: {
      lang: "bash",
      code: `export BITHUMAN_API_SECRET="<your API secret>"
curl -s -X POST https://api.bithuman.ai/v1/validate -H "api-secret: $BITHUMAN_API_SECRET"
# → {"valid":true}`,
      expect: "Your API secret works. The API quickstart continues with a talking video of a sample agent speaking your audio, in minutes, then an agent of your own.",
    },
  },
  {
    id: "python", want: "Render or stream from Python", use: "Python", needs: "API secret",
    renders: "on your machine: macOS (Apple silicon) or Linux x86_64 / arm64", conversation: "your code", credential: "API secret (BITHUMAN_API_SECRET)",
    first: `pip install "bithuman[expression-2]"`, docs: "/platforms/python", models: both,
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
      expect: "300 frames of 416×720 video: the 15 seconds of sample speech.",
    },
  },
  {
    id: "cli", want: "Run it from a terminal", use: "CLI (macOS arm64, Linux x86_64 / arm64)", needs: "sign-in",
    renders: "on your machine: macOS (Apple silicon) or Linux x86_64 / arm64", conversation: "bitHuman's voice chat, your own OpenAI account, or the local conversation brain (BITHUMAN_LOCAL=1)", credential: "bithuman login, or BITHUMAN_API_SECRET",
    first: "curl -fsSL https://install.bithuman.ai | sh", docs: "/platforms/cli", models: both,
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
    renders: "on the iPhone, iPad or Mac", conversation: "your app's own speech, language and voice services", credential: "API secret, fetched from your backend in a shipped app",
    first: `.package(url: "https://gitlab.com/bithuman/sdk/bithuman-swift", from: "${V.swift}")`,
    docs: "/platforms/ios", models: both,
  },
  {
    id: "android", want: "Ship an Android app", use: "Android", needs: "arm64 device, API secret",
    renders: "on the Android phone (arm64, a physical device)", conversation: "your app's own speech, language and voice services", credential: "API secret, fetched from your backend in a shipped app",
    first: `implementation("ai.bithuman:expression2-android:${V.expression2_android}")`,
    docs: "/platforms/android", models: both,
  },
  {
    id: "livekit", want: "Add a face to a LiveKit voice agent", use: "LiveKit", needs: "API secret",
    renders: "on your server (model_path) or in the bitHuman cloud", conversation: "your LiveKit agent", credential: "BITHUMAN_MASTER_SECRET on the worker; a minted token for a cloud avatar",
    first: 'pip install "livekit-agents[openai,silero]" livekit-plugins-bithuman python-dotenv', docs: "/platforms/livekit", models: both,
  },
  {
    id: "pipecat", want: "Add a face to a Pipecat voice bot", use: "Pipecat", needs: "API secret",
    renders: "in your bot's process, on your own Mac or Linux machine", conversation: "your Pipecat pipeline", credential: "BITHUMAN_API_SECRET in the bot's environment",
    first: 'pip install "pipecat-bithuman[expression-2]"', docs: "/platforms/pipecat", models: both,
  },
  {
    id: "mcp", want: "Drive it from Claude or Cursor", use: "MCP server", needs: "sign-in",
    first: "claude mcp add bithuman -- bithuman mcp", docs: "/build/mcp", models: both,
  },
  {
    id: "offline", want: "Run fully offline (kiosk, trade show, ATM)", use: "Fully offline",
    renders: "on your Linux and macOS computers", conversation: "agreed with sales for your site", credential: "a pack, redeemed once on the machine while it is online",
    needs: "Business or Enterprise plan; Essence 1 on Linux or an Apple silicon Mac, Essence 2 and Expression 2 on Linux x86_64",
    first: "Contact sales", docs: "/deploy/offline", models: ["essence-2", "expression-2", "essence-1"],
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
  /** Who supplies the conversation (listening, the replies, the voice), for the support matrix */
  conversation: string;
  /** The one thing to install (a command, shown as code, or a few words) */
  install: { code?: string; text?: string };
}

export const PLATFORM_PAGES: PlatformPage[] = [
  { id: "ios", title: "iOS & iPadOS", href: "/platforms/ios", icon: "phone", group: "Apps",
    line: "One Swift package. The avatar renders on the iPhone or iPad.", renders: ["device"], artifacts: ["swift"], conversation: "Your app sends speech audio", install: { text: "Swift Package Manager" } },
  { id: "macos", title: "macOS", href: "/platforms/macos", icon: "laptop", group: "Apps",
    line: "The same Swift package in a Mac app, or from a terminal with swift run.", renders: ["device"], artifacts: ["swift"], conversation: "Your app sends speech audio", install: { text: "Swift Package Manager" } },
  { id: "android", title: "Android", href: "/platforms/android", icon: "android", group: "Apps",
    line: "One Gradle dependency. The avatar renders on the phone.", renders: ["device"], artifacts: ["expression2_android", "essence2_android"], conversation: "Your app sends speech audio", install: { text: "Gradle, from maven.bithuman.ai" } },
  { id: "flutter", title: "Flutter", href: "/platforms/flutter", icon: "flutter", group: "Apps",
    line: "One plugin for a Flutter app. The avatar renders on the phone.", renders: ["device"], artifacts: ["flutter_plugin"], conversation: "Your app sends speech audio", install: { text: "A git dependency in pubspec.yaml" } },
  { id: "web", title: "Web", href: "/platforms/web", icon: "globe", group: "Apps",
    line: "One iframe on any page. The avatar renders in the cloud, or in the tab with WebGPU.", renders: ["cloud", "browser"], artifacts: [], conversation: "Included: bitHuman listens and answers", install: { text: "Nothing: one <iframe>" } },
  { id: "python", title: "Python", href: "/platforms/python", icon: "braces", group: "Code & terminal",
    line: "Open an avatar, push audio, get frames, on macOS, or on a Linux or Windows PC with no GPU.", renders: ["server", "no-gpu"], artifacts: ["python"], conversation: "Your code sends speech audio", install: { code: 'pip install "bithuman[expression-2]"' } },
  { id: "windows", title: "Windows", href: "/platforms/windows", icon: "windows", group: "Code & terminal",
    line: "Open an avatar, push audio, get frames on a Windows 11 PC, with no GPU.", renders: ["server", "no-gpu"], artifacts: ["python"], conversation: "Your code sends speech audio", install: { code: 'pip install "bithuman[expression-2]"' } },
  { id: "cli", title: "CLI", href: "/platforms/cli", icon: "terminal", group: "Code & terminal",
    line: "A live avatar or an MP4 from the terminal, on macOS or a Linux PC with no GPU.", renders: ["server", "no-gpu"], artifacts: ["cli"], conversation: "Included with bithuman run, or your own audio file", install: { code: "curl -fsSL https://install.bithuman.ai | sh" } },
  { id: "livekit", title: "LiveKit", href: "/platforms/livekit", icon: "wave", group: "Agents & APIs",
    line: "Give a LiveKit voice agent a face, rendered on your server or in the bitHuman cloud.", renders: ["server", "cloud"], artifacts: ["livekit_plugin"], conversation: "Your LiveKit agent", install: { code: "pip install livekit-plugins-bithuman" } },
  { id: "pipecat", title: "Pipecat", href: "/platforms/pipecat", icon: "chat", group: "Agents & APIs",
    line: "Give a Pipecat voice bot a face, rendered in the bot's own process.", renders: ["server", "no-gpu"], artifacts: [], conversation: "Your Pipecat pipeline", install: { code: 'pip install "pipecat-bithuman[expression-2]"' } },
  { id: "rest", title: "REST API", href: "/platforms/rest", icon: "code", group: "Agents & APIs",
    line: "Agents, live sessions and talking video over HTTPS.", renders: ["cloud"], artifacts: [], conversation: "Included (a bitHuman agent), or your own audio", install: { text: "Nothing: HTTPS from any language" } },
];

// ---------------------------------------------------------------- the quickstart picker
/** One platform in the /start picker: 3–4 copy-ready steps taken from the
 *  platform page's first frame, what you should see, and where to go next.
 *  Versions come from versions.json; nothing here states a speed or a price. */
export interface QuickstartStep {
  title: string;
  /** A code block (runs as pasted, or starts with an `excerpt:` comment) */
  code?: { lang: string; label: string; code: string };
  /** A sentence instead of, or under, the code */
  text?: string;
}
export interface Quickstart {
  id: "web" | "ios" | "macos" | "android" | "flutter" | "python" | "cli" | "livekit" | "rest" | "offline";
  /** The picker button */
  label: string;
  /** The panel heading */
  title: string;
  icon: string;
  needs: string[];
  models: string[];
  renders: import("./labels").Renders[];
  steps: QuickstartStep[];
  expect: { text: string; media?: { src?: string; poster: string; width: number; height: number; caption: string; captions?: string } };
  /** The page to continue on; a platform page opens at its #run-your-first-avatar (firstFrame()) */
  next: { href: string; label: string };
  /** The plan chip, when one is needed */
  plan?: "creator" | "business-enterprise";
  /** A line under the steps: where the avatar renders and what reaches bitHuman (S29), or the offline copy */
  note?: string;
}

const TWO = ["Essence 2", "Expression 2"];
const SECRET = `export BITHUMAN_API_SECRET="<your API secret>"`;
const PUP_IMX = `curl -fL -o wise-pup.imx "https://api.bithuman.ai/v1/agent/${pup.code}/model/download?model=expression-2"`;
const SPEECH = "curl -fsSLo speech.wav https://docs.bithuman.ai/samples/speech.wav";

export const QUICKSTART: Quickstart[] = [
  {
    id: "web", label: "Website", title: "A live avatar on your website", icon: "globe",
    needs: ["No account for the sample avatar"], models: TWO, renders: ["cloud", "browser"],
    steps: [
      { title: "Paste the embed into any page", code: { lang: "html", label: "HTML", code: EMBED_SNIPPET } },
      { title: "Open the page and allow the microphone", text: "The avatar appears, asks for the microphone and answers when you speak. The `wise-pup` sample ends each session after 2 minutes; embed your own agent for your site." },
      { title: "Render in the visitor's tab (optional)", text: "Add `?render=local` to the embed URL: with WebGPU the avatar renders in the tab, and a device that can't render it in real time shows a message instead of falling back to the cloud. The avatar's web bundle downloads once (50–200 MB), then comes from the cache." },
    ],
    // The still is the avatar the snippet above embeds (the Expression 2 sample), so what you paste and what you see match.
    expect: {
      text: "A live avatar in your page that listens and answers.",
      media: { poster: `${pup.poster}-480.webp`, width: 480, height: 600, caption: `${pup.slug}, the ${pup.modelName} sample avatar this embed opens.` },
    },
    next: { href: "/platforms/web", label: "Web embed" },
    note: "With the web embed the conversation runs on bitHuman's servers, including when the avatar renders in the tab.",
  },
  {
    id: "ios", plan: "creator", label: "iPhone & iPad", title: "An avatar inside your iPhone or iPad app", icon: "phone",
    needs: ["Xcode 26+", "Physical device", "API secret"], models: TWO, renders: ["device"],
    steps: [
      { title: "Add the Swift package", code: { lang: "swift", label: "Package.swift", code: `.package(url: "https://gitlab.com/bithuman/sdk/bithuman-swift", from: "${V.swift}")\n// then: .product(name: "Bithuman", package: "bithuman-swift")` } },
      { title: "Download the sample avatar", code: { lang: "bash", label: "Shell", code: `curl -fL -o ${pup.code}.imx "https://api.bithuman.ai/v1/agent/${pup.code}/model/download?model=expression-2"` }, text: "The iOS page also fetches the shared engine and a 16 kHz speech clip." },
      { title: "Feed audio, draw frames", code: { lang: "swift", label: "Swift", code: `// excerpt: the core loop; the complete first frame is on the iOS page\nimport Expression2\n\nExpression2Credential.set(apiSecret)\nlet engine = try Expression2Engine.create(\n    avatarContainer: avatarURL, sharedEngineContainer: sharedEngineURL, stagingDir: stagingURL)\nengine.feed(samples)      // [Float], 16 kHz mono\nengine.flushTail()        // end of the reply\nfor await frame in engine.frames(audioClock: { played() }) {\n    show(frame.bgr, frame.width, frame.height)\n    if frame.endsReply { break }\n}` } },
    ],
    expect: { text: "The avatar's lips follow the speech, rendered on the iPhone or iPad.", media: captureMedia("ios-expression-2") },
    next: { href: "/platforms/ios", label: "iOS & iPadOS" },
  },
  {
    id: "macos", plan: "creator", label: "Mac", title: "An avatar on your Mac", icon: "laptop",
    needs: ["Apple silicon", "Xcode 26+", "API secret"], models: TWO, renders: ["device"],
    steps: [
      { title: "Clone the macOS example", code: { lang: "bash", label: "Shell", code: "git clone https://github.com/bithuman-product/bithuman-examples.git\ncd bithuman-examples/swift/macos-expression2\n./setup.sh" } },
      { title: "Run it", code: { lang: "bash", label: "Shell", code: `${SECRET}\nswift run -c release MacOSExpression2` } },
    ],
    expect: { text: "Frames rendered from the sample speech, and out/first-frame.png on disk.", media: captureMedia("macos-expression-2") },
    next: { href: "/platforms/macos", label: "macOS" },
  },
  {
    id: "android", plan: "creator", label: "Android", title: "An avatar inside your Android app", icon: "android",
    needs: ["Physical device", "JDK 17", "API secret"], models: TWO, renders: ["device"],
    steps: [
      { title: "Add the repository and the dependency", code: { lang: "kotlin", label: "Gradle", code: `// excerpt: settings.gradle.kts and app/build.gradle.kts; the full setup is on the Android page\n// settings.gradle.kts\ndependencyResolutionManagement {\n    repositories {\n        google()\n        mavenCentral()\n        exclusiveContent {   // ai.bithuman resolves from bitHuman's repository only\n            forRepository { maven { url = uri("https://maven.bithuman.ai") } }\n            filter { includeGroup("ai.bithuman") }\n        }\n    }\n}\n// app/build.gradle.kts\nandroid {\n    defaultConfig { ndk { abiFilters += "arm64-v8a" } }\n    packaging { jniLibs { useLegacyPackaging = true } }   // required\n}\ndependencies {\n    implementation("ai.bithuman:expression2-android:${V.expression2_android}")\n}` } },
      { title: "Keep the API secret out of your source", text: "Put `bithuman.apiSecret=…` in your project's `local.properties` (git-ignored), or export `BITHUMAN_API_SECRET` before you build; the Gradle block on the Android page reads it into `BuildConfig`." },
      { title: "Feed audio, pull frames", code: { lang: "kotlin", label: "Kotlin", code: `// excerpt: off the main thread; pcm16k is 16 kHz mono float\nExpression2Credential.set(BuildConfig.BITHUMAN_API_SECRET)\nval model = Expression2ModelStore(context).fetch("${pup.code}")   // first run only\nExpression2Avatar.create(context, model, Expression2Options()).use { avatar ->\n    val frame = avatar.newFrameBitmap()\n    avatar.feed(pcm16k)\n    avatar.flushTail()\n    while (avatar.hasPendingTail || avatar.queuedFrames > 0) {\n        if (avatar.pull(frame) != null) show(frame) else Thread.sleep(10)\n    }\n}` } },
    ],
    expect: { text: "20 frames for each second of audio, with the avatar's lips following the speech.", media: captureMedia("android-expression-2") },
    next: { href: "/platforms/android", label: "Android" },
  },
  {
    id: "flutter", plan: "creator", label: "Flutter", title: "An avatar inside your Flutter app", icon: "flutter",
    needs: ["Physical device", "Dart 3.11.5+", "API secret"], models: TWO, renders: ["device"],
    steps: [
      { title: "Clone the example app", code: { lang: "bash", label: "Shell", code: "git clone https://github.com/bithuman-product/bithuman-examples.git\ncd bithuman-examples/app/avatar_chat\nflutter pub get" } },
      { title: "Run it on your phone", code: { lang: "bash", label: "Shell", code: `flutter run --release --dart-define=AGENT_CODE=${pup.code}` } },
      { title: "Add the plugin to your own app", code: { lang: "yaml", label: "pubspec.yaml", code: `dependencies:\n  bithuman: ^${V.flutter_plugin}` }, text: "Then, in `android/app/build.gradle.kts`, set `minSdk = 29`, `ndk { abiFilters += \"arm64-v8a\" }` and `packaging { jniLibs { useLegacyPackaging = true } }`; the Flutter page's Install section shows the block." },
    ],
    expect: { text: "The app asks for your API secret once, downloads the avatar on first run and shows it idling full screen. Speak, or type a line, and it answers with its lips in sync." },
    next: { href: "/platforms/flutter", label: "Flutter" },
  },
  {
    id: "python", plan: "creator", label: "Python", title: "Render from Python", icon: "braces",
    needs: ["Python 3.10+", "API secret"], models: TWO, renders: ["server", "no-gpu"],
    steps: [
      { title: "Install", code: { lang: "bash", label: "Shell", code: `python3 -m venv .venv && source .venv/bin/activate\npip install "bithuman[expression-2]"` } },
      { title: "Download the sample avatar and speech", code: { lang: "bash", label: "Shell", code: `${SECRET}\n${PUP_IMX}\n${SPEECH}` } },
      { title: "Render", code: { lang: "python", label: "Python", code: `import bithuman\n\nwith bithuman.open("wise-pup.imx") as avatar:\n    frames = [image for image in avatar.render("speech.wav")]\nprint(len(frames), "frames of", frames[0].shape)\n# → 300 frames of (720, 416, 3)` } },
    ],
    expect: { text: "300 frames of 416×720 video: the 15 seconds of sample speech. On Linux it runs on the CPU alone, with no GPU." },
    next: { href: "/platforms/python", label: "Python" },
  },
  {
    id: "cli", plan: "creator", label: "Terminal", title: "An avatar from your terminal", icon: "terminal",
    needs: ["macOS or Linux", "ffmpeg"], models: TWO, renders: ["server", "no-gpu"],
    steps: [
      { title: "Install the CLI", code: { lang: "bash", label: "Shell", code: "# macOS: brew tap bithuman/bithuman https://gitlab.com/bithuman/sdk/homebrew-bithuman && brew install bithuman/bithuman/bithuman-cli\ncurl -fsSL https://install.bithuman.ai | sh" } },
      { title: "Sign in", code: { lang: "bash", label: "Shell", code: "bithuman login" } },
      { title: "Render a talking video", code: { lang: "bash", label: "Shell", code: `${SPEECH}\nbithuman render wise-pup speech.wav -o out.mp4\n# → out.mp4: 416×720, 300 frames, 15.0 s` }, text: "`bithuman run wise-pup` opens a live conversation instead." },
    ],
    expect: { text: "out.mp4, 15 seconds of the avatar saying the sample. On Linux both models run on the CPU alone, with no GPU.", media: captureMedia("cli-linux") },
    next: { href: "/platforms/cli", label: "CLI" },
  },
  {
    id: "livekit", plan: "creator", label: "LiveKit", title: "A face for your LiveKit voice agent", icon: "wave",
    needs: ["A LiveKit project", "API secret"], models: TWO, renders: ["server", "cloud"],
    steps: [
      { title: "Install", code: { lang: "bash", label: "Shell", code: 'pip install "livekit-agents[openai,silero]" livekit-plugins-bithuman python-dotenv' } },
      { title: "Set the credentials", code: { lang: "bash", label: "Shell", code: `export BITHUMAN_MASTER_SECRET="<your API secret>"\nexport BITHUMAN_AGENT_ID=${pup.code}\nexport LIVEKIT_URL=wss://your-project.livekit.cloud\nexport LIVEKIT_API_KEY=… LIVEKIT_API_SECRET=…\nexport OPENAI_API_KEY=…` } },
      { title: "Run the worker", code: { lang: "bash", label: "Shell", code: "python agent.py dev\n# → join the room from the LiveKit Agents Playground; the avatar appears and answers" }, text: "Copy `agent.py`, a complete worker, from the LiveKit page." },
    ],
    expect: { text: "The avatar joins your LiveKit room as a participant and answers with its lips in sync." },
    next: { href: "/platforms/livekit", label: "LiveKit" },
  },
  {
    id: "rest", plan: "creator", label: "REST", title: "Call the REST API", icon: "code",
    needs: ["API secret"], models: TWO, renders: ["cloud"],
    steps: [
      { title: "Check your API secret", code: { lang: "bash", label: "Shell", code: `${SECRET}\ncurl -s -X POST https://api.bithuman.ai/v1/validate -H "api-secret: $BITHUMAN_API_SECRET"\n# → {"valid":true}` } },
      { title: "Render a sample agent speaking your audio", code: { lang: "bash", label: "Shell", code: `curl -s -X POST https://api.bithuman.ai/v1/video/generate \\\n  -H "api-secret: $BITHUMAN_API_SECRET" -H "Content-Type: application/json" \\\n  -d '{"model": "expression-2", "agent_code": "A23WJF0199", "input": {"type": "audio", "audio_url": "https://docs.bithuman.ai/samples/speech-16k-short.wav"}}'\n# → {"success": true, "job_id": "vid_…", "status": "processing"}` } },
    ],
    expect: { text: "{\"valid\":true}, then a job_id: poll GET /v1/video/{job_id} until it is completed and open video_url, the wise-pup sample speaking a 5-second sample clip (4 credits). The API quickstart continues with an agent of your own." },
    next: { href: "/platforms/rest", label: "REST API" },
  },
  {
    id: "offline", plan: "business-enterprise", label: "Kiosk / offline", title: "A kiosk, fully offline", icon: "offline",
    needs: ["Business or Enterprise plan", "Essence 1 on Linux (x86_64, ARM64) and Apple silicon Macs; Essence 2 and Expression 2 on Linux x86_64"],
    models: ["Essence 2", "Expression 2", "Essence 1"], renders: ["offline"],
    steps: [],
    expect: { text: "For a kiosk that stays online, the CLI renders both models live on a Linux PC with no GPU: pick Terminal." },
    next: { href: "/deploy/offline", label: "Fully offline" },
    note: OFFLINE_LICENSE_COPY,
  },
];

/** Where the picker's "Next" lands: a platform page at its first frame. */
export const firstFrame = (href: string) => (href.startsWith("/platforms/") && !href.includes("#") ? `${href}#run-your-first-avatar` : href);
