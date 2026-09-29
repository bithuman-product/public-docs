#!/usr/bin/env bash
# scripts/vercel-ignore.sh — Vercel "Ignored Build Step" for public-docs (docs.bithuman.ai).
# Same script as bithuman-apps/scripts/vercel-ignore.sh; keep the two in step.
#
# Exit 0 = SKIP the build, exit 1 = BUILD. Every doubt resolves to BUILD.
#
# Usage (from vercel.json "ignoreCommand"; Vercel runs it in the project's root directory):
#   bash scripts/vercel-ignore.sh [--preview-always] <repo-relative path>...
# public-docs uses `--preview-always .`: previews always build (visual review; the old
# "skip non-PR previews" rule canceled every first-push preview), production builds when
# anything changed since the last production deploy.
#
# Why: a `git diff HEAD^ HEAD` rule compares only the LAST commit; a rebase-merge whose
# last commit misses the app skips the production build (bithuman-apps #355, 2026-09-29).
#
# Rule: diff the app's paths between VERCEL_GIT_PREVIOUS_SHA (the last successful
# deployment for this project + branch, i.e. what is live) and HEAD. Build when:
#   - VERCEL_GIT_PREVIOUS_SHA is empty (first deploy of a branch, redeploys, CLI deploys)
#   - that commit is not in the shallow clone and cannot be fetched
#   - git fails in any way
#   - --preview-always is given and VERCEL_ENV=preview
#   - anything under the given paths (or this script) changed
# Skip only when git positively reports "no change under these paths".
#
# Dry test: VERCEL_ENV=production VERCEL_GIT_PREVIOUS_SHA=$(git rev-parse HEAD~2) \
#   bash scripts/vercel-ignore.sh --preview-always .; echo "exit=$?"

build() { echo "vercel-ignore: BUILD - $*"; exit 1; }
skip()  { echo "vercel-ignore: SKIP - $*"; exit 0; }

# Any unexpected failure below means BUILD, never skip.
trap 'build "unexpected error (line $LINENO)"' ERR

PREVIEW_ALWAYS=0
PATHS=()
for a in "$@"; do
  case "$a" in
    --preview-always) PREVIEW_ALWAYS=1 ;;
    *) PATHS+=("$a") ;;
  esac
done
[ "${#PATHS[@]}" -gt 0 ] || build "no paths given"

ENV_NAME="${VERCEL_ENV:-unknown}"
if [ "$PREVIEW_ALWAYS" = 1 ] && [ "$ENV_NAME" = "preview" ]; then
  build "preview deployments always build"
fi

TOP="$(git rev-parse --show-toplevel 2>/dev/null)" || build "not a git checkout"
cd "$TOP" || build "cannot cd to repo root"

HEAD_SHA="$(git rev-parse --verify -q HEAD 2>/dev/null)" || build "HEAD unresolvable"
PREV="${VERCEL_GIT_PREVIOUS_SHA:-}"
[ -n "$PREV" ] || build "no VERCEL_GIT_PREVIOUS_SHA (first deploy for this branch/env)"
case "$PREV" in *[!0-9a-fA-F]*) build "malformed VERCEL_GIT_PREVIOUS_SHA" ;; esac
[ "$PREV" != "$HEAD_SHA" ] || build "previous deploy sha == HEAD (explicit redeploy)"

if ! git cat-file -e "${PREV}^{commit}" 2>/dev/null; then
  # Vercel clones shallow; fetch the previous deploy commit (GitHub serves reachable shas).
  timeout 60 git fetch --quiet --no-tags --depth=1 origin "$PREV" >/dev/null 2>&1 || true
  git cat-file -e "${PREV}^{commit}" 2>/dev/null || build "previous deploy $PREV not reachable in the clone"
fi

# This script and the paths decide what ships, so a change to the script builds too.
rc=0
git diff --quiet "$PREV" "$HEAD_SHA" -- "${PATHS[@]}" scripts/vercel-ignore.sh || rc=$?
case "$rc" in
  0) skip "no change under ${PATHS[*]} since last $ENV_NAME deploy ${PREV:0:12} (HEAD ${HEAD_SHA:0:12})" ;;
  1) build "changes under ${PATHS[*]} since last $ENV_NAME deploy ${PREV:0:12} (HEAD ${HEAD_SHA:0:12})" ;;
  *) build "git diff failed (rc=$rc)" ;;
esac
