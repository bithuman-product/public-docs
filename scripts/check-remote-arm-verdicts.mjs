#!/usr/bin/env node
// check-remote-arm-verdicts.mjs — refuse a remote arm that grades on ssh's exit code.
//
// WHY
// ---
// MEASURED 2026-09-11, from lafayette, multiplexing off:
//
//     ssh echelon "exit 3"   -> 0      ssh alpharetta "exit 3" -> 3
//     ssh moraga  "exit 3"   -> 0      ssh orinda     "exit 3" -> 3
//     ssh echelon false      -> 0
//
// echelon and moraga run Tailscale SSH. tailscaled's macOS incubator execs the
// command under `/usr/bin/login -f -pq -h <ip> <user> /bin/zsh -c '<cmd>'`, and
// login(1) does not propagate its child's exit status. Proved on moraga, same
// host, one command apart:
//
//     sudo /usr/bin/login -f -pq -h 1.2.3.4 $u /bin/zsh -c 'exit 3'  -> 0
//                                           /bin/zsh -c 'exit 3'     -> 3
//
// This repo's compiling gate runs on echelon. Until 2026-09-11 its verdict was
// `rc=$?` of that ssh, so `examples-build-gate.sh` COULD NOT FAIL — and neither
// could its own `--mutate` failure control, which is why nobody saw it.
//
// A transport failure is still honest (ssh itself returns 255), and scp/rsync
// are honest too (they do not go through login(1)). It is only the REMOTE
// COMMAND's status that is lost. So the rule this guard enforces is narrow:
//
//   an `ssh <host> <command>` whose OUTCOME is decided must decide it from
//   CONTENT — a printed sentinel the remote emits, or a parsed payload —
//   never from `$?`, `||`, `if !`, or `set -e`.
//
// Reachability probes (`ssh host true`) are exempt: they are asking about the
// transport, which is the one thing the exit status still answers.
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, relative } from "node:path";

const ROOT = new URL("..", import.meta.url).pathname.replace(/\/$/, "");
const SKIP = new Set(["node_modules", ".git", "dist", ".astro", "public"]);

// Audited exemptions. Every entry states WHY the exit status is not the verdict.
//
// ★AN EXEMPTION IS KEYED ON EVIDENCE, NOT ON THE CALL SITE. The first draft of
// this guard matched only `line`, so re-introducing `rc=$?` under an audited
// site sailed through — the allowlist was asserting a NAME while the meaning
// under it had changed. `requires` is the evidence: when given, the exemption
// only applies if that pattern is still present in the window, and `forbids`
// withdraws it outright when the blind shape reappears.
const AUDITED = new Map([
  ["scripts/examples-build-gate.sh", [
    { line: /ssh .*"\$REMOTE" true/, why: "reachability probe — the transport IS what rc answers (255 on failure)" },
    { line: /free_gib=/,             why: "verdict is the parsed number; non-numeric is refused" },
    { line: /mkdir -p '\$RDIR'/,     why: "belt-and-braces; the scp that follows is honest and the sha compare is the real gate" },
    { line: /LANDED_SHA=/,           why: "verdict is the sha compare; empty reads as a mismatch" },
    { line: /exit 7/,                why: "THE failure control — asserts the sentinel carries a nonzero status",
                                     requires: /RC_SENTINEL/ },
    { line: /bash -s --/,            why: "verdict is the EXAMPLES_BUILD_GATE_RC sentinel; a missing one is UNPROVEN",
                                     requires: /echo "\$RC_SENTINEL=/, forbids: /^\s*rc=\$\?\s*$/m },
  ]],
]);

const SSH_CALL = /(^|[;&|(`]|\$\(|\bthen\b|\bdo\b|\bif\b|!|=)\s*(?:timeout\s+\S+\s+)?ssh\s+-/;
const GRADES_ON_RC = /rc=\$\?|\|\|\s*\{|\|\|\s*(exit|die|return|fail)\b|^\s*if\s*!\s*(timeout\s+\S+\s+)?ssh\b/;

function walk(dir, out = []) {
  for (const e of readdirSync(dir)) {
    if (SKIP.has(e)) continue;
    const p = join(dir, e);
    const st = statSync(p);
    if (st.isDirectory()) walk(p, out);
    else if (/\.(sh|mjs|js|bash)$/.test(e)) out.push(p);
  }
  return out;
}

export function scan(root = ROOT, overrideText = null) {
  const findings = [];
  const files = overrideText ? [["<memory>", overrideText]]
                             : walk(root).map((p) => [relative(root, p), readFileSync(p, "utf8")]);
  for (const [rel, text] of files) {
    const lines = text.split("\n");
    for (let i = 0; i < lines.length; i++) {
      const ln = lines[i];
      const s = ln.trim();
      if (s.startsWith("#") || s.startsWith("//")) continue;
      if (!SSH_CALL.test(ln)) continue;
      // the verdict may be on this line or the next few (a heredoc ends in rc=$?)
      const near = lines.slice(i, Math.min(lines.length, i + 14)).join("\n");
      if (!GRADES_ON_RC.test(ln) && !/^\s*rc=\$\?/m.test(near)) continue;
      const audited = (AUDITED.get(rel) || []).find((a) => a.line.test(ln));
      if (audited
          && (!audited.requires || audited.requires.test(near))
          && (!audited.forbids  || !audited.forbids.test(near))) continue;
      findings.push({ file: rel, line: i + 1, code: s.slice(0, 110) });
    }
  }
  return findings;
}

// ---- self-test: a guard that cannot refuse is not a guard --------------------
if (process.argv.includes("--selftest")) {
  const mutant = [
    'REMOTE=echelon',
    'ssh -o BatchMode=yes "$REMOTE" bash -s -- <<EOF',
    'node ./check.mjs',
    'EOF',
    'rc=$?',
  ].join("\n");
  const got = scan(null, mutant);
  if (got.length !== 1) {
    console.error(`SELFTEST RED: the mutant (verdict from rc=$?) was not caught — ${got.length} findings`);
    process.exit(1);
  }
  const clean = [
    'REMOTE=echelon',
    'ssh -o BatchMode=yes "$REMOTE" bash -s -- <<EOF | tee "$OUT"',
    'node ./check.mjs',
    'echo "TOKEN_RC=$?"',
    'EOF',
    'rc="${line#TOKEN_RC=}"',
  ].join("\n");
  if (scan(null, clean).length !== 0) {
    console.error("SELFTEST RED: the sentinel form was reported as blind");
    process.exit(1);
  }
  // ★and the audited exemption must be WITHDRAWN when its evidence goes away.
  // This is the arm that caught the first draft of this guard: without it the
  // allowlist would keep vouching for a site whose sentinel had been deleted.
  const gate = readFileSync(join(ROOT, "scripts/examples-build-gate.sh"), "utf8");
  const deSentinelled = gate
    .replace(/ 2>&1 \| tee "\$GATE_OUT"/, "")
    .replace(/sentinel_line="\$\(grep/, 'rc=$?\nsentinel_line="$(grep');
  const caught = scan(null, deSentinelled).filter((f) => /bash -s --/.test(f.code));
  if (caught.length !== 1) {
    console.error("SELFTEST RED: the audited exemption for the gate's run step " +
                  "did NOT withdraw when the sentinel was removed — this guard " +
                  `would vouch for a blind arm (${caught.length} findings)`);
    process.exit(1);
  }
  console.log("selftest GREEN: the mutant is refused, the sentinel form passes, " +
              "and the audited exemption withdraws when its sentinel is deleted");
  process.exit(0);
}

const findings = scan();
if (findings.length) {
  console.error("RED — remote arms whose verdict is ssh's exit status:\n");
  for (const f of findings) console.error(`  ${f.file}:${f.line}\n    ${f.code}`);
  console.error(`
On echelon and moraga that status is ALWAYS 0 (Tailscale SSH runs the command
under login(1), which does not propagate it). Have the remote print its own
status behind a token and parse it:

    ssh "$HOST" 'sh -c "<cmd>"; echo "MY_TOKEN_RC=$?"'

and treat a MISSING token as its own failure code — never as a pass. If the
exit status genuinely is not the verdict here, add the site to AUDITED in
${relative(ROOT, new URL(import.meta.url).pathname)} with the reason.`);
  process.exit(1);
}
console.log(`remote-arm verdicts: GREEN (no arm grades on ssh's exit code)`);
