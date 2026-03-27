---
name: news-card
description: >
  全自动 AI 新闻日报。抓取 25+ 英文一手信息源，多维度评分筛选，AI 选题分三梯队，
  生成 8 张 9:16 小红书风格 PNG 卡片。说"今日 AI 日报"即可触发。
version: 0.1.0
---

# News Card Skill

## 触发方式

- "今日 AI 日报"
- "generate AI digest"
- `$news-card`

## 工作流概览

执行以下 5 步，每步完成后再进入下一步：

### Step 1 — Fetch

```bash
bash skills/news-card/scripts/fetch-all.sh workspace/candidates.json
```

抓取所有信息源，输出 `candidates.json`（每条含 title, url, source, published, summary, community_metrics）。

### Step 2 — Score + Dedup

```bash
bash skills/news-card/scripts/score.sh workspace/candidates.json workspace/scored.json
```

多维度评分 + 去重，输出 `scored.json`（按总分降序排列）。

### Step 3 — Curate（你来完成）

读取 `workspace/scored.json`，按照下方「三梯队规则」和 `references/scoring-spec.md` 选出 16 条新闻。

为每条生成中文标题、摘要，填充为 `digest.json`，结构参见 `examples/sample-digest.json`。

**选题 Prompt**：

你是一位冷静的新闻编辑。从今天的候选中选出 16 条，分为三梯队：

- **第一梯队（4 条）**：最大影响力 + 最大新颖性，4 条必须覆盖不同子领域，叙事方式错开
- **第二梯队（4 条）**：值得关注但非头条级别，与第一梯队不重叠的领域优先
- **其他新闻（8 条）**：从剩余候选中选最有信息量的 8 条

输出 JSON 数组，每条包含：
```json
{
  "tier": 1,
  "headline_zh": "≤25 字，零情绪化",
  "headline_en": "English headline",
  "summary_zh": "第一梯队 150 字 / 第二梯队 80 字 / 第三梯队 30 字",
  "content_html": "（仅第一梯队）富 HTML 内容，包含语义组件",
  "source": "来源名",
  "source_url": "原文链接",
  "category": "模型发布|产品应用|安全对齐|行业动态|开发工具|研究前沿|开源生态|政策监管|劳动力影响",
  "color_tag": "#hex（按 category 对应 references/design-tokens.md 中的颜色）",
  "highlight": "仅第一梯队需要：一句关键数据或亮点"
}
```

### 第一梯队 content_html 生成规则

对于第一梯队的 4 条新闻，你必须生成 `content_html` 字段。这是纯 HTML，会被直接渲染到卡片的内容区域（约 1200px 高度）。

**目标**：用信息把整个页面填满。不要只写 150 字摘要 — 写 400-600 字的深度内容，配合语义组件来可视化关键数据。

**内容来源**：从原文中提取尽可能多的有价值信息：
- 关键数据和数字
- 事件时间线和因果关系
- 各方观点和反应
- 技术细节和架构信息
- 影响分析和未来展望

**组件选择**（参见 `references/components-spec.md`）：

| 内容语义 | 推荐组件 |
|---------|---------|
| 关键数据/数字 | `<div class="data-row">` + `<div class="data-highlight">` |
| 步骤/流程/时间线 | `<div class="timeline">` |
| 对比/争议/优劣 | `<div class="compare-grid">` |
| 名人引言/观点 | `<blockquote>` |
| 关键要点/总结 | `<ul class="key-points">` |
| 背景知识/定义 | `<div class="callout">` |
| 核心洞察 | `<div class="highlight">` |
| 段落分隔 | `<div class="divider">` |
| 小标题 | `<h3>` |

**必须满足**：
- content_html 包含至少 3 个 `<p>` 段落
- 至少使用 1 个语义组件（根据内容选择最合适的）
- 页面底部空白不超过 10%
- 所有 HTML class 名必须使用上表中列出的 class（模板已定义样式）

将完整 JSON 写入 `workspace/digest.json`。

### Step 4 — Render HTML

```bash
node skills/news-card/scripts/lib/render-html.js \
  --input workspace/digest.json \
  --templates skills/news-card/templates \
  --output output/<datetime>/slides
```

将 digest.json 填入 HTML 模板，输出 8 个 HTML 文件到 `slides/` 子目录。

### Step 5 — Screenshot

```bash
bash skills/news-card/scripts/screenshot.sh output/<datetime>/slides output/<datetime>/images
```

Playwright 截图，输出 8 张 PNG（1080×1920px @2x）到 `images/` 子目录。

完成后告知用户输出位置。

## 输出目录结构

每次运行在项目根目录的 `output/` 下创建以当前日期时间命名的子目录：

```
output/
└── 2026-03-26_14-30-00/
    ├── slides/              ← 8 个 HTML 文件
    │   ├── page-0-cover.html
    │   ├── page-1-top1.html
    │   ├── ...
    │   └── page-7-briefs.html
    ├── images/              ← 8 张 PNG 卡片
    │   ├── page-0-cover.png
    │   ├── page-1-top1.png
    │   ├── ...
    │   └── page-7-briefs.png
    └── digest.json          ← 本次选题数据
```

或使用一键脚本（自动创建带时间戳的目录）：

```bash
bash skills/news-card/scripts/run-digest.sh
```

---

## 三梯队规则

| 梯队 | 条数 | 页面 | 展示方式 |
|------|------|------|----------|
| 第一梯队 | 4 条 | 第 1–4 页 | 每页一条，整页展示 |
| 第二梯队 | 4 条 | 第 5–6 页 | 每页两条，半页展示 |
| 其他新闻 | ~8 条 | 第 7 页 | 方框卡片 2×4 网格 |

封面（第 0 页）：所有 16 条新闻按 category 对应色块排列。

总计 8 张 PNG：1 封面 + 4 第一梯队 + 2 第二梯队 + 1 快讯。

---

## 信息密度准则（强制）

详见 `references/density-spec.md`。核心原则：

- 「填满」以人眼阅读感受为标准，不以 DOM 元素是否存在为标准
- 色块填满 ≠ 内容填满。一个 500px 色块里只有 2 行字 = 不合格
- 每种页面类型有最低文字占比要求（50%–65%）
- 页面底部空白不得超过总高度的 25%

---

## 设计约束（强制）

详见 `references/design-tokens.md`。

- 固定 1080×1920px，不考虑其他尺寸
- 字体：Noto Serif SC + Source Serif Pro（衬线体，永远不用无衬线体）
- 仅使用 design-tokens.md 中定义的色彩变量
- 分类色块颜色严格对应 category

---

## 文件索引

| 用途 | 路径 |
|------|------|
| 信息源清单 | `references/sources-spec.md` |
| 评分规则 | `references/scoring-spec.md` |
| 密度准则 | `references/density-spec.md` |
| 设计变量 | `references/design-tokens.md` |
| 输出模板 | `templates/output.md` |
| 样例数据 | `examples/sample-digest.json` |
| 样例输出 | `examples/sample-output.md` |
