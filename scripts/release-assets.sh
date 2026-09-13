#!/usr/bin/env bash
# Build the release assets for a tag from the exact commit checked out.
# Usage: scripts/release-assets.sh v0.1.0-alpha.1 [out-dir]
# Produces: <out>/evidence-os-inspector-<tag>-site.zip, -source.zip, demo-en.mp4,
#           demo-zh.mp4, SHA256SUMS.txt (with provenance header)
set -euo pipefail
TAG="${1:?tag required, e.g. v0.1.0-alpha.1}"
OUT="${2:-release-assets}"
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

if [ -n "$(git status --porcelain)" ]; then
  echo "working tree not clean; commit first" >&2
  exit 1
fi
COMMIT="$(git rev-parse HEAD)"
if git rev-parse -q --verify "refs/tags/$TAG" >/dev/null; then
  TAG_COMMIT="$(git rev-list -n1 "$TAG")"
  if [ "$TAG_COMMIT" != "$COMMIT" ]; then
    echo "tag $TAG points to $TAG_COMMIT but HEAD is $COMMIT" >&2
    exit 1
  fi
fi

rm -rf "$OUT" dist
mkdir -p "$OUT"
NAME="evidence-os-inspector-$TAG"

# Verification chain is the same one CI runs.
npm run typecheck
npm run lint
npm test
# e2e rebuilds dist itself, so run it first; the packaged build is made after it.
npm run test:e2e
VITE_BASE=/evidence-os-inspector/ npm run build
echo "commit=$COMMIT" > dist/BUILD_INFO.txt
echo "tag=$TAG" >> dist/BUILD_INFO.txt
echo "node=$(node --version)" >> dist/BUILD_INFO.txt
echo "npm=$(npm --version)" >> dist/BUILD_INFO.txt
echo "os=$(uname -s) $(uname -r) $(uname -m)" >> dist/BUILD_INFO.txt
echo "built_at=$(date -u +%Y-%m-%dT%H:%M:%SZ)" >> dist/BUILD_INFO.txt

# Deterministic zips: fixed order, no extra attrs, fixed timestamps.
export TZ=UTC
( cd dist && find . -type f | LC_ALL=C sort | zip -X -q -D "../$OUT/$NAME-site.zip" -@ )
git archive --format=zip --prefix="$NAME/" -o "$OUT/$NAME-source.zip" "$COMMIT"
cp docs/media/demo-en.mp4 docs/media/demo-zh.mp4 "$OUT/"

( cd "$OUT" && {
  echo "# Evidence OS Inspector $TAG"
  echo "# commit: $COMMIT"
  echo "# built: $(date -u +%Y-%m-%dT%H:%M:%SZ) on $(uname -s) $(uname -m), node $(node --version), npm $(npm --version)"
  echo "# verification: typecheck, lint, unit tests, production build (base /evidence-os-inspector/), Playwright e2e — all passed before packaging"
  echo "# sha256 (BSD shasum -a 256 format):"
  shasum -a 256 "$NAME-site.zip" "$NAME-source.zip" demo-en.mp4 demo-zh.mp4
} > SHA256SUMS.txt )

echo "assets in $OUT:"
ls -la "$OUT"
