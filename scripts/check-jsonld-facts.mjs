#!/usr/bin/env node
// The prices, rates, plan names and platforms in the built JSON-LD are the
// ones the pricing data and the platform pages publish.
//
// WHY THIS EXISTS
// ---------------
// The site-wide Organization and SoftwareApplication (src/config/site-jsonld.ts,
// placed by src/layouts/Base.astro on every page) are what search engines and
// AI agents read first. The block they replaced said "Free tier available; low
// per-minute cost from 1 credit/min self-hosted" with a price of "0" for months
// after the plans changed, and no gate saw it: check-billing-consistency reads
// the docs pages, check-claims has no price or rate pattern. The generator now
// derives every figure from the data, but nothing stopped a typed figure from
// coming back, in the generator or in Base.astro. This gate does.
//
// WHAT IT CHECKS
//   Built (every JSON-LD node on every built page, changelog excepted):
//     1. every "N credits/min" or "N credits per minute" is a published
//        current-generation rate: on the device or your servers, in the
//        bitHuman cloud, or a managed agent's chat line (src/data/pricing.json,
//        the same source as /pricing and its calculator);
//     2. every "$N" is a plan price from src/data/plans.json, and "$1 = N
//        credits" has N = the top-up rate;
//     3. every price, lowPrice and highPrice of an Offer, AggregateOffer or
//        price specification is a plan price; an AggregateOffer's offerCount
//        is the number of offers it lists;
//     4. every "<Name> plan" or "<Name> tier" names a plan in plans.json, and
//        nothing offers a free plan, tier or trial;
//     5. the site-wide nodes name no platform the site does not publish as a
//        place bitHuman runs: no Windows or WSL (the docs send Windows users to
//        WSL2 until it ships), no NVIDIA or CUDA (on the site NVIDIA is only
//        the bitHuman cloud's GPU), no Raspberry Pi or Jetson; and macOS is
//        "macOS (Apple silicon)", as every macOS page requires.
//   Source (src/config/site-jsonld.ts and src/layouts/Base.astro): no typed
//     rate, dollar amount, offer price field or plan name. "$1 = ${…}" is the
//     top-up unit, whose count is read from the data, and is allowed.
//
//   node scripts/check-jsonld-facts.mjs            # source, and dist/ when built
//   node scripts/check-jsonld-facts.mjs --built    # dist/ must be built
//   node scripts/check-jsonld-facts.mjs --selftest # every rule fires on a fixture
//
// Pure Node, no deps. Exit 1 on any finding.
import { readFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import { builtJsonLd, jsonLdNodes, strings, nodeText } from "./jsonld.mjs";

const ROOT = join(import.meta.dirname, "..");
const readJson = (p) => JSON.parse(readFileSync(join(ROOT, p), "utf8"));
const GENERATOR = "src/config/site-jsonld.ts";
const SOURCES = [GENERATOR, "src/layouts/Base.astro"];

const genSrc = readFileSync(join(ROOT, GENERATOR), "utf8");
const idOf = (name) => {
  const m = new RegExp(`${name} = "([^"]+)"`).exec(genSrc);
  if (!m) throw new Error(`${GENERATOR} no longer declares ${name}; this gate reads the site-wide @ids from it`);
  return m[1];
};
const SITE_IDS = new Set([idOf("ORGANIZATION_ID"), idOf("SOFTWARE_ID")]);

/** The published figures, read the way src/lib/doc-blocks.ts reads them. */
export function published(plans = readJson("src/data/plans.json"), pricing = readJson("src/data/pricing.json")) {
  const rt = pricing.realtime;
  const rate = (table) => {
    const by = rt[table].by_model;
    const r = by["essence-2"]?.rate;
    if (typeof r !== "number" || r !== by["expression-2"]?.rate) throw new Error(`pricing.json: ${table} rates for essence-2 and expression-2 differ or are missing`);
    return r;
  };
  const rates = new Map([[rate("self_hosted"), "on the device or your servers"], [rate("hosted"), "in the bitHuman cloud"]]);
  for (const line of ["chat_line", "camera_chat_line"]) if (typeof rt.hosted[line]?.rate === "number") rates.set(rt.hosted[line].rate, line.replace(/_/g, " "));
  const prices = new Set(plans.plans.flatMap((p) => [p.monthly_usd, p.yearly_usd]).filter((n) => typeof n === "number"));
  return { rates, prices, names: new Set(plans.plans.map((p) => p.name)), creditsPerUsd: plans.topup.credits_per_usd };
}

const RATE = /(\d+(?:\.\d+)?)\s*credits?\s*(?:\/\s*min(?:ute)?|per\s+min(?:ute)?)\b/gi;
const DOLLAR = /\$\s?(\d[\d,]*(?:\.\d+)?)/g;
const TOPUP = /^\s*=\s*(\d[\d,]*)\s*credits?\b/;
/** A capitalised word before "plan" or "tier" that is not a plan's name. */
const PLAN_WORD = /\b([A-Z][A-Za-z]+) (?:plans?|tier)\b/g;
const NOT_A_NAME = new Set(["The", "A", "An", "Any", "Every", "Each", "Your", "This", "That", "Which", "Our", "Their", "One", "Paid", "Monthly", "Yearly", "Annual", "Higher", "Same"]);
const FREE = /\bfree (?:plan|tier|trial)s?\b/i;
const OFF_SITE = /\bWindows\b|\bWSL2?\b|\bNVIDIA\b|\bCUDA\b|\bRaspberry Pi\b|\bJetson\b/gi;
const PRICED = new Set(["Offer", "AggregateOffer", "PriceSpecification", "UnitPriceSpecification", "CompoundPriceSpecification"]);
const num = (s) => Number(String(s).replace(/,/g, ""));

/** The findings in one JSON-LD node. */
export function gradeNode(node, facts = published()) {
  const out = [];
  const site = SITE_IDS.has(node?.["@id"]);
  for (const s of strings(node)) {
    for (const m of s.matchAll(RATE)) {
      if (!facts.rates.has(num(m[1]))) out.push(`"${m[0]}" is not a published rate (${[...facts.rates].map(([n, w]) => `${n} ${w}`).join(", ")})`);
    }
    for (const m of s.matchAll(DOLLAR)) {
      const topup = TOPUP.exec(s.slice(m.index + m[0].length));
      if (topup) {
        if (num(m[1]) !== 1 || num(topup[1]) !== facts.creditsPerUsd) out.push(`"${m[0]}${topup[0]}" is not the top-up rate ($1 = ${facts.creditsPerUsd} credits)`);
      } else if (!facts.prices.has(num(m[1]))) out.push(`"${m[0]}" is not a plan price in plans.json`);
    }
    for (const m of s.matchAll(PLAN_WORD)) {
      if (!facts.names.has(m[1]) && !NOT_A_NAME.has(m[1])) out.push(`"${m[0]}" names no plan in plans.json (${[...facts.names].join(", ")})`);
    }
    const free = FREE.exec(s);
    if (free) out.push(`"${free[0]}": there is no free plan, tier or trial`);
    if (site) for (const m of s.matchAll(OFF_SITE)) out.push(`"${m[0]}" in the site-wide ${node["@type"]}: the site does not publish it as a platform bitHuman runs on`);
  }
  if (site && typeof node.operatingSystem === "string" && /\bmacOS\b(?! \(Apple silicon\))/.test(node.operatingSystem)) {
    out.push(`operatingSystem "${node.operatingSystem}" names macOS without "(Apple silicon)"; Intel Macs are not supported`);
  }
  const walk = (v) => {
    if (Array.isArray(v)) return v.forEach(walk);
    if (!v || typeof v !== "object") return;
    if (PRICED.has(v["@type"])) {
      for (const k of ["price", "lowPrice", "highPrice"]) {
        if (k in v && !facts.prices.has(num(v[k]))) out.push(`${v["@type"]} ${k} ${JSON.stringify(v[k])} is not a plan price in plans.json`);
      }
      if (v["@type"] === "AggregateOffer" && Array.isArray(v.offers) && "offerCount" in v && num(v.offerCount) !== v.offers.length) out.push(`AggregateOffer offerCount ${v.offerCount} but it lists ${v.offers.length} offer(s)`);
    }
    Object.values(v).forEach(walk);
  };
  walk(node);
  return out;
}

/** Typed figures in a generator source. */
export function gradeSource(text) {
  const out = [];
  text.split("\n").forEach((line, i) => {
    if (/^\s*(\/\/|\*|\/\*)/.test(line)) return; // comments
    const code = line.replace(/\s\/\/.*$/, "");
    const at = `line ${i + 1}`;
    for (const m of code.matchAll(RATE)) out.push(`${at}: typed rate "${m[0]}"; read it from the pricing data (calcData())`);
    for (const m of code.matchAll(DOLLAR)) {
      if (m[1] === "1" && /^\s*=\s*\$\{/.test(code.slice(m.index + m[0].length))) continue; // "$1 = ${…} credits": the top-up unit
      out.push(`${at}: typed dollar amount "${m[0]}"; read it from plans.json`);
    }
    for (const m of code.matchAll(/\b(?:price|lowPrice|highPrice|offerCount)\s*:\s*["']?\d/g)) out.push(`${at}: typed offer figure "${m[0]}"; read it from plans.json`);
    for (const m of code.matchAll(PLAN_WORD)) if (!NOT_A_NAME.has(m[1])) out.push(`${at}: typed plan name "${m[0]}"; read it from plans.json`);
    const free = FREE.exec(code);
    if (free) out.push(`${at}: "${free[0]}": there is no free plan, tier or trial`);
  });
  return out;
}

function selftest() {
  const f = published();
  const [device, cloud] = [...f.rates.keys()];
  const plan = readJson("src/data/plans.json").plans[0];
  const soft = [...SITE_IDS].find((id) => id.endsWith("#software"));
  const ld = (o) => jsonLdNodes(`<script type="application/ld+json">${JSON.stringify({ "@graph": [o] })}</script>`)[0];
  const sw = (extra) => ld({ "@type": "SoftwareApplication", "@id": soft, ...extra });
  let bad = 0;
  const ok = (name, cond) => { console.log(`  ${cond ? "PASS" : "FAIL"}  ${name}`); if (!cond) bad++; };
  const fires = (name, node, n = 1) => ok(`fires on ${name}`, gradeNode(node, f).length >= n);
  fires("a hand-typed rate: \"from 1 credit/min self-hosted\"", sw({ description: "Low per-minute cost, from 1 credit/min self-hosted." }));
  fires("a rate in words: \"3 credits per minute\"", sw({ featureList: ["Cloud avatars at 3 credits per minute."] }));
  fires("a plan that does not exist: \"Free plan: $0 a month\" (plan and price)", sw({ description: `Free plan: $0 a month, ${device} credits/min self-hosted.` }), 2);
  fires("\"Free tier available\"", sw({ offers: { "@type": "AggregateOffer", description: "Free tier available." } }));
  fires("a plan name plans.json does not have: \"Starter plan\"", sw({ offers: { "@type": "Offer", name: "Starter plan" } }));
  fires("a wrong top-up rate: \"$1 = 50 credits\"", sw({ description: `Credit top-ups: $1 = ${f.creditsPerUsd / 2} credits.` }));
  fires("an offer priced 0", sw({ offers: { "@type": "AggregateOffer", lowPrice: 0, highPrice: plan.monthly_usd, offerCount: 1, offers: [{ "@type": "Offer", price: "0", priceCurrency: "USD" }] } }), 2);
  fires("an offerCount that is not the offers listed", sw({ offers: { "@type": "AggregateOffer", lowPrice: plan.monthly_usd, highPrice: plan.monthly_usd, offerCount: 4, offers: [{ "@type": "Offer", price: plan.monthly_usd }] } }));
  fires("the old NVIDIA wording in the site node: \"Runs on CPU, NVIDIA GPU, and Apple Silicon.\"", sw({ description: "Runs on CPU, NVIDIA GPU, and Apple Silicon." }));
  fires("a Windows claim in the site node: \"Runs natively on Windows.\"", sw({ description: "Runs natively on Windows." }));
  fires("Raspberry Pi OS in the site node's operatingSystem", sw({ operatingSystem: "iOS, Android, Linux, Raspberry Pi OS" }));
  fires("macOS without Apple silicon in operatingSystem", sw({ operatingSystem: "iOS, macOS, Linux" }));
  ok("quiet on a clean site node built from the data", gradeNode(sw({
    operatingSystem: "iOS, iPadOS, Android, macOS (Apple silicon), Linux, Web browser",
    featureList: [...f.rates.keys()].map((n) => `${n} credits/min`),
    offers: {
      "@type": "AggregateOffer", lowPrice: plan.monthly_usd, highPrice: plan.monthly_usd, offerCount: 1,
      description: `From 2026-10-12, API and SDK use requires the ${plan.name} plan or higher. ${device} credits/min on the device, ${cloud} in the cloud. Credit top-ups: $1 = ${f.creditsPerUsd} credits.`,
      offers: [{ "@type": "Offer", name: `${plan.name} plan`, price: plan.monthly_usd, priceSpecification: { "@type": "UnitPriceSpecification", price: plan.monthly_usd }, description: `$${plan.monthly_usd} a month` }],
    },
  }), f).length === 0);
  ok("a page's own node may name the cloud's NVIDIA GPU (the platform rule is for the site-wide nodes)", gradeNode(ld({ "@type": "TechArticle", "@id": "https://docs.bithuman.ai/deploy/cloud#article", description: "Rendered on NVIDIA GPUs in the bitHuman cloud." }), f).length === 0);
  const src = (s) => gradeSource(s).length;
  ok("source: a typed rate fires", src(`  description: "from 1 credit/min self-hosted",`) === 1);
  ok("source: a typed dollar amount fires", src(`  description: "Free: $0 a month",`) >= 1);
  ok("source: a typed offer price fires", src(`    lowPrice: 20,`) === 1);
  ok("source: a typed plan name fires", src(`  name: "Creator plan",`) === 1);
  ok("source: the top-up unit with its count read from the data is quiet", src("`Credit top-ups: $1 = ${d.credits_per_usd} credits.`") === 0);
  ok("source: a plan name read from the data is quiet", src("name: `${p.name} plan`, price: p.monthly_usd,") === 0);
  ok("source: a comment is quiet", src(`// the old block said "Free tier available; 1 credit/min" and $0`) === 0);
  console.log(bad ? "selftest RED" : "selftest GREEN (every rule fired, no finding on the clean controls)");
  return bad ? 1 : 0;
}

function main() {
  if (process.argv.includes("--selftest")) return selftest();
  const facts = published();
  const faults = [];
  for (const rel of SOURCES) {
    if (!existsSync(join(ROOT, rel))) continue;
    for (const x of gradeSource(readFileSync(join(ROOT, rel), "utf8"))) faults.push(`${rel} ${x}`);
  }
  const dist = join(ROOT, "dist");
  const built = existsSync(join(dist, "index.html"));
  let graded = 0;
  if (!built && process.argv.includes("--built")) faults.push("dist/ is not built; run npm run build first (--built)");
  if (built) {
    const ld = builtJsonLd(dist, { root: ROOT, skip: (rel) => /(^|\/)changelog(\/|\.html$)/.test(rel) });
    faults.push(...ld.faults);
    const siteNodes = ld.nodes.filter((n) => SITE_IDS.has(n.node?.["@id"]));
    if (!siteNodes.some((n) => n.node["@id"].endsWith("#software"))) faults.push("dist/ is built but no page carries the site-wide SoftwareApplication; the reader of the head moved, refusing to pass");
    graded = ld.nodes.length;
    for (const n of ld.nodes) for (const x of gradeNode(n.node, facts)) faults.push(`${n.page} JSON-LD (${n.type}): ${x}`);
    if (graded && !ld.nodes.some((n) => nodeText(n.node).match(RATE))) console.log("note: no JSON-LD node states a per-minute rate");
  }
  for (const x of faults) console.log(`::error::${x}`);
  console.log(faults.length
    ? `jsonld facts: ${faults.length} finding(s)`
    : `jsonld facts ok: ${SOURCES.join(" and ")} type no figure${graded ? `; ${graded} built JSON-LD node(s) state only published rates, plan prices and plan names` : ""}`);
  return faults.length ? 1 : 0;
}
process.exit(main());
