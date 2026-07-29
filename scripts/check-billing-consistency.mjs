#!/usr/bin/env node
// Billing-consistency checker for the docs content.
//
// WHY THIS EXISTS
// ---------------
// `GET /v2/credit-summaries` returns `minutes_estimate`: the caller's balance
// floor-divided by each serving mode's credits/min rate. We document that
// object with worked JSON examples on two pages. Those examples are the
// numbers a customer reads to decide whether they can afford a session, so a
// stale one is a customer-facing billing error, not a typo.
//
// They rot in a specific way: someone updates the rate table on
// guides/pricing.md and the example JSON keeps the OLD arithmetic, or a new
// model ships and its key never reaches the examples. Nothing resolves the two
// against each other, exactly as nothing resolved internal links before
// check-internal-links.mjs.
//
// So: guides/pricing.md's serving table is the declared source of truth for
// rates (the page says so itself — "This page is the single source for every
// billing number on the platform"). This script re-derives every documented
// minutes_estimate value from that table and fails if they disagree.
//
// WHAT IT CHECKS
//   1. Every ```json example containing `minutes_estimate` parses as JSON.
//   2. Every value == floor(balance / rate), rate taken from the pricing table.
//   3. The key set is exactly: <model>_cloud/<model>_self_hosted for every
//      model in the table, + voice_chat/camera_chat, + the four retained
//      unversioned legacy aliases. A missing key means a model shipped without
//      reaching the docs; an unknown key means the docs invented one.
//   4. The legacy unversioned aliases (essence_cloud, essence_self_hosted,
//      expression_cloud, expression_self_hosted) carry the FIRST-generation
//      value. They are the documented 2x/4x over-estimate trap, so if they ever
//      silently start meaning Essence 2 the docs must not keep saying they
//      don't.
//
// Pure Node, no deps. Exit 1 on any disagreement.
//
// Not in scope: whether the pricing table itself matches the live `pricing`
// table in the database. CI has no DB credentials, so this checker deliberately
// verifies INTERNAL consistency only. The rates were last reconciled against
// the live schedule on 2026-07-28 (essence_2 4/2, essence_2_max 8/4,
// expression_2 4/2, essence_1 2/1, expression_1 4/2, voice 10, camera 30).

import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";

const ROOT = new URL("..", import.meta.url).pathname;
const CONTENT = join(ROOT, "src/content/docs");
const PRICING = join(CONTENT, "guides/pricing.md");

// The four unversioned keys the API still returns. Documented as aliases of the
// first-generation rows — NOT the Essence 2 rate.
const LEGACY_ALIASES = {
  essence_cloud: "essence_1_cloud",
  essence_self_hosted: "essence_1_self_hosted",
  expression_cloud: "expression_1_cloud",
  expression_self_hosted: "expression_1_self_hosted",
};

const failures = [];

function walk(dir, exts) {
  const out = [];
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    const st = statSync(p);
    if (st.isDirectory()) out.push(...walk(p, exts));
    else if (exts.some((e) => name.endsWith(e))) out.push(p);
  }
  return out;
}

// --- 1. Parse the declared rate table out of guides/pricing.md -------------
// Serving table rows look like:
//   | [Essence 2](/concepts/essence-2) (`essence-2`) | 4 credits/min | 2 credits/min |
// The model KEY comes from the backticked model id, so a label reword can't
// silently repoint a rate.
function parseRates(md) {
  const rates = {};

  // Matched on the leading word only. The heading's trailing wording is prose
  // that legitimately changes (it read "credits per active minute" until the
  // 2026-07-28 idle-billing correction); binding the checker to the full string
  // would turn an editorial tweak into a confusing parse failure and hide the
  // real check behind it.
  const serving = section(md, /^Serving\b/);
  if (serving === null) {
    failures.push(
      `guides/pricing.md: could not find a "## Serving …" section — ` +
        `the rate table is the source of truth for every example on the site`
    );
    return rates;
  }
  const ROW = /^\|(.+?)\|\s*([\d.]+)\s*credits?\/min\s*\|\s*([\d.]+)\s*credits?\/min\s*\|/gm;
  let m;
  while ((m = ROW.exec(serving)) !== null) {
    const id = /`([a-z0-9-]+)`/.exec(m[1]);
    if (!id) continue; // header/separator rows and any prose row
    const key = id[1].replace(/-/g, "_");
    rates[`${key}_cloud`] = Number(m[2]);
    rates[`${key}_self_hosted`] = Number(m[3]);
  }

  // Managed conversational agents — a single-rate table keyed by surface name,
  // living in the same section, below the per-model table.
  const AGENT = /^\|\s*Managed agent[^|]*?\|\s*([\d.]+)\s*credits?\/min\s*\|/gm;
  const agentKeys = [];
  while ((m = AGENT.exec(serving)) !== null) agentKeys.push(m);
  for (const row of agentKeys) {
    const label = row[0].toLowerCase();
    if (label.includes("voice")) rates.voice_chat = Number(row[1]);
    else if (label.includes("camera")) rates.camera_chat = Number(row[1]);
  }
  for (const k of ["voice_chat", "camera_chat"]) {
    if (!(k in rates)) {
      failures.push(
        `guides/pricing.md: no managed-agent rate row resolved to \`${k}\` — ` +
          `the managed-agent table drives the ${k} estimate`
      );
    }
  }
  return rates;
}

// Return the text of a "## <title>" section, up to the next "## ".
// `title` is a RegExp tested against the heading text.
function section(md, title) {
  const lines = md.split("\n");
  const start = lines.findIndex((l) => l.startsWith("## ") && title.test(l.slice(3).trim()));
  if (start === -1) return null;
  let end = lines.length;
  for (let i = start + 1; i < lines.length; i++) {
    if (lines[i].startsWith("## ")) {
      end = i;
      break;
    }
  }
  return lines.slice(start, end).join("\n");
}

const pricingMd = readFileSync(PRICING, "utf8");
const rates = parseRates(pricingMd);
const expectedKeys = new Set([...Object.keys(rates), ...Object.keys(LEGACY_ALIASES)]);

// --- 2. Check every documented minutes_estimate example --------------------
const JSON_BLOCK = /```json\n([\s\S]*?)```/g;
let examples = 0;
let assertions = 0;

for (const f of walk(CONTENT, [".md", ".mdx"])) {
  const text = readFileSync(f, "utf8");
  const rel = relative(ROOT, f);
  let m;
  JSON_BLOCK.lastIndex = 0;
  while ((m = JSON_BLOCK.exec(text)) !== null) {
    if (!m[1].includes("minutes_estimate")) continue;
    const line = text.slice(0, m.index).split("\n").length;

    let doc;
    try {
      doc = JSON.parse(m[1]);
    } catch (e) {
      failures.push(`${rel}:${line}: minutes_estimate example is not valid JSON — ${e.message}`);
      continue;
    }
    const data = doc.data ?? doc;
    const est = data.minutes_estimate;
    const balance = data.balance;
    if (est === undefined) continue;
    examples++;

    if (typeof balance !== "number") {
      failures.push(
        `${rel}:${line}: example has minutes_estimate but no numeric \`balance\` — ` +
          `the estimates cannot be checked against anything`
      );
      continue;
    }

    // 2a. every documented key must be one we can derive
    for (const [k, v] of Object.entries(est)) {
      if (!expectedKeys.has(k)) {
        failures.push(
          `${rel}:${line}: minutes_estimate key \`${k}\` is not a documented serving mode ` +
            `(no such row in the pricing table, and not a known legacy alias)`
        );
        continue;
      }
      const rate = k in LEGACY_ALIASES ? rates[LEGACY_ALIASES[k]] : rates[k];
      if (rate === undefined) continue; // already reported by parseRates
      const want = Math.floor(balance / rate);
      assertions++;
      if (v !== want) {
        failures.push(
          `${rel}:${line}: minutes_estimate.${k} = ${v}, but balance ${balance} ` +
            `÷ ${rate} credits/min = ${want}`
        );
      }
    }

    // 2b. no documented serving mode may be missing from the example
    for (const k of expectedKeys) {
      if (!(k in est)) {
        failures.push(
          `${rel}:${line}: minutes_estimate is missing \`${k}\` — the API returns one key ` +
            `per serving mode, so an example that omits one teaches callers it isn't there`
        );
      }
    }

    // 2c. the legacy aliases must still mean the first-generation models
    for (const [legacy, canonical] of Object.entries(LEGACY_ALIASES)) {
      if (legacy in est && canonical in est && est[legacy] !== est[canonical]) {
        failures.push(
          `${rel}:${line}: legacy alias \`${legacy}\` (${est[legacy]}) no longer equals ` +
            `\`${canonical}\` (${est[canonical]}) — the docs promise it is a first-generation alias`
        );
      }
    }
  }
}

if (examples === 0) {
  failures.push(
    "no minutes_estimate examples found at all — this checker would pass vacuously, " +
      "which is indistinguishable from it not running"
  );
}

// --- 3. Report -------------------------------------------------------------
if (failures.length) {
  console.error(`Found ${failures.length} billing-consistency problem(s):\n`);
  for (const msg of failures) {
    console.error(`  ${msg}`);
    console.error(`    ::error::${msg}`);
  }
  console.error(
    `\nRates in play (from guides/pricing.md):\n  ` +
      Object.entries(rates)
        .sort()
        .map(([k, v]) => `${k} = ${v} credits/min`)
        .join("\n  ")
  );
  process.exit(1);
}

console.log(
  `OK — ${examples} minutes_estimate example(s) agree with the pricing table ` +
    `(${assertions} value(s) re-derived, ${Object.keys(rates).length} rates parsed).`
);
