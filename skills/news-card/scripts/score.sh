#!/bin/bash
set -euo pipefail

# Score + dedup pipeline.
# Usage: bash score.sh <candidates.json> <output.json>

SKILL_DIR="$(cd "$(dirname "$0")/.." && pwd)"
INPUT="${1:?Usage: score.sh <candidates.json> <output.json>}"
OUTPUT="${2:?Usage: score.sh <candidates.json> <output.json>}"
TMPDIR=$(mktemp -d)
trap 'rm -rf "$TMPDIR"' EXIT

echo "=== Scoring candidates ==="
SIGNALS_FILE="$(dirname "$INPUT")/newsletter-signals.json"
SIGNALS_ARG=""
if [ -f "$SIGNALS_FILE" ]; then
  SIGNALS_ARG="--signals $SIGNALS_FILE"
  echo "📰 Using newsletter signals from $SIGNALS_FILE"
fi

node "$SKILL_DIR/scripts/lib/score-engine.js" --input "$INPUT" --output "$TMPDIR/scored.json" $SIGNALS_ARG

echo "=== Deduplicating ==="
node "$SKILL_DIR/scripts/lib/dedup.js" --input "$TMPDIR/scored.json" --output "$OUTPUT"

# Show summary
node -e "
import { readFileSync } from 'fs';
const items = JSON.parse(readFileSync('$OUTPUT', 'utf-8'));
const spotlight = items.filter(i => i.scores.total >= 12).length;
const notable = items.filter(i => i.scores.total >= 6 && i.scores.total < 12).length;
const discard = items.filter(i => i.scores.total < 6).length;
console.log('📊 Score summary:');
console.log('   ≥12 (spotlight): ' + spotlight);
console.log('   ≥6  (notable):   ' + notable);
console.log('   <6  (discard):   ' + discard);
console.log('   Total:           ' + items.length);
"

echo "✅ Scored output: $OUTPUT"
