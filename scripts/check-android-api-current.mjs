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
//   node scripts/check-android-api-current.mjs --java /path/to/java

import { readFileSync } from "node:fs";
import {
  ARTIFACTS, CannotCheck, GROUP, PAGE_PATH, RECORD_PATH, REGISTRY,
  diffSurface, downloadAndExtract, newestRelease, renderRegion, splitPage,
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
export async function verdict({ record, pageText, registry, extract, artifacts = ARTIFACTS }) {
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
  return { code: PASS, lines: out };
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
  const V = (o) => verdict({ record: base, pageText: goodPage, registry: goodRegistry, extract: goodExtract, artifacts, ...o });

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
