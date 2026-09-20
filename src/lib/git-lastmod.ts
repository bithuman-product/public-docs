import { execFileSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";

// The one source of "when did this page last change" for the sitemap's
// <lastmod> and the JSON-LD dateModified: the file's last commit, read from
// git at build time. A date is emitted only when it is known to be right —
// in a shallow clone (Vercel's default) every file older than the clone's
// boundary reports the boundary commit's date, which is wrong, so a file whose
// last commit IS a boundary commit gets no date at all. VERCEL_DEEP_CLONE=true
// on the project makes the history full and every page dated.

const cache = new Map<string, string | null>();
let shallow: Set<string> | null = null;

function git(args: string[]): string {
  return execFileSync("git", args, { encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] }).trim();
}

function boundary(): Set<string> {
  if (shallow) return shallow;
  shallow = new Set();
  try {
    const p = git(["rev-parse", "--git-path", "shallow"]);
    if (existsSync(p)) for (const l of readFileSync(p, "utf8").split("\n")) if (l.trim()) shallow.add(l.trim());
  } catch {}
  return shallow;
}

/** ISO-8601 commit date of the file's last change, or null when unknown. */
export function lastModified(file: string): string | null {
  if (cache.has(file)) return cache.get(file)!;
  let out: string | null = null;
  try {
    const [sha, date] = git(["log", "-1", "--format=%H%n%cI", "--", file]).split("\n");
    if (sha && date && !boundary().has(sha)) out = date;
  } catch {}
  cache.set(file, out);
  return out;
}
