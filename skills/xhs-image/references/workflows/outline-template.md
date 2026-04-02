---
name: outline-template
description: Outline file format, naming conventions, and strategy differentiation
---

# Xiaohongshu Outline Template

Template for generating infographic series outlines with layout specifications.

## File Naming

Outline files use strategy identifier in the name:
- `outline-strategy-a.md` — Story-driven variant
- `outline-strategy-b.md` — Information-dense variant
- `outline-strategy-c.md` — Visual-first variant
- `outline.md` — Final selected (copied from chosen variant)

## Image File Naming

Images use meaningful slugs for readability:
```
NN-{type}-[slug].png
NN-{type}-[slug].md (in prompts/)
```

| Type | Usage |
|------|-------|
| `cover` | First image (cover) |
| `content` | Middle content images |
| `ending` | Last image |

**Examples**:
- `01-cover-ai-tools.png`
- `02-content-why-ai.png`
- `03-content-chatgpt.png`
- `06-ending-summary.png`

**Slug rules**:
- Derived from image content (kebab-case)
- Must be unique within the series
- Keep short but descriptive (2-4 words)

## Layout Selection Guide

### Density-Based Layouts

| Layout | When to Use | Info Points | Whitespace |
|--------|-------------|------------|------------|
| sparse | Covers, quotes, impact statements | 1-2 | 60-70% |
| balanced | Standard content, tutorials | 3-4 | 40-50% |
| dense | Knowledge cards, cheat sheets | 5-8 | 20-30% |

### Structure-Based Layouts

| Layout | When to Use | Structure |
|--------|-------------|-----------|
| list | Rankings, checklists, steps | Numbered/bulleted vertical |
| comparison | Before/after, pros/cons | Left vs right split |
| flow | Processes, timelines | Connected nodes with arrows |

### Position-Based Recommendations

| Position | Recommended | Reasoning |
|----------|-------------|-----------|
| Cover | sparse | Maximum impact, clear title |
| Setup | balanced | Context without overwhelming |
| Core | balanced/dense/list | Match content density |
| Payoff | balanced/list | Clear takeaways |
| Ending | sparse | Clean CTA, memorable |

## Outline Format

```markdown
# Xiaohongshu Infographic Series Outline

---
strategy: a  # a, b, or c
name: Story-Driven
style: notion
default_layout: dense
image_count: 6
generated: YYYY-MM-DD HH:mm
---

## Image 1 of 6

**Position**: Cover
**Layout**: sparse
**Hook**: 核心钩子文案
**Slug**: topic-name
**Filename**: 01-cover-topic-name.png

**Text Content**:
- Title: 「主标题」
- Subtitle: 副标题

**Visual Concept**:
视觉概念描述，包含布局、色彩、元素

**Swipe Hook**: 引导下一页的文案

---

## Image 2 of 6

**Position**: Content
**Layout**: balanced
**Core Message**: 核心信息
**Slug**: sub-topic
**Filename**: 02-content-sub-topic.png

**Text Content**:
- Title: 「小标题」
- Points:
  - 要点 1
  - 要点 2
  - 要点 3

**Visual Concept**:
视觉概念描述

**Swipe Hook**: 引导下一页的文案

---
(continue for all images...)
```

## Swipe Hook Strategies

Each image should end with a hook for the next:

| Strategy | Example |
|----------|---------|
| Teaser | "第一个就很强大👇" |
| Numbering | "接下来是第2个👇" |
| Superlative | "下一个更厉害👇" |
| Question | "猜猜下一个是什么？👇" |
| Promise | "最后一个最实用👇" |
| Urgency | "最重要的来了👇" |

## Strategy Differentiation

Three strategies should differ meaningfully:

| Strategy | Focus | Structure | Page Count |
|----------|-------|-----------|------------|
| A: Story-Driven | Emotional, personal | Hook→Problem→Discovery→Experience→Conclusion | 4-6 |
| B: Information-Dense | Factual, structured | Core→Info Cards→Comparison→Recommendation | 3-5 |
| C: Visual-First | Atmospheric, minimal text | Hero→Details→Lifestyle→CTA | 3-4 |
