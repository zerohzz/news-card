# AI 日报 UI & Content Optimization Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Fix feature page content overlap, improve cover mobile-readability, upgrade content scoring algorithm, and increase text density on half-page/briefs.

**Architecture:** 5 workstreams: (1) Fix critical CSS overflow bug on feature pages, (2) Redesign cover for mobile, (3) Upgrade scoring algorithm with newsletter methodology, (4) Increase content requirements for tier-2/tier-3, (5) Standardize footer layout.

**Tech Stack:** HTML/CSS, Node.js ESM, Playwright

---

## File Structure

### Modified Files
- `skills/news-card/templates/feature.html` — Fix overflow/overlap bug, footer layout
- `skills/news-card/templates/cover.html` — Mobile-friendly text, source count, fill bottom
- `skills/news-card/templates/half-page.html` — Footer layout
- `skills/news-card/templates/briefs.html` — Footer layout
- `skills/news-card/scripts/lib/score-engine.js` — New scoring formula with virality/shareability
- `skills/news-card/references/scoring-spec.md` — Updated methodology
- `skills/news-card/SKILL.md` — Longer content requirements for tier-2/tier-3

---

### Task 1: Fix feature page content overflow/overlap (CRITICAL BUG)

**Files:**
- Modify: `skills/news-card/templates/feature.html`

The bug: `.content` has `overflow: hidden` + `justify-content: space-between`. When `content_html` is long, elements at the bottom (callout boxes, person-cards) get clipped by the footer. Visible in pages 2 and 3 where "后续影响" callout and Simon Willison person-card are cut off.

- [ ] **Step 1: Read the current feature.html**

Read `skills/news-card/templates/feature.html` and find the `.content` CSS rule (~line 99-106).

- [ ] **Step 2: Fix the overflow**

Change `.content` from:
```css
.content {
  flex: 1;
  padding: 36px 60px;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
}
```

To:
```css
.content {
  flex: 1;
  padding: 36px 60px;
  overflow-y: auto;
  overflow-x: hidden;
  /* Remove justify-content: space-between — it causes bottom elements to
     overlap with footer when content is long. Content should flow naturally
     from top to bottom. */
}
```

Key changes:
- `overflow: hidden` → `overflow-y: auto; overflow-x: hidden` — allows vertical scroll if content overflows (Playwright will capture the full 1920px viewport anyway)
- Remove `display: flex; flex-direction: column; justify-content: space-between` — this was spreading content apart when short AND clipping when long. Let content flow naturally top-to-bottom instead.

- [ ] **Step 3: Test with sample data**

```bash
node skills/news-card/scripts/lib/render-html.js --input skills/news-card/examples/sample-digest.json --templates skills/news-card/templates --output /tmp/test-fix/slides 2>&1
node skills/news-card/scripts/lib/screenshot-playwright.js --input /tmp/test-fix/slides --output /tmp/test-fix/images 2>&1
```

Open page-2 and page-3 PNGs. Verify:
- All content is visible (no clipping at bottom)
- Callout boxes and person-cards are fully rendered
- Footer is visible and not overlapped

- [ ] **Step 4: Commit**

```bash
git add skills/news-card/templates/feature.html
git commit -m "fix: remove overflow:hidden and space-between from feature.html to prevent content clipping"
```

---

### Task 2: Redesign cover page for mobile readability

**Files:**
- Modify: `skills/news-card/templates/cover.html`
- Modify: `skills/news-card/scripts/lib/render-html.js` (pass `total_sources` to cover template)

- [ ] **Step 1: Read current cover.html**

Read `skills/news-card/templates/cover.html`.

- [ ] **Step 2: Update cover CSS for larger, mobile-friendly text**

Key changes:
- Main title "AI 日报": increase to 72px
- News item headlines: increase to 28px (from ~24px)
- Category group headers: increase to 32px
- Tier badges: increase to 22px
- Reduce gaps between category groups to fill bottom space
- Add a "本日信息源" summary line above the footer showing total source count

- [ ] **Step 3: Update render-html.js to pass `total_sources` count**

In `renderAll()`, where the cover page is rendered (~line 192-200), add a `total_sources` variable:

```javascript
const coverHTML = renderTemplate(coverTpl, {
  date: today,
  total: allItems.length,
  total_sources: allItems.length,  // total candidates before curation
  issue,
  categories: groupByCategory(allItems),
});
```

Also modify the function signature to accept an optional `totalCandidates` parameter, or just use the count of all items in the digest.

- [ ] **Step 4: Add source count to cover HTML template**

Above the footer in cover.html, add:
```html
<div class="source-count">本日共提取 {{total_sources}} 条信息源</div>
```

With CSS:
```css
.source-count {
  text-align: center;
  font: 500 24px/1.5 var(--font-zh);
  color: var(--text-mid);
  margin-top: auto;
  padding: 16px 0;
}
```

- [ ] **Step 5: Test and verify**

Render + screenshot. Check:
- All text readable at mobile scale
- Bottom area filled (source count + footer)
- No excessive whitespace below the last category group

- [ ] **Step 6: Commit**

```bash
git add skills/news-card/templates/cover.html skills/news-card/scripts/lib/render-html.js
git commit -m "feat: improve cover page mobile readability and add source count"
```

---

### Task 3: Upgrade content scoring algorithm

**Files:**
- Modify: `skills/news-card/scripts/lib/score-engine.js`
- Modify: `skills/news-card/references/scoring-spec.md`

Based on the methodology research from 5 top newsletters:

| Newsletter | Core Principle |
|------------|---------------|
| The Rundown AI | "Can this make someone act in 5 minutes?" — actionability |
| TLDR | "Would I forward this to my group chat?" — shareability |
| Superhuman AI | "Did AI surpass human ability at something?" — breakthrough detection |
| The Neuron | "Can I explain this with a joke?" — understandability |
| The Batch | "Does Andrew Ng think this matters?" — authority judgment |
| AI资讯速览 | Multi-source cross-validation + human-algorithm separation |

- [ ] **Step 1: Read current score-engine.js**

Read `skills/news-card/scripts/lib/score-engine.js` to understand the current formula.

- [ ] **Step 2: Update the scoring formula**

Add two new dimensions to the existing formula:

**Current:** `cross_validation × 2.0 + community × 1.5 + authority × 1.0 + recency × 0.8`

**New:** `cross_validation × 2.0 + community × 1.5 + authority × 1.0 + recency × 0.8 + virality × 1.2 + actionability × 0.6`

New scoring dimensions:
- **virality** (0-5): Based on community_metrics. tweets with likes > 5000 = 5, > 1000 = 4, > 500 = 3, > 100 = 2, > 0 = 1. HN stories with score > 200 = 5, > 100 = 4, > 50 = 3, > 20 = 2, > 0 = 1. Captures the "would I forward this?" test.
- **actionability** (0-3): Keyword-based heuristic. Title/summary containing action words like "launches", "releases", "open-sources", "announces", "introduces", "available", "now available", "free", "open beta" = 3. Words like "raises", "acquires", "partners" = 2. Analysis/opinion pieces = 1. This captures the "can someone act on this?" test.

Implementation in score-engine.js:
```javascript
function scoreVirality(item) {
  const metrics = item.community_metrics || {};
  const likes = metrics.likes || 0;
  const score = metrics.score || 0;

  if (item.source?.startsWith('X/')) {
    if (likes >= 5000) return 5;
    if (likes >= 1000) return 4;
    if (likes >= 500) return 3;
    if (likes >= 100) return 2;
    return likes > 0 ? 1 : 0;
  }

  // HN, HF, general
  if (score >= 200) return 5;
  if (score >= 100) return 4;
  if (score >= 50) return 3;
  if (score >= 20) return 2;
  return score > 0 ? 1 : 0;
}

function scoreActionability(item) {
  const text = ((item.title || '') + ' ' + (item.summary || '')).toLowerCase();
  const highAction = /\b(launch|release|open.?source|announc|introduc|available|free|open beta|ship|deploy)\b/i;
  const medAction = /\b(rais|acquir|partner|invest|fund|merge|hire)\b/i;

  if (highAction.test(text)) return 3;
  if (medAction.test(text)) return 2;
  return 1;
}
```

- [ ] **Step 3: Update scoring-spec.md**

Add the new dimensions to the documentation with the methodology rationale.

- [ ] **Step 4: Test scoring**

```bash
bash skills/news-card/scripts/score.sh workspace/2026-03-27_15-10-55/candidates.json /tmp/test-scored.json 2>&1
```

Check that high-engagement tweets (Karpathy 16K likes) now rank higher.

- [ ] **Step 5: Commit**

```bash
git add skills/news-card/scripts/lib/score-engine.js skills/news-card/references/scoring-spec.md
git commit -m "feat: add virality and actionability scoring dimensions based on newsletter methodology"
```

---

### Task 4: Increase content requirements for tier-2 and tier-3

**Files:**
- Modify: `skills/news-card/SKILL.md`

- [ ] **Step 1: Read current SKILL.md curation section**

Read `skills/news-card/SKILL.md` and find the output schema and content rules.

- [ ] **Step 2: Update tier-2 summary length**

Change tier-2 `summary_zh` requirement from 80 chars to 150 chars:
```
"summary_zh": "第一梯队 150 字 / 第二梯队 150 字 / 第三梯队 60 字"
```

Add a note: "第二梯队必须包含至少两个自然段，每段有一定长度，不要让页面显得太空。"

- [ ] **Step 3: Update tier-3 summary length**

Change tier-3 `summary_zh` requirement from 30 chars to 60 chars:
```
"第三梯队：60 字以上，在允许范围内尽量写满一个自然段"
```

- [ ] **Step 4: Add content guidelines based on newsletter methodology**

Add a new section to SKILL.md after the curation prompt:

```markdown
### 选题准则（参考顶级 Newsletter 方法论）

选题时，每条新闻必须通过以下至少一个测试：

1. **转发测试**（TLDR）：你会不会把这个转发给朋友？
2. **行动测试**（Rundown AI）：读者能不能在 5 分钟内基于这条新闻做出行动？
3. **利他测试**：这条新闻是否让人想要收藏或转发给别人？

**排除标准：**
- 没有具体信息量的泛泛评论文章
- 重复此前已报道过的相同事件
- 纯融资/人事变动（除非金额或人物足够重磅）
```

- [ ] **Step 5: Commit**

```bash
git add skills/news-card/SKILL.md
git commit -m "feat: increase tier-2/tier-3 content requirements, add newsletter-based selection criteria"
```

---

### Task 5: Standardize footer layout across all templates

**Files:**
- Modify: `skills/news-card/templates/feature.html`
- Modify: `skills/news-card/templates/half-page.html`
- Modify: `skills/news-card/templates/briefs.html`
- Modify: `skills/news-card/templates/cover.html`

User requested footer layout: Left = "News Card", Center = date+time, Right = empty.

- [ ] **Step 1: Define the standard footer HTML**

All templates should use this footer structure:
```html
<div class="footer">
  <span class="brand">News Card</span>
  <span class="date-center">{{date}} · 第 {{issue}} 期</span>
  <span class="spacer"></span>
</div>
```

With CSS:
```css
.footer {
  flex-shrink: 0;
  padding: 12px 60px;
  border-top: 1px solid var(--divider);
  display: flex;
  justify-content: space-between;
  align-items: center;
  font: 400 18px/1 var(--font-en);
  color: var(--text-dim);
}
.footer .brand { font-weight: 700; color: var(--accent); }
.footer .date-center { text-align: center; }
.footer .spacer { width: 80px; } /* balances the layout */
```

- [ ] **Step 2: Update feature.html footer**

Read feature.html. Replace the current `.footer` section (`.source-bar` + `.brand-bar`) with the standard footer. Move the source attribution INTO the `.content` area (above the footer), not in the footer itself.

Add source info as the last element in `.content`:
```html
<div class="source-info">
  <span>{{source}}</span> · <span>{{source_url}}</span>
</div>
```

With CSS:
```css
.source-info {
  margin-top: auto;
  padding-top: 16px;
  border-top: 1px solid var(--divider);
  font: 400 20px/1.4 var(--font-en);
  color: var(--text-dim);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
```

- [ ] **Step 3: Update half-page.html footer**

Read half-page.html. Replace the footer to match standard layout.

- [ ] **Step 4: Update briefs.html footer**

Read briefs.html. Replace the footer to match standard layout.

- [ ] **Step 5: Update cover.html footer**

Read cover.html. Replace the footer to match standard layout.

- [ ] **Step 6: Test all pages**

```bash
node skills/news-card/scripts/lib/render-html.js --input skills/news-card/examples/sample-digest.json --templates skills/news-card/templates --output /tmp/test-footer/slides 2>&1
node skills/news-card/scripts/lib/screenshot-playwright.js --input /tmp/test-footer/slides --output /tmp/test-footer/images 2>&1
```

Verify all 8 pages have consistent footer: News Card (left), date (center), empty (right).

- [ ] **Step 7: Commit**

```bash
git add skills/news-card/templates/
git commit -m "feat: standardize footer layout across all templates (brand left, date center)"
```

---

### Task 6: Run regression evals and end-to-end test

- [ ] **Step 1: Run v1 structural evals**

```bash
node autoresearch-news-card/eval-runner.js --run-id final-reg 2>/dev/null
```

Expected: 6/6 pass.

- [ ] **Step 2: Run v3 evals**

```bash
node autoresearch-news-card-v3/eval-runner.js --run-id final-reg 2>/dev/null
```

Expected: 6/6 pass (may need threshold adjustments if footer changes affect measurements).

- [ ] **Step 3: Full pipeline test**

Run the complete pipeline with live data → score → curate → render → screenshot. Verify all 8 PNGs look correct with no overlap, proper footers, and filled content.

- [ ] **Step 4: Commit any eval threshold adjustments**

```bash
git add -A
git commit -m "chore: final regression checks and eval adjustments"
```
