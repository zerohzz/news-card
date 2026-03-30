#!/bin/bash
set -euo pipefail

# End-to-end AI news digest pipeline.
# Each run creates: output/<YYYY-MM-DD_HH-MM-SS>/slides/ + images/
# Usage: bash run-digest.sh [workspace_dir]

SKILL_DIR="$(cd "$(dirname "$0")/.." && pwd)"
PROJECT_ROOT="$(cd "$SKILL_DIR/../.." && pwd)"
TIMESTAMP=$(date +%Y-%m-%d_%H-%M-%S)
OUTPUT_ROOT="$PROJECT_ROOT/output/$TIMESTAMP"
WORK_DIR="${1:-$PROJECT_ROOT/workspace/$TIMESTAMP}"
SLIDES_DIR="$OUTPUT_ROOT/slides"
IMAGES_DIR="$OUTPUT_ROOT/images"

mkdir -p "$WORK_DIR" "$SLIDES_DIR" "$IMAGES_DIR"

echo "============================================"
echo "  News Card â€” AI æ—¥æŠ¥ç”Ÿæˆç®¡çº¿"
echo "  Workspace: $WORK_DIR"
echo "  Output:    $OUTPUT_ROOT"
echo "  Date: $(date +%Y-%m-%d %H:%M:%S)"
echo "============================================"

echo ""
echo "=== Step 1/5: Fetch ==="
bash "$SKILL_DIR/scripts/fetch-all.sh" "$WORK_DIR/candidates.json"

echo ""
echo "=== Step 2/5: Score + Dedup ==="
bash "$SKILL_DIR/scripts/score.sh" "$WORK_DIR/candidates.json" "$WORK_DIR/scored.json"

echo ""
echo "=== Step 3/5: Curate ==="
echo "â³ ç­‰å¾… Claude é€‰é¢˜..."
echo "   Claude éœ€è¦è¯»å– $WORK_DIR/scored.json"
echo "   ç„¶åŽè¾“å‡º $WORK_DIR/digest.json"
echo ""

# Check if digest.json already exists (e.g., from a previous run or Claude already wrote it)
if [ -f "$WORK_DIR/digest.json" ]; then
  echo "âœ… digest.json å·²å­˜åœ¨ï¼Œè·³è¿‡ curate æ­¥éª¤"
else
  echo "âŒ digest.json ä¸å­˜åœ¨ã€‚è¯·åœ¨ Claude å¯¹è¯ä¸­å®Œæˆé€‰é¢˜åŽé‡æ–°è¿è¡Œæ­¤è„šæœ¬ï¼Œ"
  echo "   æˆ–æ‰‹åŠ¨åˆ›å»º $WORK_DIR/digest.json"
  echo ""
  echo "   æç¤º: ä½ å¯ä»¥å•ç‹¬è¿è¡Œ Step 4-5:"
  echo "   node $SKILL_DIR/scripts/lib/render-html.js --input $WORK_DIR/digest.json --templates $SKILL_DIR/templates --output $SLIDES_DIR"
  echo "   bash $SKILL_DIR/scripts/screenshot.sh $SLIDES_DIR $IMAGES_DIR"
  exit 0
fi

echo ""
echo "=== Step 4/5: Render HTML ==="
node "$SKILL_DIR/scripts/lib/render-html.js" \
  --input "$WORK_DIR/digest.json" \
  --templates "$SKILL_DIR/templates" \
  --output "$SLIDES_DIR"

echo ""
echo "=== Step 5/5: Screenshot ==="
bash "$SKILL_DIR/scripts/screenshot.sh" "$SLIDES_DIR" "$IMAGES_DIR"

# Copy digest.json to output for reference
cp "$WORK_DIR/digest.json" "$OUTPUT_ROOT/digest.json" 2>/dev/null || true
cp "$WORK_DIR/scored-candidates.md" "$OUTPUT_ROOT/scored-candidates.md" 2>/dev/null || true

echo ""
echo "============================================"
echo "  âœ… å®Œæˆï¼"
echo "  è¾“å‡ºç›®å½•: $OUTPUT_ROOT"
echo "    slides/ â€” 10 ä¸ª HTML æ–‡ä»¶"
echo "    images/ â€” 10 å¼  PNG å¡ç‰‡ (1080Ã—1920 @2x)"
echo "============================================"
