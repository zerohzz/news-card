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

# Split into news (main ranking) vs signals (X + HuggingFace → last page)
echo "=== Splitting news vs signals ==="
NEWS_OUTPUT="${OUTPUT%.json}-news.json"
SIGNALS_OUTPUT="${OUTPUT%.json}-signals.json"
node --input-type=module -e "
import { readFileSync, writeFileSync } from 'fs';
const all = JSON.parse(readFileSync('$OUTPUT', 'utf-8'));
const news = all.filter(i => !i.source?.startsWith('X/') && !i.source?.includes('HuggingFace'));
const signals = all.filter(i => i.source?.startsWith('X/') || i.source?.includes('HuggingFace'));
writeFileSync('$NEWS_OUTPUT', JSON.stringify(news, null, 2));
writeFileSync('$SIGNALS_OUTPUT', JSON.stringify(signals, null, 2));
console.error('[split] ' + news.length + ' news + ' + signals.length + ' signals');
"

# Show summary
node --input-type=module -e "
import { readFileSync } from 'fs';
const all = JSON.parse(readFileSync('$OUTPUT', 'utf-8'));
const news = JSON.parse(readFileSync('$NEWS_OUTPUT', 'utf-8'));
const signals = JSON.parse(readFileSync('$SIGNALS_OUTPUT', 'utf-8'));
const spotlight = news.filter(i => i.scores.total >= 12).length;
const notable = news.filter(i => i.scores.total >= 6 && i.scores.total < 12).length;
const discard = news.filter(i => i.scores.total < 6).length;
console.log('📊 Score summary:');
console.log('   News (main ranking):');
console.log('     ≥12 (spotlight): ' + spotlight);
console.log('     ≥6  (notable):   ' + notable);
console.log('     <6  (discard):   ' + discard);
console.log('     Subtotal:        ' + news.length);
console.log('   Signals (X + HF → last page): ' + signals.length);
console.log('   Total:           ' + all.length);
"

echo "✅ Scored output: $OUTPUT"
echo "   News ranking:  $NEWS_OUTPUT"
echo "   Signal pool:   $SIGNALS_OUTPUT"
