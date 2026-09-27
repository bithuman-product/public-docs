// Where each deployment mode renders the avatar, where the conversation runs,
// and what reaches bitHuman. Every cell cites the PLAN_v2 SAFE claim (S row)
// it states; nothing here goes beyond those rows. /deploy, the mode pages and
// /deploy/privacy draw it (the ```dataflow and ```deploy-matrix blocks).
//
// No imports, so scripts can load this file with Node alone.

export type ModeId = "cloud" | "servers" | "device" | "cpu" | "offline";

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
