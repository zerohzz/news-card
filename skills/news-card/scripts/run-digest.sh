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
echo "  News Card — AI 日报生成管线"
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
echo "⏳ 等待 Claude 选题..."
echo "   Claude 需要读取 $WORK_DIR/scored.json"
echo "   然后输出 $WORK_DIR/digest.json"
echo ""

# Check if digest.json already exists (e.g., from a previous run or Claude already wrote it)
if [ -f "$WORK_DIR/digest.json" ]; then
  echo "✅ digest.json 已存在，跳过 curate 步骤"
else
  echo "❌ digest.json 不存在。请在 Claude 对话中完成选题后重新运行此脚本，"
  echo "   或手动创建 $WORK_DIR/digest.json"
  echo ""
  echo "   提示: 你可以单独运行 Step 4-5:"
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

echo ""
echo "============================================"
echo "  ✅ 完成！"
echo "  输出目录: $OUTPUT_ROOT"
echo "    slides/ — 8 个 HTML 文件"
echo "    images/ — 8 张 PNG 卡片 (1080×1920 @2x)"
echo "============================================"
