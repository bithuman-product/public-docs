#!/usr/bin/env node
// THE PYTHON API REFERENCE STILL DESCRIBES THE WHEEL PyPI SERVES TODAY.
//
// WHY THIS EXISTS, and why it could not be deferred to "later"
// -----------------------------------------------------------
// The page it grades is generated from a published artifact. Everything on this
// site that was generated from a published artifact and then left alone has
// gone stale the same way: `instrument.cli` was the only machine-readable
// version in the performance record, it was stale on all eight rows that
// carried it, and on 2026-09-15 it was deleted for exactly that reason. The
// text never changed. The REGISTRY changed.
//
// So the subject of this check is not the page. It is PyPI. The page is
// re-derived from whatever PyPI serves this morning and compared with what is
// committed, and the run is scheduled as well as pushed, because a release
// publishing is not an event in this repository.
//
// ★THE GOVERNING RULE IT ENFORCES, which is the rule the generator obeys:
//
//     A SYMBOL ENTERS THE REFERENCE ONLY IF IT IS PUBLIC IN THE SHIPPED
//     INTERFACE. A symbol present in SOURCE, or present in a compiled artifact
//     as a LOCAL symbol, is evidence of the OPPOSITE of presence — it is
//     something a consumer cannot call. NEVER GENERATE FROM A SOURCE TREE.
//     GENERATE FROM THE ARTIFACT A DEVELOPER INSTALLS.
//
// WHAT IT GRADES, in order, and each is a DIFFERENT failure with its own words:
//   P1 THE PAGE IS WHAT THE RECORD RENDERS. scripts/python-surface.json is the
//      extraction; the page region is a rendering of it. A hand edit inside the
//      markers is caught here and nowhere else.
//   P2 THE RECORDED ARTIFACT IS THE NEWEST PUBLISHED ONE. A version that moved
//      is a stale record even when every symbol is identical — that is the
//      `instrument.cli` failure, and letting it pass is how this page would
//      acquire it.
//   P3 THE RECORDED DIGEST IS PyPI'S OWN DIGEST for the recorded wheel file. A
//      release has one digest per FILE, so this is graded against the registry
//      rather than against whatever wheel this runner's interpreter resolves —
//      which is what makes the check interpreter-independent.
//   P4 THE SURFACE HAS NOT MOVED. The wheel is installed here, read back, and
//      diffed against the record: every name ADDED, REMOVED or CHANGED IN
//      SIGNATURE is listed by name.
//
// THREE OUTCOMES, NEVER COLLAPSED
//   exit 0  PASS         the page matches the shipped surface
//   exit 1  FAIL         the surface moved, or the record is stale, or the page
//                        is not what the record renders — a real disagreement
//   exit 2  CANNOT CHECK PyPI unreachable, no wheel for this platform, the
//                        wheel will not install, the extractor did not run.
//                        A DISTINCT non-zero code that can never read as a pass.
//
// ★AND IT PROVES ITSELF WITH NO NETWORK. `--selftest` drives the verdict
// function against fixtures with a STUB registry and a STUB extraction: one arm
// for each outcome, including a separate arm for each KIND of FAIL, and the run
// FAILS unless every arm fires. An instrument that cannot show its own red is
// not evidence of anything.
//
//   node scripts/check-python-api-current.mjs
//   node scripts/check-python-api-current.mjs --selftest
//   node scripts/check-python-api-current.mjs --python python3.12

import { readFileSync } from "node:fs";
import {
  CannotCheck, DIST, PAGE_PATH, RECORD_PATH, REGISTRY,
  diffSurface, installAndExtract, newestRelease, normalizeSurface,
  renderRegion, splitPage,
} from "./gen-python-api.mjs";

export const PASS = 0;
export const FAIL = 1;
export const CANNOT_CHECK = 2;

const REGENERATE = "how to fix: run `node scripts/gen-python-api.mjs` and commit both files.";

/**
 * The whole verdict as a pure function, so every outcome has a selftest arm.
 * `registry` and `extract` are injected: the real ones reach PyPI, the selftest
 * ones do not.
 */
export async function verdict({ record, pageText, registry, extract }) {
  const out = [];
  const say = (s) => out.push(s);

  // ---- P1 the page is what the record renders ------------------------------
  const page = splitPage(pageText);
  if (!page) {
    return { code: FAIL, lines: [`${PAGE_PATH} has no PYAPI markers — nothing generated lives there.`] };
  }
  const expected = renderRegion(record);
  if (page.region !== expected) {
    const a = expected.split("\n"), b = page.region.split("\n");
    const i = a.findIndex((l, n) => l !== b[n]);
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

  // ---- the registry --------------------------------------------------------
  const { version, files } = await registry();
  const a = record.artifact;

  // ---- P2 the recorded artifact is the newest published one -----------------
  if (a.version !== version) {
    return {
      code: FAIL,
      lines: [
        `P2 THE RECORD IS STALE. The page says it was read from ${a.coordinate} ${a.version};`,
        `   ${REGISTRY} now serves ${version}.`,
        "   ★The surface may well be identical. That is not the point: a record of",
        "   which bytes were read is worthless once it names bytes nobody installs,",
        "   and this is the exact way the CLI version in the performance record went",
        "   stale on all eight rows that carried it.",
        `   ${REGENERATE}`,
      ],
    };
  }

  // ---- P3 the recorded digest is PyPI's own digest for that file ------------
  const published = files.find((f) => f.filename === a.wheel);
  if (!published) {
    return {
      code: FAIL,
      lines: [
        `P3 ${REGISTRY} serves no file named ${a.wheel} for ${a.coordinate} ${version}.`,
        `   the release serves: ${files.map((f) => f.filename).join(", ") || "(nothing)"}`,
        `   ${REGENERATE}`,
      ],
    };
  }
  if (`sha256:${published.sha256}` !== a.digest) {
    return {
      code: FAIL,
      lines: [
        `P3 THE RECORDED DIGEST IS NOT THE PUBLISHED ONE for ${a.wheel}:`,
        `     record: ${a.digest}`,
        `     ${REGISTRY}:   sha256:${published.sha256}`,
        `   ${REGENERATE}`,
      ],
    };
  }

  // ---- P4 the surface has not moved ----------------------------------------
  const fresh = extract({ version });
  if (fresh.surface.distribution.version !== version) {
    throw new CannotCheck(
      `asked for ${version} and the venv reports ${fresh.surface.distribution.version}`);
  }
  // The wheel this runner resolved is usually a different FILE from the one in
  // the record (a different interpreter tag), which is fine — but it must still
  // be one of the published ones, byte for byte. If it is not, what was read
  // here is not what PyPI serves and the honest verdict is that nothing was
  // compared.
  if (fresh.wheel && !files.some((f) => f.filename === fresh.wheel && f.sha256 === fresh.sha256)) {
    throw new CannotCheck(
      `the wheel installed here (${fresh.wheel}, sha256:${fresh.sha256}) is not one of the ` +
      `files ${REGISTRY} publishes for ${a.coordinate} ${version}`);
  }
  const { added, removed, changed } = diffSurface(record.surface, normalizeSurface(fresh.surface));
  if (added.length || removed.length || changed.length) {
    const lines = [
      `P4 THE PUBLIC SURFACE OF ${a.coordinate} ${version} IS NOT WHAT THIS PAGE DESCRIBES.`,
    ];
    for (const n of removed) lines.push(`   REMOVED    ${n}`);
    for (const n of added) lines.push(`   ADDED      ${n}`);
    for (const c of changed) {
      lines.push(`   CHANGED    ${c.name}`);
      lines.push(`                was  ${c.was}`);
      lines.push(`                now  ${c.now}`);
    }
    lines.push(`   ${REGENERATE}`);
    return { code: FAIL, lines };
  }

  say(`check-python-api-current: OK — the reference matches ${a.coordinate} ${version} as ${REGISTRY} serves it.`);
  say(`  wheel    ${fresh.wheel}`);
  say(`  digest   ${a.digest}`);
  say(`  surface  ${[...record.surface.modules].filter((m) => m.symbols?.length).length} module(s), ` +
      `${record.surface.modules.reduce((n, m) => n + (m.symbols?.length ?? 0), 0)} public name(s) compared`);
  return { code: PASS, lines: out };
}

/* ------------------------------------------------------------------ selftest */

/** The smallest record the renderer will accept, so the arms are readable. */
function fixtureRecord() {
  return {
    artifact: {
      registry: REGISTRY, coordinate: DIST, version: "1.0.0",
      digest: "sha256:aa", resolved_on: "2026-01-01",
      wheel: "bithuman-1.0.0-cp312-cp312-manylinux_2_28_x86_64.whl",
    },
    surface: {
      package: DIST,
      distribution: {
        name: DIST, version: "1.0.0", requires_python: ">=3.10",
        extras: ["offline"], console_scripts: [], has_py_typed: true,
      },
      dunder_version: false,
      runnable_as_module: true,
      retired: [{ name: "Bithuman", raises: "_Retired", is_import_error: true }],
      modules: [{
        name: DIST, interface: "stub", stub: "__init__.pyi", doc: "",
        declared: ["open", "Avatar"],
        symbols: [
          { name: "open", kind: "function", doc: "Open an avatar.", signature: "(source: Any) -> Avatar" },
          { name: "Avatar", kind: "class", doc: "An open avatar.", bases: ["object"],
            defined_in: "bithuman._open", constructor_signature: null,
            not_in_shipped_interface: [{ name: "__init__", signature: "(self, engine)" }],
            members: [{ name: "render", signature: "(self, audio: Audio) -> Iterator[np.ndarray]", doc: "Yield frames." }] },
        ],
        stub_only: [], stub_aliases: {}, runtime_extra: [],
      }],
    },
  };
}

const clone = (x) => structuredClone(x);

async function selftest() {
  const base = fixtureRecord();
  const pageOf = (record) => `head\n<!-- PYAPI:BEGIN -->\n${renderRegion(record)}<!-- PYAPI:END -->\ntail\n`;
  const goodPage = pageOf(base);
  const goodRegistry = async () => ({
    version: "1.0.0",
    files: [{ filename: base.artifact.wheel, sha256: "aa", packagetype: "bdist_wheel" }],
  });
  // The extraction the record was made from: the record's own surface, in the
  // shape the extractor emits (`constructor`, not `constructor_signature`).
  const asExtracted = (record) => {
    const s = clone(record.surface);
    for (const m of s.modules) for (const sym of m.symbols ?? []) {
      if ("constructor_signature" in sym) { sym.constructor = sym.constructor_signature; delete sym.constructor_signature; }
    }
    return { surface: s, wheel: record.artifact.wheel, sha256: "aa" };
  };
  const goodExtract = () => asExtracted(base);

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

  console.log("check-python-api-current --selftest: every outcome, no network\n");

  await arm("PASS: page, record and registry agree", PASS, "OK —", () =>
    verdict({ record: base, pageText: goodPage, registry: goodRegistry, extract: goodExtract }));

  await arm("FAIL P4: a name was ADDED to the shipped surface", FAIL, "ADDED      bithuman.close", () => {
    const moved = clone(base);
    moved.surface.modules[0].symbols.push({ name: "close", kind: "function", doc: "", signature: "() -> None" });
    return verdict({ record: base, pageText: goodPage, registry: goodRegistry, extract: () => asExtracted(moved) });
  });

  await arm("FAIL P4: a name was REMOVED from the shipped surface", FAIL, "REMOVED    bithuman.open", () => {
    const moved = clone(base);
    moved.surface.modules[0].symbols = moved.surface.modules[0].symbols.filter((s) => s.name !== "open");
    return verdict({ record: base, pageText: goodPage, registry: goodRegistry, extract: () => asExtracted(moved) });
  });

  await arm("FAIL P4: a SIGNATURE changed", FAIL, "CHANGED    bithuman.Avatar.render", () => {
    const moved = clone(base);
    moved.surface.modules[0].symbols[1].members[0].signature = "(self, audio: Audio, fps: int) -> Iterator[np.ndarray]";
    return verdict({ record: base, pageText: goodPage, registry: goodRegistry, extract: () => asExtracted(moved) });
  });

  await arm("FAIL P2: the registry moved and the record still names the old wheel", FAIL, "THE RECORD IS STALE", () =>
    verdict({
      record: base, pageText: goodPage, extract: goodExtract,
      registry: async () => ({ version: "1.0.1", files: [{ filename: "bithuman-1.0.1-cp312-cp312-manylinux_2_28_x86_64.whl", sha256: "bb" }] }),
    }));

  await arm("FAIL P3: the recorded digest is not the published one", FAIL, "NOT THE PUBLISHED ONE", () =>
    verdict({
      record: base, pageText: goodPage, extract: goodExtract,
      registry: async () => ({ version: "1.0.0", files: [{ filename: base.artifact.wheel, sha256: "zz" }] }),
    }));

  await arm("FAIL P1: the page region was edited by hand", FAIL, "NOT WHAT THE RECORD RENDERS", () =>
    verdict({
      record: base, registry: goodRegistry, extract: goodExtract,
      pageText: goodPage.replace("An open avatar.", "An open avatar, and also a teapot."),
    }));

  await arm("CANNOT CHECK: the registry cannot be reached", CANNOT_CHECK, null, () =>
    verdict({
      record: base, pageText: goodPage, extract: goodExtract,
      registry: async () => { throw new CannotCheck("pypi.org: fetch failed"); },
    }));

  await arm("CANNOT CHECK: the published wheel will not install here", CANNOT_CHECK, null, () =>
    verdict({
      record: base, pageText: goodPage, registry: goodRegistry,
      extract: () => { throw new CannotCheck("no wheel for this platform"); },
    }));

  await arm("CANNOT CHECK: the bytes installed here are not the published bytes", CANNOT_CHECK, null, () =>
    verdict({
      record: base, pageText: goodPage, registry: goodRegistry,
      extract: () => ({ ...goodExtract(), sha256: "tampered" }),
    }));

  // ★THE CONTROLS. An instrument whose arms all agree proves nothing about the
  // distinctions it claims to draw.
  const codes = new Set(arms.map((a) => a.want));
  const distinct = codes.size === 3 && codes.has(PASS) && codes.has(FAIL) && codes.has(CANNOT_CHECK);
  console.log(`  ${distinct ? "ok  " : "FAIL"} control: all three outcomes are exercised and their exits are distinct (0/1/2)`);
  const failArms = arms.filter((a) => a.want === FAIL).length;
  const fourKinds = failArms >= 6;
  console.log(`  ${fourKinds ? "ok  " : "FAIL"} control: every KIND of FAIL has its own arm (${failArms} of them)`);

  const bad = arms.filter((a) => !a.ok).length + (distinct ? 0 : 1) + (fourKinds ? 0 : 1);
  console.log(
    bad === 0
      ? `\ncheck-python-api-current --selftest: OK — ${arms.length}/${arms.length} arms fired as required.`
      : `\ncheck-python-api-current --selftest: ${bad} arm(s) wrong — this instrument is not proven.`);
  return bad === 0 ? PASS : FAIL;
}

/* ---------------------------------------------------------------------- main */

const args = process.argv.slice(2);

if (args.includes("--selftest")) {
  process.exit(await selftest());
}

const pyArg = args.indexOf("--python");
const python = pyArg > -1 ? args[pyArg + 1] : undefined;

try {
  const record = JSON.parse(readFileSync(RECORD_PATH, "utf8"));
  const pageText = readFileSync(PAGE_PATH, "utf8");
  const { code, lines } = await verdict({
    record,
    pageText,
    registry: () => newestRelease(),
    extract: ({ version }) => installAndExtract({ version, python }),
  });
  for (const l of lines) (code === PASS ? console.log : console.error)(l);
  if (code === FAIL) {
    console.error(
      "\ncheck-python-api-current: FAIL — the committed reference is not the shipped surface.\n" +
      "This is exit 1: a real disagreement, not an infrastructure problem.");
  }
  process.exit(code);
} catch (e) {
  if (e instanceof CannotCheck) {
    console.error(`check-python-api-current: CANNOT CHECK — ${e.message}`);
    console.error(
      "\nThis is exit 2. It is NOT a pass: nothing was compared. The page may be\n" +
      "correct or stale and this run cannot tell you which.");
    process.exit(CANNOT_CHECK);
  }
  throw e;
}
