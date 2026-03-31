---
name: news-card
description: >
  全自动 AI 新闻日报。抓取 65+ 英文 + 中文一手信息源，多维度评分筛选，AI 选题分三梯队，
  生成 10 张 9:16 小红书风格 PNG 卡片。说"今日 AI 日报"即可触发。
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

读取两个文件：
- `workspace/scored-news.json` — 新闻主排名（RSS + Blogs + follow-builders Blog/Podcast）
- `workspace/scored-signals.json` — 信号池（X/Twitter + Hacker News + HuggingFace Papers）

按照下方「四梯队规则」和 `references/scoring-spec.md` 选出 24 条，填充为 `digest.json`。

**选题 Prompt**：

你是一位有二十年从业经验的资深科技编辑。温柔但有力量——你的文字让人觉得被认真对待，而不是被喂了一碗信息快餐。你不是冷冰冰的通讯社，也不是追热点的自媒体。你有自己的判断力，写作带有深度思考的灵魂。

**你的编辑人格：**
- **温柔且有力量**：你的温柔体现在对读者的体贴——用最清晰的方式把复杂的事讲明白，不居高临下，也不降低标准。你的力量体现在判断力——敢于在摘要中点明一件事真正重要的原因，或者直接说「这没什么新意」
- **分析性视角**：每条摘要必须回答「为什么重要」，不仅仅是「发生了什么」。你被允许——也被鼓励——在摘要中指出讽刺性、强调被忽视的细节、点明信息的缺失
- **反标题党**：这是科技媒体的尊严。标题陈述事实，不贩卖情绪。读者因为信任你的判断力而来，不是因为你的标题刺激了他们的焦虑
- **有温度的专业感**：偶尔流露对技术进步的真诚好奇、对行业变化的敏锐洞察、对读者时间的珍惜。像一个你信任的前辈在跟你聊今天的新闻，不像一份没有灵魂的简报

从今天的候选中选出 24 条，分为四梯队：

- **第一梯队（4 条）**：从 `scored-news.json` 选。最大影响力 + 最大新颖性，4 条必须覆盖不同子领域，叙事方式错开
- **第二梯队（4 条）**：从 `scored-news.json` 选。值得关注但非头条级别，与第一梯队不重叠的领域优先
- **新闻快讯（8 条）**：从 `scored-news.json` 剩余候选中选最有信息量的 8 条
- **研究前沿 / Builder 动态（8 条）**：从 `scored-signals.json` 选。涵盖最值得关注的学术论文和 AI Builder 社区动态

输出 JSON 数组，每条包含：
```json
{
  "tier": 1,
  "headline_zh": "≤25 字，零情绪化",
  "headline_en": "English headline",
  "summary_zh": "第一梯队 150 字 / 第二梯队 150 字（两段） / 第三梯队 60–90 字（一段，硬上限 90 字）",
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

第三梯队每条新闻的 `summary_zh` 必须在 **60–90 字** 范围内（硬上限 90 字），写满一个完整自然段。不要只写一句话。

**⚠️ 字数硬限制（CRITICAL）**：
- `headline_zh`：**≤ 25 字**（超过会导致卡片标题溢出为 3 行）
- `summary_zh`：**60–90 字**（超过 90 字会导致 2×4 网格卡片溢出，遮挡页脚）
- 排版预算：每张卡片高度约 400px，标题 2 行 + 摘要 5 行是上限
- 宁可精简措辞，也不要超出字数限制

### 标题规范（headline_zh）

`headline_zh` 的「零情绪化」原则具体化：

**禁止**：
- 情绪标点：！、？（标题中不使用）
- 夸张词：震撼、重磅、突发、颠覆、炸裂、史诗级、里程碑、王炸、炸场
- 抽象概括：避免「AI 迎来重大升级」「行业格局巨变」这类不含具体信息的标题

**要求**：
- 具体事实：主语 + 动词 + 关键信息
- 标题读完后，读者应能知道发生了什么，不需要看正文来理解标题

**正反对比**：

| ❌ 坏标题 | ✅ 好标题 | 原因 |
|-----------|----------|------|
| AI 对话迎来重大升级 | Claude 新增记忆控制台，支持跨会话持久化 | 具体产品 + 具体功能 |
| 开源界又一重磅炸弹 | Mistral 开源 Codestral Router，Apache 2.0 协议 | 谁 + 做了什么 + 关键细节 |
| 这项政策将改变 AI 行业 | 欧盟公布高风险 AI 模型审计细则，明年生效 | 事实 + 时间，不预判影响 |

### 摘要写作标准（summary_zh）

所有梯队的摘要必须遵循以下写作标准：

**结构**：
- **第一句**：事实核心——谁做了什么（不要用背景铺垫开头）
- **中间句**：为什么不同、为什么重要、你的编辑视角
- **结尾句**：前瞻判断或行业影响——不要重复第一句的信息

**禁止**：
- 两面套话：「一方面…另一方面…」「既…又…」
- AI 味过渡词：值得一提的是、需要注意的是、总的来说、综上所述、与此同时、不言而喻、众所周知
- AI 味句式：「在…的背景下」「随着…的发展」「这不仅…更…」「无论是…还是…」

**句式要求**：
- 同一页面的多条摘要不得以相同句式开头
- 刻意混合长短句——连续三个等长句子是 AI 最明显的特征
- 允许使用短句做判断：「这是个信号。」「时机很微妙。」
- 偶尔用破折号插入补充——这比括号更有编辑味

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

### Step 3.5 — 评分报告（推荐生成）

将 `workspace/scored.json` 中**全部候选新闻**（不只是入选的 24 条）整理为 Markdown 格式，写入 `output/<datetime>/scored-candidates.md`。可通过 `generate-score-report.js` 自动生成。

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

将 digest.json 填入 HTML 模板，输出 10 个 HTML 文件到 `slides/` 子目录。

### Step 5 — Screenshot

```bash
bash skills/news-card/scripts/screenshot.sh output/<datetime>/slides output/<datetime>/images
```

Playwright 截图，输出 10 张 PNG（1080×1920px @2x）到 `images/` 子目录。

完成后告知用户输出位置。

### Step 6 — 输出附带文档（必须）

每次运行完成后，必须在输出目录中生成以下文档：

#### 6a. 选题理由说明 (`selection-rationale.md`)

解释为什么选择这 24 条新闻。包含：

```markdown
# 选题理由 — YYYY-MM-DD

## 第一梯队（4 条）
| # | 标题 | 入选理由 |
|---|------|---------|
| 1 | ... | 多源交叉验证（3+ 媒体）、行业影响大、叙事方式独特 |

## 第二梯队（4 条）
（同上格式）

## 第三梯队（16 条）
### 快讯速览（8 条）
### 研究前沿 / Builder 动态（8 条）
（同上格式，理由可简短）

## 落选说明
列出 3-5 条高分但未入选的候选，说明为什么没选。
```

#### 6b. 管线问题记录 (`pipeline-issues.md`)

记录本次运行中遇到的所有问题、错误、异常，以及修复或绕过措施：

```markdown
# Pipeline Issues — YYYY-MM-DD Run

| # | Issue | Step | Severity | Fixed? | 说明 |
|---|-------|------|----------|--------|------|
| 1 | ... | Fetch | BLOCKING | Yes | ... |

## 详细描述
（每个 issue 的症状、根因、修复方式）

## 改进建议
（基于本次运行，对管线代码或配置的改进建议）
```

#### 6c. 小红书发布文案 (`xiaohongshu-post.md`)

> **⚠️ 必须先读取 `skills/XHS-writer/SKILL.md`**，按其中的文风规范、限流词/敏感词速查表和反 AI 检测策略来生成本文案。

生成可直接复制粘贴到小红书的发布文案。

**标题格式（强制）**：
```
MM/DD日报 · <当日最大亮点，一句话>
```
示例：`03/30日报 · Bluesky 用 Claude 让你自己定义算法`

**正文格式**：
```markdown
# MM/DD日报 · <亮点>

🔥 今日头条
1. <tier-1 headline> — <一句话说明>
2. <tier-1 headline> — <一句话说明>
3. <tier-1 headline> — <一句话说明>
4. <tier-1 headline> — <一句话说明>

📰 值得关注
5. <tier-2 headline> — <一句话说明>
6. <tier-2 headline> — <一句话说明>
7. <tier-2 headline> — <一句话说明>
8. <tier-2 headline> — <一句话说明>

⚡ 快讯
· <tier-3 headline>
· <tier-3 headline>
...

#AI日报 #AI资讯 #人工智能 #科技新闻
```

**注意**：
- 标题 prefix 永远是 `MM/DD日报 · `，不可省略
- 正文用中文，简洁有力
- hashtag 固定使用上述 4 个

**文风要求**：
- xiaohongshu-post.md 应读起来像编辑部晨报简报，不像新闻稿罗列
- 每条 headline 后的一句话描述必须包含编辑判断，不能只是重复标题

| ❌ 坏描述 | ✅ 好描述 |
|-----------|----------|
| OpenAI 发布企业 Agents SDK — 新工具支持多种功能 | OpenAI 发布企业 Agents SDK — 从 demo 到生产的关键一步，tracing 和 eval hooks 是亮点 |
| 欧盟公布 AI 审计细则 — 对高风险模型提出新要求 | 欧盟公布 AI 审计细则 — 合规成本会筛掉一批小厂，大公司反而受益 |

- 4 条 tier-1 描述不得使用相同语法结构（避免 AI 痕迹）

**小红书合规速查**（综合 10+ 个 GitHub 开源检测工具整理）：

🔴 **违规词（删帖/封号风险）**：
- 极限用语：最、极、首、顶级、第一、唯一、NO.1、全网最、史上最、国家级、世界级、百分百、绝对、永久
- 跨平台引流：加微信、公众号、淘宝、链接（含谐音变体：薇信、v信）

🟡 **限流词（降权/shadow ban）**：
- 消费诱导：必入、必买、不买后悔、错过就没、强烈推荐
- 虚假承诺：立竿见影、7天见效、无效退款
- 诱导互动：点赞、收藏、关注、评论区见、私信我、双击

🟠 **AI检测词（被判定 AI 内容）**：
- 过渡词：值得一提的是、需要注意的是、总的来说、综上所述、与此同时、不言而喻、众所周知、显而易见、不难发现、可以预见
- 句式模板：「在…的背景下」「随着…的发展」「这不仅…更…」「无论是…还是…」「一方面…另一方面…」
- 结构特征：首先/其次/最后（刚性枚举）、由此可见、基于以上分析
- 隐性特征：连续 3 句等长、完美并列、全文无口语化表达

## 输出目录结构

每次运行在项目根目录的 `output/` 下创建以当前日期时间命名的子目录：

```
output/
└── 2026-03-26_14-30-00/
    ├── slides/              ← 10 个 HTML 文件
    │   ├── page-0-cover.html    (Hero Cover)
    │   ├── page-1-menu.html     (Menu / 目录)
    │   ├── page-2-top1.html … page-5-top4.html  (Tier 1 × 4)
    │   ├── page-6-second.html, page-7-second.html  (Tier 2 × 2)
    │   ├── page-8-briefs.html   (快讯速览)
    │   └── page-9-briefs.html   (研究前沿 / Builder 动态)
    ├── images/              ← 10 张 PNG 卡片 (1080×1920 @2x)
    ├── digest.json          ← 本次选题数据
    ├── scored-candidates.md ← 全部候选新闻评分报告
    ├── selection-rationale.md ← 选题理由说明（为什么选这 24 条）
    ├── pipeline-issues.md   ← 本次运行遇到的问题与改进建议
    └── xiaohongshu-post.md  ← 小红书发布文案
```

或使用一键脚本（自动创建带时间戳的目录）：

```bash
bash skills/news-card/scripts/run-digest.sh
```

---

## 页面与梯队规则

| 页码 | 页面 | 梯队 | 条数 | 数据源 | 展示方式 |
|------|------|------|------|--------|----------|
| P0 | Hero Cover | — | — | — | 品牌封面 + Top 4 标题 |
| P1 | Menu | — | 24 | digest.json | 目录索引，按 category 色块 |
| P2–P5 | Feature | 第一梯队 (tier 1) | 4 条 | scored-news.json | 每页一条，整页展示 |
| P6–P7 | Half-page | 第二梯队 (tier 2) | 4 条 | scored-news.json | 每页两条，半页展示 |
| P8 | Briefs | 快讯速览 (tier 3) | 8 条 | scored-news.json | 方框卡片 2×4 网格 |
| P9 | Briefs | 研究前沿 / Builder 动态 (tier 3) | 8 条 | scored-signals.json | 方框卡片 2×4 网格 |

总计 10 张 PNG：1 封面 + 1 目录 + 4 第一梯队 + 2 第二梯队 + 1 快讯速览 + 1 研究前沿。

> **页码规则**：Hero Cover (P0) 不显示页码。内容页（P1–P9）显示 `X / 9`，共 9 页内容。

> **数据层只有 tier 1/2/3。** P8 和 P9 在数据上都是 `tier: 3`，但 P9 的 section 标题为「研究前沿 / Builder 动态」，内容优先从 `scored-signals.json` 选取。

> **信号池来源（进入 scored-signals.json）：** X/Twitter、Hacker News、HuggingFace Papers。它们仍参与 cross_validation 和 peer_review 的评分计算（为新闻条目提供交叉验证信号），但选题时仅出现在 P9「研究前沿 / Builder 动态」。follow-builders 的 Blog 和 Podcast 进入主排名（scored-news.json）。

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
