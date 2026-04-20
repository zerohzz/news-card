---
name: content-standards
description: 各梯队内容写作标准、content_html 规则、字数限制
---

# 各梯队内容写作标准

## Tier 1 — 第一梯队（Feature 整页，P2–P5）

### summary_zh

- **≥ 150 字**，深度分析
- 回答「为什么重要」而不仅是「发生了什么」

### content_html（CRITICAL）

对于第一梯队的 4 条新闻，必须生成 `content_html` 字段。这是纯 HTML，会被直接渲染到卡片的内容区域。

#### 空间限制

| 约束 | 值 | 说明 |
|------|---|------|
| 纯文字下限 | **≥ 500 字**（去 HTML 标签后） | 低于导致页面半空 |
| 总字符上限 | **≤ 1100 字符**（含 HTML 标签） | 超过会被裁剪 |
| 可用高度 | ~1490px | 1920px - 标题区 ~240px - 页脚区 ~90px - 内边距 ~100px（已移除英文副标题和页脚日期） |
| 顶级组件上限 | **最多 5 个** | 段落 + 数据行 + 语义组件 + 结尾段落 |
| 组件硬限制 | **绝不超过 6 个** | 必然溢出导致页脚消失 |

**目标**：用信息把内容区填满但不溢出。写 500-600 字的深度内容，配合 1-2 个语义组件。

#### 内容来源

从原文中提取尽可能多的有价值信息：
- 关键数据和数字
- 事件时间线和因果关系
- 各方观点和反应
- 技术细节和架构信息
- 影响分析和未来展望

#### 组件选择

参见 `references/components-spec.md` 完整清单。快速参考：

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

#### 必须满足

- content_html **≤ 1100 字符**（含标签），包含 2-3 个 `<p>` 段落
- 至少使用 1 个语义组件（根据内容选择最合适的）
- **最多 4 个顶级组件**（段落、数据行、语义组件各算一个）
- 页面底部留有 footer 的空间 — 如果 footer 消失说明内容太长
- 所有 HTML class 名必须使用上表中列出的 class（模板已定义样式）

#### 组件多样性（CRITICAL — validator 强制）

**4 条 T1 必须使用 4 种不同的语义组件，不允许重复**。`<ul class="key-points">` 是通用兜底，**整组 T1 中至多出现 1 次**。

**不要每天用同一组组件。** 从 `references/components-spec.md` 的 28 个组件中，根据每条新闻的内容语义自由选择。组件库按语义分 7 类：

| 语义类别 | 可用组件 |
|---------|---------|
| 步骤/流程 | `numbered-grid`, `flowchart`, `timeline`, `funnel`, `gantt`, `checklist` |
| 对比/选择 | `pros-cons`, `compare-grid`, `compare-table`, `decision-tree` |
| 数字/数据 | `data-row`+`data-highlight`, `progress-group`, `pie-chart`, `bubble-chart` |
| 定义/概念 | `concept-map`, `formula-box`, `definition-list`, `callout` |
| 多要素关联 | `venn`, `quadrant`, `cycle`, `fishbone` |
| 要点/关键词 | `tag-cloud`, `badge-list` |
| 观点/引用 | `blockquote`, `chat-bubble`, `highlight`, `person-card` |

兜底组件（`key-points`, 单纯 `<ul>`, 单纯 `<p>`）不算独特组件——validator 会按顶级组件 class 识别。

**4 条 T1 提取出的组件 class 集合 size 必须 ≥ 4**，否则 validate-digest.js 报错。

#### 跨日组件去重（CRITICAL — 防止视觉疲劳）

**本期 4 个组件中，至少 2 个必须是上期未使用过的。** 选组件前先读取上期 digest.json 的 T1 content_html，提取其使用的 4 个组件 class，然后确保本期至少换掉一半。

示例：上期用了 `numbered-grid, tag-cloud, pros-cons, data-row`，本期必须至少引入 2 个不同的组件（如 `timeline, compare-grid, progress-group, concept-map` 等）。

#### 组件选择原则

1. **先看新闻内容，再选组件** — 不要先决定组件再硬套内容
2. **匹配内容语义** — 有时间线的用 `timeline`，有对立观点的用 `pros-cons`，有多方数据的用 `progress-group`
3. **查阅 `components-spec.md`** — 每个组件都有 HTML 范例和字数限制，直接参考
4. **禁止固定分配** — 不存在「T1#1 永远用 numbered-grid」这种规则

#### 字数预算提示（避免组件膨胀触发字数下限）

切换到富组件后，HTML 标签会吃掉 200–400 字符。**纯文字段必须打到 510-540 字才能稳定通过 ≥ 500 校验**，组件本身贡献的文字（如 numbered-item 的标签）不算多。建议：两段段落分别 160 + 350 字，组件文字 30-60 字。

---

## Tier 2 — 第二梯队（Half-page，P6–P7）

### summary_zh（CRITICAL — 字数硬上限 210）

- **180–210 字**（硬上限 210 字，下限 180 字）— **sweet spot 约 200 字**
- 写作时在思路上分成两部分（用 `\n\n` 标记分界）：
  - 第一段：事件本身的描述（什么、谁、何时）
  - 第二段：影响分析或背景补充（为什么重要、后续会怎样）
- `\n\n` **只是写作组织工具**，渲染时换行会被折叠为空格，整条 summary 以**一整块连贯文字**呈现（不是视觉上的分段）。这是有意为之——半页卡片没有为段间空行留物理空间，留空行会把 footer 顶出视口。

**Geometry lock**：Tier-2 summary 的字体被锁定在 36px / line-height 1.7（`half-page.html`）。这个字号是**可读性契约**，**绝对不可以为了塞下更多内容而缩小字体**。如果你发现字数超出上限：

1. **改写内容，不改字号**——删掉冗余形容、合并重复论点、用更紧凑的句式
2. 两段各砍 10-15 字通常就能回到 200 字内
3. 过度精简（<180 字）会让半页留白太多，视觉比 04-14 baseline 空 1-2 行，阅读节奏断裂——宁可保留一个论点也不要 180 字以下

**为什么是 210**：36px 字体、1.7 行高、960px 容器下，半页 story 约有 8 行可用高度（扣掉标题、category、source-bar）。每行约 26 个中文字，8 × 26 = 208，取整为 210。超过这个数字第二个 story 就会把 footer 推出视口。

**为什么不做可视分段**：参考 2026-04-13 / 04-14 的 P6-P7 渲染——那几天 T2 summary 都在 190-210 字之间，但渲染为单一连续文字块，阅读节奏紧凑舒适。这是 half-page 模板的既定 baseline。

### 无 content_html

Tier 2 **不使用** content_html 字段。

---

## Tier 3 — 第三梯队（Briefs 网格，P8–P9）

### summary_zh

- **60–90 字**（硬上限 90 字），写满一个完整自然段
- 不要只写一句话

### 字数硬限制（CRITICAL）

| 字段 | 限制 | 后果 |
|------|------|------|
| `headline_zh` | **≤ 25 字** | 超过导致卡片标题溢出为 3 行 |
| `summary_zh` | **60–90 字**（硬上限 90 字） | 超过 90 字导致 2×4 网格卡片溢出，遮挡页脚 |

- 排版预算：每张卡片高度约 400px，标题 2 行 + 摘要 5 行是上限
- 宁可精简措辞，也不要超出字数限制

### 无 content_html

Tier 3 **不使用** content_html 字段。

---

## 跨梯队通用规则

### 禁止暴露管线内部逻辑（CRITICAL — 全部梯队）

读者面向的内容（headline_zh、summary_zh、content_html）中 **绝对不能出现管线内部的筛选标准、评分机制和数据源元信息**。这些是编辑部的内部工具，不是读者需要知道的信息。

**禁止写入正文的内容：**
- 交叉验证分数、评分维度（「交叉验证高达12分」「评分排名第一」）
- 媒体报道数量作为论据（「六家媒体同步报道」「14家媒体报道证明影响力」）
- 候选池/来源数（「从130条候选中筛选」「65个信息源」）
- 信号池/排名术语（「scored-news排名」「topic_hint分类」）
- 任何暗示内容经过算法筛选的表述

**正确做法：** 用新闻本身的事实来支撑重要性判断，而非管线元数据。

| ❌ 错误 | ✅ 正确 |
|--------|--------|
| 六家权威媒体同步报道这一发现 | 两项独立研究同时得出了相似结论 |
| 交叉验证分数高达12分 | （直接删除，不需要替代） |
| 这是今日所有候选中的顶格值 | （直接删除，不需要替代） |
| 14家媒体报道证明其行业冲击力 | 这一发布引发了行业广泛关注 |

> **原则**：读者应该因为新闻内容本身而觉得重要，不是因为你告诉他「我们的算法认为它重要」。

### headline_zh — 全部梯队

- **≤ 25 字**，零情绪化
- 详细标准 → `references/elements/typography.md` § 标题规范

### summary_zh — 全部梯队

- 写作风格 → `references/elements/typography.md` § 摘要写作标准
- 同一页面的多条摘要不得以相同句式开头

### highlight — 仅 Tier 1

一句关键数据或亮点，用于 Cover 页 Top 4 预览区。
