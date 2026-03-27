#!/bin/bash
set -euo pipefail

# Fetch all sources concurrently, merge into candidates.json.
# Usage: bash fetch-all.sh <output_file>

SKILL_DIR="$(cd "$(dirname "$0")/.." && pwd)"
OUTPUT="${1:?Usage: fetch-all.sh <output_file>}"
TMPDIR=$(mktemp -d)
trap 'rm -rf "$TMPDIR"' EXIT

echo "=== Fetching all sources ==="

# Run all fetchers in parallel
node "$SKILL_DIR/scripts/lib/fetch-rss.js" --output "$TMPDIR/rss.json" &
PID_RSS=$!

node "$SKILL_DIR/scripts/lib/fetch-hackernews.js" --output "$TMPDIR/hn.json" &
PID_HN=$!

node "$SKILL_DIR/scripts/lib/fetch-huggingface.js" --output "$TMPDIR/hf.json" &
PID_HF=$!

node "$SKILL_DIR/scripts/lib/fetch-blogs.js" --output "$TMPDIR/blogs.json" &
PID_BLOGS=$!

node "$SKILL_DIR/scripts/lib/fetch-follow-builders.js" --output "$TMPDIR/follow-builders.json" &
PID_FB=$!

echo "--- Newsletter signals ---"
node "$SKILL_DIR/scripts/lib/fetch-newsletters.js" --output "$TMPDIR/newsletter-signals.json" &
PID_NL=$!

# Wait for all fetchers
wait $PID_RSS || echo "⚠️  RSS fetch had errors (partial results may exist)"
wait $PID_HN || echo "⚠️  HN fetch had errors"
wait $PID_HF || echo "⚠️  HF fetch had errors"
wait $PID_BLOGS || echo "⚠️  Blog scraper had errors (continuing)"
wait $PID_FB || echo "⚠️  Follow-builders fetch had errors (continuing)"
wait $PID_NL || echo "⚠️  Newsletter signals had errors (continuing)"

# Merge all JSON arrays into one
node -e "
import { readFileSync, writeFileSync } from 'fs';
const files = ['rss.json', 'hn.json', 'hf.json', 'blogs.json', 'follow-builders.json'];
const all = [];
for (const f of files) {
  try {
    const data = JSON.parse(readFileSync('$TMPDIR/' + f, 'utf-8'));
    all.push(...data);
  } catch (e) {
    console.error('Skip ' + f + ': ' + e.message);
  }
}
console.error('[merge] Total candidates: ' + all.length);
writeFileSync('$OUTPUT', JSON.stringify(all, null, 2));
"

# Copy newsletter signals alongside candidates
if [ -f "$TMPDIR/newsletter-signals.json" ]; then
  cp "$TMPDIR/newsletter-signals.json" "${OUTPUT%/*}/newsletter-signals.json" 2>/dev/null || true
  cp "$TMPDIR/newsletter-signals.json" "$(dirname "$OUTPUT")/newsletter-signals.json" 2>/dev/null || true
fi

echo "✅ Wrote $(node -e "import{readFileSync as r}from'fs';console.log(JSON.parse(r('$OUTPUT','utf-8')).length)") candidates to $OUTPUT"
