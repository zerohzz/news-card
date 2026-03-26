# CLAUDE.md — Project Instructions for Claude Code

## What This Project Is

`news-card` is a Claude Code Skill that generates AI news digest cards. It fetches 25+ English-language AI news sources, scores and deduplicates them, then produces 8 PNG cards (1080×1920px, 9:16 ratio) for Xiaohongshu-style sharing.

## Project Structure

```
news-card/                           # Project root
├── CLAUDE.md                        # This file — project-level instructions
├── README.md                        # Project documentation
├── package.json                     # Dependencies (rss-parser, playwright)
├── skills/
│   └── news-card/                   # The skill itself
│       ├── SKILL.md                 # Skill entry point (Claude reads this)
│       ├── templates/               # HTML templates + output.md
│       ├── references/              # Spec docs (sources, scoring, density, design)
│       ├── scripts/                 # Shell wrappers + lib/ (Node.js modules)
│       ├── examples/                # Sample data
│       └── assets/fonts/            # Font files (optional)
├── workspace/                       # Intermediate data (gitignored)
└── output/                          # Final deliverables (gitignored)
```

## How to Run

```bash
# Full pipeline
bash skills/news-card/scripts/run-digest.sh

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
    │   ├── ...
    │   └── page-7-briefs.html
    ├── images/              ← PNG screenshots (8 cards, 2160×3840px @2x)
    │   ├── page-0-cover.png
    │   ├── page-1-top1.png
    │   ├── ...
    │   └── page-7-briefs.png
    └── digest.json          ← Curated news data for this run
```

- **Never overwrite** previous runs — each gets its own timestamped directory
- `slides/` stores the intermediate HTML (useful for debugging or manual editing)
- `images/` stores the final PNG deliverables
- `output/` and `workspace/` are gitignored

## Pipeline Steps

### Step 1: Fetch
```bash
bash skills/news-card/scripts/fetch-all.sh workspace/candidates.json
```
Runs all fetchers in parallel (RSS, Hacker News, HuggingFace, Twitter). Outputs `candidates.json`.

### Step 2: Score + Dedup
```bash
bash skills/news-card/scripts/score.sh workspace/candidates.json workspace/scored.json
```
Applies scoring formula: `cross_validation × 2.0 + community × 1.5 + authority × 1.0 + recency × 0.8`. Deduplicates via Jaccard similarity.

### Step 3: Curate (Claude's job)
Read `scored.json`, select 16 stories across 3 tiers, write `digest.json`. See `skills/news-card/SKILL.md` for the full curation prompt and JSON schema.

### Step 4: Render
```bash
node skills/news-card/scripts/lib/render-html.js \
  --input digest.json \
  --templates skills/news-card/templates \
  --output output/<timestamp>/slides
```

### Step 5: Screenshot
```bash
bash skills/news-card/scripts/screenshot.sh output/<timestamp>/slides output/<timestamp>/images
```

## Key Architecture Decisions

- **Skill lives in `skills/news-card/`** — follows Claude Code Skills best practice
- **`package.json` at project root** — Node resolves `node_modules` by walking up the directory tree
- **ESM modules** — all `.js` files use `import`/`export` (`"type": "module"`)
- **Custom template engine** — handles `{{var}}`, `{{#each}}`, `{{#if}}` with nesting (no Handlebars dep)
- **Custom Jaccard dedup** — no string-similarity dependency
- **Playwright over Puppeteer** — better cross-platform browser management
- **Shell wraps Node** — `.sh` handles orchestration, `.js` handles logic
- **Serif fonts only** — Noto Serif SC + Source Serif Pro, never sans-serif
- **Hardcoded viewport** — 1080×1920px, not configurable by design

## Design Constraints (Mandatory)

- Read `skills/news-card/references/density-spec.md` before modifying any HTML template
- Read `skills/news-card/references/design-tokens.md` before changing any colors or fonts
- Text density: 50%–65% per page type. No large empty areas
- Category colors must match `design-tokens.md` mapping
- Screenshot dimensions: always 1080×1920 @2x (2160×3840px actual)

## File Reference

| Purpose | File |
|---------|------|
| Skill entry point | `skills/news-card/SKILL.md` |
| Source list + fetch strategies | `skills/news-card/references/sources-spec.md` |
| Scoring formula | `skills/news-card/references/scoring-spec.md` |
| Density rules | `skills/news-card/references/density-spec.md` |
| Design variables | `skills/news-card/references/design-tokens.md` |
| Sample data | `skills/news-card/examples/sample-digest.json` |
| Main pipeline | `skills/news-card/scripts/run-digest.sh` |

## Development Notes

- `workspace/` at project root stores intermediate data (candidates, scored, digest JSON). Gitignored.
- `output/` at project root stores final deliverables. Gitignored.
- Twitter/X fetcher uses guest mode and may fail — pipeline continues without it.
- Google Fonts CDN is used in HTML templates. For offline environments, remove the `<link>` tag.
- Playwright auto-detects Chromium from `~/.cache/ms-playwright/`. Install with `npx playwright install chromium`.
