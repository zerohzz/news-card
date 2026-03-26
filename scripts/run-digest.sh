#!/bin/bash
set -euo pipefail

# End-to-end AI news digest pipeline.
# Usage: bash run-digest.sh [workspace_dir]

SKILL_DIR="$(cd "$(dirname "$0")/.." && pwd)"
WORK_DIR="${1:-$SKILL_DIR/workspace/$(date +%Y-%m-%d)}"
mkdir -p "$WORK_DIR"

echo "============================================"
echo "  News Card — AI 日报生成管线"
echo "  Workspace: $WORK_DIR"
echo "  Date: $(date +%Y-%m-%d)"
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
  echo "   node $SKILL_DIR/scripts/lib/render-html.js --input $WORK_DIR/digest.json --templates $SKILL_DIR/templates --output $WORK_DIR/html"
  echo "   bash $SKILL_DIR/scripts/screenshot.sh $WORK_DIR/html $WORK_DIR/output"
  exit 0
fi

echo ""
echo "=== Step 4/5: Render HTML ==="
node "$SKILL_DIR/scripts/lib/render-html.js" \
  --input "$WORK_DIR/digest.json" \
  --templates "$SKILL_DIR/templates" \
  --output "$WORK_DIR/html"

echo ""
echo "=== Step 5/5: Screenshot ==="
bash "$SKILL_DIR/scripts/screenshot.sh" "$WORK_DIR/html" "$WORK_DIR/output"

echo ""
echo "============================================"
echo "  ✅ 完成！"
echo "  PNG 输出: $WORK_DIR/output/"
echo "  HTML 中间产物: $WORK_DIR/html/"
echo "============================================"
