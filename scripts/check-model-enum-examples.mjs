#!/usr/bin/env node
// Model-enum consistency checker for the published OpenAPI spec.
//
// WHY THIS EXISTS
// ---------------
// The `model` enums in src/openapi/bithuman.yaml are hand-maintained here, in a
// DIFFERENT repo from the API that enforces them, and they have now drifted from
// the code's accepted sets three times. The third, on 2026-07-29, was
// customer-visible and fixed by hand: the spec's worked examples and cURL
// samples were advertising `essence-2-quality`, which POST /v1/video/generate
// had begun 400-rejecting. A caller who copies our example gets an error.
//
// WHAT THIS SCRIPT CAN AND CANNOT CHECK
//   CAN  — INTERNAL consistency: every `model` value the spec SHOWS (a schema
//          `example:`, a `"model": "..."` in an x-codeSamples body, a `?model=`
//          in a sample URL) must be a member of the `model` enum declared by the
//          SAME endpoint. One source of truth per endpoint: the enum. Nothing is
//          duplicated here, so this file cannot itself go stale.
//   CANNOT — whether the ENUM matches the code's accepted set. That comparison
//          needs both repos in one checkout, and the API lives in a PRIVATE repo
//          this public one holds no token for. It runs on the platform side, in
//          the `model-enum-drift` job of .github/workflows/audit-tests.yml
//          there, against a checkout of this repo
//          (services/public-api-service/test_model_enum_docs_sync.py).
//
// The two halves are complementary, and neither is sufficient: the platform job
// compares ENUMS ONLY and never looks at an example, so an example advertising a
// rejected model passes it; this script never sees the code, so an enum that
// drifts wholesale (enum and examples wrong together) passes here. Together they
// close the path from "the code accepts X" to "every model string a customer can
// read is X".
//
// Deliberately dependency-free (matching check-internal-links.mjs and
// check-billing-consistency.mjs): a line-oriented pass over the spec, not a YAML
// parse. The enums are single-line flow sequences, and an endpoint block is a
// 2-space-indented `/path:` key. If either shape ever changes, this script
// reports finding no enums at all and exits non-zero rather than passing
// vacuously.
//
// Exit 1 on any disagreement.

import { readFileSync } from "node:fs";

const ROOT = new URL("..", import.meta.url).pathname;
const SPEC = `${ROOT}src/openapi/bithuman.yaml`;

const lines = readFileSync(SPEC, "utf8").split("\n");

// ── split the spec into endpoint blocks: `  /v1/...:` at exactly 2 spaces ─────
const blocks = [];
lines.forEach((line, i) => {
  const m = /^ {2}(\/\S*):\s*$/.exec(line);
  if (m) blocks.push({ path: m[1], start: i, end: lines.length });
});
for (let i = 0; i < blocks.length - 1; i++) blocks[i].end = blocks[i + 1].start;

// An ENGINE name identifies an enum as a model enum. `auto` alone does not:
// /v1/files/upload's `type` enum is [auto, image, video, audio, document], and
// treating that as a model enum would quietly widen what an example on that
// endpoint may say. It IS a legal model VALUE though (agent-generate and
// dynamics both accept it), so it stays in the set of values to check.
// Voice / TTS models (`tts-1`) are a different namespace with no enum to resolve
// against, and deliberately out of scope.
const ENGINE = /^(essence|expression|seedance|kling)(-|$)/;
const MODELISH = new RegExp(`${ENGINE.source}|^auto$`);

const failures = [];
let enumsFound = 0;

for (const block of blocks) {
  const body = lines.slice(block.start, block.end);

  // every `enum: [a, b, c]` in this endpoint whose members look like models
  const allowed = new Set();
  for (const line of body) {
    const m = /enum:\s*\[([^\]]*)\]/.exec(line);
    if (!m) continue;
    const members = m[1].split(",").map((s) => s.trim().replace(/^["']|["']$/g, ""));
    if (members.some((v) => ENGINE.test(v))) {
      enumsFound++;
      for (const v of members) allowed.add(v);
    }
  }
  if (allowed.size === 0) continue; // no model enum here → nothing to resolve against

  const check = (value, lineNo, what) => {
    if (!MODELISH.test(value)) return; // not a model string
    if (allowed.has(value)) return;
    failures.push(
      `${block.path}: ${what} \`${value}\` (line ${lineNo}) is not in this ` +
        `endpoint's model enum [${[...allowed].sort().join(", ")}] — a caller who ` +
        `copies it gets a 400. Fix the example, or the enum if the API really ` +
        `accepts it (in which case the platform-side cross-check needs to agree).`
    );
  };

  body.forEach((line, j) => {
    const lineNo = block.start + j + 1;
    // schema example:  `example: "essence-2-max"` / `example: expression`
    const ex = /^\s*example:\s*["']?([A-Za-z0-9._-]+)["']?\s*$/.exec(line);
    if (ex) check(ex[1], lineNo, "example");
    // request/response body JSON in a description or x-codeSamples
    for (const m of line.matchAll(/"model"\s*:\s*"([^"]+)"/g)) {
      check(m[1], lineNo, 'a `"model"` sample value');
    }
    // `?model=<v>` in a sample URL
    for (const m of line.matchAll(/[?&]model=([A-Za-z0-9._-]+)/g)) {
      check(m[1], lineNo, "a `?model=` sample value");
    }
  });
}

if (enumsFound === 0) {
  console.error(
    "check-model-enum-examples: found NO model enums in src/openapi/bithuman.yaml.\n" +
      "The spec's shape must have changed (flow-style `enum: [...]` under a\n" +
      "2-space-indented `/path:` key). Refusing to pass vacuously — a checker\n" +
      "that silently stops checking is worse than no checker."
  );
  process.exit(1);
}

if (failures.length) {
  console.error(
    `check-model-enum-examples: ${failures.length} documented model value(s) ` +
      `outside their endpoint's enum:\n`
  );
  for (const f of failures) console.error(` - ${f}`);
  process.exit(1);
}

console.log(
  `check-model-enum-examples: OK — every documented model example is a member ` +
    `of its endpoint's enum (${enumsFound} model enum(s) across ` +
    `${blocks.length} endpoints).`
);
