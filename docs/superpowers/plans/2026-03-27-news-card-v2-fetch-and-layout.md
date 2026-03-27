# News Card v2: Fetch Reliability + Layout Overhaul

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix all broken news fetchers and completely redesign the card layout for mobile-readable, information-dense output inspired by ljg-card.

**Architecture:** Two independent workstreams: (1) Replace the brittle RSS+Twitter fetch pipeline with reliable native `fetch()` + official APIs following the follow-builders pattern. (2) Redesign all 4 HTML templates with ljg-card-inspired typography (36px body, 1.7 line-height, 1080px fixed width), rich semantic HTML components for feature pages (timelines, comparison cards, quote blocks, data highlights), and tighter spacing throughout.

**Tech Stack:** Node.js ESM, native `fetch()`, Playwright, HTML/CSS (no build tools)

---

## File Structure

### New Files
- `skills/news-card/scripts/lib/fetch-rss-v2.js` — Rewritten RSS fetcher with URL validation, retries, and updated source list
- `skills/news-card/scripts/lib/fetch-blogs.js` — Direct HTML scraping for blogs that don't have working RSS (Anthropic, Meta AI, DeepLearning.ai)
- `skills/news-card/templates/feature-v2.html` — New feature page with rich semantic HTML support
- `skills/news-card/templates/half-page-v2.html` — New half-page with tighter layout
- `skills/news-card/templates/briefs-v2.html` — New briefs page with denser grid
- `skills/news-card/templates/cover-v2.html` — New cover with tighter spacing
- `skills/news-card/references/components-spec.md` — Semantic HTML component library for Claude's curation step

### Modified Files
- `skills/news-card/scripts/fetch-all.sh` — Update to use new fetchers
- `skills/news-card/scripts/lib/render-html.js` — Support `content_html` field (raw HTML passthrough for feature pages)
- `skills/news-card/SKILL.md` — Update curation prompt to produce rich HTML content for tier-1 stories
- `skills/news-card/references/sources-spec.md` — Update with working URLs
- `skills/news-card/references/density-spec.md` — Update font size and spacing rules
- `skills/news-card/references/design-tokens.md` — New typography scale

### Deleted Files
- `skills/news-card/scripts/lib/fetch-twitter.js` — Remove (unreliable fxtwitter proxy)
- `skills/news-card/templates/feature.html` — Replace with v2
- `skills/news-card/templates/half-page.html` — Replace with v2
- `skills/news-card/templates/briefs.html` — Replace with v2
- `skills/news-card/templates/cover.html` — Replace with v2

---

## WORKSTREAM A: Fetch Reliability

### Task 1: Audit and fix RSS source URLs

**Files:**
- Modify: `skills/news-card/scripts/lib/fetch-rss.js`
- Modify: `skills/news-card/references/sources-spec.md`

- [ ] **Step 1: Create a URL validation script**

Create a one-off test script to check every RSS URL:

```javascript
// scripts/test-rss-urls.js
import { readFileSync } from 'fs';

const SOURCES = [
  { name: 'OpenAI Blog', url: 'https://openai.com/index/rss.xml' },
  { name: 'Google AI Blog', url: 'https://blog.google/technology/ai/rss/' },
  { name: 'DeepMind Blog', url: 'https://deepmind.google/blog/rss.xml' },
  { name: 'NVIDIA Blog', url: 'https://blogs.nvidia.com/feed/' },
  { name: 'MIT Tech Review', url: 'https://www.technologyreview.com/feed/' },
  { name: 'The Verge (AI)', url: 'https://www.theverge.com/rss/ai-artificial-intelligence/index.xml' },
  { name: 'TechCrunch (AI)', url: 'https://techcrunch.com/category/artificial-intelligence/feed/' },
  { name: 'Ars Technica', url: 'https://feeds.arstechnica.com/arstechnica/technology-lab' },
  { name: 'Wired (AI)', url: 'https://www.wired.com/feed/tag/ai/latest/rss' },
  { name: '404 Media', url: 'https://www.404media.co/rss/' },
  { name: 'Anthropic Blog', url: 'https://www.anthropic.com/rss.xml' },
  { name: 'Meta AI Blog', url: 'https://ai.meta.com/blog/rss/' },
  { name: 'The Batch', url: 'https://www.deeplearning.ai/the-batch/feed/' },
  { name: 'Ben\'s Bites', url: 'https://bensbites.beehiiv.com/feed' },
  { name: 'Import AI', url: 'https://importai.substack.com/feed' },
  { name: 'Latent Space', url: 'https://www.latent.space/feed' },
  { name: 'AI Snake Oil', url: 'https://www.aisnakeoil.com/feed' },
  { name: 'One Useful Thing', url: 'https://www.oneusefulthing.org/feed' },
  { name: 'Simon Willison', url: 'https://simonwillison.net/atom/everything/' },
  { name: 'Chip Huyen', url: 'https://huyenchip.com/feed.xml' },
  { name: 'Lil\'Log', url: 'https://lilianweng.github.io/index.xml' },
  { name: 'The Gradient', url: 'https://thegradient.pub/rss/' },
  { name: 'Ahead of AI', url: 'https://magazine.sebastianraschka.com/feed' },
  { name: 'Interconnects', url: 'https://www.interconnects.ai/feed' },
  { name: 'Last Week in AI', url: 'https://lastweekin.ai/feed' },
  { name: 'Jack Clark (Import AI)', url: 'https://importai.substack.com/feed' },
];

for (const src of SOURCES) {
  try {
    const res = await fetch(src.url, {
      headers: { 'User-Agent': 'Mozilla/5.0 NewsCard/1.0' },
      signal: AbortSignal.timeout(10000),
    });
    const ok = res.ok ? '✅' : '❌';
    const ct = res.headers.get('content-type') || '';
    const isXml = ct.includes('xml') || ct.includes('rss') || ct.includes('atom');
    console.log(`${ok} ${res.status} ${src.name} — ${src.url} ${isXml ? '(XML)' : `(${ct.split(';')[0]})`}`);
  } catch (err) {
    console.log(`❌ ERR ${src.name} — ${src.url} — ${err.message}`);
  }
}
```

- [ ] **Step 2: Run the URL audit**

Run: `node scripts/test-rss-urls.js`

Record which URLs return 200+XML vs 404/error. Update the list of working URLs.

- [ ] **Step 3: Rewrite fetch-rss.js with working URLs and retry logic**

Update `skills/news-card/scripts/lib/fetch-rss.js`:

```javascript
// Key changes:
// 1. Replace hardcoded URL list with audited working URLs
// 2. Add User-Agent header (some sites block default Node fetch)
// 3. Add AbortSignal.timeout(15000) per request
// 4. Add retry with 1s backoff for transient failures
// 5. Log success/failure count at the end

async function fetchWithRetry(url, retries = 2) {
  for (let i = 0; i <= retries; i++) {
    try {
      const res = await fetch(url, {
        headers: { 'User-Agent': 'Mozilla/5.0 NewsCard/1.0 (news aggregator)' },
        signal: AbortSignal.timeout(15000),
      });
      if (res.ok) return await res.text();
      if (res.status === 429 && i < retries) {
        await new Promise(r => setTimeout(r, 2000 * (i + 1)));
        continue;
      }
      throw new Error(`HTTP ${res.status}`);
    } catch (err) {
      if (i === retries) throw err;
      await new Promise(r => setTimeout(r, 1000));
    }
  }
}
```

- [ ] **Step 4: Verify fetch-rss.js fetches all working sources**

Run: `node skills/news-card/scripts/lib/fetch-rss.js --output /tmp/test-rss.json 2>&1`

Expected: No 404 errors. Count of items should be 60+ (from ~20 working RSS sources).

- [ ] **Step 5: Commit**

```bash
git add skills/news-card/scripts/lib/fetch-rss.js scripts/test-rss-urls.js
git commit -m "fix: update RSS source URLs and add retry logic"
```

---

### Task 2: Create direct blog scraper for non-RSS sources

**Files:**
- Create: `skills/news-card/scripts/lib/fetch-blogs.js`
- Modify: `skills/news-card/scripts/fetch-all.sh`

For blogs without working RSS (Anthropic, Meta AI, DeepLearning.ai), follow the follow-builders pattern: scrape the blog index page and extract article metadata from structured data (JSON-LD, Next.js __NEXT_DATA__, or HTML parsing).

- [ ] **Step 1: Write fetch-blogs.js**

```javascript
#!/usr/bin/env node
/**
 * Direct blog scraper for sources without working RSS feeds.
 * Inspired by follow-builders/scripts/generate-feed.js blog scraping pattern.
 * Uses native fetch() + HTML parsing (no dependencies).
 */
import { writeFileSync } from 'fs';
import { resolve } from 'path';

const BLOGS = [
  {
    name: 'Anthropic Blog',
    indexUrl: 'https://www.anthropic.com/research',
    authority: 5,
    parser: 'anthropic',
  },
  {
    name: 'Meta AI Blog',
    indexUrl: 'https://ai.meta.com/blog/',
    authority: 5,
    parser: 'meta',
  },
];

const LOOKBACK_HOURS = 72;
const cutoff = new Date(Date.now() - LOOKBACK_HOURS * 60 * 60 * 1000);

async function fetchPage(url) {
  const res = await fetch(url, {
    headers: { 'User-Agent': 'Mozilla/5.0 NewsCard/1.0' },
    signal: AbortSignal.timeout(15000),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status} for ${url}`);
  return await res.text();
}

// Anthropic: extract from Next.js __NEXT_DATA__ or structured HTML
async function parseAnthropic() {
  const items = [];
  try {
    const html = await fetchPage('https://www.anthropic.com/research');
    // Try __NEXT_DATA__ first (Next.js pattern)
    const nextDataMatch = html.match(/<script id="__NEXT_DATA__"[^>]*>([\s\S]*?)<\/script>/);
    if (nextDataMatch) {
      const data = JSON.parse(nextDataMatch[1]);
      const posts = data?.props?.pageProps?.posts || [];
      for (const post of posts.slice(0, 10)) {
        items.push({
          title: post.title || '',
          url: `https://www.anthropic.com/research/${post.slug || ''}`,
          source: 'Anthropic Blog',
          published: post.publishedAt || post.date || null,
          summary: post.excerpt || post.description || '',
          authority: 5,
        });
      }
    } else {
      // Fallback: parse <a> tags with /research/ hrefs
      const linkRe = /<a[^>]+href="\/research\/([^"]+)"[^>]*>[\s\S]*?<\/a>/g;
      let match;
      while ((match = linkRe.exec(html)) !== null) {
        const slug = match[1];
        if (slug && !slug.includes('#')) {
          items.push({
            title: slug.replace(/-/g, ' '),
            url: `https://www.anthropic.com/research/${slug}`,
            source: 'Anthropic Blog',
            published: null,
            summary: '',
            authority: 5,
          });
        }
      }
    }
  } catch (err) {
    console.error(`[fetch-blogs] Anthropic failed: ${err.message}`);
  }
  return items;
}

// Meta AI: similar HTML-based extraction
async function parseMeta() {
  const items = [];
  try {
    const html = await fetchPage('https://ai.meta.com/blog/');
    // Try JSON-LD
    const jsonLdMatch = html.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/);
    if (jsonLdMatch) {
      try {
        const ld = JSON.parse(jsonLdMatch[1]);
        const posts = Array.isArray(ld) ? ld : ld.itemListElement || [];
        for (const post of posts.slice(0, 10)) {
          items.push({
            title: post.name || post.headline || '',
            url: post.url || '',
            source: 'Meta AI Blog',
            published: post.datePublished || null,
            summary: post.description || '',
            authority: 5,
          });
        }
      } catch {}
    }
    // Fallback: parse blog post links
    if (items.length === 0) {
      const linkRe = /<a[^>]+href="(\/blog\/[^"]+)"[^>]*>/g;
      let match;
      const seen = new Set();
      while ((match = linkRe.exec(html)) !== null) {
        const path = match[1];
        if (!seen.has(path) && !path.includes('#')) {
          seen.add(path);
          items.push({
            title: path.split('/').pop().replace(/-/g, ' '),
            url: `https://ai.meta.com${path}`,
            source: 'Meta AI Blog',
            published: null,
            summary: '',
            authority: 5,
          });
        }
      }
    }
  } catch (err) {
    console.error(`[fetch-blogs] Meta AI failed: ${err.message}`);
  }
  return items;
}

const parsers = { anthropic: parseAnthropic, meta: parseMeta };

async function fetchAllBlogs() {
  const allItems = [];
  for (const blog of BLOGS) {
    const parser = parsers[blog.parser];
    if (!parser) continue;
    const items = await parser();
    console.error(`[fetch-blogs] ${blog.name}: ${items.length} items`);
    allItems.push(...items);
  }
  return allItems;
}

// CLI
const args = process.argv.slice(2);
const outputIdx = args.indexOf('--output');
const outputPath = outputIdx !== -1 ? resolve(args[outputIdx + 1]) : null;

const items = await fetchAllBlogs();
console.error(`[fetch-blogs] Total: ${items.length} items`);

if (outputPath) {
  writeFileSync(outputPath, JSON.stringify(items, null, 2));
  console.error(`[fetch-blogs] Wrote to ${outputPath}`);
} else {
  console.log(JSON.stringify(items, null, 2));
}
```

- [ ] **Step 2: Test the blog scraper**

Run: `node skills/news-card/scripts/lib/fetch-blogs.js --output /tmp/test-blogs.json 2>&1`

Expected: Items from Anthropic and Meta AI blogs (even if 0 due to structured data changes, the script shouldn't crash).

- [ ] **Step 3: Update fetch-all.sh to include blog scraper**

In `skills/news-card/scripts/fetch-all.sh`, replace the Twitter fetcher with the blog scraper:

```bash
# Remove:
node "$SKILL_DIR/scripts/lib/fetch-twitter.js" --output "$TMPDIR/twitter.json" &
PID_TW=$!

# Add:
node "$SKILL_DIR/scripts/lib/fetch-blogs.js" --output "$TMPDIR/blogs.json" &
PID_BLOGS=$!
```

Update the wait/merge section accordingly: replace `twitter.json` references with `blogs.json`.

- [ ] **Step 4: Delete fetch-twitter.js**

```bash
rm skills/news-card/scripts/lib/fetch-twitter.js
```

- [ ] **Step 5: Run full fetch pipeline and verify**

Run: `bash skills/news-card/scripts/fetch-all.sh workspace/test-candidates.json 2>&1`

Expected: 100+ candidates with 0 errors (or only transient warnings). RSS, HN, HF, and blogs all contribute items.

- [ ] **Step 6: Commit**

```bash
git add skills/news-card/scripts/lib/fetch-blogs.js skills/news-card/scripts/fetch-all.sh
git rm skills/news-card/scripts/lib/fetch-twitter.js
git commit -m "feat: replace Twitter fetcher with direct blog scraper, fix fetch pipeline"
```

---

## WORKSTREAM B: Layout Overhaul

### Task 3: Define new typography scale and component library

**Files:**
- Modify: `skills/news-card/references/design-tokens.md`
- Modify: `skills/news-card/references/density-spec.md`
- Create: `skills/news-card/references/components-spec.md`

- [ ] **Step 1: Update design-tokens.md typography scale**

Replace the font size section with ljg-card-inspired values. Key changes:
- Body text: 28px → 36px (matches ljg-card for mobile readability)
- Line height: 2.0 → 1.7 (ljg-card sweet spot — tighter but still comfortable)
- Title: 48px → 56px (more impactful)
- Padding: 56px → 60px sides (slightly wider margins, ljg-card uses 72px but our page has more elements)

```markdown
## 字号层级（1080px 宽度下）

| 语义 | 字号 | 行高 | 字重 |
|------|------|------|------|
| 封面大标题 | 64px | 1.2 | 900 |
| 第一梯队标题 | 56px | 1.2 | 900 |
| 第二梯队标题 | 36px | 1.3 | 900 |
| 正文/摘要 | 36px | 1.7 | 400 |
| 亮点文字 | 40px | 1.55 | 500 |
| 来源/标注 | 24px | 1.5 | 400 |
| 快讯标题 | 28px | 1.3 | 700 |
| 快讯正文 | 24px | 1.5 | 400 |
| 页脚 | 20px | 1.5 | 400 |
```

- [ ] **Step 2: Update density-spec.md with new spacing rules**

Key change: reduce all excessive margins. Replace current spec's spacing guidance:

```markdown
## 间距规则

- 段落间距: 28px (用 margin-bottom)
- 区块间距: 36px (用 divider + margin)
- 卡片内边距: 24px
- 页面边距: 60px (左右), 48px (上), 40px (下)
- 页面底部空白: 不得超过总高度 10%（192px）
- 元素间 gap: briefs grid 16px, half-page stories 0 (用 border-top 分隔)
```

- [ ] **Step 3: Create components-spec.md**

This file defines the semantic HTML components Claude should use when generating rich content for tier-1 feature pages:

```markdown
# 语义组件库

第一梯队页面中，Claude 在生成 `content_html` 字段时，应根据新闻内容的语义类型
选择合适的 HTML 组件。所有组件使用内联 HTML，不需要额外 CSS（模板已定义样式）。

## 可用组件

### 数据高亮块
用于: 数字、结论、关键数据
```html
<div class="data-highlight">
  <span class="data-value">40%</span>
  <span class="data-label">推理基准提升</span>
</div>
```

### 时间轴
用于: 步骤、流程、事件序列
```html
<div class="timeline">
  <div class="timeline-item">
    <span class="timeline-marker">1</span>
    <div class="timeline-content">
      <strong>标题</strong>
      <p>描述文字</p>
    </div>
  </div>
</div>
```

### 引用块
用于: 观点、金句、原文引用
```html
<blockquote>
  <p>引用内容</p>
  <cite>— 来源人物</cite>
</blockquote>
```

### 对比卡片
用于: 对比、选择、优劣
```html
<div class="compare-grid">
  <div class="compare-item compare-pro">
    <strong>优势</strong>
    <p>描述</p>
  </div>
  <div class="compare-item compare-con">
    <strong>劣势</strong>
    <p>描述</p>
  </div>
</div>
```

### 要点列表
用于: 关键词、总结、要点
```html
<ul class="key-points">
  <li><strong>要点标题</strong> — 详细说明</li>
</ul>
```

### 高亮框
用于: 关键洞察、重要概念
```html
<div class="highlight">关键洞察文字，限 25 字以内</div>
```

### Callout 提示框
用于: 定义、概念、背景信息
```html
<div class="callout">
  <strong>📌 背景</strong>
  <p>解释文字</p>
</div>
```
```

- [ ] **Step 4: Commit**

```bash
git add skills/news-card/references/design-tokens.md skills/news-card/references/density-spec.md skills/news-card/references/components-spec.md
git commit -m "docs: new typography scale, tighter density rules, semantic component library"
```

---

### Task 4: Redesign feature.html template

**Files:**
- Create: `skills/news-card/templates/feature-v2.html`
- Modify: `skills/news-card/scripts/lib/render-html.js`

The feature page is the biggest change. It needs to:
1. Support `content_html` field — raw HTML passthrough for rich semantic content
2. Use the new typography scale (36px body, 1.7 line-height)
3. Fill the entire page with content — no large whitespace gaps
4. Include styled components (data highlights, timelines, quotes, etc.)

- [ ] **Step 1: Create feature-v2.html with new layout and component styles**

```html
<!DOCTYPE html>
<html lang="zh-CN">
<head>
<meta charset="UTF-8">
<style>
  :root {
    --bg: #FAF9F6;
    --card: #FFFFFF;
    --text: #1A1A1A;
    --text-mid: #6B7280;
    --text-dim: #9CA3AF;
    --accent: #D97706;
    --divider: #E5E7EB;
    --font-zh: 'Noto Serif SC', 'Source Han Serif SC', 'PingFang SC', serif;
    --font-en: 'Source Serif Pro', Georgia, serif;
  }

  * { margin: 0; padding: 0; box-sizing: border-box; }

  html, body {
    width: 1080px;
    height: 1920px;
    overflow: hidden;
    background: var(--bg);
    font-family: var(--font-zh);
    color: var(--text);
  }

  .page {
    width: 1080px;
    height: 1920px;
    display: flex;
    flex-direction: column;
  }

  /* ── Header ── */
  .header {
    padding: 48px 60px 36px;
    position: relative;
  }

  .header::after {
    content: '';
    position: absolute;
    inset: 0;
    background: var(--cat-color, var(--accent));
    opacity: 0.06;
    z-index: 0;
  }

  .header > * { position: relative; z-index: 1; }

  .meta-bar {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 20px;
    font: 400 20px/1 var(--font-en);
    color: var(--text-dim);
  }

  .cat-tag {
    display: inline-block;
    padding: 8px 24px;
    border-radius: 6px;
    color: #fff;
    font: 700 20px/1 var(--font-zh);
    margin-bottom: 20px;
  }

  .headline-zh {
    font: 900 56px/1.2 var(--font-zh);
    letter-spacing: -0.02em;
    margin-bottom: 16px;
  }

  .headline-en {
    font: 600 24px/1.4 var(--font-en);
    color: var(--text-mid);
  }

  /* ── Content ── */
  .content {
    flex: 1;
    padding: 36px 60px;
    display: flex;
    flex-direction: column;
    overflow: hidden;
  }

  .accent-rule {
    width: 52px;
    height: 3px;
    background: var(--accent);
    margin-bottom: 28px;
    border-radius: 2px;
  }

  /* Body text */
  .content p {
    font: 400 36px/1.7 var(--font-zh);
    color: var(--text);
    margin-bottom: 28px;
  }

  .content strong { font-weight: 600; }

  /* Highlight block (accent left border) */
  .content .highlight {
    font: 500 40px/1.55 var(--font-zh);
    padding: 14px 0 14px 24px;
    border-left: 3px solid var(--cat-color, var(--accent));
    margin: 28px 0;
  }

  /* Blockquote */
  .content blockquote {
    margin: 24px 0;
    padding-left: 24px;
    border-left: 3px solid var(--divider);
  }

  .content blockquote p {
    font: 300 36px/1.7 var(--font-zh);
    color: var(--text-mid);
    margin-bottom: 8px;
  }

  .content blockquote cite {
    font: 400 24px/1.5 var(--font-en);
    color: var(--text-dim);
    display: block;
    margin-top: 8px;
  }

  /* Data highlight */
  .data-highlight {
    display: inline-flex;
    flex-direction: column;
    align-items: center;
    background: var(--card);
    border-radius: 12px;
    padding: 20px 32px;
    margin: 8px 12px 8px 0;
    box-shadow: 0 1px 4px rgba(0,0,0,0.06);
  }

  .data-highlight .data-value {
    font: 900 48px/1.1 var(--font-en);
    color: var(--cat-color, var(--accent));
  }

  .data-highlight .data-label {
    font: 400 20px/1.4 var(--font-zh);
    color: var(--text-mid);
    margin-top: 6px;
  }

  .data-row {
    display: flex;
    flex-wrap: wrap;
    margin: 16px 0 24px;
  }

  /* Timeline */
  .timeline { margin: 20px 0; }

  .timeline-item {
    display: flex;
    gap: 16px;
    margin-bottom: 20px;
  }

  .timeline-marker {
    flex-shrink: 0;
    width: 40px;
    height: 40px;
    border-radius: 50%;
    background: var(--cat-color, var(--accent));
    color: #fff;
    font: 700 20px/40px var(--font-en);
    text-align: center;
  }

  .timeline-content {
    flex: 1;
  }

  .timeline-content strong {
    font: 600 32px/1.4 var(--font-zh);
    display: block;
    margin-bottom: 4px;
  }

  .timeline-content p {
    font: 400 28px/1.6 var(--font-zh);
    color: var(--text-mid);
    margin-bottom: 0;
  }

  /* Compare grid */
  .compare-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 16px;
    margin: 20px 0;
  }

  .compare-item {
    padding: 20px;
    border-radius: 10px;
  }

  .compare-pro { background: #ECFDF5; }
  .compare-con { background: #FEF2F2; }

  .compare-item strong {
    font: 700 28px/1.3 var(--font-zh);
    display: block;
    margin-bottom: 8px;
  }

  .compare-item p {
    font: 400 28px/1.6 var(--font-zh);
    margin-bottom: 0;
  }

  /* Key points list */
  .key-points {
    list-style: none;
    margin: 16px 0;
  }

  .key-points li {
    font: 400 32px/1.6 var(--font-zh);
    padding: 8px 0 8px 24px;
    position: relative;
  }

  .key-points li::before {
    content: '·';
    position: absolute;
    left: 0;
    color: var(--text-mid);
  }

  /* Callout */
  .callout {
    background: var(--card);
    border-radius: 10px;
    padding: 20px 24px;
    margin: 20px 0;
    box-shadow: 0 1px 3px rgba(0,0,0,0.05);
  }

  .callout strong {
    font: 600 28px/1.4 var(--font-zh);
    display: block;
    margin-bottom: 8px;
  }

  .callout p {
    font: 400 28px/1.6 var(--font-zh);
    color: var(--text-mid);
    margin-bottom: 0;
  }

  /* Divider */
  .divider {
    height: 1px;
    background: var(--divider);
    margin: 28px 0;
  }

  /* Unordered list (generic) */
  .content ul {
    list-style: none;
    margin-bottom: 24px;
  }

  .content ul li {
    font: 400 32px/1.7 var(--font-zh);
    padding: 4px 0 4px 24px;
    position: relative;
  }

  .content ul li::before {
    content: '·';
    position: absolute;
    left: 0;
    color: var(--text-mid);
  }

  /* Section headings inside content */
  .content h3 {
    font: 700 36px/1.3 var(--font-zh);
    margin: 28px 0 16px;
  }

  .content h3:first-child { margin-top: 0; }

  /* ── Footer ── */
  .footer {
    flex-shrink: 0;
    padding: 0 60px 36px;
  }

  .source-bar {
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 16px 0;
    border-top: 2px solid var(--divider);
  }

  .source-bar .name {
    font: 700 22px/1 var(--font-en);
  }

  .source-bar .dot {
    width: 5px; height: 5px;
    border-radius: 50%;
    background: var(--text-dim);
  }

  .source-bar .url {
    font: 400 18px/1 var(--font-en);
    color: var(--text-dim);
    flex: 1;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .brand-bar {
    padding-top: 12px;
    border-top: 1px solid var(--divider);
    display: flex;
    justify-content: space-between;
    font: 400 18px/1 var(--font-en);
    color: var(--text-dim);
  }

  .brand-bar .brand {
    font-weight: 700;
    color: var(--accent);
  }

  /* Left accent bar */
  .page::before {
    content: '';
    position: fixed;
    left: 0; top: 0;
    width: 6px; height: 1920px;
    background: var(--cat-color, var(--accent));
  }
</style>
</head>
<body>
<div class="page" style="--cat-color: {{color_tag}}">
  <div class="header">
    <div class="meta-bar">
      <span>{{page_num}} / 8</span>
      <span>{{date}}</span>
    </div>
    <div class="cat-tag" style="background: {{color_tag}}">{{category}}</div>
    <div class="headline-zh">{{headline_zh}}</div>
    <div class="headline-en">{{headline_en}}</div>
  </div>

  <div class="content">
    <div class="accent-rule"></div>
    {{{content_html}}}
  </div>

  <div class="footer">
    <div class="source-bar">
      <span class="name">{{source}}</span>
      <span class="dot"></span>
      <span class="url">{{source_url}}</span>
    </div>
    <div class="brand-bar">
      <span class="brand">News Card</span>
      <span>{{date}} · 第 {{issue}} 期</span>
    </div>
  </div>
</div>
</body>
</html>
```

- [ ] **Step 2: Update render-html.js to support `{{{content_html}}}` triple-brace passthrough**

In `skills/news-card/scripts/lib/render-html.js`, add a new replacement pass that handles `{{{var}}}` (triple-brace = raw HTML, no escaping) BEFORE the `{{var}}` pass:

```javascript
// In renderTemplate(), add before the {{var}} replacement (around line 125):

// Replace {{{var}}} — raw HTML passthrough (triple-brace)
result = result.replace(/\{\{\{(\w+)\}\}\}/g, (m, k) => {
  if (data[k] !== undefined) return String(data[k]);
  if (parentData && parentData[k] !== undefined) return String(parentData[k]);
  return '';
});
```

Also in `renderAll()` (around line 209), when preparing tier-1 data, pass `content_html` through:

```javascript
// For tier-1 items, if content_html is not provided, fall back to summary
const html = renderTemplate(featureTpl, {
  ...item,
  content_html: item.content_html || `<p>${item.summary_zh}</p>`,
  page_num: i + 1,
  date: today,
  issue,
  related_sources: relatedStr,
});
```

- [ ] **Step 3: Swap template files**

```bash
mv skills/news-card/templates/feature.html skills/news-card/templates/feature-old.html
mv skills/news-card/templates/feature-v2.html skills/news-card/templates/feature.html
```

- [ ] **Step 4: Test feature page rendering with sample data**

Run: `node skills/news-card/scripts/lib/render-html.js --input skills/news-card/examples/sample-digest.json --templates skills/news-card/templates --output /tmp/test-slides 2>&1`

Then: `node skills/news-card/scripts/lib/screenshot-playwright.js --input /tmp/test-slides --output /tmp/test-images 2>&1`

Open `/tmp/test-images/page-1-top1.png` and verify: text is 36px, fills the page, no excessive whitespace.

- [ ] **Step 5: Commit**

```bash
git add skills/news-card/templates/feature.html skills/news-card/scripts/lib/render-html.js
git rm skills/news-card/templates/feature-old.html
git commit -m "feat: redesign feature page with rich HTML components and new typography"
```

---

### Task 5: Redesign half-page, briefs, and cover templates

**Files:**
- Create: `skills/news-card/templates/half-page-v2.html`
- Create: `skills/news-card/templates/briefs-v2.html`
- Create: `skills/news-card/templates/cover-v2.html`

- [ ] **Step 1: Create half-page-v2.html with tighter layout**

Key changes from original:
- Headline: 28px → 36px, weight 900
- Summary: 22px → 32px, line-height 1.7
- Story padding: 36px → 28px
- Remove `flex: 1` from `.summary` (it creates dead space). Instead use `flex: 1` on `.story` with `justify-content: flex-start` so content packs tight.
- Each story fills its half of the page without excessive gaps.

(Full HTML follows the same pattern as feature-v2.html but with two stories per page, same `--font-zh` stack, same `--bg`, same footer pattern.)

- [ ] **Step 2: Create briefs-v2.html with denser grid**

Key changes:
- Grid gap: 20px → 12px
- Card padding: 24px → 20px
- Title: 22px → 28px, weight 700
- Summary: 18px → 24px, line-height 1.5
- Source: 14px → 18px
- Category tag: 13px → 16px

- [ ] **Step 3: Create cover-v2.html with tighter spacing**

Key changes:
- Reduce vertical gaps between category groups
- Item font: 20px → 24px
- Tier badge: 14px → 18px
- Remove excessive padding

- [ ] **Step 4: Swap all template files**

```bash
mv skills/news-card/templates/half-page.html skills/news-card/templates/half-page-old.html
mv skills/news-card/templates/briefs.html skills/news-card/templates/briefs-old.html
mv skills/news-card/templates/cover.html skills/news-card/templates/cover-old.html
mv skills/news-card/templates/half-page-v2.html skills/news-card/templates/half-page.html
mv skills/news-card/templates/briefs-v2.html skills/news-card/templates/briefs.html
mv skills/news-card/templates/cover-v2.html skills/news-card/templates/cover.html
```

- [ ] **Step 5: Test all pages with sample data**

Run the full render + screenshot pipeline, open all 8 PNGs and verify:
- Half-pages: text fills each story's half, no large gaps
- Briefs: grid is tight, cards are readable
- Cover: dense, all 16 headlines visible

- [ ] **Step 6: Commit**

```bash
git add skills/news-card/templates/
git rm skills/news-card/templates/*-old.html
git commit -m "feat: redesign half-page, briefs, and cover templates with denser layout"
```

---

### Task 6: Update SKILL.md curation prompt for rich content

**Files:**
- Modify: `skills/news-card/SKILL.md`

- [ ] **Step 1: Update the curation JSON schema in SKILL.md**

Add `content_html` field to the tier-1 output schema:

```json
{
  "tier": 1,
  "headline_zh": "≤25 字",
  "headline_en": "English headline",
  "summary_zh": "150 字摘要",
  "content_html": "<p>第一段全文...</p><div class='highlight'>关键洞察</div><p>第二段...</p>",
  "source": "来源名",
  "source_url": "链接",
  "category": "分类",
  "color_tag": "#hex"
}
```

- [ ] **Step 2: Add content generation instructions**

Add to the curation prompt in SKILL.md:

```markdown
### 第一梯队 content_html 生成规则

对于第一梯队的 4 条新闻，你必须生成 `content_html` 字段。这是纯 HTML，会被直接
渲染到卡片的内容区域。目标是用信息填满整个页面（约 1200px 高度的内容区）。

**内容来源**：从原文中提取尽可能多的有价值信息。不要只写 150 字摘要 — 写 400-600 字
的深度分析，配合语义组件来可视化关键数据。

**组件选择**：根据新闻内容的语义类型选择合适的组件（参见 references/components-spec.md）：
- 有关键数据 → 用 `<div class="data-row">` + `<div class="data-highlight">`
- 有时间序列/步骤 → 用 `<div class="timeline">`
- 有对比/争议 → 用 `<div class="compare-grid">`
- 有名人引言 → 用 `<blockquote>`
- 有关键要点 → 用 `<ul class="key-points">`
- 有背景知识 → 用 `<div class="callout">`
- 有核心洞察 → 用 `<div class="highlight">`

**填满规则**：content_html 必须包含至少 3 个段落 + 至少 1 个语义组件。
页面底部不应有超过 10% 的空白。
```

- [ ] **Step 3: Commit**

```bash
git add skills/news-card/SKILL.md
git commit -m "feat: update curation prompt for rich HTML content generation"
```

---

### Task 7: Run autoresearch v2 eval suite on new templates

**Files:**
- Modify: `autoresearch-news-card-v2/eval-runner.js` (update thresholds for new layout)

- [ ] **Step 1: Update eval thresholds for new layout**

The v2 evals need threshold updates:
- Eval 1 (Feature Page Content Fill): Keep gap < 200px threshold (should pass with rich content)
- Eval 2 (Half-Page Story Fill): Keep 60% threshold
- Eval 4 (Min Font Size): Update to new typography scale (feature headline >= 56px, body >= 36px, etc.)

- [ ] **Step 2: Run eval suite**

```bash
node autoresearch-news-card-v2/eval-runner.js --run-id v2-final 2>/dev/null
```

Expected: 5/5 pass or identify remaining issues.

- [ ] **Step 3: Run v1 structural evals as regression check**

```bash
node autoresearch-news-card/eval-runner.js --run-id v2-regression 2>/dev/null
```

Expected: 6/6 pass (dimensions, file count, tier distribution all unchanged).

- [ ] **Step 4: Commit any eval threshold updates**

```bash
git add autoresearch-news-card-v2/eval-runner.js
git commit -m "chore: update eval thresholds for v2 layout"
```

---

### Task 8: End-to-end test with live data

- [ ] **Step 1: Run the full pipeline**

```bash
bash skills/news-card/scripts/run-digest.sh
```

This will fetch live data → score → curate (Claude generates content_html for tier-1) → render → screenshot.

- [ ] **Step 2: Verify all 8 output PNGs**

Open each PNG and check:
- Feature pages: rich content fills the page, semantic components render correctly, no excessive whitespace
- Half-pages: tight layout, readable text at 32px
- Briefs: dense grid, no wasted space
- Cover: all 16 headlines visible, tight spacing

- [ ] **Step 3: Final commit**

```bash
git add -A
git commit -m "feat: news-card v2 — reliable fetching + information-dense layout"
```
