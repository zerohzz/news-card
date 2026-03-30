#!/bin/bash
set -euo pipefail

# Playwright screenshot: HTML â†’ PNG at 1080Ã—1920 @2x.
# Usage: bash screenshot.sh <html_dir> <output_dir>

SKILL_DIR="$(cd "$(dirname "$0")/.." && pwd)"
HTML_DIR="${1:?Usage: screenshot.sh <html_dir> <output_dir>}"
OUTPUT_DIR="${2:?Usage: screenshot.sh <html_dir> <output_dir>}"

# Ensure Playwright browsers are installed
echo "=== Ensuring Playwright Chromium is installed ==="
npx playwright install chromium --with-deps 2>/dev/null || {
  echo "âš ï¸  Auto-install failed, trying manual install..."
  npx playwright install chromium || true
}

echo "=== Taking screenshots ==="
node "$SKILL_DIR/scripts/lib/screenshot-playwright.js" \
  --input "$HTML_DIR" \
  --output "$OUTPUT_DIR"

echo "âœ… Screenshots saved to: $OUTPUT_DIR"
ls -la "$OUTPUT_DIR"/*.png 2>/dev/null || echo "âš ï¸  No PNG files found"
