#!/usr/bin/env node
// Offline copy is the owner-approved sentence, word for word (docs spec §5.2):
// every mention of the offline license is either in a section that carries the
// verbatim sentence together with "Linux PCs and terminals; arranged through
// sales", or it links to the page that does. The sentence itself lives once,
// in src/data/offline.ts; code imports it and never types it.
//
//   node scripts/check-offline-copy.mjs            # markdown, code, and (when built) twins + llms
//   node scripts/check-offline-copy.mjs --selftest
import { readFileSync, readdirSync, statSync, existsSync } from "node:fs";
import { join, relative } from "node:path";

const ROOT = join(import.meta.dirname, "..");
const src = readFileSync(join(ROOT, "src/data/offline.ts"), "utf8");
const SENTENCE = /OFFLINE_LICENSE_SENTENCE =\s*"([^"]+)"/.exec(src)[1];
const TERMS = /OFFLINE_LICENSE_TERMS = "([^"]+)"/.exec(src)[1];
/** The pages that carry the full offline copy; a mention may link to one of them instead. */
const HOMES = /\((?:https:\/\/docs\.bithuman\.ai)?\/(?:deploy\/offline|deploy#fully-offline|pricing#offline-licensing)\)|href="\/(?:deploy\/offline|deploy#fully-offline|pricing#offline-licensing)"/;
const MENTION = /offline licen[cs]e/i;

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
  // a paraphrase: the sentence's opening words with a different ending
  for (const m of text.matchAll(/Offline license is only available to[^.\n]*[.\n]/g)) {
    if (!text.slice(m.index).startsWith(SENTENCE)) faults.push(`a paraphrase of the offline sentence: "${m[0].trim().slice(0, 120)}"`);
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
  ok("a comment is not copy", gradeCode(`// the offline license copy lives in offline.ts`).length === 0);
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
  for (const f of faults) console.log(`::error::${f}`);
  console.log(faults.length ? `offline copy: ${faults.length} finding(s)` : `offline copy ok: ${n} files; every offline-license mention carries the approved sentence or links to it`);
  return faults.length ? 1 : 0;
}
process.exit(main());
