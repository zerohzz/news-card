# news-card

> A Claude Code Skill that turns the daily AI news firehose into a curated 10-card visual digest.

`news-card` pulls from 65+ AI sources, scores and de-duplicates the candidates across 8 dimensions, then has Claude curate 24 stories into a tiered 10-page card deck sized for Xiaohongshu / Instagram (1080×1920, @2x). A Gemini-generated four-panel hero image and a three-line "punch" cover wrap the deck.

It is small (~5 KLOC of JS and shell), runs entirely locally, and is designed to be modified — every step of the pipeline is a script you can call on its own.

---

## Quickstart

```bash
git clone https://github.com/zerohzz/news-card.git
cd news-card
npm install
npx playwright install chromium

# Copy and edit if you want the Gemini-powered hero cover; the rest of the
# pipeline works without any API keys.
cp .env.example .env
```

Trigger it inside Claude Code by saying **"今日 AI 日报"** or `$news-card`, or run the pipeline directly:

```bash
bash skills/news-card/scripts/run-digest.sh
```

Output lands in `output/<timestamp>/`.

---

## What it does

```
Fetch  →  Score & dedup  →  Curate  →  XHS review  →  Render  →  Screenshot  →  Hero cover
 65+        8 dimensions      24         compliance     10 HTML    10 PNG @2x    Gemini + V3
sources     Jaccard 0.6      stories     7-axis        templates                  3-line title
```

| Step | What happens | Artifact |
|------|--------------|----------|
| 1. Fetch | Parallel pulls across RSS, Hacker News, HuggingFace Papers, builder X feeds, newsletters, vendor blogs | `candidates.json` |
| 2. Score & dedup | 8-dimensional weighted score, Jaccard de-duplication, topic classification | `scored-news.json`, `scored-signals.json` |
| 3. Curate | Claude picks exactly 24 stories across tier 1 / 2 / 3 under topic-quota rules | `digest.json` |
| 3.6 Post | XHS-writer composes the editorial caption with 5 candidate titles | `xiaohongshu-post.md` |
| 3.7 Quota | `check-topic-quota.js` verifies tier 1 stays tech-led | — |
| 3.9 Length | `validate-digest.js` enforces per-tier character budgets | — |
| 3.95 Review | xhs-reviewer runs 7-axis compliance + sensitive-word substitution | `digest-xhs.json` |
| 4. Render | `digest-xhs.json` → 10 HTML pages via the template engine | `slides/*.html` |
| 5. Screenshot | Playwright captures each page at 1080×1920 @2x | `images/*.png` |
| 6. Hero + V3 | Gemini four-panel image, three-line cover title, V3 cover render | `hero-image.png`, `page-0-v3-cover.png` |

---

## Scoring

```
total = cross_validation × 2.0
      + community_heat   × 1.5
      + authority        × 1.0
      + recency          × 0.8
      + virality         × 1.2
      + actionability    × 0.6
      + peer_review      × 3.0
      + topic_adjustment × 1.0
```

`topic_adjustment` is a first-match-wins classifier that boosts technical and China-AI stories and penalises politically charged or off-topic content:

| Topic | Adjustment | Trigger keywords |
|-------|-----------:|------------------|
| `sovereignty` | **−20** (hard cut) | 台独/港独/疆独/藏独 |
| `unrest` | −4 | 袭击/抗议/示威/燃烧瓶 |
| `politics` | −3 | 两党/共和党/民主党/白宫/国防部/财政部 |
| `religion_ethics` | −2 | 基督教/牧师/宗教 |
| `health_ai` | −1 | 医疗/诊疗/处方/cancer/NHS |
| `finance_ai` | −1 | 银行/炒股/股价/理财 |
| `china_ai_positive` | **+3** | Qwen/DeepSeek/Kimi/通义/智谱/昇腾 |
| `tech` | **+2** | launch/release/benchmark/paper/发布/开源 |
| `ai_reg` | −1 | AI Act / AI 行政令 |

Full rationale: [`skills/news-card/references/scoring-spec.md`](skills/news-card/references/scoring-spec.md).

---

## Topic quotas per tier

| Tier | Tech / neutral | China AI (positive) | Health / finance | Policy | Religion | Politics / unrest |
|------|---------------:|--------------------:|-----------------:|-------:|---------:|------------------:|
| T1 (4) | ≥ 3 | unlimited | 0 | 0 | 0 | 0 |
| T2 (4) | ≥ 2 | unlimited | ≤ 1 | ≤ 1 | ≤ 1 | 0 |
| T3 (16) | ≥ 8 | unlimited | ≤ 2 | ≤ 2 | ≤ 2 | ≤ 2 |

Enforced by `skills/news-card/scripts/check-topic-quota.js`.

---

## Category palette (9 colors)

| Category | Hex | CSS variable |
|----------|-----|--------------|
| 模型发布 | `#4A90D9` 蓝 | `--cat-model-release` |
| 产品应用 | `#7B68EE` 紫 | `--cat-product` |
| 可信对齐 | `#E74C3C` 红 | `--cat-safety` |
| 行业动态 | `#F39C12` 橙 | `--cat-industry` |
| 开发工具 | `#2ECC71` 绿 | `--cat-devtools` |
| 研究前沿 | `#1ABC9C` 青 | `--cat-research` |
| 开源生态 | `#E67E22` 深橙 | `--cat-opensource` |
| 政策监管 | `#95A5A6` 灰 | `--cat-policy` |
| 劳力影响 | `#8E44AD` 紫红 | `--cat-labor` |

Tokens live in [`skills/news-card/references/design-tokens.md`](skills/news-card/references/design-tokens.md). The `可信对齐` label is the only category that is **never** rewritten by the sensitive-word pass.

---

## Page layout

| Page | Tier | Content |
|------|------|---------|
| P0 | — | Brand cover (logo + slogan + Top 4 headlines) |
| V3 | — | Gemini four-panel hero image + three-line punch title |
| P1 | — | Index of all 24 stories |
| P2–P5 | T1 | Full page, ≥ 500-char `content_html` + a semantic component |
| P6–P7 | T2 | Half page, 180–250 chars |
| P8 | T3 news | 8 briefs, 60–90 chars each |
| P9 | T3 signals | Research frontier / builder activity |

Density and overflow rules: [`skills/news-card/references/density-spec.md`](skills/news-card/references/density-spec.md).

---

## Output layout

Every run is written to a fresh timestamped directory — runs never overwrite each other.

```
output/<YYYY-MM-DD_HH-MM-SS>/
├── slides/                      # 10 HTML pages + page-0-v3-cover.html
├── images/                      # 10 PNGs + page-0-v3-cover.png (2160×3840 @2x)
├── digest.json                  # Curated 24 stories
├── digest-xhs.json              # XHS-compliant variant (used by renderer)
├── scored-candidates.md         # Full candidate ranking with reasons
├── selection-rationale.md       # Why these 24
├── pipeline-issues.md           # Any problems flagged during the run
├── xiaohongshu-post.md          # Editorial caption + 5 title candidates
├── hero-prompt.md               # Prompt fed to Gemini
└── hero-image.png               # 2048×2048 four-panel hero
```

---

## Skill map

| Skill | Purpose | Entry |
|-------|---------|-------|
| **news-card** | Main pipeline | `skills/news-card/SKILL.md` |
| **XHS-writer** | Editorial Xiaohongshu post + title generator | `skills/XHS-writer/SKILL.md` |
| **xhs-reviewer** | 7-axis compliance review and sensitive-word substitution | `skills/xhs-reviewer/SKILL.md` |
| **xhs-image-hero** | Gemini hero image + V3 cover | `skills/xhs-image-hero/SKILL.md` |
| **xhs-cover-title** | Three-line punch title generator | `skills/xhs-cover-title/SKILL.md` |
| **autoresearch** | Meta-skill for optimising other skills (opt-in only) | `skills/autoresearch/SKILL.md` |

Each skill is self-contained; skills do not invoke each other automatically.

---

## Project structure

```
news-card/
├── README.md                       ← you are here
├── CLAUDE.md                       # Project instructions for Claude Code
├── SETUP.md                        # Environment setup notes
├── LICENSE                         # MIT
├── .env.example                    # Optional Gemini key for hero image
├── package.json                    # rss-parser + playwright
├── scripts/                        # Top-level helpers (build-xhs-digest, render-v3-cover, ...)
└── skills/
    ├── news-card/                  # Main pipeline
    │   ├── SKILL.md
    │   ├── templates/              # HTML templates (cover, feature, half-page, briefs, ...)
    │   ├── references/             # Specs (scoring, density, design tokens, sources)
    │   ├── scripts/                # fetch / score / render / screenshot
    │   ├── assets/                 # Fonts, logo, IP reference image
    │   └── examples/               # Sample digest + fixtures
    ├── XHS-writer/
    ├── xhs-reviewer/
    ├── xhs-image-hero/             # Hero image + V3 cover
    ├── xhs-cover-title/            # Three-line title
    ├── xhs-image/                  # General XHS image generation
    └── autoresearch/
```

---

## Design constants

- Canvas: **1080×1920** rendered at **@2x → 2160×3840**.
- Safe zone: 280 px top / 240 px bottom (keeps Xiaohongshu thumbnails from cropping the content).
- Fonts: Noto Serif SC + Source Serif Pro (serif only); brand accents in ChillDuanHei.
- Theme: warm white `#FFF9F5`, accent orange `#E8734A`, gold arc `#c5a059`.
- Logo: pure CSS / SVG — double gold arc, `zz`, `AI每日资讯`.
- AI label always reads `含AI辅助生成内容` in hollow orange (Apple squircle, 7 px radius).

---

## Running steps individually

```bash
# 1. Fetch
bash skills/news-card/scripts/fetch-all.sh workspace/candidates.json

# 2. Score & dedup
bash skills/news-card/scripts/score.sh workspace/candidates.json workspace/scored.json

# 3. (Claude curates 24 stories into output/<ts>/digest.json)

# 3.7 / 3.9 — validate
node skills/news-card/scripts/check-topic-quota.js output/<ts>/digest.json
node skills/news-card/scripts/validate-digest.js  output/<ts>/digest.json

# 3.95 — XHS compliance pass
node scripts/build-xhs-digest.cjs output/<ts>/digest.json output/<ts>/digest-xhs.json

# 4. Render HTML
node skills/news-card/scripts/lib/render-html.js \
  --input output/<ts>/digest-xhs.json \
  --templates skills/news-card/templates \
  --output output/<ts>/slides \
  --source-count 131 --num-sources 65

# 5. Screenshot
bash skills/news-card/scripts/screenshot.sh output/<ts>/slides output/<ts>/images

# 6. Hero image (requires GEMINI_API_KEY)
node skills/xhs-image-hero/scripts/generate.js \
  --promptfile output/<ts>/hero-prompt.md \
  --image      output/<ts>/hero-image.png \
  --ref        skills/news-card/assets/zz-IP-Ref.png \
  --ar 1:1 --quality 2k

# 6b. V3 cover (3-line punch title)
node scripts/render-v3-cover.cjs output/<ts>
node scripts/shoot-v3-cover.cjs  output/<ts>
```

---

## Installing as a Claude Code Skill

```bash
cp -r skills/news-card skills/XHS-writer skills/xhs-reviewer \
       skills/xhs-image-hero skills/xhs-cover-title ~/.claude/skills/
```

Then say "今日 AI 日报" in any Claude Code session.

---

## License

[MIT](LICENSE) © 2026 Alex Huang.
