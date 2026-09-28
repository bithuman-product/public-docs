#!/usr/bin/env node
// Offline copy is the owner-approved sentence, word for word (docs spec §5.2):
// every mention of the offline license is either in a section that carries the
// verbatim sentence together with the terms line (OFFLINE_LICENSE_TERMS), or it links to the page that does. The sentence itself lives once,
// in src/data/offline.ts; code imports it and never types it.
//
//   node scripts/check-offline-copy.mjs            # markdown, code, and (when built) twins, llms and JSON-LD
//   node scripts/check-offline-copy.mjs --selftest
import { readFileSync, readdirSync, statSync, existsSync } from "node:fs";
import { join, relative } from "node:path";
import { builtJsonLd, jsonLdNodes, strings } from "./jsonld.mjs";

const ROOT = join(import.meta.dirname, "..");
const src = readFileSync(join(ROOT, "src/data/offline.ts"), "utf8");
const SENTENCE = /OFFLINE_LICENSE_SENTENCE =\s*"([^"]+)"/.exec(src)[1];
const TERMS = /OFFLINE_LICENSE_TERMS = "([^"]+)"/.exec(src)[1];
/** The pages that carry the full offline copy; a mention may link to one of them instead. */
const HOMES = /\((?:https:\/\/docs\.bithuman\.ai)?\/(?:deploy\/offline|deploy#fully-offline|pricing#offline-licensing)\)|href="\/(?:deploy\/offline|deploy#fully-offline|pricing#offline-licensing)"/;
const MENTION = /offline licen[cs]e/i;
/** A statement about the license (what it is, covers or includes), however it is
 *  worded ("offline license", "licenses", "licensing"). The approved sentence
 *  is the only one allowed; the topic word alone ("plans, offline licensing,
 *  and how to check your balance") is not a statement. */
const CLAIM = /\boffline licen[cs](?:e|es|ing)\s+(?:is|are|comes?|covers?|includes?|included|works?|runs?|supports?|also|available)\b[^.\n]*[.\n]?/gi;
const COPY = `${SENTENCE} ${TERMS}`;

/** Markdown: the block is the H2 section. */
export function gradeMarkdown(text) {
  const faults = [];
  const parts = text.split(/^(?=## )/m);
  for (const part of parts) {
    if (!MENTION.test(part)) continue;
    const verbatim = part.includes(SENTENCE) && part.includes(TERMS);
    if (verbatim) continue;
    for (const line of part.split("\n")) {
      if (MENTION.test(line) && !HOMES.test(line)) faults.push(`"${line.trim().slice(0, 120)}" names the offline license without the approved sentence in its section or a link to it`);
    }
  }
  // a paraphrase: a statement about the license that is not the approved sentence
  for (const m of text.matchAll(CLAIM)) {
    if (!text.slice(m.index).startsWith(SENTENCE)) faults.push(`a paraphrase of the offline sentence: "${m[0].trim().slice(0, 120)}"`);
  }
  return faults;
}

/** JSON-LD: each string value (a featureList item, a description) is its own
 *  section, so the approved copy in one item cannot vouch for an altered claim
 *  beside it. A string that names the license is the approved copy, verbatim;
 *  with the copy taken out, nothing left in it may name the license again. */
export function gradeJsonLdNode(node) {
  const faults = [];
  for (const s of strings(node)) {
    const rest = s.split(COPY).join(" ");
    if (rest !== s && MENTION.test(rest) && !HOMES.test(rest)) faults.push(`"${s.trim().slice(0, 120)}" names the offline license again beside the approved copy in the JSON-LD; the copy is the only wording allowed`);
    faults.push(...gradeMarkdown(s));
  }
  return faults;
}

/** Code: the sentence is typed only in src/data/offline.ts; other code imports it. */
export function gradeCode(text) {
  const faults = [];
  for (const line of text.split("\n")) {
    if (/^\s*(\/\/|\*|\/\*)/.test(line)) continue; // comments
    if (MENTION.test(line) && !HOMES.test(line)) faults.push(`"${line.trim().slice(0, 120)}" types offline-license copy; import it from src/data/offline.ts`);
    if (line.includes("Offline license is only available")) faults.push(`the offline sentence is typed here; import OFFLINE_LICENSE_SENTENCE instead`);
    else if (line.match(CLAIM)) faults.push(`"${line.trim().slice(0, 120)}" types a statement about the offline license; import the approved copy from src/data/offline.ts`);
  }
  return faults;
}

function selftest() {
  let bad = 0;
  const ok = (name, cond) => { console.log(`  ${cond ? "PASS" : "FAIL"}  ${name}`); if (!cond) bad++; };
  ok("a section with the verbatim copy passes", gradeMarkdown(`## Offline\n\n${SENTENCE} ${TERMS}\n\nIt needs no offline license.\n`).length === 0);
  ok("a mention with a link passes", gradeMarkdown(`## X\n\nSee the [offline license](/deploy#fully-offline).\n`).length === 0);
  ok("a bare mention fires", gradeMarkdown(`## X\n\nBuy an offline license for kiosks.\n`).length === 1);
  ok("the sentence without the terms fires", gradeMarkdown(`## X\n\n${SENTENCE} Offline license terms vary.\n`).length > 0);
  ok("a paraphrase fires", gradeMarkdown(`## X\n\nOffline license is only available to Enterprise clients.\n`).length > 0);
  ok("code that types the copy fires", gradeCode(`const x = "an offline license for kiosks";`).length === 1);
  ok("code that types a statement about offline licensing fires", gradeCode(`const x = "Offline licensing is included with every plan.";`).length === 1);
  ok("the topic word alone is not a statement", gradeMarkdown(`## X\n\nRates, plans, offline licensing, and how to check your balance.\n`).length === 0);
  ok("a comment is not copy", gradeCode(`// the offline license copy lives in offline.ts`).length === 0);
  const ld = (o) => jsonLdNodes(`<script type="application/ld+json">${JSON.stringify({ "@graph": [o] })}</script>`)[0];
  ok("a JSON-LD node quoting the approved copy passes", gradeJsonLdNode(ld({ featureList: ["Runs everywhere.", `${SENTENCE} ${TERMS}`] })).length === 0);
  ok("a JSON-LD node that names the license without the copy fires", gradeJsonLdNode(ld({ featureList: ["An offline license for kiosks, from sales."] })).length > 0);
  ok("a JSON-LD node that paraphrases the copy fires", gradeJsonLdNode(ld({ description: "Offline license is only available to Enterprise clients." })).length > 0);
  ok("the approved copy in one JSON-LD item does not vouch for an altered one beside it", gradeJsonLdNode(ld({ description: "Offline license is available to every plan, on Windows and macOS too.", featureList: [COPY] })).length > 0);
  ok("an altered claim in the same JSON-LD string as the approved copy fires", gradeJsonLdNode(ld({ featureList: [`${COPY} An offline license also covers Windows PCs.`] })).length > 0);
  ok("\"offline licensing is …\" is a statement too (markdown)", gradeMarkdown(`## X\n\nOffline licensing is included with every plan, Windows PCs too.\n`).length > 0);
  ok("\"offline licensing is …\" is a statement too (JSON-LD, beside the approved copy)", gradeJsonLdNode(ld({ description: "Offline licensing is included with every plan, Windows PCs too.", featureList: [COPY] })).length > 0);
  ok("the approved copy alone in a JSON-LD item passes", gradeJsonLdNode(ld({ description: "Realtime avatars.", featureList: ["Runs everywhere.", COPY] })).length === 0);
  console.log(bad ? "selftest RED" : "selftest GREEN (every rule fired)");
  return bad ? 1 : 0;
}

function main() {
  if (process.argv.includes("--selftest")) return selftest();
  const walk = (d) => (existsSync(d) ? readdirSync(d).flatMap((n) => { const p = join(d, n); return statSync(p).isDirectory() ? walk(p) : [p]; }) : []);
  const faults = [];
  let n = 0;
  for (const f of walk(join(ROOT, "src"))) {
    const rel = relative(ROOT, f);
    if (/changelog(\/|\.md$)/.test(rel) || rel === "src/data/offline.ts") continue;
    const text = readFileSync(f, "utf8");
    if (/\.mdx?$/.test(f)) { n++; for (const x of gradeMarkdown(text)) faults.push(`${rel}: ${x}`); }
    else if (/\.(astro|ts|mjs)$/.test(f)) { n++; for (const x of gradeCode(text)) faults.push(`${rel}: ${x}`); }
  }
  const dist = join(ROOT, "dist");
  if (existsSync(join(dist, "llms.txt"))) {
    for (const f of walk(dist).filter((f) => /\.md$|llms[^/]*\.txt$|\/llms\/[^/]+\.txt$/.test(f))) {
      const rel = relative(ROOT, f);
      if (/changelog/.test(rel)) continue;
      n++;
      for (const x of gradeMarkdown(readFileSync(f, "utf8"))) faults.push(`${rel}: ${x}`);
    }
  }
  // each page's JSON-LD, every distinct node once
  let nodes = 0;
  if (existsSync(join(dist, "index.html"))) {
    const ld = builtJsonLd(dist, { root: ROOT, skip: (rel) => /changelog/.test(rel) });
    faults.push(...ld.faults);
    if (!ld.nodes.length) faults.push("dist/ is built but no page carries JSON-LD — the reader of the head moved; refusing to pass");
    nodes = ld.nodes.length;
    for (const node of ld.nodes) for (const x of gradeJsonLdNode(node.node)) faults.push(`${node.page} JSON-LD (${node.type}): ${x}`);
  }
  for (const f of faults) console.log(`::error::${f}`);
  console.log(faults.length ? `offline copy: ${faults.length} finding(s)` : `offline copy ok: ${n} files${nodes ? ` and ${nodes} JSON-LD node(s)` : ""}; every offline-license mention carries the approved sentence or links to it`);
  return faults.length ? 1 : 0;
}
process.exit(main());
