// The four deployment modes, in the fixed vocabulary (docs spec §2.1), and
// CPU only (no GPU): Your servers on a Linux PC with no GPU, shown as a note
// beside the modes, never as a fifth one. The home cards, /deploy and the mode
// pages read these. Rates come from pricing.json and the data flow from
// dataflows.ts; neither is typed here.
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
  /** Which real-time rate applies: pricing.json's hosted or self-hosted table, or sales */
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
    id: "offline", name: "Fully offline", href: "/deploy/offline", anchor: "fully-offline", icon: "offline", plan: "business-enterprise", rate: "sales",
    line: "Real-time avatars off the internet, on Linux and macOS computers.",
    surfaces: "Linux PCs and terminals, Macs with Apple silicon (Python)",
    models: "Essence 1 (Linux x86_64 and ARM64, macOS on Apple silicon); Essence 2 and Expression 2 later",
  },
];

/** The note beside the modes: Your servers on a Linux PC with no GPU. It has
 *  its own page (/deploy/cpu), which the ```dataflow and ```price blocks draw. */
export const CPU_ONLY: Deployment = {
  id: "cpu", name: "CPU only (no GPU)", href: "/deploy/cpu", anchor: "cpu-only-no-gpu", icon: "cpu", plan: "creator", rate: "self_hosted",
  line: "Both models run live on a standard Linux PC with no GPU.",
  surfaces: "CLI, Python SDK on Linux x86_64 or arm64",
  models: "Essence 2, Expression 2, Essence 1",
};

/** A mode, or the CPU-only note, by id. */
export const deploymentById = (id: string): Deployment | undefined => [...DEPLOYMENTS, CPU_ONLY].find((d) => d.id === id);
