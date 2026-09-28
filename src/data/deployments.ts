// The five places an avatar can render, in the fixed vocabulary (docs spec
// §2.1): four deployment modes plus the CPU-only hardware lens. The home
// cards, /deploy and the mode pages read this list. Rates come from
// pricing.json and the data flow from dataflows.ts; neither is typed here.
//
// No imports, so scripts can load this file with Node alone.

import type { ModeId } from "./dataflows.ts";

export interface Deployment {
  id: ModeId;
  name: string;
  /** The mode's own page (a card never targets an anchor) */
  href: string;
  /** Its section on /deploy */
  anchor: string;
  /** One line for cards */
  line: string;
  icon: string;
  plan: "creator" | "business-enterprise";
  /** The products that deploy here */
  surfaces: string;
  /** The models available here, by name */
  models: string;
  /** Which realtime rate applies: pricing.json's hosted or self-hosted table, or sales */
  rate: "hosted" | "self_hosted" | "sales";
}

export const DEPLOYMENTS: Deployment[] = [
  {
    id: "cloud", name: "bitHuman cloud", href: "/deploy/cloud", anchor: "bithuman-cloud", icon: "cloud", plan: "creator", rate: "hosted",
    line: "bitHuman renders the avatar and streams it: the web embed, the REST API or LiveKit.",
    surfaces: "web embed, REST API, LiveKit plugin, cloud avatar in your room",
    models: "Essence 2, Expression 2, Essence 1, Expression 1",
  },
  {
    id: "servers", name: "Your servers", href: "/deploy/self-hosted", anchor: "your-servers-self-hosted", icon: "server", plan: "creator", rate: "self_hosted",
    line: "The CLI, Python or the LiveKit plugin on your own Mac or Linux machines.",
    surfaces: "CLI, Python SDK, LiveKit plugin (`model_path`)",
    models: "Essence 2, Expression 2, Essence 1",
  },
  {
    id: "device", name: "On the device", href: "/deploy/on-device", anchor: "on-the-device", icon: "devices", plan: "creator", rate: "self_hosted",
    line: "Inside your app on iPhone, iPad, Mac or Android, or in a WebGPU browser tab.",
    surfaces: "Swift package, Android SDK, Flutter plugin, web embed with `render=local`",
    models: "Essence 2, Expression 2",
  },
  {
    id: "cpu", name: "CPU only (no GPU)", href: "/deploy/cpu", anchor: "cpu-only-no-gpu", icon: "cpu", plan: "creator", rate: "self_hosted",
    line: "Both models run live on a standard Linux PC with no GPU.",
    surfaces: "CLI, Python SDK on Linux x86_64 or arm64",
    models: "Essence 2, Expression 2, Essence 1",
  },
  {
    id: "offline", name: "Fully offline", href: "/deploy/offline", anchor: "fully-offline", icon: "offline", plan: "business-enterprise", rate: "sales",
    line: "Realtime avatars off the internet, on Linux PCs and terminals.",
    surfaces: "Linux PCs and terminals",
    models: "Essence 1 (Linux x86_64 and ARM64); Essence 2 and Expression 2 later",
  },
];
