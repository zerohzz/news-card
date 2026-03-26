#!/bin/bash
set -euo pipefail

# RSS fetcher shell wrapper.
# Usage: bash fetch-rss.sh [output.json] [--strategy title_only|metadata|summary]

SKILL_DIR="$(cd "$(dirname "$0")/.." && pwd)"
OUTPUT="${1:-/dev/stdout}"
shift || true

node "$SKILL_DIR/scripts/lib/fetch-rss.js" --output "$OUTPUT" "$@"
