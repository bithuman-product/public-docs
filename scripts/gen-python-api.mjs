#!/usr/bin/env node
// THE PYTHON API REFERENCE IS GENERATED FROM THE WHEEL A DEVELOPER INSTALLS.
//
// ★THE GOVERNING RULE, and the only reason this tool exists:
//
//     A SYMBOL ENTERS THE REFERENCE ONLY IF IT IS PUBLIC IN THE SHIPPED
//     INTERFACE. A symbol present in SOURCE, or present in a compiled artifact
//     as a LOCAL symbol, is evidence of the OPPOSITE of presence — it is
//     something a consumer cannot call. NEVER GENERATE FROM A SOURCE TREE.
//     GENERATE FROM THE ARTIFACT A DEVELOPER INSTALLS.
//
// It was paid for on the Apple surface: `pullPos()` exists in the shipped `.a`
// as a local symbol and appears in no `.swiftinterface`, so a reference built
// from the source tree would have documented a method no developer can call.
// The Python spelling of the same defect, measured on the 3.1.8 wheel while
// this was written:
//
//   - `Avatar.__init__(self, engine, engine_id, armed=True)` is on the runtime
//     class and in NO stub. The class docstring says "Get one from
//     bithuman.open". A reference built from the runtime object alone would
//     have published a constructor taking two engine handles.
//   - `Audio`, the audio type alias, is DECLARED BY THE SHIPPED STUB and is not
//     resolvable at runtime: `from bithuman import Audio` raises ImportError.
//     A reference built from the stub alone would have published an import
//     that fails.
//   - `bithuman/lib/*.so` are listed by `pkgutil` as modules and none of them
//     imports: they are native libraries the engine opens by path.
//
// So the extraction reads BOTH and records both directions of disagreement —
// see scripts/python-api-extract.py, which runs inside the venv.
//
// WHAT THIS TOOL DOES
//   1. Asks PyPI for the newest published version of `bithuman`.
//   2. Downloads that exact wheel, checks its sha256 against PyPI's own JSON,
//      and installs it — and NOTHING else — into a throwaway virtualenv.
//   3. Runs the extractor with that venv's interpreter.
//   4. Writes scripts/python-surface.json: the artifact record plus the whole
//      public surface, whether or not the page prints it.
//   5. Renders the page region between the PYAPI markers on
//      src/content/docs/sdk/python-api.md from that record.
//
// THE RECORD names the artifact in the shape the performance record uses —
// {registry, coordinate, version, digest, resolved_on} — plus the wheel
// FILENAME, because a PyPI release has one digest per file and a digest with no
// filename beside it cannot be checked by anyone.
//
// ★THE VERSION IS WRITTEN AS PLAIN TEXT ON THE PAGE, NEVER IN BACKTICKS.
// scripts/check-versions-current.mjs reads an inline code span as a CODE REGION
// and grades `bithuman==X` (V2) there; its V3 rule grades the prose forms
// "`bithuman` X" and "PyPI serves X" as claims that X is the NEWEST published
// version. This page states which wheel it was READ FROM, which is a different
// claim and is deliberately not written in any of those forms.
//
// ★WHAT THE PAGE MAY NOT PRINT. The wheel's own public surface carries names
// and docstrings this site is forbidden to publish: `bithuman.offline` exports
// five constants naming an internal mechanism, and two of its docstrings
// describe that mechanism and name a retired engine id. The AUTHORITY on that
// is check-internal-vocabulary.mjs and check-retired-model-names.mjs, which
// grade the emitted page like any other. The screens below exist so this
// tool's output is mergeable, not as a second authority: a name or a docstring
// they stop is WITHHELD FROM THE PAGE AND COUNTED, never dropped from the
// record, so the gate still grades it. If a screen ever drifts from the two
// guards, the build goes red and this is the list to fix.
//
//   node scripts/gen-python-api.mjs            # regenerate record + page
//   node scripts/gen-python-api.mjs --dry-run  # print what would change
//   node scripts/gen-python-api.mjs --python python3.12
//
// Exit 0 written · 1 nothing to write is not a failure, a broken render is ·
// 2 CANNOT CHECK (PyPI unreachable, the wheel will not install here).

import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

export const ROOT = new URL("..", import.meta.url).pathname.replace(/\/$/, "");
export const RECORD_PATH = join(ROOT, "scripts/python-surface.json");
export const PAGE_PATH = join(ROOT, "src/content/docs/sdk/python-api.md");
export const EXTRACTOR = join(ROOT, "scripts/python-api-extract.py");

export const BEGIN = "<!-- PYAPI:BEGIN -->";
export const END = "<!-- PYAPI:END -->";

export const DIST = "bithuman";
export const REGISTRY = "pypi";

/** Thrown for anything that means "I could not look" — never a pass. */
export class CannotCheck extends Error {}

/* ------------------------------------------------------------------ registry */

const UA = "bithuman-public-docs-python-api (+https://github.com/bithuman-product/public-docs)";
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
        signal: AbortSignal.timeout(30000),
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

/** The newest published version, and every file it serves. Cache-busted for the
 *  same reason the version guard busts it: PyPI's CDN can serve a project JSON
 *  minutes behind the index pip reads. */
export async function newestRelease(dist = DIST) {
  const url = `https://pypi.org/pypi/${dist}/json`;
  const j = await (await get(`${url}?cb=${Date.now()}`, { "Cache-Control": "no-cache" })).json();
  const version = j?.info?.version;
  if (!version || !SEMVER.test(version)) {
    throw new CannotCheck(`${url}: info.version is ${JSON.stringify(version)}`);
  }
  const files = (j.releases?.[version] ?? []).map((f) => ({
    filename: f.filename,
    sha256: f.digests?.sha256 ?? "",
    packagetype: f.packagetype,
  }));
  if (!files.length) throw new CannotCheck(`${url}: release ${version} lists no files`);
  return { version, files };
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

/**
 * Install the published wheel into a throwaway venv and read its surface back.
 * `pip download` first, so the exact file — and therefore the exact digest —
 * is known before anything is installed.
 */
export function installAndExtract({ version, python = process.env.PYTHON || "python3" }) {
  const dir = mkdtempSync(join(process.env.TMPDIR || tmpdir(), "pyapi-"));
  try {
    let venvPy;
    try {
      run(python, ["-m", "venv", join(dir, "venv")]);
      venvPy = join(dir, "venv", "bin", "python");
      run(venvPy, ["-m", "pip", "install", "--quiet", "--upgrade", "pip"]);
    } catch (e) {
      throw new CannotCheck(`could not create a virtualenv with ${python}: ${e.message}`);
    }

    const wheels = join(dir, "wheel");
    try {
      run(venvPy, ["-m", "pip", "download", "--no-deps", "--only-binary=:all:",
                   "-d", wheels, `${DIST}==${version}`]);
    } catch (e) {
      throw new CannotCheck(
        `pip could not download ${DIST} ${version} for this interpreter — ` +
        `there may be no wheel for this platform:\n${e.stderr || e.message}`);
    }
    const wheel = readdirSync(wheels).find((f) => f.endsWith(".whl"));
    if (!wheel) throw new CannotCheck(`pip downloaded no wheel for ${DIST} ${version}`);
    const bytes = readFileSync(join(wheels, wheel));
    const sha256 = createHash("sha256").update(bytes).digest("hex");

    try {
      run(venvPy, ["-m", "pip", "install", "--quiet", join(wheels, wheel)]);
    } catch (e) {
      throw new CannotCheck(`the published wheel will not install here:\n${e.stderr || e.message}`);
    }

    let surface;
    try {
      surface = JSON.parse(run(venvPy, [EXTRACTOR]));
    } catch (e) {
      throw new CannotCheck(`the extractor did not produce JSON:\n${e.stderr || e.message}`);
    }
    return { surface, wheel, sha256 };
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}

/* -------------------------------------------------------------------- policy */

// Modules whose declared interface the page PRINTS. Everything else the wheel
// exposes is listed by name with its status, which is the honest thing to do
// with a module that is public by spelling and is not an API a reader calls.
export const PAGE_MODULES = ["bithuman", "bithuman.offline", "bithuman.tessera_offline"];

// ★See the header: these are NOT the authority, the two vocabulary guards are.
// A symbol NAME this matches is withheld from the page and counted.
const NAME_SCREEN = [
  /\bborrow\w*/i,
  /\belevate|\bembody|\blebundle/i,
  /essence[-_ ]?2[-_ ]?(max|mobile|light|quality)/i,
  /essence2[-_](light|quality)/i,
  /\bdream[-_ ]?1\b/i,
];
// A DOCSTRING this matches is withheld; the name and signature still appear,
// which is what a reference is for.
const PROSE_SCREEN = [
  ...NAME_SCREEN,
  /\barm(ed|ing)\b/i,
  /\bpassthrough\b/i,
  /\bdonors?\b/i,
  /\bbanks?\b/i,
  /\bdirectors?\b/i,
  /\bplanes?\b/i,
  /\bcompos(e|ed|es|ing|ition|itions|ite|ited|ites|iting|itor|itors)\b/i,
  /\bw0\b/i,
  /\bpi[ -]frames?\b/i,
  /tessera|libessence/i,
];

export const nameAllowed = (s) => !NAME_SCREEN.some((re) => re.test(s));
export const proseAllowed = (s) => !PROSE_SCREEN.some((re) => re.test(s));

/* --------------------------------------------------------------- rendering */

/** `inspect.signature` renders annotations as quoted strings when the module
 *  uses postponed evaluation. Unquote the ANNOTATION positions only — a default
 *  value is a string literal and its quotes are part of the value. */
export function normalizeSignature(sig) {
  if (!sig) return "";
  return sig.replace(/: '([^']*)'/g, ": $1").replace(/-> '([^']*)'/g, "-> $1")
            .replace(/-> "([^"]*)"/g, "-> $1");
}

/** reStructuredText as the artifact writes it, in Markdown. Deterministic and
 *  deliberately small: ``x`` becomes a code span, a :role:`x` becomes the name
 *  it points at, and nothing becomes a link (a link needs an anchor, and an
 *  anchor invented here is a link this site's link gate would have to resolve). */
export function rst(text) {
  if (!text) return "";
  return text
    // `~` is reST for "print only the last component"; without it the writer
    // meant the whole dotted path and shortening it would lose the module.
    .replace(/:[a-z:]+:`(~?)([^`]+)`/g, (_, tilde, s) =>
      "`" + (tilde ? s.replace(/^.*\./, "") : s) + "`")
    .replace(/``([^`]+)``/g, "`$1`")
    .replace(/\r/g, "")
    .trim();
}

/** How many parameters a signature takes, `self` excluded. */
export function arity(sig) {
  const inner = (sig || "").replace(/^\(|\)(\s*->.*)?$/g, "");
  return inner
    .split(",")
    .map((p) => p.trim())
    .filter((p) => p && p !== "self" && p !== "*" && p !== "/").length;
}

const table = (rows) => rows.map((r) => `| ${r.join(" | ")} |`).join("\n");

function symbolsOf(record, moduleName) {
  const m = record.surface.modules.find((x) => x.name === moduleName);
  return m ? m.symbols : [];
}

function renderSymbol(sym) {
  const out = [];
  out.push(`### ${sym.name}`);
  out.push("");
  if (sym.kind === "function") {
    out.push("```python");
    out.push(`${sym.name}${normalizeSignature(sym.signature)}`);
    out.push("```");
  } else if (sym.kind === "class" || sym.kind === "exception") {
    if (sym.constructor_signature) {
      out.push("```python");
      out.push(`${sym.name}${normalizeSignature(sym.constructor_signature)}`);
      out.push("```");
    }
  }
  out.push("");
  if (sym.doc && proseAllowed(sym.doc)) {
    out.push(rst(sym.doc));
  } else if (sym.doc) {
    out.push("_The docstring shipped with this symbol describes internal machinery and is not reproduced here._");
  }
  out.push("");
  const all = (sym.members ?? []).filter((m) => proseAllowed(m.name));
  // `__enter__`/`__exit__` are one fact about the class, not two methods to
  // document: it can be used as a context manager.
  const isCtx = all.some((m) => m.name === "__enter__") && all.some((m) => m.name === "__exit__");
  if (isCtx) out.push("Usable as a context manager: `with` closes it for you.\n");
  for (const m of all) {
    if (isCtx && (m.name === "__enter__" || m.name === "__exit__")) continue;
    out.push(`**\`${m.name}${normalizeSignature(m.signature).replace(/^\(self(, )?/, "(")}\`**`);
    out.push("");
    if (m.doc && proseAllowed(m.doc)) out.push(rst(m.doc));
    out.push("");
  }
  return out.join("\n");
}

/** The whole region between the markers, from the record and nothing else. */
export function renderRegion(record) {
  const a = record.artifact;
  const d = record.surface.distribution;
  const out = [];

  out.push("## The wheel this page describes");
  out.push("");
  out.push(table([
    ["Field", "Value"],
    ["---", "---"],
    ["Registry", a.registry],
    ["Coordinate", a.coordinate],
    ["Version", a.version],
    ["Wheel", `\`${a.wheel}\``],
    ["Digest", `\`${a.digest}\``],
    ["Resolved on", a.resolved_on],
  ]));
  out.push("");
  out.push(
    `Every name below was read back out of those bytes, in a virtualenv that had ` +
    `nothing else installed in it. Nothing here was read from a source tree.`);
  out.push("");
  out.push(table([
    ["What the distribution declares", "Value"],
    ["---", "---"],
    ["Python versions", `\`${d.requires_python}\``],
    // ★Written in the `dist[extra]` form a developer actually types. `tessera`
    // alone reads as a product name — a retired one — and the guard that owns
    // that word freezes the typed spelling and nothing else.
    ["Extras", d.extras.map((e) => `\`${DIST}[${e}]\``).join(", ")],
    ["Commands added to `PATH`", d.console_scripts.length ? d.console_scripts.join(", ") : "none"],
    ["Ships type information", d.has_py_typed ? "yes — a `py.typed` marker and a type stub" : "no"],
    ["`python -m bithuman`", record.surface.runnable_as_module ? "yes" : "no"],
  ]));
  out.push("");

  for (const moduleName of PAGE_MODULES) {
    const mod = record.surface.modules.find((x) => x.name === moduleName);
    if (!mod) continue;
    const shown = mod.symbols.filter((s) => nameAllowed(s.name));
    const withheld = mod.symbols.length - shown.length;

    out.push(`## ${moduleName}`);
    out.push("");
    out.push(
      `${mod.symbols.length} name${mod.symbols.length === 1 ? "" : "s"}, ` +
      `declared by ${mod.interface === "stub" ? "the type stub the package ships" : "the module's own `__all__`"}.`);
    out.push("");
    if (withheld) {
      out.push(
        `${withheld} of them are module constants naming an internal mechanism ` +
        `and are not listed here; they are not part of the two calls this ` +
        `package exists for.`);
      out.push("");
    }

    if (moduleName === "bithuman.tessera_offline") {
      // A deprecated alias module: every name is the SAME OBJECT as one in
      // `bithuman.offline`. Rendered as a table so the page does not carry a
      // second copy of the same signatures under duplicate headings.
      out.push(table([
        ["Name", "Kind", "Same object as"],
        ["---", "---", "---"],
        ...shown.map((s) => {
          const twin = symbolsOf(record, "bithuman.offline")
            .find((t) => t.name === s.name || t.doc === s.doc);
          return [`\`${s.name}\``, s.kind, twin ? `\`bithuman.offline.${twin.name}\`` : "—"];
        }),
      ]));
      out.push("");
      continue;
    }

    for (const sym of shown) {
      out.push(renderSymbol(sym));
    }
  }

  // ---- exceptions ---------------------------------------------------------
  out.push("## The exception hierarchy");
  out.push("");
  const excs = [];
  for (const moduleName of PAGE_MODULES) {
    for (const s of symbolsOf(record, moduleName)) {
      if (s.kind !== "exception" || !nameAllowed(s.name)) continue;
      if (excs.some((e) => e.name === s.name && e.defined_in === s.defined_in)) continue;
      excs.push({ ...s, module: moduleName });
    }
  }
  out.push(table([
    ["Exception", "Raised from", "Inherits"],
    ["---", "---", "---"],
    ...excs.map((e) => [`\`${e.name}\``, `\`${e.module}\``, e.bases.map((b) => `\`${b}\``).join(", ")]),
  ]));
  out.push("");

  // ---- what is NOT the surface -------------------------------------------
  out.push("## Present in the wheel, not callable from it");
  out.push("");
  out.push(
    "A reference generated from a source tree would have listed each of these. " +
    "They are in the installed package and a developer cannot use them, which " +
    "is the opposite of being public.");
  out.push("");
  const rows = [];
  for (const mod of record.surface.modules) {
    for (const sym of mod.symbols) {
      for (const hidden of sym.not_in_shipped_interface ?? []) {
        const sig = normalizeSignature(hidden.signature);
        rows.push([
          `\`${mod.name}.${sym.name}.${hidden.name}\``,
          "on the runtime object, in no type stub",
          // The signature is printed where it can be; where it names internal
          // machinery, its SHAPE is printed instead. Either way the row stands.
          proseAllowed(sig)
            ? `\`${sig}\``
            : `takes ${arity(sig)} arguments, none of them documented`,
        ]);
      }
    }
    for (const only of mod.stub_only ?? []) {
      const alias = (mod.stub_aliases ?? {})[only];
      rows.push([
        `\`${mod.name}.${only}\``,
        "declared by the type stub, absent at runtime — importing it raises `ImportError`",
        alias ? `the type an \`audio\` argument accepts: \`${alias}\`` : "declared for type checkers only",
      ]);
    }
  }
  const notImportable = record.surface.modules.filter((m) => m.interface === "not-importable");
  if (notImportable.length) {
    rows.push([
      `${notImportable.length} files under \`bithuman/lib/\``,
      "listed as modules by their suffix, none of them imports",
      "native libraries the engine opens by path",
    ]);
  }
  rows.push([
    `${record.surface.retired.length} names from the 2.x releases`,
    "intercepted with a refusal that says what to write instead",
    `raises \`NotSupported\`${record.surface.retired.every((r) => r.is_import_error) ? " and `ImportError`" : ""}`,
  ]);
  rows.push([
    "`bithuman.__version__`",
    "removed on purpose — `hasattr` answers False",
    "read the version from `importlib.metadata`",
  ]);
  out.push(table([["Name", "Why it is not the surface", "What it is"], ["---", "---", "---"], ...rows]));
  out.push("");

  // ---- the rest of the wheel ---------------------------------------------
  const rest = record.surface.modules.filter(
    (m) => !PAGE_MODULES.includes(m.name) && m.interface !== "not-importable");
  if (rest.length) {
    out.push("## Other modules the package exposes");
    out.push("");
    out.push(
      "Public by spelling, and not an API this page documents. They are listed " +
      "so that finding one by grep is not mistaken for finding something to call.");
    out.push("");
    out.push(table([
      ["Module", "What it declares"],
      ["---", "---"],
      ...rest.map((m) => [
        `\`${m.name}\``,
        m.interface === "undeclared"
          ? "no `__all__` — it declares nothing public"
          : `an \`__all__\` of ${m.declared.length} name${m.declared.length === 1 ? "" : "s"}; no part of opening an avatar goes through it`,
      ]),
    ]));
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

/** Every public name in a surface, as `module.name` -> its signature. */
export function flatten(surface) {
  const out = new Map();
  for (const m of surface.modules) {
    out.set(`module ${m.name}`, m.interface);
    for (const s of m.symbols ?? []) {
      const sig = s.kind === "function" ? s.signature : s.constructor_signature ?? s.value ?? s.kind;
      out.set(`${m.name}.${s.name}`, `${s.kind}${sig ? " " + sig : ""}`);
      for (const mem of s.members ?? []) {
        out.set(`${m.name}.${s.name}.${mem.name}`, `method ${mem.signature}`);
      }
    }
  }
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

/**
 * The extractor's JSON as the record stores it. Two things happen here and
 * BOTH exist so that two extractions are comparable:
 *  - `constructor` is renamed: on a plain JS object that key shadows Object's
 *    own, and a reader that forgets loses the signature silently.
 *  - `extracted_by` is dropped: it names the INTERPRETER that ran, and the
 *    surface is the same on every one of them (proved by extracting the same
 *    wheel under 3.12 and 3.14 and diffing). Keeping it would make every
 *    runner upgrade look like a surface change.
 */
export function normalizeSurface(surface) {
  const cleaned = structuredClone(surface);
  for (const m of cleaned.modules) {
    for (const s of m.symbols ?? []) {
      // ★`"constructor" in s` is TRUE FOR EVERY PLAIN OBJECT — it resolves up
      // the prototype chain to Object's own. Written that way, this stamped
      // `constructor_signature = Object` onto every CONSTANT, JSON dropped the
      // function on the way to disk, and the live extraction then disagreed
      // with the committed record about 24 constants. The gate caught it on its
      // first real run, which is the only reason it is a comment and not a bug.
      if (Object.hasOwn(s, "constructor")) {
        s.constructor_signature = s.constructor;
        delete s.constructor;
      }
    }
  }
  delete cleaned.extracted_by;
  return cleaned;
}

/** The whole record: the artifact it came from, and the surface inside it. */
export function buildRecord({ version, wheel, sha256, surface, today }) {
  const cleaned = normalizeSurface(surface);
  return {
    artifact: {
      registry: REGISTRY,
      coordinate: DIST,
      version,
      digest: `sha256:${sha256}`,
      resolved_on: today,
      wheel,
    },
    surface: cleaned,
  };
}

export async function generate({ python, today = new Date().toISOString().slice(0, 10) } = {}) {
  const { version, files } = await newestRelease();
  const { surface, wheel, sha256 } = installAndExtract({ version, python });

  const published = files.find((f) => f.filename === wheel);
  if (!published) {
    throw new CannotCheck(`PyPI's JSON for ${version} does not list ${wheel}`);
  }
  if (published.sha256 !== sha256) {
    throw new CannotCheck(
      `the wheel pip downloaded does not match PyPI's own digest for it:\n` +
      `  file   ${wheel}\n  pypi   ${published.sha256}\n  local  ${sha256}`);
  }
  if (surface.distribution.version !== version) {
    throw new CannotCheck(
      `installed ${surface.distribution.version} while asking for ${version}`);
  }
  return buildRecord({ version, wheel, sha256, surface, today });
}

const invokedDirectly =
  process.argv[1] && import.meta.url === new URL(`file://${process.argv[1]}`).href;

if (invokedDirectly) {
  const args = process.argv.slice(2);
  const dry = args.includes("--dry-run");
  const pyArg = args.indexOf("--python");
  const python = pyArg > -1 ? args[pyArg + 1] : undefined;

  try {
    const record = await generate({ python });
    const region = renderRegion(record);
    const page = splitPage(readFileSync(PAGE_PATH, "utf8"));
    if (!page) {
      console.error(`gen-python-api: ${PAGE_PATH} has no ${BEGIN} / ${END} markers.`);
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
    console.log(
      `gen-python-api: wrote ${record.artifact.coordinate} ${record.artifact.version} ` +
      `(${record.artifact.wheel})\n  record ${RECORD_PATH}\n  page   ${PAGE_PATH}`);
    process.exit(0);
  } catch (e) {
    if (e instanceof CannotCheck) {
      console.error(`gen-python-api: CANNOT GENERATE — ${e.message}`);
      console.error(`This is exit 2 (could not look), not a failure of the page.`);
      process.exit(2);
    }
    throw e;
  }
}
