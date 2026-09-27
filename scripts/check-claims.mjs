#!/usr/bin/env node
// Honest claims only (docs spec §5.2 and PLAN_v2 §2): no banned word and no
// claim from the DO NOT CLAIM list reaches a reader. Scans the sources a page
// is built from and, after a build, the markdown twins and llms files.
//
//   node scripts/check-claims.mjs            # src/ (and dist/ when built)
//   node scripts/check-claims.mjs --selftest # every pattern fires on a fixture
//
// Exceptions live in scripts/claims-exceptions.json, each with a reason and an
// expiry. The changelog and its archive are dated records and are not scanned.
import { readFileSync, readdirSync, statSync, existsSync } from "node:fs";
import { join, relative } from "node:path";

const ROOT = join(import.meta.dirname, "..");

/** [id, what it is, pattern]. The id cites the PLAN_v2 row or the style guide. */
export const CLAIMS = [
  ["D20", "hype: leading / world's first / best-in-class", /\b(?:industry[- ])?leading (?:platform|avatar|company|provider|solution)\b|\bworld'?s (?:first|leading)\b|\bbest[- ]in[- ]class\b/i],
  ["style", "banned word", /\bseamless(?:ly)?\b|\brevolutionary\b|\bblazing\b|\binstant(?:ly)?\b|\bscale infinitely\b|\b1000[x×]\b|\bhighest (?:avatar )?quality\b|\bmost cost[- ]effective\b/i],
  ["D7", "data never leaving the device, unqualified", /\bnothing leaves\b|\bnever leaves? your (?:hardware|device|phone|boundary)\b|\b100% on[- ]device\b|\bno data leaves\b|\bfully private companion\b/i],
  ["D8", "air-gapped or no-internet, without the license", /\bair[- ]gapped\b|\b100% offline\b|\bno internet required\b/i],
  ["N3", "an offline license term", /\bno time limit\b|\bvalid (?:for )?12 months\b/i],
  ["D13/D14", "Raspberry Pi, Jetson or NVIDIA as a self-host target", /\bRaspberry Pi\b|\bJetson\b|\bNVIDIA (?:GPUs?|Jetson) (?:support|target)|\bruns? on (?:an? )?NVIDIA\b/i],
  ["D33", "native Windows apps", /\bnative Windows (?:app|apps|desktop|support)\b/i],
  ["D15/D29", "sub-second or instant replies", /\bsub[- ]second\b|\bsub[- ]100 ?ms\b|\bin under a second\b|<\s?1 ?s(?:econd)?\b/i],
  ["D16", "uptime or an SLA", /\b99\.9+ ?%|\buptime\b|\bSLA\b/],
  ["D1-D6", "a compliance certification", /\bHIPAA\b|\bSOC ?2\b|\bISO 27001\b|\bBAA\b|\bGDPR[- ]compliant\b|\bCCPA\b|\bEU (?:data )?residency\b|\bend[- ]to[- ]end encrypt/i],
  ["D11/D34", "idle is free / talking time only", /\bidle (?:time )?is free\b|\btalking time only\b|\bpay for talking time\b|\bmeters? the talking time\b/i],
  ["D31", "a free tier or a free key", /\bfree tier\b|\bfree API (?:key|secret)\b|\bfree SDK\b|\bfree key\b/i],
  ["D18", "concurrency per server", /\bhigh[- ]concurrency\b|\bsessions per (?:server|GPU)\b|\bno cloud session cap\b/i],
  ["D19/D30", "any, mid-range or older phones; battery", /\bmid[- ]range (?:phones?|devices?)\b|\bany phone\b|\bolder phones\b|\bbattery life\b/i],
  ["D32", "therapy or mental-health framing", /\btherap(?:y|ist|eutic)\b|\bmental[- ]health\b|\bloneliness\b/i],
  ["N17", "device tokens for shipped apps", /\bdevice tokens?\b/i],
  ["N20", "per-user memory", /\bper-user memory\b|\bremembers each user\b/i],
  ["D26", "a conversation brain on the phone", /\bon-device (?:conversation |voice )?brain\b/i],
  ["style", "British spelling of license", /\blicence\b/i],
];

const SCAN = ["src/content", "src/data", "src/config", "src/pages", "src/partials", "src/components", "src/layouts", "src/lib", "src/openapi"];
const SKIP = /(^|\/)changelog(\/|\.md$)/;
const EXT = /\.(md|mdx|astro|ts|json|yaml)$/;

export function scan(text) {
  const hits = [];
  for (const [id, what, re] of CLAIMS) {
    const g = new RegExp(re.source, re.flags.includes("g") ? re.flags : re.flags + "g");
    for (const m of text.matchAll(g)) {
      const line = text.slice(0, m.index).split("\n").length;
      hits.push({ id, what, line, text: m[0] });
    }
  }
  return hits;
}

function selftest() {
  const fixtures = [
    "the leading avatar platform", "loops seamlessly", "Nothing leaves the device", "fully air-gapped",
    "valid for 12 months", "runs on Raspberry Pi", "a native Windows app", "sub-second replies", "99.9% uptime",
    "HIPAA-ready", "idle is free", "a free tier", "high-concurrency serving", "any phone", "AI therapist",
    "short-lived device tokens", "per-user memory", "an on-device brain", "an offline licence",
  ];
  let bad = 0;
  for (const f of fixtures) {
    const n = scan(f).length;
    console.log(`  ${n ? "PASS" : "FAIL"}  fires on "${f}"`);
    if (!n) bad++;
  }
  for (const f of ["Audio, transcripts and generated speech never leave the machine.", "Free accounts cannot create agents.", "There is no Intel Mac or native Windows binary; use WSL2.", "the same container under a second name", "NVIDIA RTX 4090"]) {
    const n = scan(f).length;
    console.log(`  ${n ? "FAIL" : "PASS"}  quiet on "${f}"`);
    if (n) bad++;
  }
  console.log(bad ? "selftest RED" : "selftest GREEN (every pattern fired, no false positive on the controls)");
  return bad ? 1 : 0;
}

function main() {
  if (process.argv.includes("--selftest")) return selftest();
  const { exceptions } = JSON.parse(readFileSync(join(ROOT, "scripts/claims-exceptions.json"), "utf8"));
  const excepted = new Map(exceptions.map((e) => [e.file, e]));
  const walk = (d) => (existsSync(d) ? readdirSync(d).flatMap((n) => { const p = join(d, n); return statSync(p).isDirectory() ? walk(p) : [p]; }) : []);
  const files = SCAN.flatMap((d) => walk(join(ROOT, d))).filter((f) => EXT.test(f) && !SKIP.test(relative(join(ROOT, "src/content/docs"), f)));
  // what agents read, once built: the markdown twins and the llms files
  const dist = join(ROOT, "dist");
  if (existsSync(join(dist, "llms.txt"))) {
    files.push(...walk(dist).filter((f) => (/\.md$/.test(f) && !/(^|\/)changelog(\/|\.md$)/.test(relative(dist, f))) || /llms[^/]*\.txt$|\/llms\/[^/]+\.txt$/.test(f)));
  }
  let bad = 0, seen = 0;
  const used = new Set();
  for (const f of files) {
    const rel = relative(ROOT, f);
    const hits = scan(readFileSync(f, "utf8"));
    if (!hits.length) continue;
    if (excepted.has(rel)) { used.add(rel); console.log(`  excepted  ${rel}: ${hits.length} hit(s) — ${excepted.get(rel).reason} (until ${excepted.get(rel).expires})`); continue; }
    for (const h of hits) { console.log(`::error file=${rel},line=${h.line}::${h.id} ${h.what}: "${h.text}"`); bad++; }
    seen++;
  }
  for (const e of exceptions) if (!used.has(e.file)) { console.log(`::error::claims-exceptions.json names ${e.file}, which no longer trips the check — delete the entry`); bad++; }
  console.log(bad ? `claims: ${bad} finding(s) in ${seen} file(s)` : `claims ok: ${files.length} files scanned, ${CLAIMS.length} patterns, ${exceptions.length} named exception(s)`);
  return bad ? 1 : 0;
}
process.exit(main());
