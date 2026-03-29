---
name: news-card
description: >
  全自动 AI 新闻日报。抓取 40+ 英文 + 中文一手信息源，多维度评分筛选，AI 选题分三梯队，
  生成 9 张 9:16 小红书风格 PNG 卡片。说"今日 AI 日报"即可触发。
version: 0.2.0
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

读取 `workspace/scored.json`，按照下方「三梯队规则」和 `references/scoring-spec.md` 选出 24 条新闻。

为每条生成中文标题、摘要，填充为 `digest.json`，结构参见 `examples/sample-digest.json`。

**选题 Prompt**：

你是一位冷静的新闻编辑。从今天的候选中选出 24 条，分为三梯队：

- **第一梯队（4 条）**：最大影响力 + 最大新颖性，4 条必须覆盖不同子领域，叙事方式错开
- **第二梯队（4 条）**：值得关注但非头条级别，与第一梯队不重叠的领域优先
- **其他新闻（16 条）**：从剩余候选中选最有信息量的 16 条（分两页展示，每页 8 条）

输出 JSON 数组，每条包含：
```json
{
  "tier": 1,
  "headline_zh": "≤25 字，零情绪化",
  "headline_en": "English headline",
  "summary_zh": "第一梯队 150 字 / 第二梯队 150 字（两段） / 第三梯队 60 字（一段）",
  "content_html": "（仅第一梯队）富 HTML 内容，包含语义组件",
  "source": "来源名",
  "source_url": "原文链接",
  "category": "模型发布|产品应用|安全对齐|行业动态|开发工具|研究前沿|开源生态|政策监管|劳动力影响",
  "color_tag": "#hex（按 category 对应 references/design-tokens.md 中的颜色）",
  "highlight": "仅第一梯队需要：一句关键数据或亮点"
}
```

### 第一梯队 content_html 生成规则

对于第一梯队的 4 条新闻，你必须生成 `content_html` 字段。这是纯 HTML，会被直接渲染到卡片的内容区域。

**⚠️ 内容长度硬限制（CRITICAL）**：
- content_html **最多 900 字符**（含 HTML 标签），超过会被裁剪
- 内容区可用高度仅 **~1100px**（页面 1920px - 标题区 ~320px - 页脚区 ~150px - 内边距 ~350px）
- **最多使用 4 个顶级组件**（段落 + 数据行 + 1 个语义组件 + 结尾段落）
- **绝不使用 5 个以上组件** — 必然溢出导致页脚消失
- 宁可少放一个组件，也不要让内容溢出

**目标**：用信息把内容区填满但不溢出。写 300-400 字的深度内容，配合 1-2 个语义组件。

**内容来源**：从原文中提取尽可能多的有价值信息：
- 关键数据和数字
- 事件时间线和因果关系
- 各方观点和反应
- 技术细节和架构信息
- 影响分析和未来展望

**组件选择**（参见 `references/components-spec.md`）：

| 内容语义 | 推荐组件 |
|---------|---------|
| 步骤/工具/流程 | `flowchart`, `timeline`, `funnel`, `gantt` |
| 对比/选择/优劣 | `compare-grid`, `decision-tree`, `compare-table`, `pros-cons` |
| 数字/结论/数据 | `data-row`+`data-highlight`, `progress-group`, `pie-chart`, `bubble-chart` |
| 定义/概念/理论 | `concept-map`, `formula-box`, `definition-list`, `callout` |
| 多要素关联 | `venn`, `quadrant`, `cycle`, `fishbone` |
| 要点/关键词/总结 | `tag-cloud`, `numbered-grid`, `checklist`, `badge-list` |
| 观点/金句/引用 | `blockquote`, `chat-bubble`, `highlight`, `person-card` |
| 通用 | `<h3>`, `<p>`, `<div class="divider">`, `<ul class="key-points">` |

**必须满足**：
- content_html **≤ 900 字符**（含标签），包含 2-3 个 `<p>` 段落
- 至少使用 1 个语义组件（根据内容选择最合适的）
- **最多 4 个顶级组件**（段落、数据行、语义组件各算一个）
- 页面底部留有 footer 的空间 — 如果 footer 消失说明内容太长
- 所有 HTML class 名必须使用上表中列出的 class（模板已定义样式）

将完整 JSON 写入 `workspace/digest.json`。

### 第二梯队内容填充规则

第二梯队每条新闻的 `summary_zh` 必须包含 **至少 150 字**，分为两个自然段：
- 第一段：事件本身的描述（什么、谁、何时）
- 第二段：影响分析或背景补充（为什么重要、后续会怎样）

不要让半页留白太多。即使是次要内容，也有充足的空间展开。

### 第三梯队内容填充规则

第三梯队每条新闻的 `summary_zh` 必须包含 **至少 60 字**，写满一个完整自然段。不要只写一句话。
在允许范围内尽量充实内容，包括关键数据点或背景信息。

### 选题准则（参考顶级 Newsletter 方法论）

选题时，每条新闻必须通过以下至少一个测试：

1. **转发测试**（TLDR 方法论）：「你会不会把这个转发给朋友？」— 如果不会，不入选
2. **行动测试**（Rundown AI 方法论）：「读者能不能在 5 分钟内基于这条新闻做出行动？」
3. **利他测试**：「这条新闻是否让人想要收藏或转发给别人？」

**优先选择：**
- 多个信息源同时报道的事件（交叉验证 = 真正重要）
- 社交媒体高互动内容（likes > 1000, HN > 100 分）
- 有新工具/产品可以立即使用的发布类新闻
- AI 在某个领域超越人类能力的突破（Superhuman AI 方法论）

**排除标准：**
- 没有具体信息量的泛泛评论文章
- 重复此前已报道过的相同事件
- 纯融资/人事变动（除非金额或人物足够重磅）
- 缺乏具体细节的传闻或预测

**X/Twitter 单源限制：**
- X 单独发出的内容，未经其他独立来源确认时，不允许进入第一梯队
- 可作为早期 signal 保留在候选池或第三梯队中

### Step 2.5 — Enrich（预选题充实）— 未来步骤

<!-- implementation_status: future -->

> ⚠️ 本步骤当前未实现。Score 输出直接进入 Curate。

对 scored.json 中高分候选执行按需内容充实：

| 当前 Fetch 级别 | 升级目标 | 触发条件 |
|---------------|---------|---------|
| `title_only` | `metadata` | score ≥ 12 或进入 top-20 |
| `metadata` | `summary` | score ≥ 12 且 summary 为空 |
| `summary` | `full_text` | 仅第一梯队最终入选后 |

充实后写入 `workspace/enriched.json`，结构与 scored.json 相同，增加 `enrichment_level` 字段。

**高价值关键词触发列表：**
`announce`, `release`, `launch`, `open-source`, `model`, `benchmark`, `API`, `pricing`, `breakthrough`, `state-of-the-art`

### Step 3.5 — 评分报告（每次必须生成）

将 `workspace/scored.json` 中**全部候选新闻**（不只是入选的 24 条）整理为 Markdown 格式，写入 `output/<datetime>/scored-candidates.md`。

格式要求：

```markdown
# AI 日报候选评分 — YYYY-MM-DD

> 共 N 条候选，Spotlight N 条 / Notable N 条 / Discard N 条
> 信号源：N 个 Newsletter（N EN + N CN），共 N 条信号

## Spotlight 梯队（total ≥ 12）

| # | Score | Source | Title | CV | Heat | Auth | Rec | Vir | Act | PR | Related |
|---|-------|--------|-------|----|------|------|-----|-----|-----|----|---------|
| 1 | 32.6 | TechCrunch | Claude popularity skyrocketing | 6 | 4 | 4 | 0.3 | 3 | 3 | 5 | +4 src |

## Notable 梯队（6 ≤ total < 12）

（同上表格式）

## Discard 梯队（total < 6）

（同上表格式，可折叠或简化为仅 Title + Score）

## 维度活跃度

| Dimension | Non-Zero | Coverage |
|-----------|----------|----------|
| cross_validation | 7/126 | 5.6% |
| peer_review | 15/126 | 11.9% |
| ... | | |

## 入选标记

在 Spotlight/Notable 表格中，最终被选入 digest.json 的 24 条用 **✅** 标注。
```

此报告用于：
- 每次运行后审计评分算法质量
- 追踪算法迭代的改进效果
- 检查是否有高分候选被遗漏或低分候选被误选

### Step 4 — Render HTML

```bash
node skills/news-card/scripts/lib/render-html.js \
  --input workspace/digest.json \
  --templates skills/news-card/templates \
  --output output/<datetime>/slides
```

将 digest.json 填入 HTML 模板，输出 9 个 HTML 文件到 `slides/` 子目录。

### Step 5 — Screenshot

```bash
bash skills/news-card/scripts/screenshot.sh output/<datetime>/slides output/<datetime>/images
```

Playwright 截图，输出 9 张 PNG（1080×1920px @2x）到 `images/` 子目录。

完成后告知用户输出位置。

## 输出目录结构

每次运行在项目根目录的 `output/` 下创建以当前日期时间命名的子目录：

```
output/
└── 2026-03-26_14-30-00/
    ├── slides/              ← 9 个 HTML 文件
    │   ├── page-0-cover.html
    │   ├── page-1-top1.html
    │   ├── ...
    │   └── page-7-briefs.html
    ├── images/              ← 9 张 PNG 卡片
    │   ├── page-0-cover.png
    │   ├── page-1-top1.png
    │   ├── ...
    │   └── page-7-briefs.png
    ├── digest.json          ← 本次选题数据
    └── scored-candidates.md ← 全部候选新闻评分报告
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
| 其他新闻 | 16 条 | 第 7–8 页 | 方框卡片 2×4 网格，每页 8 条 |

封面（第 0 页）：所有 24 条新闻按 category 对应色块排列。

总计 9 张 PNG：1 封面 + 4 第一梯队 + 2 第二梯队 + 2 快讯。

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
