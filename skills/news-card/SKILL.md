---
name: news-card
description: >
  全自动 AI 新闻日报。抓取 65+ 英文 + 中文一手信息源，多维度评分筛选，AI 选题分三梯队，
  生成 10 张 9:16 小红书风格 PNG 卡片。说"今日 AI 日报"即可触发。
version: 0.4.0
---

# News Card Skill

> **⚠️ 本技能是执行管线，不是开发任务。**
> 不要执行 development-workflow.md 中的 Research & Reuse 步骤。
> 不要手动阅读脚本源码来理解管线——直接按本文档的 Step 1-6 顺序执行。
> SKILL.md 就是唯一入口。具体规则拆分在 `references/` 子目录中，按需加载。

## 触发方式

- "今日 AI 日报"
- "generate AI digest"
- `$news-card`

### 封面切换

- **默认**：使用 HTML hero-cover 模板生成封面（始终生成作为备用）
- **手动切换**：当用户明确说"现在用xhs-image-hero生成封面"时，调用 `xhs-image-hero` skill 生成 1:1 四格漫画 Hero Image，嵌入 V2 封面模板（`skills/xhs-image-hero/templates/v2-cover.html`）
- xhs-image-hero 封面不会替代 HTML 封面，两者共存，仅在手动触发时生成

---

## 必须交付物清单（CRITICAL — 缺一不可）

每次运行完成后，`output/<datetime>/` 目录中必须包含以下全部文件：

| 文件 | 生成步骤 | 说明 |
|------|---------|------|
| `slides/*.html` (10 个) | Step 4 | 10 张 HTML 页面 |
| `images/*.png` (10 张) | Step 5 | 10 张 PNG 卡片 |
| `digest.json` | Step 3 | 选题数据（**必须恰好 24 条**） |
| `digest-xhs.json` | Step 3.95 | XHS 合规和谐版（渲染用） |
| `scored-candidates.md` | Step 3.5 | 全部候选新闻评分报告 |
| `xiaohongshu-post.md` | Step 3.6 | 小红书发布文案（经 3.95 审核） |
| `selection-rationale.md` | Step 6a | 选题理由说明 |
| `pipeline-issues.md` | Step 6b | 管线问题记录 |

**完成 Step 5 后，必须继续执行 Step 6 生成所有附带文档。Step 6 不是可选的。**

详见 → `references/config/output-structure.md`

---

## 工作流概览

执行以下 6 步，每步完成后再进入下一步。

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

按照梯队规则选出 **恰好 24 条**（不多不少），填充为 `digest.json`。

**核心规则：**
- 梯队分配 → `references/elements/tier-system.md`
- 编辑人格与选题标准 → `references/workflows/curation-framework.md`
- 各梯队内容写作标准 → `references/workflows/content-standards.md`
- 语义组件选择 → `references/components-spec.md`

将完整 JSON 写入 `workspace/digest.json`。

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

### Step 3.5 — 评分报告

将 `workspace/scored.json` 中**全部候选新闻**整理为 Markdown 格式，写入 `output/<datetime>/scored-candidates.md`。可通过 `generate-score-report.js` 自动生成。

格式 → `references/config/output-structure.md`

### Step 3.6 — 小红书文案（提前生成，供 Step 3.95 审核）

**必须调用 `skills/XHS-writer/SKILL.md` 执行完整创作流程**，再结合 `references/workflows/xhs-post-guide.md` 的日报格式模板生成**两个版本**：

| 文件 | 版本 | 定位 |
|------|------|------|
| `xiaohongshu-post.md` | V1 编辑版 | 有 editorial bite，每条带分析 |
| `xiaohongshu-post-v2.md` | V2 关键词版 | 每条极简，关键词密度最大化，防限流 |

具体要求：
1. 读取 `skills/XHS-writer/SKILL.md`，按其第三步生成 **5 个备选标题**（每个标注策略类型）
2. V1 按 `xhs-post-guide.md` 的 V1 模板填充，V2 按 V2 模板填充
3. 写作风格、反 AI 检测策略、敏感词规避均以 XHS-writer 为准
4. 两个文件末尾均包含「备选标题」区，列出全部 5 个标题方案

**此步骤必须在 Step 3.95 之前完成**，因为 XHS 合规审核需要同时审查卡片内容和发布文案。

### Step 3.7 — 话题配额自检（CRITICAL — 必须通过才能进入 Step 3.9）

对照 `curation-framework.md` §「话题配额」硬约束检查 digest.json：

```bash
node skills/news-card/scripts/check-topic-quota.js output/<datetime>/digest.json
```

检查项：
- T1 中 `politics` / `unrest` / `religion_ethics` / `health_ai` / `finance_ai` / `ai_reg` 条目必须为 0（「特别特别特别重要」例外需在 `selection-rationale.md` 中说明依据）
- T2 对应话题 ≤ 1
- T3 briefs（P8+P9）中 `politics+unrest` 合计 ≤ 2，医疗/金融 AI 合计 ≤ 2
- `sovereignty` 任何位置都不允许出现

不通过则回到 Step 3 重新选题。exit code 0 = 通过，1 = 违规。

### Step 3.9 — digest.json 自检（CRITICAL — 必须通过才能进入 Step 4）

```bash
node skills/news-card/scripts/validate-digest.js workspace/digest.json
```

脚本自动检测上期 digest 进行跨期去重，也可手动指定：`--prev output/<prev>/digest.json`。
输出包含每个 tier-1 的 HTML/文字双向空间余量。**exit code 0 = 全部通过，1 = 有违规**。

验证清单 → `references/workflows/curation-framework.md` § 验证清单

### Step 3.95 — XHS 合规审核（CRITICAL — 必须通过才能进入 Step 4）

**本步骤必须调用 `skills/xhs-reviewer/SKILL.md` 执行完整的 6 维度审核，不可用简单的字符串替换代替。**

#### 审核范围（三个文件，缺一不可）

| 审核对象 | 来源 | 说明 |
|---------|------|------|
| `digest.json` 的全部文本字段 | Step 3 输出 | headline_zh, summary_zh, content_html, highlight |
| `xiaohongshu-post.md` | Step 6c 输出 | 标题 + 正文 + hashtag（**因此 Step 6c 必须在 3.95 之前生成**） |
| V2 封面 slogan | `skills/xhs-image-hero/templates/v2-cover.html` | 固定文案，每期确认无新增敏感词 |

#### 审核流程

1. 加载 `references/config/sensitive-word-dict.md` 完整敏感词库
2. 对照 xhs-reviewer 的 **6 个维度**（法律法规、行业准入、社区规范、内容质量、平台元素、营销合规）逐项检查
3. **重点扫描**：自杀/自残/心理等心理危机词（XHS 零容忍）、广告法极限词（最/绝对/完美）、医疗/金融行业词、强负面词（封杀/崩溃/暴跌）
4. 输出审核报告，列出所有问题及修复建议
5. 执行修复，生成 `digest-xhs.json`（对 digest.json 的和谐版）和修正后的 `xiaohongshu-post.md`
6. 对 `digest-xhs.json` 重新运行 `validate-digest.js` 确认字数限制仍然通过

**⚠️ `category` 字段（如「可信对齐」）不可替换** — 详见 `sensitive-word-dict.md` § 不可替换的固定词。

**所有下游步骤（Step 4 render、Step 5 screenshot、Phase 2 hero）使用 `digest-xhs.json`，不使用 digest.json。**

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

**⚠️ 截图完成 ≠ 管线完成。必须继续执行 Step 5.5 和 Step 6。**

### Step 5.5 — 渲染溢出检测（CRITICAL — 必须通过才能进入 Step 6）

```bash
node skills/news-card/scripts/check-overflow.js output/<datetime>/slides
```

用 Playwright 测量 P2–P5 四张 T1 Feature 页面的实际渲染高度，检测内容是否溢出到 source-bar / footer 区域。**字符数通过 ≤ 1100 并不意味着页面不溢出**——不同语义组件占用的渲染高度差异极大（详见 `content-standards.md` § 组件高度分级）。

exit code 0 = 全部通过，1 = 有溢出。如有溢出，回到 Step 3 缩短对应 T1 的 content_html 纯文字段，重新 render + screenshot + check-overflow。

### Step 6 — 输出附带文档（CRITICAL — 不可跳过）

每次运行完成后，必须在输出目录中生成以下文档：

| 文档 | 文件名 | 规则来源 |
|------|--------|---------|
| 6a. 选题理由 | `selection-rationale.md` | `references/config/output-structure.md` § 6a |
| 6b. 管线问题 | `pipeline-issues.md` | `references/config/output-structure.md` § 6b |

> **注意**：`xiaohongshu-post.md`（原 6c）已移至 Step 3.6，在 XHS 合规审核之前生成。

---

## 设计约束（强制）

- **画布** → `references/elements/canvas.md`
- **字体与排版** → `references/elements/typography.md`
- **信息密度** → `references/density-spec.md`
- **设计变量** → `references/design-tokens.md`

核心原则摘要：
- 固定 1080×1920px，不考虑其他尺寸
- 字体：Noto Serif SC + Source Serif Pro（衬线体，永远不用无衬线体）
- 仅使用 design-tokens.md 中定义的色彩变量
- 文字密度 50–65%，页面底部空白不超过总高度 25%

---

## 文件索引

### Skill 入口

| 用途 | 路径 |
|------|------|
| 本文件 | `SKILL.md` |
| XHS-writer 技能 | `skills/XHS-writer/SKILL.md` |
| Autoresearch 技能 | `skills/autoresearch/SKILL.md` |

### 配置 (`references/config/`)

| 用途 | 路径 |
|------|------|
| 输出目录结构与交付物 | `references/config/output-structure.md` |
| 小红书敏感词替换库 | `references/config/sensitive-word-dict.md` |

### 元素 (`references/elements/`)

| 用途 | 路径 |
|------|------|
| 画布规格与安全区 | `references/elements/canvas.md` |
| 字体与排版规范 | `references/elements/typography.md` |
| 梯队系统与分配 | `references/elements/tier-system.md` |

### 工作流 (`references/workflows/`)

| 用途 | 路径 |
|------|------|
| 选题框架与编辑人格 | `references/workflows/curation-framework.md` |
| 各梯队内容写作标准 | `references/workflows/content-standards.md` |
| 小红书发布文案指南 | `references/workflows/xhs-post-guide.md` |

### 规格参考 (`references/`)

| 用途 | 路径 |
|------|------|
| 语义组件清单 | `references/components-spec.md` |
| 设计变量（色彩） | `references/design-tokens.md` |
| 信息密度准则 | `references/density-spec.md` |
| 评分规则 | `references/scoring-spec.md` |
| 信息源清单 | `references/sources-spec.md` |

### 其他

| 用途 | 路径 |
|------|------|
| 样例数据 | `examples/sample-digest.json` |
| 样例输出 | `examples/sample-output.md` |
| 输出模板 | `templates/output.md` |
