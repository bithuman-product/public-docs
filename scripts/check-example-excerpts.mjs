#!/usr/bin/env node
// "The code that matters" is the code the reader clones (docs spec §3.3 and W4).
//
// An example page, a recipe or a platform page may show the core lines of a
// project in bithuman-examples instead of the whole file. Such a block opens
// with an excerpt line naming the file, and each run of lines between two
// elision lines is copied verbatim (an indent removed evenly is allowed):
//
//   ```kotlin
//   // excerpt: android/expression2-hello/app/src/main/java/com/example/x2hello/MainActivity.kt
//   Expression2Credential.set(secret)
//   // …
//   val model = Expression2ModelStore(this).fetch(agentCode)
//   ```
//
// bithuman-examples builds every one of those projects in its own CI, so an
// excerpt that still matches the file at main is code that compiles today. This
// gate reads every excerpt in src/content/docs and grades it against the file
// at bithuman-examples main: the runs must appear in the file, in order. A run
// that no longer matches means the project moved on and the page did not.
//
//   node scripts/check-example-excerpts.mjs                  # against GitHub main
//   node scripts/check-example-excerpts.mjs --repo ../bithuman-examples
//   node scripts/check-example-excerpts.mjs --make <path> 12-18,40-52 [--repo DIR]
//                                                             # print a block to paste
//   node scripts/check-example-excerpts.mjs --selftest
import { readFileSync, readdirSync, statSync, existsSync } from "node:fs";
import { join, relative } from "node:path";

const ROOT = join(import.meta.dirname, "..");
const DOCS = join(ROOT, "src/content/docs");
const RAW = "https://raw.githubusercontent.com/bithuman-product/bithuman-examples/main/";
const args = process.argv.slice(2);
const flag = (k) => { const i = args.indexOf(k); return i >= 0 ? args[i + 1] : undefined; };
const REPO = flag("--repo");

/** The excerpt line: a comment marker, "excerpt:", a repository path with an extension. */
const HEAD = /^(\/\/|#) excerpt: ([\w./-]+\/[\w.-]+\.[a-z]{1,6})\s*$/;
/** An elision line between two runs. */
const ELIDE = /^\s*(\/\/|#) …\s*$/;
const LANG_COMMENT = { swift: "//", kotlin: "//", kt: "//", python: "#", py: "#", bash: "#", sh: "#", dart: "//", ts: "//", js: "//" };

/** Every fenced block in a markdown file whose first line is an excerpt line. */
export function excerptsIn(md) {
  const out = [];
  for (const m of md.matchAll(/^(`{3,})([a-z]*)[^\n]*\n([\s\S]*?)^\1[ \t]*$/gm)) {
    const lines = m[3].replace(/\n$/, "").split("\n");
    const h = HEAD.exec(lines[0] ?? "");
    if (!h) continue;
    const runs = [[]];
    for (const l of lines.slice(1)) {
      if (ELIDE.test(l)) runs.push([]);
      else runs[runs.length - 1].push(l);
    }
    out.push({ path: h[2], lang: m[2], runs: runs.filter((r) => r.some((l) => l.trim())), line: md.slice(0, m.index).split("\n").length });
  }
  return out;
}

/** Where `run` sits in `file` at or after line `from`, with one indent removed evenly; -1 if nowhere. */
export function findRun(file, run, from = 0) {
  const body = run.slice(run.findIndex((l) => l.trim()));
  while (body.length && !body[body.length - 1].trim()) body.pop();
  if (!body.length) return from;
  outer: for (let i = from; i + body.length <= file.length; i++) {
    const first = file[i];
    if (!first.endsWith(body[0]) || first.slice(0, first.length - body[0].length).trim()) continue;
    const indent = first.slice(0, first.length - body[0].length);
    for (let j = 1; j < body.length; j++) {
      const want = body[j], got = file[i + j];
      if (!want.trim()) { if (got.trim()) continue outer; continue; }
      if (got !== indent + want) continue outer;
    }
    return i + body.length;
  }
  return -1;
}

/** Faults for one excerpt against the file's lines. */
export function gradeExcerpt(ex, fileLines) {
  let at = 0;
  const faults = [];
  ex.runs.forEach((run, k) => {
    const next = findRun(fileLines, run, at);
    if (next < 0) faults.push(`run ${k + 1} of ${ex.runs.length} ("${run.find((l) => l.trim()).trim().slice(0, 60)}") is not in ${ex.path} after the previous run`);
    else at = next;
  });
  return faults;
}

async function source(path) {
  if (REPO) {
    const f = join(REPO, path);
    return existsSync(f) ? readFileSync(f, "utf8") : null;
  }
  const r = await fetch(RAW + path);
  if (r.status === 404) return null;
  if (!r.ok) throw new Error(`${RAW}${path}: HTTP ${r.status}`);
  return r.text();
}

function walk(dir) {
  return readdirSync(dir).flatMap((n) => {
    const p = join(dir, n);
    return statSync(p).isDirectory() ? walk(p) : p.endsWith(".md") ? [p] : [];
  });
}

async function make(path, spec) {
  const text = await source(path);
  if (text == null) { console.error(`no ${path}`); process.exit(2); }
  const lines = text.split("\n");
  const ext = path.split(".").pop();
  const c = LANG_COMMENT[ext] ?? "//";
  const runs = spec.split(",").map((r) => r.split("-").map(Number)).map(([a, b]) => lines.slice(a - 1, (b ?? a)));
  // one indent removed from every run, so the runs keep their nesting; an
  // elision line takes the indent of the run after it
  const lead = (l) => /^\s*/.exec(l)[0].length;
  const ind = Math.min(...runs.flat().filter((l) => l.trim()).map(lead));
  const cut = (run) => run.map((l) => l.slice(ind));
  console.log([`${c} excerpt: ${path}`, ...runs.flatMap((r, i) => [...(i ? [" ".repeat(lead(r.find((l) => l.trim())) - ind) + `${c} …`] : []), ...cut(r)])].join("\n"));
}

function selftest() {
  let bad = 0;
  const ok = (name, cond) => { console.log(`${cond ? "ok  " : "FAIL"} ${name}`); if (!cond) bad++; };
  const file = ["class A {", "    fun go() {", "        val x = 1", "        call(x)", "    }", "", "    fun stop() {", "        halt()", "    }", "}"];
  const md = (body) => "text\n\n```kotlin\n// excerpt: android/app/A.kt\n" + body + "\n```\n";
  const one = (body) => excerptsIn(md(body))[0];
  ok("a verbatim run passes", gradeExcerpt(one("val x = 1\ncall(x)"), file).length === 0);
  ok("an evenly removed indent passes", gradeExcerpt(one("fun go() {\n    val x = 1\n}"), ["fun go() {", "    val x = 1", "}"]).length === 0);
  ok("two runs in order pass", gradeExcerpt(one("val x = 1\n// …\nhalt()"), file).length === 0);
  ok("two runs out of order fire", gradeExcerpt(one("halt()\n// …\nval x = 1"), file).length === 1);
  ok("an edited line fires", gradeExcerpt(one("val x = 2\ncall(x)"), file).length === 1);
  ok("a partial line does not pass as the line", gradeExcerpt(one("x = 1"), file).length === 1);
  ok("an uneven indent fires", gradeExcerpt(one("val x = 1\n  call(x)"), file).length === 1);
  ok("a block with no excerpt line is not graded", excerptsIn("```kotlin\nval x = 1\n```\n").length === 0);
  ok("a prose excerpt line is not a path", excerptsIn("```swift\n// excerpt: the core loop\nx\n```\n").length === 0);
  ok("a four-backtick block is read", excerptsIn("````python\n# excerpt: python/a/b.py\nx = 1\n````\n").length === 1);
  console.log(bad ? `selftest: ${bad} arm(s) did not fire` : "selftest GREEN");
  process.exit(bad ? 1 : 0);
}

if (args.includes("--selftest")) selftest();
else if (args.includes("--make")) await make(flag("--make"), args[args.indexOf("--make") + 2]);
else {
  const faults = [];
  let n = 0;
  const cache = new Map();
  for (const f of walk(DOCS)) {
    for (const ex of excerptsIn(readFileSync(f, "utf8"))) {
      n++;
      if (!cache.has(ex.path)) cache.set(ex.path, await source(ex.path));
      const text = cache.get(ex.path);
      const where = `${relative(ROOT, f)}:${ex.line}`;
      if (text == null) { faults.push(`${where}: ${ex.path} is not in bithuman-examples main`); continue; }
      for (const fault of gradeExcerpt(ex, text.split("\n"))) faults.push(`${where}: ${fault}`);
    }
  }
  for (const f of faults) console.log(`::error::${f}`);
  console.log(faults.length ? `excerpts: ${faults.length} fault(s) in ${n} excerpt(s)` : `excerpts ok: ${n} excerpt(s) match bithuman-examples ${REPO ? REPO : "main"}`);
  process.exit(faults.length ? 1 : 0);
}
