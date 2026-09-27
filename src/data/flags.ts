// Features built and shipped dark until the owner decides (docs spec §8).
// Each flag defaults off; turning one on is a one-line change here.
//
// O2 (docs demo sessions): the owner approved live demos per model, paid by
// bitHuman and bounded on the page. Two demo modes wait on the rest of O2:
//   demoInTab   "Render in this tab": the demo avatar renders in the visitor's
//               tab with WebGPU (`render=local`), after a GPU check and with the
//               one-time download size shown first.
//   demoMirror  "Mirror": the avatar lip-syncs the visitor's own microphone in
//               the tab, with no conversation (`rendering_mode=avatar`); whether
//               it bills is not decided.
// O3 (API try-it): a first-party proxy or CORS on api.bithuman.ai. Until then
// the API reference offers copy-ready curl, Python and Node samples only.
export const FLAGS = {
  demoInTab: false,
  demoMirror: false,
  apiTryIt: false,
} as const;
