#!/usr/bin/env node
// Docs v2 (SPEC §1.8, W7 POLISH 3): A HUB'S .md TWIN HAS ITS PAGE'S HEADINGS.
// A twin equals its page body; the one exemption is the platform "Continue" bundle
// (§7), which is not a hub. The hubs are the pages whose twin is generated rather than
// served from their own source (src/pages/[...slug].md.ts): the final acceptance of
// 2026-09-30 found all seven differing — /start's twin said "Choose your platform"
// where the page says "Talk to an avatar / Get your API secret / Pick your platform".
// Graded on the BUILT page and the BUILT twin: the H2s inside <main> (the step number
// and the layout's "Next steps" foot excluded) against the twin's `## ` lines outside
// code fences, in order.
//
//   node scripts/check-hub-twins.mjs            grade every hub in dist/
//   node scripts/check-hub-twins.mjs --selftest
// EXIT 0 all match · 1 a twin differs · 2 could not run
import { readFileSync, readdirSync, statSync, existsSync } from "node:fs";
import { join } from "node:path";
import { routeOf } from "./content-routes.mjs";

const ROOT = join(import.meta.dirname, "..");
const CONTENT = join(ROOT, "src/content/docs");
/** the drawn (.astro) hubs and the landing; content hubs are read off their `type: hub` */
export const DRAWN = ["/", "/start", "/platforms", "/build", "/resources", "/api/reference"];
const unesc = (s) => s.replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&#39;|&#x27;/g, "'").replace(/&quot;/g, '"');

export function pageH2(html) {
  const main = (/<main[\s\S]*<\/main>/.exec(html) || [html])[0];
  return [...main.matchAll(/<h2\b([^>]*)>([\s\S]*?)<\/h2>/g)]
    .filter((m) => !/id="next-steps-title"/.test(m[1]))
    .map((m) => unesc(m[2].replace(/<span class="step"[^>]*>[\s\S]*?<\/span>/g, "").replace(/<[^>]+>/g, "")).replace(/\s+/g, " ").trim());
}
export function twinH2(md) {
  let fence = false;
  const out = [];
  for (const l of md.split("\n")) {
    if (/^\s*(```|~~~)/.test(l)) { fence = !fence; continue; }
    if (!fence && /^## /.test(l)) out.push(l.slice(3).trim());
  }
  return out;
}
export function grade(html, md) {
  const a = pageH2(html), b = twinH2(md);
  return a.join("\n") === b.join("\n") ? [] : [`page H2s [${a.join(" | ")}] ≠ twin H2s [${b.join(" | ")}]`];
}

function selftest() {
  let bad = 0;
  const ok = (name, cond) => { console.log(`  ${cond ? "PASS" : "FAIL"}  ${name}`); bad += cond ? 0 : 1; };
  const page = '<main><h2 id="a"><span class="step" data-astro-cid-x>1</span> Talk to an avatar</h2><h2>Get &amp; go</h2><h2 id="next-steps-title">Next steps</h2></main>';
  ok("matching headings pass (step number, entity and Next steps foot ignored)", grade(page, "# T\n\n## Talk to an avatar\n\ntext\n\n## Get & go\n").length === 0);
  ok("the /start twin of 2026-09-30 fails", grade(page, "## Choose your platform\n## Pick your platform and run it\n## Get started\n").length === 1);
  ok("an extra twin heading (a page list) fails", grade(page, "## Talk to an avatar\n## Get & go\n## Pages in this section\n").length === 1);
  ok("a heading inside a code fence is not a heading", grade(page, "## Talk to an avatar\n## Get & go\n```md\n## not one\n```\n").length === 0);
  ok("order matters", grade(page, "## Get & go\n## Talk to an avatar\n").length === 1);
  console.log(bad ? "selftest RED" : "selftest GREEN (every arm fired)");
  return bad ? 1 : 0;
}

const walk = (d) => readdirSync(d).flatMap((n) => { const p = join(d, n); return statSync(p).isDirectory() ? walk(p) : n.endsWith(".md") ? [p] : []; });

function main() {
  if (process.argv.includes("--selftest")) return selftest();
  const dist = join(ROOT, "dist");
  if (!existsSync(join(dist, "index.html"))) { console.log("::error::dist/ missing: build first"); return 2; }
  const routes = new Set(DRAWN);
  for (const f of walk(CONTENT)) {
    const md = readFileSync(f, "utf8");
    const fm = (/^---\n([\s\S]*?)\n---/.exec(md) || [])[1] || "";
    if (/^draft:\s*true/m.test(fm)) continue;
    if (/^type:\s*"?hub"?\s*$/m.test(fm)) routes.add(routeOf(CONTENT, f, md));
  }
  let failing = 0;
  for (const r of [...routes].sort()) {
    const html = join(dist, r.slice(1), "index.html"), twin = join(dist, r === "/" ? "index.md" : `${r.slice(1)}.md`);
    if (!existsSync(html) || !existsSync(twin)) { console.log(`::error::${r}: page or twin not built`); failing++; continue; }
    const faults = grade(readFileSync(html, "utf8"), readFileSync(twin, "utf8"));
    if (faults.length) { failing++; for (const x of faults) console.log(`::error::${r} ${x}`); }
    else console.log(`  ok ${r} (${pageH2(readFileSync(html, "utf8")).length} H2s)`);
  }
  if (routes.size < 8) { console.log(`::error::graded only ${routes.size} hubs — the corpus moved`); return 2; }
  console.log(`hub twins: ${routes.size} hubs; ${failing} with headings that differ from their page`);
  return failing ? 1 : 0;
}
process.exit(main());
