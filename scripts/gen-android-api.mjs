#!/usr/bin/env node
// THE ANDROID API REFERENCE IS GENERATED FROM THE AAR A GRADLE BUILD RESOLVES.
//
// ★THE GOVERNING RULE, the estate's since the Python slice corrected it:
//
//     A SYMBOL ENTERS THE REFERENCE ONLY IF THE SHIPPED INTERFACE AND THE
//     SHIPPED RUNTIME AGREE ON IT. WHERE THEY DISAGREE, SAY SO RATHER THAN
//     PICK ONE. NEVER GENERATE FROM A SOURCE TREE.
//
// Both failure modes are real and they are mirror images. In the Python wheel
// `Avatar.__init__(self, engine, engine_id, armed=True)` is on the runtime
// class and in no stub; `Audio` is declared by the stub and raises ImportError.
// On Android the same split is the Kotlin METADATA (what the Kotlin compiler
// believes: visibility, nullability, defaults, suspend, typealiases) against
// the CLASS FILES (what a class loader binds to). Measured on the two
// published artifacts while this was written:
//
//   - essence2-android 0.5.7 has 17 classes and 58 members the metadata marks
//     `internal` that are `public` in the class file — a Java caller can call
//     `MeteringRefused(String)` and `Essence2ModelStore.parseFetchManifest`,
//     a Kotlin caller cannot, and a reference read from `javap` alone would
//     have published all of them.
//   - the product-named package `ai.bithuman.essence2` is EIGHT TYPEALIASES
//     in a file facade whose class file is EMPTY. A reference read from the
//     class files alone would not know the package exists; one read from the
//     metadata alone would not know a Java caller cannot see it.
//
// So the extraction reads BOTH and records both directions of disagreement —
// see scripts/android-api-extract.java, which runs against the AAR.
//
// WHAT THIS TOOL DOES, for each artifact in ARTIFACTS
//   1. Asks Maven Central's maven-metadata.xml for the `<release>` version.
//   2. Downloads that exact .aar and verifies it against Central's own
//      .sha256 AND .sha512 sidecars before anything reads it.
//   3. Runs the extractor (Java, three pinned and digest-verified jars).
//   4. Writes scripts/android-surface.json: the artifact record plus the whole
//      public surface, whether or not the page prints it.
//   5. Renders the page region between the ANDROIDAPI markers on
//      src/content/docs/sdk/android-api.md from that record.
//
// THE RECORD names each artifact as {registry, coordinate, version, digest,
// filename, resolved_on}. ★`filename` is not optional: a Maven release carries
// an .aar, a -sources.jar, a -javadoc.jar, a .pom and a .module, each with its
// own digest, and a digest with no filename beside it names nothing.
//
// ★THE VERSION IS WRITTEN AS PLAIN TEXT ON THE PAGE, in its own table cell,
// never as `implementation("ai.bithuman:x:V")`. check-versions-current.mjs
// grades that Gradle form (V1) as a claim that V is what to install today.
// This page states which bytes it was READ FROM, which is a different claim.
//
// ★WHAT THE PAGE MAY NOT PRINT. The artifacts' own public surfaces carry names
// this site is forbidden to publish: the declaring package of essence2-android
// is a retired product name, and public classes and members name internal
// mechanisms (a teeth borrow, donors, a plane, a bank). The AUTHORITY is
// check-internal-vocabulary.mjs and check-retired-model-names.mjs, which grade
// the emitted page like any other. The screen below exists so this tool's
// output is mergeable, not as a second authority: a name it stops is WITHHELD
// FROM THE PAGE AND COUNTED, never dropped from the record, so the gate still
// grades it. If the screen ever drifts from the two guards, the build goes red
// and this is the list to fix. The one retired name the page must spell — the
// legacy package a developer types in an import — is printed once per
// artifact, in the sentence that says it is legacy, which is the form the
// retired-names guard admits and the form two other pages already use.
//
//   node scripts/gen-android-api.mjs            # regenerate record + page
//   node scripts/gen-android-api.mjs --dry-run  # print what would change
//   node scripts/gen-android-api.mjs --java /path/to/java
//
// Exit 0 written · 1 a broken render · 2 CANNOT GENERATE (Central unreachable,
// a digest does not match, no JDK, the extractor did not run).

import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

export const ROOT = new URL("..", import.meta.url).pathname.replace(/\/$/, "");
export const RECORD_PATH = join(ROOT, "scripts/android-surface.json");
export const PAGE_PATH = join(ROOT, "src/content/docs/sdk/android-api.md");
export const EXTRACTOR = join(ROOT, "scripts/android-api-extract.java");

export const BEGIN = "<!-- ANDROIDAPI:BEGIN -->";
export const END = "<!-- ANDROIDAPI:END -->";

export const REGISTRY = "maven-central";
export const GROUP = "ai.bithuman";
export const CENTRAL = "https://repo1.maven.org/maven2";

/** The artifacts this page describes, in page order. `product` is the name a
 *  reader knows the artifact by; the page never invents one. */
export const ARTIFACTS = [
  { id: "essence2-android", product: "Essence 2" },
  { id: "expression2-android", product: "Expression 2" },
];

/** The extractor's own dependencies: pinned to a version AND a digest, like a
 *  lockfile. JetBrains publish no .sha256 sidecar for the Kotlin jars (only
 *  .md5/.sha1), so the pins were taken from the bytes Central served on
 *  2026-09-15 after their .sha1 sidecars matched. A release on Central is
 *  immutable; a mismatch here is CANNOT CHECK, never a pass. */
export const TOOLS = [
  { path: "org/jetbrains/kotlin/kotlin-metadata-jvm/2.4.20/kotlin-metadata-jvm-2.4.20.jar",
    sha256: "98d9b1847908adfde7a8b2d4cc35708d7ddccae0698cec56bcb506bcf9392595" },
  { path: "org/jetbrains/kotlin/kotlin-stdlib/2.4.20/kotlin-stdlib-2.4.20.jar",
    sha256: "2226de463d309d4a5500a481320b3dea515a6981dcae1def531fbc158884e25f" },
  { path: "org/ow2/asm/asm/9.10.1/asm-9.10.1.jar",
    sha256: "ed825d10ab1399c8c0cb669e688cf0c8c82629b4c8399b58352b68e92ca10fcb" },
];

/** Thrown for anything that means "I could not look" — never a pass. */
export class CannotCheck extends Error {}

/* ------------------------------------------------------------------ registry */

const UA = "bithuman-public-docs-android-api (+https://github.com/bithuman-product/public-docs)";
const RETRY = new Set([403, 408, 429, 500, 502, 503, 504]);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function get(url, headers = {}) {
  let last = "";
  for (let attempt = 1; attempt <= 4; attempt++) {
    let res;
    try {
      res = await fetch(url, {
        redirect: "follow",
        headers: { "User-Agent": UA, ...headers },
        signal: AbortSignal.timeout(60000),
      });
    } catch (e) {
      last = `${url}: ${e.message}`;
      await sleep(2000 * 2 ** (attempt - 1));
      continue;
    }
    if (res.ok) return res;
    last = `${url}: HTTP ${res.status}`;
    if (!RETRY.has(res.status)) break;
    await sleep(2000 * 2 ** (attempt - 1));
  }
  throw new CannotCheck(last);
}

const SEMVER = /^\d+\.\d+\.\d+$/;
const HEX = (n) => new RegExp(`^[0-9a-f]{${n}}$`);

const sidecar = async (url) => {
  const t = (await (await get(url)).text()).trim().split(/\s+/)[0].toLowerCase();
  return t;
};

/** The newest published version of an artifact, and the digests Central
 *  publishes for its .aar. Cache-busted the way the version guard does it. */
export async function newestRelease(id) {
  const base = `${CENTRAL}/${GROUP.replace(/\./g, "/")}/${id}`;
  const xml = await (await get(`${base}/maven-metadata.xml?cb=${Date.now()}`, { "Cache-Control": "no-cache" })).text();
  const version = /<release>([^<]+)<\/release>/.exec(xml)?.[1]?.trim();
  if (!version || !SEMVER.test(version)) {
    throw new CannotCheck(`${base}/maven-metadata.xml: <release> is ${JSON.stringify(version)}`);
  }
  const filename = `${id}-${version}.aar`;
  const url = `${base}/${version}/${filename}`;
  const sha256 = await sidecar(`${url}.sha256`);
  const sha512 = await sidecar(`${url}.sha512`);
  if (!HEX(64).test(sha256) || !HEX(128).test(sha512)) {
    throw new CannotCheck(`${url}: the .sha256/.sha512 sidecars are not digests`);
  }
  return { version, filename, url, sha256, sha512 };
}

/* ------------------------------------------------------------------- extract */

function run(cmd, args, opts = {}) {
  return execFileSync(cmd, args, {
    encoding: "utf8",
    maxBuffer: 64 * 1024 * 1024,
    stdio: ["ignore", "pipe", "pipe"],
    ...opts,
  });
}

const sha256Of = (bytes) => createHash("sha256").update(bytes).digest("hex");
const sha512Of = (bytes) => createHash("sha512").update(bytes).digest("hex");

/** The three jars, fetched once into a cache under TMPDIR and verified
 *  against their pins every time they are used. */
export async function ensureTools() {
  const cache = join(process.env.TMPDIR || tmpdir(), "android-api-tools");
  mkdirSync(cache, { recursive: true });
  const jars = [];
  for (const t of TOOLS) {
    const file = join(cache, t.path.split("/").pop());
    if (!existsSync(file) || sha256Of(readFileSync(file)) !== t.sha256) {
      const bytes = Buffer.from(await (await get(`${CENTRAL}/${t.path}`)).arrayBuffer());
      const got = sha256Of(bytes);
      if (got !== t.sha256) {
        throw new CannotCheck(`${t.path}: Central served sha256:${got}, this tool pins sha256:${t.sha256}`);
      }
      writeFileSync(file, bytes);
    }
    jars.push(file);
  }
  return jars;
}

/**
 * Download the published .aar, verify it against Central's own sidecars, and
 * read its surface back with the extractor. Returns the surface and the
 * digests of the exact bytes read.
 */
export async function downloadAndExtract({ id, version, java = process.env.JAVA || "java" }) {
  const base = `${CENTRAL}/${GROUP.replace(/\./g, "/")}/${id}/${version}`;
  const filename = `${id}-${version}.aar`;
  const dir = mkdtempSync(join(process.env.TMPDIR || tmpdir(), "androidapi-"));
  try {
    const bytes = Buffer.from(await (await get(`${base}/${filename}`)).arrayBuffer());
    const sha256 = sha256Of(bytes);
    const sha512 = sha512Of(bytes);
    const want256 = await sidecar(`${base}/${filename}.sha256`);
    const want512 = await sidecar(`${base}/${filename}.sha512`);
    if (sha256 !== want256 || sha512 !== want512) {
      throw new CannotCheck(
        `the .aar downloaded is not what Central's sidecars describe:\n` +
        `  file    ${filename}\n  sha256  central ${want256}\n          local   ${sha256}\n` +
        `  sha512  central ${want512.slice(0, 32)}…\n          local   ${sha512.slice(0, 32)}…`);
    }
    const aar = join(dir, filename);
    writeFileSync(aar, bytes);

    let jars;
    try {
      jars = await ensureTools();
    } catch (e) {
      if (e instanceof CannotCheck) throw e;
      throw new CannotCheck(`could not fetch the extractor's jars: ${e.message}`);
    }
    let out;
    try {
      out = run(java, ["-cp", jars.join(":"), EXTRACTOR, aar]);
    } catch (e) {
      throw new CannotCheck(
        `the extractor did not run under ${java} (is a JDK installed?):\n${(e.stderr || e.message).slice(0, 4000)}`);
    }
    let surface;
    try {
      surface = JSON.parse(out);
    } catch (e) {
      throw new CannotCheck(`the extractor did not produce JSON: ${e.message}`);
    }
    return { surface, filename, sha256, sha512 };
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}

/* -------------------------------------------------------------------- policy */

// ★See the header: this is NOT the authority, the two vocabulary guards are.
// It is the union of what they grade, applied to identifiers, which get no
// marker or carrier protection. A NAME this matches is withheld from the page
// and counted; a SIGNATURE or a constant VALUE this matches is withheld and
// the member's name and arity stand.
const SCREEN = [
  /\bborrow\w*/i, /\bpassthrough\b/i, /\bdonors?\b/i, /\bbanks?\b/i, /\barm(ed|ing)\b/i,
  /\bw0\b/i, /\bpi[ -]frames?\b/i, /\bdirectors?\b/i, /(?<![-\w])ane(?![-\w])/i, /\bplanes?\b/i,
  /\bcompos(e|ed|es|ing|ition|itions|ite|ited|ites|iting|itor|itors)\b/i,
  /\bdream[-_ ]?1\b/i, /\bessence[-_ ]?2[-_ ]?max(?![a-z])/i,
  /elevate/i, /embody/i, /essence-2-(light|quality|mobile)/i, /lebundle/i,
  /essence2[-_](light|quality)/i, /tessera/i, /libessence/i,
];
export const allowed = (s) => !SCREEN.some((re) => re.test(s ?? ""));

/* --------------------------------------------------------------- rendering */

const table = (rows) => rows.map((r) => `| ${r.join(" | ")} |`).join("\n");
const n = (k, one, many = one + "s") => `${k} ${k === 1 ? one : many}`;
const code = (s) => `\`${s}\``;

const pkgOf = (jvm) => jvm.slice(0, jvm.lastIndexOf("."));
/** `ai.b.Outer$Inner` -> `Outer.Inner` */
const simpleOf = (jvm) => jvm.slice(jvm.lastIndexOf(".") + 1).replace(/\$/g, ".");

/** The name the page calls a class by: its product-package alias where one
 *  exists, else its own simple name. */
function displayName(cls, aliases) {
  const alias = aliases.find((a) => a.target === cls.name);
  return alias ? alias.name : simpleOf(cls.name);
}

/** A signature with every aliased class spelled by its alias — the public
 *  name this page documents the class under. Render-time only; the record
 *  keeps the declaration's own spelling. */
function spell(sig, aliases) {
  let out = sig ?? "";
  for (const a of aliases) {
    const own = simpleOf(a.target);
    if (own !== a.name) out = out.replace(new RegExp(`(?<![\\w.])${own.replace(/\./g, "\\.")}(?![\\w])`, "g"), a.name);
  }
  return out;
}

function kindWord(c) {
  const k = c.kind;
  if (k === "object") return "object";
  if (k === "companion-object") return "companion object";
  if (k === "interface") return (c.modality === "sealed" ? "sealed " : "") + (c.is_fun_interface ? "fun interface" : "interface");
  if (k === "enum-class") return "enum class";
  if (k === "annotation-class") return "annotation class";
  if (c.is_data) return "data class";
  if (c.modality === "sealed") return "sealed class";
  if (c.modality === "abstract") return "abstract class";
  if (c.modality === "open") return "open class";
  return "class";
}

/** How many parameters a Kotlin signature takes. */
export function arity(sig) {
  const m = /\(([^()]*(?:\([^()]*\)[^()]*)*)\)/.exec(sig || "");
  if (!m || !m[1].trim()) return 0;
  // split on commas outside <> and ()
  let depth = 0, count = 1;
  for (const ch of m[1]) {
    if (ch === "<" || ch === "(") depth++;
    else if (ch === ">" || ch === ")") depth--;
    else if (ch === "," && depth === 0) count++;
  }
  return count;
}

const DATA_GENERATED = /^(operator fun component\d+\(\)|fun copy\(|fun hashCode\(\)|fun toString\(\)|operator fun equals\(other: Any\?\))/;

/** One member line inside the class fence, or null when its name is withheld. */
function memberLine(sig, extra = {}) {
  const name = /(?:fun|val|var|constructor)\s+(?:[\w.<>, ]+\.)?([\w<>]+)|^constructor/.exec(sig);
  const ident = name ? (name[1] ?? "constructor") : sig;
  if (!allowed(ident)) return null;
  let line;
  if (allowed(sig)) {
    line = sig;
    if (extra.value !== undefined && extra.value !== null) {
      const v = typeof extra.value === "string" ? JSON.stringify(extra.value) : String(extra.value);
      line += allowed(v) && v.length <= 96 ? ` = ${v}` : "  // value withheld: it names an internal mechanism";
    }
  } else {
    const head = /^(.*?\b(?:fun|val|var)\s+[\w.]+|constructor)/.exec(sig)?.[1] ?? ident;
    line = `${head}(…)  // ${n(arity(sig), "parameter")}; the signature names an internal mechanism and is withheld`;
  }
  if (extra.deprecated !== undefined) {
    const msg = extra.deprecated && allowed(extra.deprecated) ? `(${JSON.stringify(extra.deprecated)})` : "";
    line = `@Deprecated${msg}\n${line}`;
  }
  return line;
}

/** A class as one ```kotlin fence: its header, constructors, properties,
 *  functions, and its companion's members. Returns the fence and the number
 *  of members withheld. */
function renderClass(c, companion, aliases) {
  const name = displayName(c, aliases);
  const sp = (sig) => spell(sig, aliases);
  const lines = [];
  let withheld = 0;
  let header = `${kindWord(c)} ${name}${c.type_parameters || ""}`;
  // `Enum<Self>` is implicit on every enum class and is not something a caller wrote.
  const written = c.supertypes.map(sp).filter((t) => !(c.kind === "enum-class" && /^Enum</.test(t)));
  const supers = written.filter(allowed);
  withheld += written.length - supers.length;
  if (supers.length) header += ` : ${supers.join(", ")}`;
  lines.push(header);
  if (c.enum_entries.length) lines.push(`    ${c.enum_entries.join(", ")}`);
  if (c.sealed_subclasses.length) {
    const subs = c.sealed_subclasses.map(sp).filter(allowed);
    withheld += c.sealed_subclasses.length - subs.length;
    lines.push(`    // sealed: ${subs.join(", ")}`);
  }
  const members = (cls) => {
    const out = [];
    for (const x of cls.constructors) {
      const l = memberLine(sp(x.signature), { deprecated: x.deprecated });
      if (l === null) withheld++; else out.push(l);
    }
    for (const x of cls.properties) {
      const l = memberLine(sp(x.signature), { value: x.value, deprecated: x.deprecated });
      if (l === null) withheld++; else out.push(l);
    }
    let generated = 0;
    for (const x of cls.functions) {
      if (cls.is_data && DATA_GENERATED.test(x.signature)) { generated++; continue; }
      const l = memberLine(sp(x.signature), { deprecated: x.deprecated });
      if (l === null) withheld++; else out.push(l);
    }
    if (generated) out.push(`// data class: copy, componentN, equals, hashCode and toString as Kotlin generates them`);
    return out;
  };
  for (const l of members(c)) lines.push(...l.split("\n").map((s) => "    " + s));
  if (companion) {
    lines.push("    companion object");
    for (const l of members(companion)) lines.push(...l.split("\n").map((s) => "        " + s));
  }
  return { fence: "```kotlin\n" + lines.join("\n") + "\n```", withheld, name };
}

const KIND_ROWS = {
  "default-argument-bridge": ["`$default` bridges and marker constructors", "how a default argument is supplied when the caller omits it; Kotlin resolves them for you"],
  "jvm-overload": ["overloads for Java callers", "the same function or constructor with trailing defaulted parameters dropped (`@JvmOverloads`, or the no-argument constructor of an all-defaults class)"],
  "jvm-static": ["static copies of companion functions", "`@JvmStatic`: the companion's function again, as a static of the outer class"],
  "object-instance": ["`INSTANCE` and `Companion` fields", "how Java reaches a Kotlin `object`; a Kotlin caller names the object"],
  "enum-entry": ["enum entry fields", "the entries listed above, as static fields"],
  "enum-static": ["`values()`, `valueOf()`, `getEntries()`", "the enum statics Kotlin generates"],
  "synthetic": ["synthetic accessors and annotation holders", "compiler plumbing: `access$…`, `…$annotations`, bridge methods"],
};

/** The whole region between the markers, from the record and nothing else. */
export function renderRegion(record) {
  const out = [];
  out.push(
    "Each artifact below is one section: the bytes it was read from, the packages " +
    "it declares, every public class with its members as Kotlin spells them, and " +
    "then everything in the class files that is NOT that surface.");
  out.push("");

  for (const entry of record.artifacts) {
    const a = entry.artifact;
    const s = entry.surface;
    const f = s.artifact_facts;
    const meta = ARTIFACTS.find((x) => `${GROUP}:${x.id}` === a.coordinate);
    const product = meta?.product ?? a.coordinate;

    out.push(`## ${product} — ${a.coordinate}`);
    out.push("");
    out.push(table([
      ["Field", "Value"],
      ["---", "---"],
      ["Registry", a.registry],
      ["Coordinate", a.coordinate],
      ["Version", a.version],
      ["File", code(a.filename)],
      ["Digest", code(a.digest)],
      ["Resolved on", a.resolved_on],
    ]));
    out.push("");
    out.push(table([
      ["What the artifact declares", "Value"],
      ["---", "---"],
      ["`minSdk`", f.min_sdk == null ? "not stated in the manifest" : String(f.min_sdk)],
      ["ABIs", f.abis.map(code).join(", ") || "none"],
      ["Native libraries", f.native_libraries.map(code).join(", ") || "none"],
      ["Permissions merged into your app", f.uses_permissions.map(code).join(", ") || "none"],
      ["Kotlin metadata", `version ${f.kotlin_metadata_version}`],
    ]));
    out.push("");

    // ---- packages -----------------------------------------------------------
    const aliases = s.packages.flatMap((p) => p.typealiases.filter((t) => t.visibility === "public").map((t) => ({ ...t, pkg: p.name })));
    const publicClasses = s.classes.filter((c) => c.loadable && c.kind !== "companion-object");
    const declaring = [...new Set(publicClasses.map((c) => pkgOf(c.name)))].sort();
    for (const pkg of declaring) {
      const count = publicClasses.filter((c) => pkgOf(c.name) === pkg).length;
      const aliasPkgs = [...new Set(aliases.filter((t) => pkgOf(t.target) === pkg).map((t) => t.pkg))].sort();
      if (allowed(pkg)) {
        out.push(`${n(count, "public class", "public classes")} on the package ${code(pkg)}.`);
      } else {
        // The one retired spelling the page must carry: the import a developer
        // types. Said once, in the sentence that says what it is.
        out.push(
          `${n(count, "public class", "public classes")} on the package ${code(pkg)} — a legacy ` +
          `package name kept for compatibility, which a developer still types in an import` +
          (aliasPkgs.length
            ? `; ${code(aliasPkgs.join("`, `"))} below aliases ${aliases.filter((t) => pkgOf(t.target) === pkg).length} of them under product names, and a nested class is reached through the legacy package only`
            : "") + ".");
      }
      out.push("");
    }
    for (const p of s.packages) {
      const pub = p.typealiases.filter((t) => t.visibility === "public");
      if (!pub.length && !p.functions.length && !p.properties.length) continue;
      out.push(`### ${p.name}`);
      out.push("");
      if (pub.length) {
        out.push(
          `${n(pub.length, "typealias", "typealiases")}, declared by the package's Kotlin metadata and present in ` +
          `no class file: a Kotlin caller imports these names, a Java caller cannot see them.`);
        out.push("");
        out.push(table([
          ["Alias", "Declared as", "Both sides agree"],
          ["---", "---", "---"],
          ...pub.map((t) => [
            code(t.name),
            allowed(simpleOf(t.target)) ? code(simpleOf(t.target)) : "a class whose own name is withheld — it names an internal mechanism",
            t.target_declared_public && t.target_loadable ? "yes" : t.target_loadable ? "the class is loadable and not declared public" : "the class is declared and not loadable",
          ]),
        ]));
        out.push("");
      }
      for (const fn of p.functions) {
        const l = memberLine(fn.signature, { deprecated: fn.deprecated });
        out.push(l === null ? "_A top-level function is withheld: its name describes an internal mechanism._" : "```kotlin\n" + l + "\n```");
        out.push("");
      }
      for (const pr of p.properties) {
        const l = memberLine(pr.signature, { value: pr.value, deprecated: pr.deprecated });
        out.push(l === null ? "_A top-level property is withheld: its name describes an internal mechanism._" : "```kotlin\n" + l + "\n```");
        out.push("");
      }
    }

    // ---- classes ------------------------------------------------------------
    const companions = new Map(s.classes.filter((c) => c.kind === "companion-object").map((c) => [c.name, c]));
    let withheldClasses = 0;
    const shown = [];
    for (const c of publicClasses) {
      const name = displayName(c, aliases);
      if (!allowed(name)) { withheldClasses++; continue; }
      shown.push(c);
    }
    shown.sort((x, y) => displayName(x, aliases).localeCompare(displayName(y, aliases), "en"));
    out.push(`### Classes`);
    out.push("");
    out.push(
      `${n(publicClasses.length, "public class", "public classes")}, each declared public by the Kotlin ` +
      `metadata and public in its class file.` +
      (withheldClasses
        ? ` ${withheldClasses} of them are not listed here: their names describe an internal mechanism, and they are not part of opening an avatar and rendering audio through it.`
        : ""));
    out.push("");
    for (const c of shown) {
      const comp = c.companion ? companions.get(`${c.name}$${c.companion}`) : null;
      const { fence, withheld, name } = renderClass(c, comp, aliases);
      out.push(`#### ${name}`);
      out.push("");
      out.push(fence);
      out.push("");
      if (withheld) {
        out.push(`${n(withheld, "member is", "members are")} withheld: the name describes an internal mechanism.`);
        out.push("");
      }
    }

    // ---- the rest of the class files ----------------------------------------
    out.push("### In the class files, not the surface");
    out.push("");
    out.push(
      "A reference generated from `javap` would have listed each of these. They are " +
      "in the AAR and public to the class loader, and a Kotlin caller either cannot " +
      "name them or never needs to.");
    out.push("");
    const rows = [];
    const internalClasses = s.disagreements.internal_classes;
    if (internalClasses.length) {
      const names = internalClasses.map((c) => simpleOf(c.name)).filter(allowed);
      rows.push([
        `${n(internalClasses.length, "class", "classes")} declared \`internal\``,
        "`public` in the class file; the Kotlin compiler refuses them from outside the artifact, Java does not",
        names.length ? names.map(code).join(", ") + (names.length < internalClasses.length ? ` and ${internalClasses.length - names.length} whose names are withheld` : "") : "names withheld",
      ]);
    }
    const byKind = new Map();
    const internalMembers = [];
    const other = [];
    for (const c of s.classes) {
      for (const u of c.loadable_undeclared) {
        if (u.kind === "internal" || u.kind === "private" || u.kind === "protected") {
          internalMembers.push({ cls: c, u });
        } else if (u.kind === "other") {
          other.push({ cls: c, u });
        } else {
          byKind.set(u.kind, (byKind.get(u.kind) ?? 0) + 1);
        }
      }
    }
    for (const p of s.packages) {
      for (const u of p.loadable_undeclared) {
        if (u.kind === "internal" || u.kind === "private" || u.kind === "protected") internalMembers.push({ cls: { name: p.name, pkg: true }, u });
        else if (u.kind === "other") other.push({ cls: { name: p.name, pkg: true }, u });
        else byKind.set(u.kind, (byKind.get(u.kind) ?? 0) + 1);
      }
    }
    if (internalMembers.length) {
      const perClass = new Map();
      for (const m of internalMembers) {
        const label = m.cls.pkg ? `the package ${m.cls.name}` : spell(simpleOf(m.cls.name), aliases);
        perClass.set(label, (perClass.get(label) ?? 0) + 1);
      }
      const listed = [...perClass.entries()]
        .sort((x, y) => y[1] - x[1] || x[0].localeCompare(y[0], "en"))
        .map(([label, count]) => `${allowed(label) ? code(label) : "a class whose name is withheld"} (${count})`);
      rows.push([
        `${n(internalMembers.length, "member", "members")} declared \`internal\` on ${n(perClass.size, "class", "classes")}`,
        "`public` in the class file — a function under a mangled name (`name$module`), a field or a constructor as is; a Java caller can call them",
        listed.join(", "),
      ]);
    }
    for (const [kind, count] of [...byKind.entries()].sort()) {
      const [what, why] = KIND_ROWS[kind] ?? [kind, ""];
      rows.push([`${count} ${what}`, "generated by the Kotlin compiler for Java callers", why]);
    }
    for (const o of other) {
      rows.push([code(`${simpleOf(o.cls.name)}.${o.u.jvm}`), "public in the class file and claimed by no declaration", "unexplained — this row is a finding"]);
    }
    const notLoadable = [];
    for (const c of s.classes) {
      for (const x of [...c.constructors, ...c.functions, ...c.properties]) {
        if (!x.loadable) notLoadable.push(`${simpleOf(c.name)}: ${x.signature}`);
      }
    }
    for (const nl of notLoadable) {
      rows.push([allowed(nl) ? code(nl) : "a member whose name is withheld", "declared public by the metadata, absent from the class file", "a Kotlin caller compiles against it and the class loader cannot find it — this row is a finding"]);
    }
    for (const c of s.disagreements.public_classes_without_metadata) {
      rows.push([code(simpleOf(c)), "a public class with no Kotlin metadata", "written in Java, or stripped of its metadata — this row is a finding"]);
    }
    if (s.disagreements.synthetic_classes) {
      rows.push([`${n(s.disagreements.synthetic_classes, "synthetic class", "synthetic classes")}`, "lambdas and `when` tables the compiler emitted", "not nameable from source"]);
    }
    out.push(table([["What", "Why it is not the surface", "What it is"], ["---", "---", "---"], ...rows]));
    out.push("");
  }

  return out.join("\n").replace(/\n{3,}/g, "\n\n").trim() + "\n";
}

/* ----------------------------------------------------------------- the page */

export function splitPage(text) {
  const i = text.indexOf(BEGIN);
  const j = text.indexOf(END);
  if (i === -1 || j === -1 || j < i) return null;
  return {
    head: text.slice(0, i + BEGIN.length),
    region: text.slice(i + BEGIN.length, j).replace(/^\n+|\n+$/g, "") + "\n",
    tail: text.slice(j),
  };
}

/* ------------------------------------------------------------------- diffing */

/** Every public name in a surface, as `class.member` -> its signature, plus
 *  every disagreement, so a member that MOVES between the two sides is a
 *  change the gate names. */
export function flatten(surface) {
  const out = new Map();
  for (const p of surface.packages) {
    out.set(`package ${p.name}`, p.facades.join(","));
    for (const t of p.typealiases) out.set(`${p.name}.${t.name}`, `typealias ${t.visibility} ${t.target}`);
    for (const fn of p.functions) out.set(`${p.name}.${fn.name}`, fn.signature);
    for (const pr of p.properties) out.set(`${p.name}.${pr.name}`, pr.signature + (pr.value !== undefined ? ` = ${JSON.stringify(pr.value)}` : ""));
    for (const u of p.loadable_undeclared) out.set(`${p.name} [${u.kind}] ${u.jvm}`, u.access.join(" "));
  }
  for (const c of surface.classes) {
    out.set(c.name, `${c.kind} ${c.modality}${c.is_data ? " data" : ""} : ${c.supertypes.join(", ")}${c.enum_entries.length ? " {" + c.enum_entries.join(",") + "}" : ""}`);
    for (const x of c.constructors) out.set(`${c.name}.${x.jvm}`, x.signature + (x.loadable ? "" : " [not loadable]") + (x.deprecated !== undefined ? " @Deprecated" : ""));
    for (const x of c.functions) out.set(`${c.name}.${x.jvm}`, x.signature + (x.loadable ? "" : " [not loadable]") + (x.deprecated !== undefined ? " @Deprecated" : ""));
    for (const x of c.properties) out.set(`${c.name}.${x.name}`, x.signature + (x.value !== undefined ? ` = ${JSON.stringify(x.value)}` : "") + (x.loadable ? "" : " [not loadable]") + (x.deprecated !== undefined ? " @Deprecated" : ""));
    for (const u of c.loadable_undeclared) out.set(`${c.name} [${u.kind}] ${u.jvm}`, u.access.join(" "));
  }
  for (const ic of surface.disagreements.internal_classes) out.set(`${ic.name} [class ${ic.declared_visibility}]`, ic.runtime_access.join(" "));
  for (const c of surface.disagreements.public_classes_without_metadata) out.set(`${c} [no metadata]`, "public");
  return out;
}

/** What moved between two surfaces: names added, names removed, signatures changed. */
export function diffSurface(before, after) {
  const A = flatten(before), B = flatten(after);
  const added = [...B.keys()].filter((k) => !A.has(k)).sort();
  const removed = [...A.keys()].filter((k) => !B.has(k)).sort();
  const changed = [...B.keys()]
    .filter((k) => A.has(k) && A.get(k) !== B.get(k))
    .sort()
    .map((k) => ({ name: k, was: A.get(k), now: B.get(k) }));
  return { added, removed, changed };
}

/* ---------------------------------------------------------------------- main */

export function buildEntry({ id, version, filename, sha256, surface, today }) {
  return {
    artifact: {
      registry: REGISTRY,
      coordinate: `${GROUP}:${id}`,
      version,
      digest: `sha256:${sha256}`,
      filename,
      resolved_on: today,
    },
    surface,
  };
}

export async function generate({ java, today = new Date().toISOString().slice(0, 10) } = {}) {
  const artifacts = [];
  for (const { id } of ARTIFACTS) {
    const rel = await newestRelease(id);
    const got = await downloadAndExtract({ id, version: rel.version, java });
    if (got.filename !== rel.filename || got.sha256 !== rel.sha256) {
      throw new CannotCheck(`${id} ${rel.version}: read ${got.filename} sha256:${got.sha256}, Central lists ${rel.filename} sha256:${rel.sha256}`);
    }
    artifacts.push(buildEntry({ id, version: rel.version, filename: got.filename, sha256: got.sha256, surface: got.surface, today }));
  }
  return { artifacts };
}

const invokedDirectly =
  process.argv[1] && import.meta.url === new URL(`file://${process.argv[1]}`).href;

if (invokedDirectly) {
  const args = process.argv.slice(2);
  const dry = args.includes("--dry-run");
  const jArg = args.indexOf("--java");
  const java = jArg > -1 ? args[jArg + 1] : undefined;

  try {
    const record = await generate({ java });
    const region = renderRegion(record);
    const page = splitPage(readFileSync(PAGE_PATH, "utf8"));
    if (!page) {
      console.error(`gen-android-api: ${PAGE_PATH} has no ${BEGIN} / ${END} markers.`);
      process.exit(1);
    }
    const nextPage = `${page.head}\n${region}${page.tail}`;
    const nextRecord = JSON.stringify(record, null, 2) + "\n";
    if (dry) {
      console.log(region);
      console.log(`--- record would be ${nextRecord.length} bytes at ${RECORD_PATH}`);
      process.exit(0);
    }
    writeFileSync(RECORD_PATH, nextRecord);
    writeFileSync(PAGE_PATH, nextPage);
    for (const e of record.artifacts) {
      console.log(`gen-android-api: wrote ${e.artifact.coordinate} ${e.artifact.version} (${e.artifact.filename}, ${e.artifact.digest})`);
    }
    console.log(`  record ${RECORD_PATH}\n  page   ${PAGE_PATH}`);
    process.exit(0);
  } catch (e) {
    if (e instanceof CannotCheck) {
      console.error(`gen-android-api: CANNOT GENERATE — ${e.message}`);
      console.error(`This is exit 2 (could not look), not a failure of the page.`);
      process.exit(2);
    }
    throw e;
  }
}
