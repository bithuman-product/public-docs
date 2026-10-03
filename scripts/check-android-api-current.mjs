#!/usr/bin/env node
// THE ANDROID API REFERENCE STILL DESCRIBES THE AARs MAVEN CENTRAL SERVES TODAY.
//
// WHY THIS EXISTS, and why it could not be deferred to "later"
// -----------------------------------------------------------
// The page it grades is generated from published artifacts. Everything on this
// site that was generated from a published artifact and then left alone has
// gone stale the same way: the text never changed, the REGISTRY changed. So the
// subject of this check is not the page. It is Maven Central. The page is
// re-derived from whatever Central serves this morning and compared with what
// is committed, and the run is scheduled as well as pushed, because a release
// publishing is not an event in this repository.
//
// ★THE GOVERNING RULE IT ENFORCES, which is the rule the generator obeys:
//
//     A SYMBOL ENTERS THE REFERENCE ONLY IF THE SHIPPED INTERFACE AND THE
//     SHIPPED RUNTIME AGREE ON IT. WHERE THEY DISAGREE, SAY SO RATHER THAN
//     PICK ONE. NEVER GENERATE FROM A SOURCE TREE.
//
// WHAT IT GRADES, in order, and each is a DIFFERENT failure with its own words:
//   P1 THE PAGE IS WHAT THE RECORD RENDERS. scripts/android-surface.json is the
//      extraction; the page region is a rendering of it. A hand edit inside the
//      markers is caught here and nowhere else.
//   P2 THE RECORD NAMES THE ARTIFACTS THIS TOOL COVERS, AND EACH RECORDED
//      VERSION IS THE NEWEST PUBLISHED ONE. A version that moved is a stale
//      record even when every symbol is identical: a record of which bytes
//      were read is worthless once it names bytes nobody installs.
//   P3 THE RECORDED DIGEST IS CENTRAL'S OWN DIGEST for the recorded FILENAME.
//      A Maven release has one digest per file, so this is graded against the
//      .sha256 sidecar for that exact file name.
//   P4 THE SURFACE HAS NOT MOVED. The .aar is downloaded here, verified against
//      its sidecars, read back, and diffed against the record: every name
//      ADDED, REMOVED or CHANGED IN SIGNATURE is listed by name — on either
//      side of the declared/runtime split.
//   P5 EVERY SDK CALL IN A DOCS SNIPPET IS IN THE REFERENCE. Each ```kotlin fence
//      on the site that uses this SDK is read for the calls it makes on a
//      documented class — `Essence2Avatar.create(…)`, `store.fetch(…)`,
//      `avatar.pull(…)`, a named argument — and each must be a member the
//      reference prints, on the side it is called on (companion/object or
//      instance). Variables are typed from what the reference says a call
//      returns (`val bundle = store.fetch(…)`, `.use { avatar -> … }`, a
//      `name: Type` declaration); a value whose type the reference does not
//      document is not followed. A product-named class that is public in the AAR
//      but has no section on the page is a FAIL when a snippet calls into it.
//      ★Why: the reference once dropped `Essence2Avatar.create`, the entry point
//      every Essence 2 snippet calls, and every check here stayed green.
//      Offline: it reads the page and the docs, nothing else.
//
// THREE OUTCOMES, NEVER COLLAPSED
//   exit 0  PASS         the page matches the shipped surface
//   exit 1  FAIL         the surface moved, or the record is stale, or the page
//                        is not what the record renders — a real disagreement
//   exit 2  CANNOT CHECK Central unreachable, no JDK, the bytes downloaded are
//                        not what the sidecars describe, the extractor did not
//                        run. A DISTINCT non-zero code that can never read as a
//                        pass.
//
// ★AND IT PROVES ITSELF WITH NO NETWORK. `--selftest` drives the verdict
// function against fixtures with a STUB registry and a STUB extraction: one arm
// for each outcome, including a separate arm for each KIND of FAIL, and the run
// FAILS unless every arm fires. An instrument that cannot show its own red is
// not evidence of anything.
//
//   node scripts/check-android-api-current.mjs
//   node scripts/check-android-api-current.mjs --selftest
//   node scripts/check-android-api-current.mjs --snippets   # P5 alone, offline
//   node scripts/check-android-api-current.mjs --java /path/to/java

import { readFileSync, readdirSync } from "node:fs";
import { join, relative } from "node:path";
import {
  ARTIFACTS, BEGIN, CannotCheck, END, GROUP, PAGE_PATH, RECORD_PATH, REGISTRY, ROOT,
  diffSurface, downloadAndExtract, newestRelease, publicNames, renderRegion, splitPage,
} from "./gen-android-api.mjs";

export const PASS = 0;
export const FAIL = 1;
export const CANNOT_CHECK = 2;

const REGENERATE = "how to fix: run `node scripts/gen-android-api.mjs` and commit both files.";

/**
 * The whole verdict as a pure function, so every outcome has a selftest arm.
 * `registry(id)` and `extract({id, version})` are injected: the real ones
 * reach Maven Central, the selftest ones do not.
 */
export async function verdict({ record, pageText, registry, extract, artifacts = ARTIFACTS, snippets = [] }) {
  const out = [];
  const say = (s) => out.push(s);

  // ---- P1 the page is what the record renders ------------------------------
  const page = splitPage(pageText);
  if (!page) {
    return { code: FAIL, lines: [`${PAGE_PATH} has no ANDROIDAPI markers — nothing generated lives there.`] };
  }
  const expected = renderRegion(record);
  if (page.region !== expected) {
    const a = expected.split("\n"), b = page.region.split("\n");
    const i = a.findIndex((l, k) => l !== b[k]);
    return {
      code: FAIL,
      lines: [
        "P1 THE PAGE IS NOT WHAT THE RECORD RENDERS — the region between the",
        "   markers was edited by hand, or the renderer changed under it.",
        `   first difference at region line ${i + 1}:`,
        `     record renders: ${JSON.stringify(a[i] ?? "(end of region)")}`,
        `     page carries:   ${JSON.stringify(b[i] ?? "(end of region)")}`,
        `   ${REGENERATE}`,
      ],
    };
  }

  // ---- P5 every SDK call in a docs snippet is in the reference -------------
  // (offline, so it runs before anything that needs the registry)
  const graded = gradeSnippets(page.region, snippets, publicNames(record));
  if (graded.failures.length) {
    const lines = [
      "P5 A DOCS SNIPPET CALLS SOMETHING THE REFERENCE DOES NOT LIST.",
      "   A developer who looks the call up on the reference page will not find it.",
    ];
    for (const f of graded.failures) lines.push(`   ${f.where}  ${f.what}  — ${f.why}`);
    lines.push("   how to fix: if the SDK has it, make the generator print it (scripts/gen-android-api.mjs);",
      "   if it does not, fix the snippet.");
    return { code: FAIL, lines };
  }

  // ---- P2a the record covers exactly the artifacts this tool covers ----------
  const want = artifacts.map((x) => `${GROUP}:${x.id}`);
  const have = record.artifacts.map((e) => e.artifact.coordinate);
  if (want.join(",") !== have.join(",")) {
    return {
      code: FAIL,
      lines: [
        "P2 THE RECORD DOES NOT COVER THE ARTIFACTS THIS TOOL COVERS.",
        `   tool:   ${want.join(", ")}`,
        `   record: ${have.join(", ") || "(none)"}`,
        `   ${REGENERATE}`,
      ],
    };
  }

  const compared = [];
  for (const entry of record.artifacts) {
    const a = entry.artifact;
    const id = a.coordinate.slice(GROUP.length + 1);

    // ---- the registry ------------------------------------------------------
    const rel = await registry(id);

    // ---- P2b the recorded artifact is the newest published one -------------
    if (a.version !== rel.version) {
      return {
        code: FAIL,
        lines: [
          `P2 THE RECORD IS STALE. The page says it was read from ${a.coordinate} ${a.version};`,
          `   ${REGISTRY} now serves ${rel.version}.`,
          "   ★The surface may well be identical. That is not the point: a record of",
          "   which bytes were read is worthless once it names bytes nobody installs.",
          `   ${REGENERATE}`,
        ],
      };
    }

    // ---- P3 the recorded digest is Central's own digest for that file ------
    if (a.filename !== rel.filename) {
      return {
        code: FAIL,
        lines: [
          `P3 THE RECORD NAMES A FILE ${REGISTRY} DOES NOT SERVE for ${a.coordinate} ${rel.version}:`,
          `     record: ${a.filename}`,
          `     ${REGISTRY}: ${rel.filename}`,
          `   ${REGENERATE}`,
        ],
      };
    }
    if (`sha256:${rel.sha256}` !== a.digest) {
      return {
        code: FAIL,
        lines: [
          `P3 THE RECORDED DIGEST IS NOT THE PUBLISHED ONE for ${a.filename}:`,
          `     record: ${a.digest}`,
          `     ${REGISTRY}: sha256:${rel.sha256}`,
          `   ${REGENERATE}`,
        ],
      };
    }

    // ---- P4 the surface has not moved --------------------------------------
    const fresh = extract({ id, version: rel.version });
    // What was read here must be the published bytes, or nothing was compared.
    if (fresh.filename !== rel.filename || fresh.sha256 !== rel.sha256) {
      throw new CannotCheck(
        `the .aar read here (${fresh.filename}, sha256:${fresh.sha256}) is not the file ` +
        `${REGISTRY} publishes for ${a.coordinate} ${rel.version} (${rel.filename}, sha256:${rel.sha256})`);
    }
    const { added, removed, changed } = diffSurface(entry.surface, fresh.surface);
    if (added.length || removed.length || changed.length) {
      const lines = [
        `P4 THE PUBLIC SURFACE OF ${a.coordinate} ${rel.version} IS NOT WHAT THIS PAGE DESCRIBES.`,
      ];
      for (const x of removed) lines.push(`   REMOVED    ${x}`);
      for (const x of added) lines.push(`   ADDED      ${x}`);
      for (const c of changed) {
        lines.push(`   CHANGED    ${c.name}`);
        lines.push(`                was  ${c.was}`);
        lines.push(`                now  ${c.now}`);
      }
      lines.push(`   ${REGENERATE}`);
      return { code: FAIL, lines };
    }
    compared.push(
      `  ${a.coordinate} ${a.version}  ${a.filename}  ${a.digest}\n` +
      `    ${entry.surface.classes.length} public class(es), ` +
      `${entry.surface.classes.reduce((k, c) => k + c.constructors.length + c.functions.length + c.properties.length, 0)} public member(s), ` +
      `${entry.surface.classes.reduce((k, c) => k + c.loadable_undeclared.length, 0) + entry.surface.disagreements.internal_classes.length} disagreement(s) compared`);
  }

  say(`check-android-api-current: OK — the reference matches what ${REGISTRY} serves.`);
  for (const c of compared) say(c);
  say(`  snippets: ${graded.calls} SDK call(s) in ${graded.fences} Kotlin snippet(s) on ${graded.pages} page(s), every one in the reference`);
  return { code: PASS, lines: out };
}

/* ----------------------------------------------------- P5 the docs snippets */

const IMPLICIT_ANY = new Set(["let", "also", "apply", "run", "use", "takeIf", "takeUnless", "toString", "hashCode", "equals", "javaClass", "to"]);
const IMPLICIT_THROWABLE = new Set(["message", "cause", "localizedMessage", "stackTrace", "printStackTrace", "addSuppressed", "suppressed", "fillInStackTrace", "stackTraceToString"]);
const IMPLICIT_ENUM = new Set(["name", "ordinal", "compareTo"]);
const IMPLICIT_ENUM_STATIC = new Set(["entries", "values", "valueOf"]);
/** Scope functions whose lambda parameter is the receiver: `.use { avatar -> … }`. */
const BINDS_RECEIVER = new Set(["use", "let", "also", "takeIf", "takeUnless"]);

function matchClose(text, i, open, close) {
  let d = 0;
  for (let k = i; k < text.length; k++) {
    if (text[k] === open) d++;
    else if (text[k] === close && --d === 0) return k;
  }
  return -1;
}

/** Split on top-level commas (outside (), [] and {}). */
function splitTop(list) {
  const out = [];
  let depth = 0, cur = "";
  for (const ch of list) {
    if ("([{".includes(ch)) depth++;
    else if (")]}".includes(ch)) depth--;
    if (ch === "," && depth === 0) { out.push(cur.trim()); cur = ""; continue; }
    cur += ch;
  }
  if (cur.trim()) out.push(cur.trim());
  return out;
}

/** `Essence2Bundle?` / `List<X>` -> the class a member lookup needs. */
const bareType = (t) => (t || "").trim().replace(/<.*$/, "").replace(/\?$/, "").trim() || null;
const paramNames = (list) => list.trim() === "…" ? null
  : splitTop(list).map((p) => /^(?:vararg\s+)?(\w+)\s*:/.exec(p)?.[1]).filter(Boolean);

function parseMember(raw) {
  const l = raw.replace(/^@JvmStatic\s+/, "").replace(/\s+\/\/.*$/, "");
  let m = /^(?:(?:const|suspend|operator|infix|inline)\s+)*fun\s+(?:<[^>]*>\s+)?(?:[\w.<>?, ]+\.)?(\w+)\(/.exec(l);
  if (m) {
    const open = m.index + m[0].length - 1;
    const close = matchClose(l, open, "(", ")");
    const after = close > 0 ? l.slice(close + 1) : "";
    return { name: m[1], kind: "fun", params: close > 0 ? paramNames(l.slice(open + 1, close)) : null,
      returns: bareType(/^\s*:\s*(.+)$/.exec(after)?.[1]) };
  }
  m = /^(?:const\s+)?(?:val|var)\s+(?:[\w.<>]+\.)?(\w+)\s*:\s*(.+?)(?:\s+=\s+.*)?$/.exec(l);
  if (m) return { name: m[1], kind: "prop", returns: bareType(m[2]) };
  m = /^constructor\((.*)\)$/.exec(l);
  if (m) return { name: "<init>", kind: "ctor", params: paramNames(m[1]) };
  return null;
}

/** The reference page region, read back as the classes and members it PRINTS. */
export function parseReference(region) {
  const classes = new Map();
  const newClass = (name, header) => {
    const c = {
      name,
      kind: /\benum class\b/.test(header) ? "enum" : /^object\b/.test(header) ? "object"
        : /\bfun interface\b/.test(header) ? "fun-interface" : "class",
      data: /^data class\b/.test(header),
      throwable: /\s:\s.*(Exception|Throwable|Error)(?!\w)/.test(header),
      ctors: [], instance: new Map(), statics: new Map(),
    };
    classes.set(name, c);
    return c;
  };
  const add = (c, side, mem) => {
    for (const sd of side === "both" ? ["instance", "statics"] : [side]) {
      if (!c[sd].has(mem.name)) c[sd].set(mem.name, []);
      c[sd].get(mem.name).push(mem);
    }
  };
  let heading = null, inFence = false, cur = null, sub = null;
  for (const raw of region.split("\n")) {
    const h = /^### (\S+)/.exec(raw);
    if (h) { heading = h[1]; continue; }
    if (/^```kotlin/.test(raw)) { inFence = true; cur = null; sub = null; continue; }
    if (/^```/.test(raw)) { inFence = false; continue; }
    if (!inFence || !heading) continue;
    if (!cur) { cur = newClass(heading, raw.trim()); continue; }
    const indent = /^ */.exec(raw)[0].length;
    const line = raw.trim();
    if (!line || line.startsWith("@Deprecated")) continue;
    let target = cur, side = cur.kind === "object" ? "both" : "instance";
    if (indent === 4) {
      sub = null;
      if (line === "companion object") { sub = { target: cur, side: "statics" }; continue; }
      const ne = /^enum class (\w+)/.exec(line);
      if (ne) { sub = { target: newClass(`${cur.name}.${ne[1]}`, line), side: "instance" }; continue; }
    } else if (indent >= 8 && sub) {
      ({ target, side } = sub);
    }
    if (target.kind === "enum" && /^[A-Z_][A-Z0-9_]*(, [A-Z_][A-Z0-9_]*)*$/.test(line)) {
      for (const e of line.split(", ")) add(target, "statics", { name: e, kind: "entry", returns: target.name });
      continue;
    }
    if (line.startsWith("//")) continue;
    const mem = parseMember(line);
    if (!mem) continue;
    if (mem.kind === "ctor") target.ctors.push(mem);
    else add(target, side, mem);
  }
  return classes;
}

/** String and comment bodies blanked (same length), so a call is only ever code. */
function codeOnly(src) {
  let out = "", i = 0;
  const blank = (a, b) => src.slice(a, b).replace(/[^\n]/g, " ");
  while (i < src.length) {
    if (src.startsWith("//", i)) { const j = src.indexOf("\n", i); const e = j < 0 ? src.length : j; out += blank(i, e); i = e; continue; }
    if (src.startsWith("/*", i)) { const j = src.indexOf("*/", i + 2); const e = j < 0 ? src.length : j + 2; out += blank(i, e); i = e; continue; }
    if (src.startsWith('"""', i)) { const j = src.indexOf('"""', i + 3); const e = j < 0 ? src.length : j + 3; out += '"' + blank(i + 1, e - 1) + '"'; i = e; continue; }
    if (src[i] === '"') {
      let j = i + 1;
      while (j < src.length && src[j] !== '"' && src[j] !== "\n") j += src[j] === "\\" ? 2 : 1;
      const e = Math.min(j + 1, src.length);
      out += e - i >= 2 ? '"' + blank(i + 1, e - 1) + '"' : blank(i, e);
      i = e;
      continue;
    }
    const ch = /^'(?:\\.|[^'\\])'/.exec(src.slice(i, i + 4));
    if (ch) { out += "'" + blank(i + 1, i + ch[0].length - 1) + "'"; i += ch[0].length; continue; }
    out += src[i++];
  }
  return out;
}

/**
 * Grade every snippet's SDK calls against the reference region. Returns the
 * failures and what was graded. Lenient where it cannot know: a value whose
 * type the reference does not document is not followed, and a fence that uses
 * nothing of this SDK is not read at all.
 */
export function gradeSnippets(region, snippets, pubNames = new Set()) {
  const ref = parseReference(region);
  const failures = [];
  let calls = 0, fences = 0;
  const pages = new Set();
  for (const sn of snippets) {
    if (!/ai\.bithuman\.|\b(?:Essence2|Expression2)\w*/.test(sn.code)) continue;
    fences++;
    pages.add(sn.file);
    const text = codeOnly(sn.code);
    const lineAt = (pos) => sn.line + (text.slice(0, pos).match(/\n/g) || []).length;
    const fail = (pos, what, why) => failures.push({ where: `${sn.file}:${lineAt(pos)}`, what, why });
    const env = new Map();
    const events = [];
    for (const m of text.matchAll(/\b([a-z_]\w*)\s*:\s*([A-Z]\w*(?:\.[A-Z]\w*)*)\??/g)) {
      if (ref.has(m[2])) events.push({ pos: m.index, type: "typed", name: m[1], cls: m[2] });
    }
    for (const m of text.matchAll(/(?<![\w.$:])([A-Za-z_]\w*)/g)) events.push({ pos: m.index, type: "chain", head: m[1] });
    events.sort((a, b) => a.pos - b.pos || (a.type === "typed" ? -1 : 1));

    const checkNamed = (args, overloads, owner, member, pos) => {
      const named = splitTop(args).map((a) => /^(\w+)\s*=(?!=)/.exec(a)?.[1]).filter(Boolean);
      const known = overloads.filter((o) => o.params);
      if (!named.length || !known.length) return;
      if (!known.some((o) => named.every((n) => o.params.includes(n)))) {
        fail(pos, `${owner}.${member}(${named.map((n) => `${n} = …`).join(", ")})`, "no overload the reference lists takes that named argument");
      }
    };

    /** Follow one call chain from its head; returns the type it ends on, or null. */
    const walk = (start, head) => {
      let i = start + head.length;
      let cls, side;
      if (env.has(head)) { cls = env.get(head); side = "instance"; }
      else if (ref.has(head)) { cls = head; side = "statics"; }
      else {
        if (pubNames.has(head) && /^(Essence2|Expression2)/.test(head) && /^\s*(\(|\{|\??\.\s*\w)/.test(text.slice(i))) {
          calls++;
          fail(start, head, "public in the AAR, but the reference has no section for it");
        }
        return null;
      }
      for (;;) {
        i += /^[ \t]*(?:\n\s*(?=\??\.))?/.exec(text.slice(i))[0].length;
        if (text.startsWith("!!", i)) { i += 2; continue; }
        const c = ref.get(cls);
        if (side === "statics" && text[i] === "(") {
          calls++;
          const close = matchClose(text, i, "(", ")");
          if (!c.ctors.length) { fail(i, `${cls}(…)`, "the reference lists no constructor"); return null; }
          checkNamed(text.slice(i + 1, close < 0 ? text.length : close), c.ctors, cls, "constructor", i);
          if (close < 0) return null;
          i = close + 1;
          side = "instance";
          continue;
        }
        if (side === "statics" && text[i] === "{") return c.kind === "fun-interface" ? cls : null;
        const dot = /^(\?\.|\.)\s*([A-Za-z_]\w*)/.exec(text.slice(i));
        if (!dot) break;
        const m = dot[2];
        const at = i;
        i += dot[0].length;
        let ov;
        if (side === "statics") {
          if (m === "Companion") continue;
          if (ref.has(`${cls}.${m}`)) { cls = `${cls}.${m}`; continue; }
          calls++;
          ov = c.statics.get(m);
          if (!ov) {
            if (c.kind === "enum" && IMPLICIT_ENUM_STATIC.has(m)) return null;
            fail(at, `${cls}.${m}`, `${cls} in the reference has no companion, object or enum member ${m}`);
            return null;
          }
        } else {
          calls++;
          ov = c.instance.get(m);
          if (!ov) {
            const implicit = IMPLICIT_ANY.has(m) || (c.throwable && IMPLICIT_THROWABLE.has(m)) ||
              (c.kind === "enum" && IMPLICIT_ENUM.has(m)) || (c.data && /^(component\d+|copy)$/.test(m));
            if (!implicit) { fail(at, `${cls}.${m}`, `${cls} in the reference has no member ${m}`); return null; }
            if (BINDS_RECEIVER.has(m)) {
              const lp = /^\s*\{\s*(\w+)\s*->/.exec(text.slice(i));
              if (lp) env.set(lp[1], cls);
            }
            return null;
          }
        }
        i += /^[ \t]*/.exec(text.slice(i))[0].length;
        if (text[i] === "(") {
          const close = matchClose(text, i, "(", ")");
          checkNamed(text.slice(i + 1, close < 0 ? text.length : close), ov.filter((o) => o.kind === "fun"), cls, m, at);
          if (close < 0) return null;
          i = close + 1;
        }
        const ret = ov.map((o) => o.returns).find((r) => r && ref.has(r));
        if (!ret) return null;
        cls = ret;
        side = "instance";
      }
      return side === "instance" ? cls : null;
    };

    for (const ev of events) {
      if (ev.type === "typed") { env.set(ev.name, ev.cls); continue; }
      const ends = walk(ev.pos, ev.head);
      const decl = /\b(?:val|var)\s+(\w+)\s*(?::\s*[\w.<>?]+\s*)?=\s*$/.exec(text.slice(0, ev.pos));
      if (decl && ends) env.set(decl[1], ends);
    }
  }
  return { failures, calls, fences, pages: pages.size };
}

/** Every ```kotlin fence on the site, outside the generated reference region. */
export function collectSnippets(dir = join(ROOT, "src/content/docs")) {
  const out = [];
  const scan = (path) => {
    const lines = readFileSync(path, "utf8").split("\n");
    let inRegion = false;
    for (let k = 0; k < lines.length; k++) {
      if (lines[k].includes(BEGIN)) inRegion = true;
      if (lines[k].includes(END)) inRegion = false;
      const m = /^(\s*)```(?:kotlin|kt)\b/.exec(lines[k]);
      if (!m) continue;
      const body = [];
      let j = k + 1;
      for (; j < lines.length && !/^\s*```\s*$/.test(lines[j]); j++) body.push(lines[j].slice(Math.min(m[1].length, /^ */.exec(lines[j])[0].length)));
      if (!inRegion) out.push({ file: relative(ROOT, path), line: k + 2, code: body.join("\n") });
      k = j;
    }
  };
  const walkDir = (d) => {
    for (const e of readdirSync(d, { withFileTypes: true }).sort((a, b) => a.name.localeCompare(b.name))) {
      const p = join(d, e.name);
      if (e.isDirectory()) walkDir(p);
      else if (/\.mdx?$/.test(e.name)) scan(p);
    }
  };
  walkDir(dir);
  return out;
}

/* ------------------------------------------------------------------ selftest */

/** The smallest record the renderer will accept, so the arms are readable. */
function fixtureSurface() {
  return {
    artifact_facts: {
      manifest_package: "ai.bithuman.x", uses_permissions: ["android.permission.INTERNET"], min_sdk: 26,
      abis: ["arm64-v8a"], native_libraries: ["libx.so"], aar_metadata: {}, kotlin_modules: ["x.kotlin_module"],
      kotlin_metadata_version: "2.0.0",
    },
    module_name: "x_release",
    packages: [{ name: "ai.bithuman.x", facades: ["ai.bithuman.x.XKt"], typealiases: [], functions: [], properties: [], loadable_undeclared: [], facades_without_metadata: [] }],
    classes: [{
      name: "ai.bithuman.x.Avatar", kind: "class", modality: "final", is_data: false, is_fun_interface: false,
      runtime_access: ["public", "final"], loadable: true, type_parameters: "", supertypes: ["AutoCloseable"],
      companion: null, nested_public: [], enum_entries: [], sealed_subclasses: [],
      constructors: [],
      functions: [{ name: "render", signature: "fun render(audio: ByteArray): Sequence<ByteArray>", suspend: false, jvm: "render([B)Lkotlin/sequences/Sequence;", loadable: true }],
      properties: [{ name: "width", signature: "val width: Int", mutable: false, jvm_getter: "getWidth()I", jvm_setter: null, jvm_field: null, loadable: true }],
      loadable_undeclared: [{ name: "open$x_release", jvm: "open$x_release()V", access: ["public", "final"], kind: "internal" }],
    }],
    disagreements: { internal_classes: [{ name: "ai.bithuman.x.Wiring", declared_visibility: "internal", runtime_access: ["public", "final"] }], public_classes_without_metadata: [], synthetic_classes: 0, unreadable_metadata: [] },
    counts: { class_files: 3, declared_classes: 3, public_classes: 1 },
  };
}

function fixtureRecord() {
  return {
    artifacts: [{
      artifact: {
        registry: REGISTRY, coordinate: `${GROUP}:x-android`, version: "1.0.0",
        digest: "sha256:aa", filename: "x-android-1.0.0.aar", resolved_on: "2026-01-01",
      },
      surface: fixtureSurface(),
    }],
  };
}

const clone = (x) => structuredClone(x);

async function selftest() {
  const base = fixtureRecord();
  const artifacts = [{ id: "x-android", product: "X" }];
  const pageOf = (record) => `head\n<!-- ANDROIDAPI:BEGIN -->\n${renderRegion(record)}<!-- ANDROIDAPI:END -->\ntail\n`;
  const goodPage = pageOf(base);
  const goodRel = { version: "1.0.0", filename: "x-android-1.0.0.aar", sha256: "aa", sha512: "aaaa" };
  const goodRegistry = async () => goodRel;
  const asExtracted = (record) => ({ surface: clone(record.artifacts[0].surface), filename: goodRel.filename, sha256: "aa", sha512: "aaaa" });
  const goodExtract = () => asExtracted(base);
  // A snippet that uses the fixture SDK the way the page documents it.
  const snippet = (code) => [{ file: "fixture.md", line: 1, code: `import ai.bithuman.x.Avatar\n${code}` }];
  const goodSnippets = snippet("fun f(a: Avatar, pcm: ByteArray) {\n  a.render(audio = pcm).toList()\n  println(a.width)\n}");
  const V = (o) => verdict({ record: base, pageText: goodPage, registry: goodRegistry, extract: goodExtract, artifacts, snippets: goodSnippets, ...o });

  const arms = [];
  const arm = async (label, want, wantIn, run) => {
    let got, lines;
    try {
      const v = await run();
      got = v.code;
      lines = v.lines.join("\n");
    } catch (e) {
      got = e instanceof CannotCheck ? CANNOT_CHECK : -1;
      lines = String(e.message);
    }
    const ok = got === want && (!wantIn || lines.includes(wantIn));
    arms.push({ label, ok, got, want, lines });
    console.log(`  ${ok ? "ok  " : "FAIL"} ${label} -> exit ${got}${ok ? "" : ` (wanted ${want}${wantIn ? `, containing ${JSON.stringify(wantIn)}` : ""})`}`);
  };

  console.log("check-android-api-current --selftest: every outcome, no network\n");

  await arm("PASS: page, record and registry agree", PASS, "OK —", () => V({}));

  await arm("FAIL P4: a member was ADDED to the shipped surface", FAIL, "ADDED      ai.bithuman.x.Avatar.close()V", () => {
    const moved = clone(base);
    moved.artifacts[0].surface.classes[0].functions.push({ name: "close", signature: "fun close()", suspend: false, jvm: "close()V", loadable: true });
    return V({ extract: () => asExtracted(moved) });
  });

  await arm("FAIL P4: a member was REMOVED from the shipped surface", FAIL, "REMOVED    ai.bithuman.x.Avatar.width", () => {
    const moved = clone(base);
    moved.artifacts[0].surface.classes[0].properties = [];
    return V({ extract: () => asExtracted(moved) });
  });

  await arm("FAIL P4: a SIGNATURE changed (nullability)", FAIL, "CHANGED    ai.bithuman.x.Avatar.render([B)Lkotlin/sequences/Sequence;", () => {
    const moved = clone(base);
    moved.artifacts[0].surface.classes[0].functions[0].signature = "fun render(audio: ByteArray?): Sequence<ByteArray>";
    return V({ extract: () => asExtracted(moved) });
  });

  await arm("FAIL P4: a member moved between the declared and the runtime side", FAIL, "REMOVED    ai.bithuman.x.Avatar [internal] open$x_release()V", () => {
    const moved = clone(base);
    moved.artifacts[0].surface.classes[0].loadable_undeclared = [];
    return V({ extract: () => asExtracted(moved) });
  });

  await arm("FAIL P2: the registry moved and the record still names the old version", FAIL, "THE RECORD IS STALE", () =>
    V({ registry: async () => ({ version: "1.0.1", filename: "x-android-1.0.1.aar", sha256: "bb", sha512: "bbbb" }) }));

  await arm("FAIL P2: the record covers a different artifact set", FAIL, "DOES NOT COVER THE ARTIFACTS", () =>
    V({ artifacts: [{ id: "x-android", product: "X" }, { id: "y-android", product: "Y" }] }));

  await arm("FAIL P3: the recorded digest is not the published one", FAIL, "NOT THE PUBLISHED ONE", () =>
    V({ registry: async () => ({ ...goodRel, sha256: "zz" }) }));

  await arm("FAIL P3: the recorded filename is not what Central serves", FAIL, "NAMES A FILE", () =>
    V({ registry: async () => ({ ...goodRel, filename: "x-android-1.0.0-sources.jar" }) }));

  await arm("FAIL P1: the page region was edited by hand", FAIL, "NOT WHAT THE RECORD RENDERS", () =>
    V({ pageText: goodPage.replace("fun render(audio: ByteArray)", "fun render(audio: ByteArray, fps: Int)") }));

  await arm("FAIL P5: a snippet calls a function the reference does not list", FAIL, "fixture.md:3  Avatar.renderAll", () =>
    V({ snippets: snippet("fun f(a: Avatar, pcm: ByteArray) {\n  a.renderAll(pcm)\n}") }));

  await arm("FAIL P5: a snippet passes a named argument no listed overload takes", FAIL, "Avatar.render(pcm16 = …)", () =>
    V({ snippets: snippet("fun f(a: Avatar, pcm: ByteArray) = a.render(pcm16 = pcm)") }));

  await arm("FAIL P5: a snippet calls into a public class the page has no section for", FAIL, "Essence2Elevated  — public in the AAR", () => {
    const moved = clone(base);
    // public in the AAR, withheld from the page by the vocabulary screen
    moved.artifacts[0].surface.classes.push({ ...clone(base.artifacts[0].surface.classes[0]), name: "ai.bithuman.x.Essence2Elevated" });
    moved.artifacts[0].surface.packages[0].typealiases.push({ name: "Essence2Elevated", visibility: "public", target: "ai.bithuman.x.Essence2Elevated" });
    return verdict({ record: moved, pageText: goodPage, registry: goodRegistry, extract: goodExtract, artifacts,
      snippets: snippet("val h = Essence2Elevated.open()") });
  });

  await arm("PASS P5: a call inside a comment or a string is not graded", PASS, "OK —", () =>
    V({ snippets: snippet("// a.renderAll(pcm)\nval s = \"Avatar.renderAll()\"") }));

  await arm("CANNOT CHECK: the registry cannot be reached", CANNOT_CHECK, null, () =>
    V({ registry: async () => { throw new CannotCheck("repo1.maven.org: fetch failed"); } }));

  await arm("CANNOT CHECK: the extractor cannot run here (no JDK)", CANNOT_CHECK, null, () =>
    V({ extract: () => { throw new CannotCheck("the extractor did not run under java"); } }));

  await arm("CANNOT CHECK: the bytes read here are not the published bytes", CANNOT_CHECK, null, () =>
    V({ extract: () => ({ ...goodExtract(), sha256: "tampered" }) }));

  // ★THE CONTROLS. An instrument whose arms all agree proves nothing about the
  // distinctions it claims to draw.
  const codes = new Set(arms.map((a) => a.want));
  const distinct = codes.size === 3 && codes.has(PASS) && codes.has(FAIL) && codes.has(CANNOT_CHECK);
  console.log(`  ${distinct ? "ok  " : "FAIL"} control: all three outcomes are exercised and their exits are distinct (0/1/2)`);
  const failArms = arms.filter((a) => a.want === FAIL).length;
  const kinds = failArms >= 8;
  console.log(`  ${kinds ? "ok  " : "FAIL"} control: every KIND of FAIL has its own arm (${failArms} of them)`);

  const bad = arms.filter((a) => !a.ok).length + (distinct ? 0 : 1) + (kinds ? 0 : 1);
  console.log(
    bad === 0
      ? `\ncheck-android-api-current --selftest: OK — ${arms.length}/${arms.length} arms fired as required.`
      : `\ncheck-android-api-current --selftest: ${bad} arm(s) wrong — this instrument is not proven.`);
  return bad === 0 ? PASS : FAIL;
}

/* ---------------------------------------------------------------------- main */

const args = process.argv.slice(2);

if (args.includes("--selftest")) {
  process.exit(await selftest());
}

// P5 alone, with no network: the docs snippets against the committed page.
if (args.includes("--snippets")) {
  const record = JSON.parse(readFileSync(RECORD_PATH, "utf8"));
  const page = splitPage(readFileSync(PAGE_PATH, "utf8"));
  if (!page) { console.error(`${PAGE_PATH} has no ANDROIDAPI markers.`); process.exit(FAIL); }
  const g = gradeSnippets(page.region, collectSnippets(), publicNames(record));
  for (const f of g.failures) console.error(`  ${f.where}  ${f.what}  — ${f.why}`);
  console.log(g.failures.length
    ? `check-android-api-current --snippets: FAIL — ${g.failures.length} call(s) not in the reference.`
    : `check-android-api-current --snippets: OK — ${g.calls} SDK call(s) in ${g.fences} Kotlin snippet(s) on ${g.pages} page(s), every one in the reference.`);
  process.exit(g.failures.length ? FAIL : PASS);
}

const jArg = args.indexOf("--java");
const java = jArg > -1 ? args[jArg + 1] : undefined;

try {
  const record = JSON.parse(readFileSync(RECORD_PATH, "utf8"));
  const pageText = readFileSync(PAGE_PATH, "utf8");
  // The extraction is asynchronous (it downloads); the verdict takes a sync
  // `extract` so the selftest stays a pure function. Resolve it up front for
  // each recorded artifact, deferring any refusal to where the verdict asks.
  const fresh = new Map();
  for (const e of record.artifacts) {
    const id = e.artifact.coordinate.slice(GROUP.length + 1);
    try {
      const rel = await newestRelease(id);
      fresh.set(id, await downloadAndExtract({ id, version: rel.version, java }));
    } catch (err) {
      fresh.set(id, err);
    }
  }
  const { code, lines } = await verdict({
    record,
    pageText,
    snippets: collectSnippets(),
    registry: (id) => newestRelease(id),
    extract: ({ id }) => {
      const x = fresh.get(id);
      if (x instanceof Error) throw x;
      return x;
    },
  });
  for (const l of lines) (code === PASS ? console.log : console.error)(l);
  if (code === FAIL) {
    console.error(
      "\ncheck-android-api-current: FAIL — the committed reference is not the shipped surface.\n" +
      "This is exit 1: a real disagreement, not an infrastructure problem.");
  }
  process.exit(code);
} catch (e) {
  if (e instanceof CannotCheck) {
    console.error(`check-android-api-current: CANNOT CHECK — ${e.message}`);
    console.error(
      "\nThis is exit 2. It is NOT a pass: nothing was compared. The page may be\n" +
      "correct or stale and this run cannot tell you which.");
    process.exit(CANNOT_CHECK);
  }
  throw e;
}
