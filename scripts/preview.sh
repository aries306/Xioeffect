#!/usr/bin/env bash
# XIO preview: idempotently repair the workspace and serve the production
# build on port 3000.
#
# Safe to re-run at any time. Each step is skipped when already done:
#   1. Git     — restore the session branch to the pushed origin tip
#                (only when the tree is clean, so local work is never destroyed)
#   2. Deps    — `npm install` when node_modules is missing
#   3. Build   — `next build` when the build is missing or older than sources
#   4. Serve   — `next start` on 0.0.0.0:${PORT:-3000}
#
# Usage: bash scripts/preview.sh
#   PORT=3000 XIO_PREVIEW_BRANCH=<branch> bash scripts/preview.sh

set -euo pipefail
cd "$(dirname "$0")/.."

PORT="${PORT:-3000}"
BRANCH="${XIO_PREVIEW_BRANCH:-arena/01a0ebde-xioeffect}"

# --- Git: recover the session branch after a workspace reset ----------------
git fetch origin "$BRANCH" --quiet 2>/dev/null || echo "preview: git fetch failed; using last-known origin state" >&2

current_branch="$(git branch --show-current || true)"
remote_head="$(git rev-parse --verify "origin/$BRANCH" 2>/dev/null || true)"

if [ -z "$current_branch" ] || [ "$current_branch" != "$BRANCH" ]; then
  if [ -n "$remote_head" ]; then
    git checkout -B "$BRANCH" "$remote_head"
    echo "preview: git — checked out $BRANCH at $remote_head"
  fi
elif [ -n "$remote_head" ] && [ "$(git rev-parse HEAD)" != "$remote_head" ]; then
  if [ -z "$(git status --porcelain)" ]; then
    git reset --hard "$remote_head"
    echo "preview: git — restored $BRANCH to $remote_head"
  else
    echo "preview: git — WARNING: local changes present and HEAD != origin tip; leaving tree untouched" >&2
  fi
fi

# --- Environment -------------------------------------------------------------
# NEXT_PUBLIC_* values are inlined at build time; real values override these.
# The defaults below are syntactically valid PLACEHOLDERS (nonexistent Clerk
# domain) so pages render without real credentials. Auth will not work.
export NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY="${NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY:-pk_test_eGlvLXByZXZpZXcuY2xlcmsuYWNjb3VudHMuZGV2JA}"
export CLERK_SECRET_KEY="${CLERK_SECRET_KEY:-sk_test_preview_placeholder_not_a_real_key}"

# --- Dependencies ------------------------------------------------------------
if [ ! -d node_modules ]; then
  echo "preview: npm — installing dependencies..."
  npm install --no-audit --no-fund
fi

# --- Build -------------------------------------------------------------------
needs_build=0
if [ ! -f .next/BUILD_ID ]; then
  needs_build=1
  echo "preview: next — no production build found"
else
  stale="$(find app lib public proxy.ts next.config.ts tsconfig.json package.json -type f -newer .next/BUILD_ID 2>/dev/null | head -n 1 || true)"
  if [ -n "$stale" ]; then
    needs_build=1
    echo "preview: next — source changed since last build ($stale)"
  fi
fi

if [ "$needs_build" = "1" ]; then
  echo "preview: next — building..."
  npm run build
else
  echo "preview: next — build is up to date, skipping"
fi

# --- Serve -------------------------------------------------------------------
echo "preview: starting production server on 0.0.0.0:$PORT ..."
exec npx next start -H 0.0.0.0 -p "$PORT"
