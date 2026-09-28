// Where each deployment mode renders the avatar, where the conversation runs,
// and what reaches bitHuman. Every cell cites the PLAN_v2 SAFE claim (S row)
// it states; nothing here goes beyond those rows. /deploy, the mode pages and
// /deploy/privacy draw it (the ```dataflow and ```deploy-matrix blocks).
//
// No imports, so scripts can load this file with Node alone.

export type ModeId = "cloud" | "servers" | "device" | "cpu" | "offline";

/** What reaches bitHuman when an app renders the avatar on the device (S30), in
 *  the pages' own words: the "What reaches bitHuman" card and the site-wide
 *  JSON-LD quote it. "Never leaves" is never said without this qualifier. */
export const DEVICE_METERING_ONLY =
  "When the avatar renders in your app on the device and you use your own voice and language services, bitHuman receives usage metering only, never audio, video or conversation text.";
/** The line web privacy copy always carries (STYLE.md, Claims). */
export const WEB_EMBED_CONVERSATION =
  "With the web embed, the conversation runs on bitHuman's servers, even when the avatar renders in the tab.";

export interface DataFlow {
  /** Where the avatar renders */
  renders: string;
  /** Where the conversation (speech recognition, language model, voice) runs */
  conversation: string;
  /** What reaches bitHuman while a session runs */
  reaches: string;
  /** What the network must do */
  network: string;
  /** The S rows these cells state */
  claims: string[];
}

export const DATAFLOWS: Record<ModeId, DataFlow> = {
  cloud: {
    renders: "on bitHuman's servers, in the US",
    conversation: "on bitHuman's voice service, or with your own provider keys",
    reaches: "the session's audio and conversation, to run it",
    network: "required for the whole session",
    claims: ["S14", "S15", "S25"],
  },
  servers: {
    renders: "on your own Mac or Linux machines",
    conversation: "your choice: the CLI's local conversation brain, your own services, or bitHuman's",
    reaches: "a credential check, the avatar download, and usage reports with no audio, video or text",
    network: "to start; rendering continues through a drop of up to 5 minutes",
    claims: ["S4", "S5", "S6", "S7", "S9", "S10"],
  },
  device: {
    renders: "on the iPhone, iPad, Mac or Android phone in front of the user, or in a WebGPU browser tab",
    conversation: "your app's choice; with the web embed, on bitHuman's servers",
    reaches: "with your own voice and language services, usage metering only, never audio, video or conversation text",
    network: "to start; rendering continues through a drop of up to 5 minutes",
    claims: ["S1", "S8", "S10", "S24", "S29", "S30"],
  },
  cpu: {
    renders: "on a standard Linux PC's CPU, with no GPU",
    conversation: "your choice: the CLI's local conversation brain, your own services, or bitHuman's",
    reaches: "a credential check, the avatar download, and usage reports with no audio, video or text",
    network: "to start; rendering continues through a drop of up to 5 minutes",
    claims: ["S3", "S4", "S5", "S10"],
  },
  offline: {
    renders: "on your Linux PCs and terminals",
    conversation: "agreed with sales for your site",
    reaches: "usage is metered on the machine; no reconnection is required",
    network: "off the internet; creating the avatar happens online first",
    claims: ["S11", "S12", "S21"],
  },
};

// ---------------------------------------------------------------- what crosses the boundary
// /deploy/privacy's "What leaves your hardware" explorer (docs spec §4.2 #12):
// for each mode, where each kind of data goes. Every cell cites the S row it
// states. The exact fields of a usage report are not listed (owner question Q8).

export type DataKind = "portrait" | "model" | "audio" | "video" | "transcripts" | "knowledge" | "provider-keys" | "secret" | "usage";
export type FlowMode = ModeId | "web-local";
/** out: reaches bitHuman · stays: stays on your hardware · yours: your own services · in: comes from bitHuman · bh: already at bitHuman */
export type Direction = "out" | "stays" | "yours" | "in" | "bh";

export const DATA_KINDS: { id: DataKind; name: string }[] = [
  { id: "portrait", name: "Portrait" },
  { id: "model", name: "Avatar model file" },
  { id: "audio", name: "Live audio" },
  { id: "video", name: "Avatar video" },
  { id: "transcripts", name: "Transcripts" },
  { id: "knowledge", name: "Knowledge and persona" },
  { id: "provider-keys", name: "Provider keys" },
  { id: "secret", name: "API secret" },
  { id: "usage", name: "Usage reports" },
];

/** The four deployment modes, then two variants that change what crosses:
 *  CPU only (Your servers on a PC with no GPU) and the web embed with render=local. */
export const FLOW_MODES: { id: FlowMode; name: string }[] = [
  { id: "cloud", name: "bitHuman cloud" },
  { id: "servers", name: "Your servers" },
  { id: "device", name: "On the device" },
  { id: "offline", name: "Fully offline" },
  { id: "cpu", name: "CPU only (no GPU)" },
  { id: "web-local", name: "Web embed, render=local" },
];

export interface Crossing { dir: Direction; text: string; claim: string }

const PORTRAIT: Crossing = { dir: "out", text: "uploaded once to the bitHuman cloud, where the avatar is created", claim: "S21" };
const SELF_HOST: Record<DataKind, Crossing> = {
  portrait: PORTRAIT,
  model: { dir: "in", text: "downloads once, then renders on your machine", claim: "S21" },
  audio: { dir: "yours", text: "goes where the conversation runs: nowhere with the CLI's local conversation brain, or to your services or bitHuman's", claim: "S4, S6" },
  video: { dir: "stays", text: "stays on your machine", claim: "S4" },
  transcripts: { dir: "stays", text: "none stored at bitHuman", claim: "S9" },
  knowledge: { dir: "yours", text: "where the conversation runs; any OpenAI-compatible model works, including one in your own network", claim: "S7" },
  "provider-keys": { dir: "yours", text: "stay with the services you run", claim: "S7" },
  secret: { dir: "stays", text: "on your machine; checked when a session starts", claim: "S10" },
  usage: { dir: "out", text: "reach bitHuman, with no audio, video, images or conversation text", claim: "S5" },
};

export const CROSSINGS: Record<FlowMode, Record<DataKind, Crossing>> = {
  cloud: {
    portrait: PORTRAIT,
    model: { dir: "bh", text: "stays in the bitHuman cloud, where the avatar renders, in the US", claim: "S14" },
    audio: { dir: "out", text: "reaches bitHuman to run the session, encrypted in transit", claim: "S14, S15" },
    video: { dir: "in", text: "rendered by bitHuman and streamed to your viewer", claim: "S14" },
    transcripts: { dir: "bh", text: "kept with the agent; deleting the agent deletes them", claim: "S18" },
    knowledge: { dir: "bh", text: "your persona lives with the managed agent; deleting the agent deletes its records", claim: "S18, S25" },
    "provider-keys": { dir: "out", text: "encrypted at rest when you connect them", claim: "S15" },
    secret: { dir: "stays", text: "on your server; browsers get scoped embed tokens", claim: "S17" },
    usage: { dir: "bh", text: "bitHuman meters the session it runs: active session time, talking or idle", claim: "S20" },
  },
  servers: SELF_HOST,
  cpu: { ...SELF_HOST, video: { dir: "stays", text: "renders on the PC's CPU and stays there", claim: "S3, S4" } },
  device: {
    portrait: PORTRAIT,
    model: { dir: "in", text: "downloads once; on Android, usage reporting is then the only traffic", claim: "S8" },
    audio: { dir: "yours", text: "goes to the voice and language services your app uses; with your own, bitHuman receives none", claim: "S24, S30" },
    video: { dir: "stays", text: "renders on the device; bitHuman never receives it", claim: "S30" },
    transcripts: { dir: "stays", text: "none stored at bitHuman", claim: "S9" },
    knowledge: { dir: "yours", text: "stays with your app and the services it uses", claim: "S24" },
    "provider-keys": { dir: "yours", text: "stay with your app and the services it uses", claim: "S24" },
    secret: { dir: "stays", text: "held by your app; checked when a session starts", claim: "S10" },
    usage: { dir: "out", text: "usage metering only, never audio, video or conversation text", claim: "S30" },
  },
  offline: {
    portrait: PORTRAIT,
    model: { dir: "stays", text: "runs on the machine; creating the avatar happens online first", claim: "S21" },
    audio: { dir: "stays", text: "stays on the machine, off the internet", claim: "S11" },
    video: { dir: "stays", text: "stays on the machine", claim: "S11" },
    transcripts: { dir: "stays", text: "stay on the machine", claim: "S11" },
    knowledge: { dir: "stays", text: "agreed with sales for your site", claim: "S11" },
    "provider-keys": { dir: "stays", text: "agreed with sales for your site", claim: "S11" },
    secret: { dir: "stays", text: "arranged through sales, for Business & Enterprise", claim: "S11" },
    usage: { dir: "stays", text: "metered on the machine; no required reconnection", claim: "S11" },
  },
  "web-local": {
    portrait: PORTRAIT,
    model: { dir: "in", text: "the avatar's web bundle downloads to the browser", claim: "S1" },
    audio: { dir: "out", text: "reaches bitHuman: the conversation runs on bitHuman's servers", claim: "S29" },
    video: { dir: "stays", text: "renders in the visitor's tab with WebGPU", claim: "S1" },
    transcripts: { dir: "bh", text: "the conversation runs on bitHuman's servers", claim: "S29" },
    knowledge: { dir: "bh", text: "your persona lives with the managed agent", claim: "S25, S29" },
    "provider-keys": { dir: "out", text: "encrypted at rest when you connect them", claim: "S15" },
    secret: { dir: "stays", text: "never in the browser: the embed uses scoped tokens", claim: "S17" },
    usage: { dir: "bh", text: "bitHuman meters the session: active session time, talking or idle", claim: "S20" },
  },
};
