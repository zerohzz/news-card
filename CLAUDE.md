# CLAUDE.md — Project Instructions for Claude Code

## What This Project Is

`news-card` is a Claude Code Skill that generates a daily AI news digest. It fetches 65+ English and Chinese AI sources, scores and de-duplicates them, then produces 10 PNG cards (1080×1920, 9:16) plus a Gemini-generated hero cover for Xiaohongshu-style sharing.

## Repository layout

```
news-card/
├── CLAUDE.md                       # This file
├── README.md                       # Public-facing overview
├── SETUP.md                        # Environment setup
├── LICENSE
├── .env.example                    # Optional Gemini key
├── package.json
├── scripts/                        # Top-level helpers
│   ├── build-xhs-digest.cjs        # Sensitive-word substitution
│   ├── render-v3-cover.cjs         # V3 hero cover renderer
│   ├── shoot-v3-cover.cjs          # V3 cover screenshot + line-wrap check
│   └── test-rss-urls.js
└── skills/
    ├── news-card/                  # Main pipeline
    │   ├── SKILL.md                # Skill entry point
    │   ├── templates/              # HTML page templates
    │   ├── references/             # Specs (scoring, density, design, sources)
    │   ├── scripts/                # fetch / score / render / screenshot
    │   ├── assets/                 # Fonts, logo, IP reference image
    │   └── examples/               # Sample fixtures
    ├── XHS-writer/                 # Editorial post + 5 title candidates
    ├── xhs-reviewer/               # 7-axis compliance review
    ├── xhs-image-hero/             # Hero image + V3 cover
    ├── xhs-cover-title/            # Three-line punch title
    ├── xhs-image/                  # General XHS image generation
    └── autoresearch/               # Meta-skill (opt-in only)
```

`workspace/` and `output/` are gitignored.

## How to Run

```bash
# Full pipeline
bash skills/news-card/scripts/run-digest.sh

# Or trigger via skill: "今日 AI 日报" / "$news-card"
```

## Output Folder Convention

Each run writes to a fresh timestamped subfolder; runs never overwrite each other.

```
output/<YYYY-MM-DD_HH-MM-SS>/
├── slides/                 # 10 HTML files
├── images/                 # 10 PNG screenshots (2160×3840 @2x)
├── digest.json             # Curated 24 stories
├── digest-xhs.json         # XHS-compliant variant (drives rendering)
├── scored-candidates.md
├── selection-rationale.md
├── pipeline-issues.md
├── xiaohongshu-post.md
├── hero-prompt.md
└── hero-image.png
```

## Pipeline

### Step 1 — Fetch

```bash
bash skills/news-card/scripts/fetch-all.sh workspace/candidates.json
```

Parallel fetchers across RSS, Hacker News, HuggingFace Papers, builder X feeds, newsletters, and vendor blogs. Outputs `candidates.json` and a `sourceCount`.

### Step 2 — Score & dedup

```bash
bash skills/news-card/scripts/score.sh workspace/candidates.json workspace/scored.json
```

8-dimensional scoring (`cross_validation × 2.0`, `community_heat × 1.5`, `authority × 1.0`, `recency × 0.8`, `virality × 1.2`, `actionability × 0.6`, `peer_review × 3.0`, `topic_adjustment × 1.0`). Jaccard de-duplication at 0.6. X / HN / HuggingFace stay in a signal pool that is not ranked into the main feed; follow-builders blog and podcast entries do go into the main ranking.

### Step 3 — Curate (Claude's job)

Read `scored-news.json` + `scored-signals.json` and select exactly 24 stories (4 tier-1 + 4 tier-2 + 16 tier-3). Write `digest.json`.

**Quoting rule:** inside any JSON string value, use `「」` for Chinese quotation marks, never bare `""` (smart quotes or ASCII). The renderer falls back to substituting `“` / `”` → `「」` but it's safer to author them correctly.

### Step 4 — Render

```bash
node skills/news-card/scripts/lib/render-html.js \
  --input output/<ts>/digest-xhs.json \
  --templates skills/news-card/templates \
  --output output/<ts>/slides \
  --source-count <N> \
  --num-sources <N>
```

Injected variables: `assetBase` (auto-computed `file://` URL to `skills/news-card/assets`), date fields (`date_year`, `date_md`, `date_dow`, `date_month_en`, `date_day_ordinal`), `total`, `sourceCount`, `numSources`, `readingMinutes`, `savedCost`, and `tier1` (first 4 stories). Reading time and saved cost are derived from content.

### Step 5 — Screenshot

```bash
bash skills/news-card/scripts/screenshot.sh output/<ts>/slides output/<ts>/images
```

### Step 6 — Hero cover

```bash
node skills/xhs-image-hero/scripts/generate.js \
  --promptfile output/<ts>/hero-prompt.md \
  --image      output/<ts>/hero-image.png \
  --ref        skills/news-card/assets/zz-IP-Ref.png \
  --ar 1:1 --quality 2k

node scripts/render-v3-cover.cjs output/<ts>
node scripts/shoot-v3-cover.cjs  output/<ts>
```

## Skill Invocation Rules

- **autoresearch** — only when the user explicitly asks for skill optimisation ("run autoresearch on …"). Never auto-invoke.
- **XHS-writer** — invoke at pipeline step 3.6 to produce `xiaohongshu-post.md`, and whenever the user directly asks for a Xiaohongshu note. Read the SKILL.md voice / compliance / anti-AI-detection rules before writing.
- **news-card** — only on a user trigger ("今日 AI 日报" / `$news-card`).
- **xhs-image-hero** — only when the user explicitly says they want the four-panel hero image.
- Skills do not call each other automatically.

## Key Architecture Decisions

- **Every page is 1080×1920.** Content sits inside a 3:4 safe zone (280 px top / 240 px bottom padding) so Xiaohongshu thumbnails never crop into content.
- **Local fonts.** `NotoSerifSC-Black.ttf` + `ChillDuanHeiSongPro_Regular.otf` are loaded via `@font-face` against `file://` URLs. No CDN dependency at render time.
- **Asset paths are templated.** Templates reference `{{assetBase}}/…`; the renderer computes the absolute `file://` URL at runtime so the repo works on any machine.
- **Logo is pure CSS / SVG.** Double gold arc (`stroke: #c5a059`) + `zz` + `AI每日资讯`. Source design lives in `skills/news-card/assets/logo/src/App.tsx`.
- **ESM throughout.** All `.js` modules use `import` / `export`.
- **Custom template engine.** Handles `{{var}}`, `{{#each}}`, `{{#if}}` with nesting and parent-context lookup. No Handlebars dependency.
- **Shell wraps Node.** `.sh` files orchestrate; `.js` files do the work.
- **Serif fonts only.** Noto Serif SC + Source Serif Pro; never sans-serif.
- **Hardcoded viewport.** 1080×1920 is a design constant, not a knob.

## Design Constraints (Mandatory)

- Read [`references/density-spec.md`](skills/news-card/references/density-spec.md) before modifying any HTML template.
- Read [`references/design-tokens.md`](skills/news-card/references/design-tokens.md) before changing any color or font.
- **Hero cover (P0):** the open layout is intentional — editorial brand hook, not subject to the 50–65 % density rule.
- **All other pages:** text density 50–65 %, no large empty areas.
- Category colors must match the design-tokens mapping.
- Screenshots are always 1080×1920 @2x → 2160×3840 px.
- The AI label always reads exactly `含AI辅助生成内容`, hollow orange (`#E8734A`), Apple squircle, 7 px radius.

## Cover Page (P0) Reference

Top → bottom inside the safe zone:

1. **Date** — `2026.03.30 Mon`, 40 px, above the logo.
2. **Brand mark** — SVG double arc + `zz` (gold, Noto Serif SC 900) + `AI每日资讯` (black).
3. **Slogan** — two lines, green / red highlights.
4. **Rule** — double-line separator.
5. **Stats bar** — `精选N条 | M+条候选 | P+个来源` (compact, secondary).
6. **Top 4 news** — tier-1 headlines (34 px) + category badge + source.

## Template Variables (hero cover)

| Variable | Source | Example |
|----------|--------|---------|
| `assetBase` | render-html.js (absolute `file://` URL to `skills/news-card/assets`) | `file:///C:/.../skills/news-card/assets` |
| `date_year` | render-html.js | `2026` |
| `date_md` | render-html.js | `03.30` |
| `date_dow` | render-html.js | `Mon` |
| `date_month_en` | render-html.js | `MARCH` |
| `total` | digest.json item count | `24` |
| `sourceCount` | `--source-count` CLI arg | `130` |
| `numSources` | `--num-sources` CLI arg | `65` |
| `savedHours` | hardcoded `3` | `3` |
| `savedCost` | `estimateApiCost(candidateCount)` | `1.5` |
| `readingMinutes` | `estimateReadingMinutes(items)` | `5` |
| `tier1` | first 4 tier-1 items | array |

## File Reference

| Purpose | File |
|---------|------|
| news-card skill entry | `skills/news-card/SKILL.md` |
| XHS-writer skill entry | `skills/XHS-writer/SKILL.md` |
| xhs-reviewer skill entry | `skills/xhs-reviewer/SKILL.md` |
| xhs-image-hero skill entry | `skills/xhs-image-hero/SKILL.md` |
| xhs-cover-title skill entry | `skills/xhs-cover-title/SKILL.md` |
| autoresearch skill entry | `skills/autoresearch/SKILL.md` |
| Source list + fetch strategies | `skills/news-card/references/sources-spec.md` |
| Scoring formula | `skills/news-card/references/scoring-spec.md` |
| Density rules | `skills/news-card/references/density-spec.md` |
| Design tokens | `skills/news-card/references/design-tokens.md` |
| Sample data | `skills/news-card/examples/sample-digest.json` |
| Digest validator | `skills/news-card/scripts/validate-digest.js` |
| Main pipeline | `skills/news-card/scripts/run-digest.sh` |

## Development Notes

- `workspace/` stores intermediate data. Gitignored.
- `output/` stores final deliverables. Gitignored.
- There is no separate X / Twitter fetcher. X data comes exclusively from `follow-builders` (`feed-x.json` at <https://github.com/zarazhangrui/follow-builders>). Do not add or invoke a standalone X / Twitter scraper.
- Playwright auto-detects Chromium from `~/.cache/ms-playwright/`. Install with `npx playwright install chromium`.
- Template HTML files reference `{{assetBase}}/Avatar-zz.png` and `{{assetBase}}/fonts/...`. If you add a new template, pass `assetBase` to `renderTemplate` so font and avatar references resolve.
