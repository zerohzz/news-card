---
name: tier-system
description: 四梯队系统、每页条目分配、数据源映射
---

# 梯队系统

## 总览

digest.json 包含 **恰好 24 条**新闻，分为 4 个梯队，映射到 10 张卡片：

| 梯队 | 条数 | 数据源 | 对应页面 | 展示方式 |
|------|------|--------|---------|---------|
| Tier 1（第一梯队） | 4 | scored-news.json | P2–P5 | 每页一条，整页 Feature |
| Tier 2（第二梯队） | 4 | scored-news.json | P6–P7 | 每页两条，半页 Half-page |
| Tier 3 快讯 | 8 | scored-news.json 剩余 | P8 | 2×4 网格 Briefs |
| Tier 3 研究前沿 | 8 | scored-signals.json | P9 | 2×4 网格 Briefs |

**⚠️ 24 条分配不可更改。少于 24 条会导致 P8/P9 网格不满，多于 24 条会溢出。**

## 页面与梯队映射

| 页码 | 页面类型 | 梯队 | 条数 | 说明 |
|------|---------|------|------|------|
| P0 | Hero Cover | — | — | 品牌封面 + Top 4 标题预览 |
| P1 | Menu | — | 24 | 目录索引，按 category 色块 |
| P2 | Feature | Tier 1 #1 | 1 | 整页展示 |
| P3 | Feature | Tier 1 #2 | 1 | 整页展示 |
| P4 | Feature | Tier 1 #3 | 1 | 整页展示 |
| P5 | Feature | Tier 1 #4 | 1 | 整页展示 |
| P6 | Half-page | Tier 2 #1–#2 | 2 | 上下分区 |
| P7 | Half-page | Tier 2 #3–#4 | 2 | 上下分区 |
| P8 | Briefs | Tier 3 快讯 | 8 | 2×4 网格 |
| P9 | Briefs | Tier 3 研究前沿 | 8 | 2×4 网格 |

## 数据层说明

- **数据层只有 tier 1/2/3**。P8 和 P9 在数据上都是 `tier: 3`
- P9 的 section 标题为「研究前沿 / Builder 动态」，内容优先从 `scored-signals.json` 选取
- **信号池来源**（进入 scored-signals.json）：X/Twitter、Hacker News、HuggingFace Papers
- 信号池仍参与 cross_validation 和 peer_review 的评分计算（为新闻条目提供交叉验证信号）
- follow-builders 的 Blog 和 Podcast 进入主排名（scored-news.json）

## JSON 输出格式

每条新闻的 JSON 结构：

```json
{
  "tier": 1,
  "headline_zh": "≤25 字，零情绪化",
  "headline_en": "English headline",
  "summary_zh": "字数按梯队要求",
  "content_html": "（仅 tier 1）富 HTML 内容",
  "source": "来源名",
  "source_url": "原文链接",
  "category": "模型发布|产品应用|价值对齐|行业动态|开发工具|研究前沿|开源生态|政策监管|劳动力影响",
  "color_tag": "#hex（对应 design-tokens.md 中的颜色）",
  "highlight": "仅 tier 1：一句关键数据或亮点"
}
```

## Category 分类

| Category | 说明 |
|----------|------|
| 模型发布 | 新模型发布、基准测试 |
| 产品应用 | 产品上线、功能更新 |
| 价值对齐 | AI 安全、对齐研究 |
| 行业动态 | 融资、并购、战略 |
| 开发工具 | SDK、框架、开发者工具 |
| 研究前沿 | 论文、学术突破 |
| 开源生态 | 开源项目、社区动态 |
| 政策监管 | 法规、政策、合规 |
| 劳动力影响 | AI 对就业的影响 |

`color_tag` 必须严格对应 `references/design-tokens.md` 中定义的 category 颜色。

## 中文引号规范

在 JSON string values 中使用 `「」`（角引号）而非 `""`（智能引号或裸 ASCII `"`）。渲染器会将 `\u201c`/`\u201d` → `「」` 作为安全网，但应在写作时避免此问题。
