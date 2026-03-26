# CLAUDE.md — Project Instructions for Claude Code

## What This Project Is

`news-card` is a Claude Code Skill that generates AI news digest cards. It fetches 25+ English-language AI news sources, scores and deduplicates them, then produces 8 PNG cards (1080×1920px, 9:16 ratio) for Xiaohongshu-style sharing.

## How to Run

```bash
# Full pipeline (fetch → score → curate → render → screenshot)
bash scripts/run-digest.sh

# Or trigger via skill: "今日 AI 日报" / "$news-card"
```

## Output Folder Convention

**Each run creates a timestamped subfolder under `output/`** with two subdirectories:

```
output/
└── YYYY-MM-DD_HH-MM-SS/
    ├── slides/              ← HTML files (8 pages)
    │   ├── page-0-cover.html
    │   ├── page-1-top1.html
    │   ├── page-2-top2.html
    │   ├── page-3-top3.html
    │   ├── page-4-top4.html
    │   ├── page-5-second.html
    │   ├── page-6-second.html
    │   └── page-7-briefs.html
    ├── images/              ← PNG screenshots (8 cards, 2160×3840px @2x)
    │   ├── page-0-cover.png
    │   ├── page-1-top1.png
    │   ├── page-2-top2.png
    │   ├── page-3-top3.png
    │   ├── page-4-top4.png
    │   ├── page-5-second.png
    │   ├── page-6-second.png
    │   └── page-7-briefs.png
    └── digest.json          ← Curated news data for this run
```

- **Never overwrite** previous runs — each gets its own timestamped directory
- `slides/` stores the intermediate HTML (useful for debugging or manual editing)
- `images/` stores the final PNG deliverables
- `output/` is gitignored

## Pipeline Steps

### Step 1: Fetch
```bash
bash scripts/fetch-all.sh workspace/candidates.json
```
Runs all fetchers in parallel (RSS, Hacker News, HuggingFace, Twitter). Outputs `candidates.json`.

### Step 2: Score + Dedup
```bash
bash scripts/score.sh workspace/candidates.json workspace/scored.json
```
Applies scoring formula: `cross_validation × 2.0 + community × 1.5 + authority × 1.0 + recency × 0.8`. Deduplicates via Jaccard similarity. Outputs `scored.json` sorted by score.

### Step 3: Curate (Claude's job)
Read `scored.json`, select 16 stories across 3 tiers, write `digest.json`. See `SKILL.md` for the full curation prompt and JSON schema.

### Step 4: Render
```bash
node scripts/lib/render-html.js --input digest.json --templates templates --output output/<timestamp>/slides
```
Fills HTML templates with digest data. Outputs 8 HTML files.

### Step 5: Screenshot
```bash
bash scripts/screenshot.sh output/<timestamp>/slides output/<timestamp>/images
```
Playwright captures each HTML at 1080×1920 with deviceScaleFactor 2. Outputs 8 PNG files.

## Key Architecture Decisions

- **ESM modules** — all `.js` files use `import`/`export` (`"type": "module"` in package.json)
- **Custom template engine** — `render-html.js` handles `{{var}}`, `{{#each}}`, `{{#if}}` with proper nesting support (no Handlebars dependency)
- **Custom Jaccard dedup** — `dedup.js` implements tokenization + Jaccard similarity (no string-similarity dependency)
- **Playwright over Puppeteer** — better cross-platform browser management
- **Shell wraps Node** — `.sh` scripts handle orchestration, `.js` handles logic
- **Serif fonts only** — Noto Serif SC + Source Serif Pro, never sans-serif
- **Hardcoded viewport** — 1080×1920px, not configurable by design

## Design Constraints (Mandatory)

- Read `references/density-spec.md` before modifying any HTML template
- Read `references/design-tokens.md` before changing any colors or fonts
- Text density: 50%–65% per page type. No large empty areas
- Category colors must match `design-tokens.md` mapping
- Screenshot dimensions: always 1080×1920 @2x (2160×3840px actual)

## File Reference

| Purpose | File |
|---------|------|
| Skill entry point | `SKILL.md` |
| Source list + fetch strategies | `references/sources-spec.md` |
| Scoring formula | `references/scoring-spec.md` |
| Density rules | `references/density-spec.md` |
| Design variables | `references/design-tokens.md` |
| Sample data | `examples/sample-digest.json` |
| Main pipeline | `scripts/run-digest.sh` |

## Development Notes

- `workspace/` stores intermediate data (candidates, scored, digest JSON). Gitignored.
- `output/` stores final deliverables. Gitignored.
- Twitter/X fetcher (`fetch-twitter.js`) uses guest mode and may fail — pipeline continues without it.
- Google Fonts CDN is used in HTML templates. For offline environments, remove the `<link>` tag and fonts fall back to system serif.
- Playwright auto-detects Chromium from `~/.cache/ms-playwright/`. Install with `npx playwright install chromium`.
