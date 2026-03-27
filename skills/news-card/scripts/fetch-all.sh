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

# Wait for all fetchers
wait $PID_RSS || echo "⚠️  RSS fetch had errors (partial results may exist)"
wait $PID_HN || echo "⚠️  HN fetch had errors"
wait $PID_HF || echo "⚠️  HF fetch had errors"
wait $PID_BLOGS || echo "⚠️  Blog scraper had errors (continuing)"

# Merge all JSON arrays into one
node -e "
import { readFileSync, writeFileSync } from 'fs';
const files = ['rss.json', 'hn.json', 'hf.json', 'blogs.json'];
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

echo "✅ Wrote $(node -e "import{readFileSync as r}from'fs';console.log(JSON.parse(r('$OUTPUT','utf-8')).length)") candidates to $OUTPUT"
