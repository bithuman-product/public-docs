#!/usr/bin/env node
// Docs v2 (SPEC §1 "Say it once and link to it", §8): NO COPIED SENTENCES. A sentence
// of 9 or more words that appears on more than 2 pages is boilerplate: it gets one
// home and a link. Graded on the built .md twins (what readers and agents get,
// partials expanded), prose only (code, tables and headings excluded).
// Ruled partials that must stay word for word on every carrier (the offline copy,
// the Essence 2 Max sentence, shared facts) sit in scripts/boilerplate-allowlist.json,
// each with a reason. Report-only in docs v2 W2a: W4 removes the copies and flips it.
//
//   node scripts/check-boilerplate.mjs            grade dist/ (fails once FAIL is on)
//   node scripts/check-boilerplate.mjs --report   list every copied sentence, exit 0
//   node scripts/check-boilerplate.mjs --selftest
import { readFileSync, readdirSync, statSync, existsSync } from "node:fs";
import { join, relative } from "node:path";

const ROOT = join(import.meta.dirname, "..");
const DIST = join(ROOT, "dist");
const ALLOW = join(ROOT, "scripts/boilerplate-allowlist.json");
const MIN_WORDS = 9, MAX_PAGES = 2;
const FAIL = true; // docs v2 W4: the copies have one home each (report-only in W2a)

/** prose sentences of one markdown twin, normalised */
export function sentences(md) {
  const out = [];
  let inCode = false;
  // A split platform's twin ends with a "Continue" bundle that inlines its app and
  // troubleshooting pages (SPEC §7): those sentences belong to the pages it inlines.
  md = md.replace(/\n## Continue\n[\s\S]*$/, "\n");
  for (const raw of md.replace(/^---\n[\s\S]*?\n---\n?/, "").split("\n")) {
    if (/^\s*(```|~~~)/.test(raw)) { inCode = !inCode; continue; }
    if (inCode || /^\s*(#|\||<)/.test(raw)) continue;
    const t = raw.replace(/^\s*(>|[-*+]|\d+\.)\s*/, "").replace(/!?\[([^\]]*)\]\([^)]*\)/g, "$1").replace(/[*_`]/g, "");
    for (const s of t.split(/(?<=[.!?])\s+(?=[A-Z0-9"“(])/)) {
      const n = s.trim().replace(/\s+/g, " ");
      if (n.split(" ").length >= MIN_WORDS) out.push(n);
    }
  }
  return out;
}

/** sentence → pages, for sentences on more than MAX_PAGES pages and not allowlisted */
export function copies(pages, allow = []) {
  const where = new Map();
  for (const [page, md] of pages) for (const s of new Set(sentences(md))) {
    if (!where.has(s)) where.set(s, new Set());
    where.get(s).add(page);
  }
  const allowed = (s) => allow.some((a) => s.includes(a.match));
  return [...where].filter(([s, p]) => p.size > MAX_PAGES && !allowed(s)).map(([s, p]) => ({ sentence: s, pages: [...p].sort() }));
}

function selftest() {
  let bad = 0;
  const ok = (name, cond) => { console.log(`  ${cond ? "PASS" : "FAIL"}  ${name}`); bad += cond ? 0 : 1; };
  const long = "Every avatar renders live on the device you already own today.";
  ok("a long sentence on 3 pages fires", copies([["/a", long], ["/b", long], ["/c", long]]).length === 1);
  ok("on 2 pages it passes", copies([["/a", long], ["/b", long]]).length === 0);
  ok("a short sentence never fires", copies([["/a", "Short one here."], ["/b", "Short one here."], ["/c", "Short one here."]]).length === 0);
  ok("code is not prose", copies([["/a", "```\n" + long + "\n```"], ["/b", "```\n" + long + "\n```"], ["/c", "```\n" + long + "\n```"]]).length === 0);
  ok("an allowlisted partial passes", copies([["/a", long], ["/b", long], ["/c", long]], [{ match: "renders live on the device", reason: "x" }]).length === 0);
  ok("a platform twin's Continue bundle is not a copy", copies([["/a", long], ["/b", "x\n\n## Continue\n\n" + long], ["/c", "y\n\n## Continue\n\n" + long]]).length === 0);
  ok("link syntax does not hide a copy", copies([["/a", long], ["/b", long.replace("device", "[device](/deploy)")], ["/c", long]]).length === 1);
  console.log(bad ? "selftest RED" : "selftest GREEN (every arm fired)");
  return bad ? 1 : 0;
}

function main() {
  const argv = process.argv.slice(2);
  if (argv.includes("--selftest")) return selftest();
  if (!existsSync(join(DIST, "index.html"))) { console.log("::error::no dist/ — run npm run build first"); return 2; }
  const allow = existsSync(ALLOW) ? JSON.parse(readFileSync(ALLOW, "utf8")).allow : [];
  for (const a of allow) if (!a.reason || !a.match) { console.log(`::error::boilerplate-allowlist: every entry needs match and reason`); return 1; }
  const walk = (d) => readdirSync(d).flatMap((n) => { const p = join(d, n); return statSync(p).isDirectory() ? walk(p) : n.endsWith(".md") ? [p] : []; });
  // records (news posts, the changelog, legal notices) are exempt, as in every budget (SPEC §1)
  const pages = walk(DIST).filter((f) => !relative(DIST, f).startsWith("llms") && !/^(news\/|changelog|legal\/)/.test(relative(DIST, f))).map((f) => ["/" + relative(DIST, f).replace(/\.md$/, "").replace(/^index$/, ""), readFileSync(f, "utf8")]);
  if (pages.length < 40) { console.log(`::error::read only ${pages.length} twins — the build moved`); return 2; }
  const found = copies(pages, allow);
  const report = argv.includes("--report");
  const hard = FAIL && !report;
  for (const c of found) console.log(`${hard ? "::error::" : "::warning::"}on ${c.pages.length} pages (${c.pages.slice(0, 4).join(", ")}${c.pages.length > 4 ? ", …" : ""}): "${c.sentence.slice(0, 140)}${c.sentence.length > 140 ? "…" : ""}"`);
  console.log(`boilerplate: ${pages.length} twins; ${found.length} sentence(s) of ≥${MIN_WORDS} words on more than ${MAX_PAGES} pages; ${allow.length} allowlisted partial(s)${hard ? "" : " (report-only)"}`);
  return hard && found.length ? 1 : 0;
}
process.exit(main());
