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

推荐分配（按梯队顺序，根据内容自由调整）：

| T1 # | 内容特征 | 推荐组件 |
|------|----------|---------|
| #1 | 多用例 / 步骤 / 编号清单 | `numbered-grid`, `flowchart`, `timeline`, `checklist` |
| #2 | 关键词 / 生态 / 概念集合 | `tag-cloud`, `badge-list`, `concept-map`, `definition-list` |
| #3 | 风险/对策 / 优劣对比 | `pros-cons`, `compare-grid`, `compare-table`, `decision-tree` |
| #4 | 数字 / 对比数据 / 进度 | `data-row` + `data-highlight`, `progress-group`, `pie-chart`, `bubble-chart` |

兜底组件（`key-points`, 单纯 `<ul>`, 单纯 `<p>`）不算独特组件——validator 会按顶级组件 class 的 `.tag-cloud` / `.numbered-grid` / `.pros-cons` / `.data-row` / `.flowchart` / `.compare-grid` / `.timeline` / `.checklist` / `.callout` / `.blockquote` / `.concept-map` / `.cycle` / `.fishbone` / `.quadrant` / `.formula-box` / `.definition-list` / `.progress-group` / `.pie-chart` / `.bubble-chart` / `.tag-cloud` / `.badge-list` / `.chat-bubble` / `.person-card` / `.venn` 这些识别。

**4 条 T1 提取出的组件 class 集合 size 必须 ≥ 4**，否则 validate-digest.js 报错。

#### 四组件实操范例（直接抄）

##### T1#1 — `numbered-grid`（适合多用例 / 步骤）

```html
<p>第一段 ~140 字，描述事件本身与背景。</p>
<div class="numbered-grid">
  <div class="numbered-item"><div class="num">1</div><div class="num-text">用例描述 1</div></div>
  <div class="numbered-item"><div class="num">2</div><div class="num-text">用例描述 2</div></div>
  <div class="numbered-item"><div class="num">3</div><div class="num-text">用例描述 3</div></div>
  <div class="numbered-item"><div class="num">4</div><div class="num-text">用例描述 4</div></div>
</div>
<p>第二段 ~340 字，分析与影响判断。</p>
```

##### T1#2 — `tag-cloud`（适合关键词 / 概念集合）

```html
<p>第一段 ~160 字。</p>
<div class="tag-cloud">
  <span class="tag-cloud-item tag-lg">核心词</span>
  <span class="tag-cloud-item tag-md">次级词1</span>
  <span class="tag-cloud-item tag-md">次级词2</span>
  <span class="tag-cloud-item tag-md">次级词3</span>
  <span class="tag-cloud-item tag-sm">辅助词1</span>
  <span class="tag-cloud-item tag-sm">辅助词2</span>
  <span class="tag-cloud-item tag-sm">辅助词3</span>
  <span class="tag-cloud-item tag-sm">辅助词4</span>
</div>
<p>第二段 ~320 字。</p>
```

##### T1#3 — `pros-cons`（适合风险对策 / 优劣对比）

```html
<p>第一段 ~170 字。</p>
<div class="pros-cons">
  <div class="pros-block">
    <strong>正方/风险</strong>
    <ul><li>要点1</li><li>要点2</li><li>要点3</li></ul>
  </div>
  <div class="cons-block">
    <strong>反方/对策</strong>
    <ul><li>要点1</li><li>要点2</li><li>要点3</li></ul>
  </div>
</div>
<p>第二段 ~280 字。</p>
```

##### T1#4 — `data-row` + `data-highlight`（适合数字对比）

```html
<p>第一段 ~170 字。</p>
<div class="data-row">
  <div class="data-highlight">
    <div class="data-value">$1.2T</div>
    <div class="data-label">指标 A 描述</div>
  </div>
  <div class="data-highlight">
    <div class="data-value">$380B</div>
    <div class="data-label">指标 B 描述</div>
  </div>
</div>
<p>第二段 ~280 字。</p>
```

#### 字数预算提示（避免组件膨胀触发字数下限）

切换到富组件后，HTML 标签会吃掉 200–400 字符。**纯文字段必须打到 510-540 字才能稳定通过 ≥ 500 校验**，组件本身贡献的文字（如 numbered-item 的标签）不算多。建议：两段段落分别 160 + 350 字，组件文字 30-60 字。

---

## Tier 2 — 第二梯队（Half-page，P6–P7）

### summary_zh（CRITICAL — 字数硬上限 210）

- **160–210 字**（硬上限 210 字），分为两个自然段
- 第一段：事件本身的描述（什么、谁、何时）
- 第二段：影响分析或背景补充（为什么重要、后续会怎样）

**Geometry lock**：Tier-2 summary 的字体被锁定在 36px / line-height 1.7（`half-page.html`）。这个字号是**可读性契约**，**绝对不可以为了塞下更多内容而缩小字体**。如果你发现字数超出上限：

1. **改写内容，不改字号**——删掉冗余形容、合并重复论点、用更紧凑的句式
2. 两段各砍 10-15 字通常就能回到 200 字内
3. 过度精简（<160 字）会让半页留白太多——宁可删一个论点也不要字字挤占

**为什么是 210**：36px 字体、1.7 行高、960px 容器下，半页 story 约有 8 行可用高度（扣掉标题、category、source-bar 和段间空行）。每行约 26 个中文字。8 × 26 = 208，取整为 210。超过这个数字第二个 story 就会把 footer 推出视口。

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

### headline_zh — 全部梯队

- **≤ 25 字**，零情绪化
- 详细标准 → `references/elements/typography.md` § 标题规范

### summary_zh — 全部梯队

- 写作风格 → `references/elements/typography.md` § 摘要写作标准
- 同一页面的多条摘要不得以相同句式开头

### highlight — 仅 Tier 1

一句关键数据或亮点，用于 Cover 页 Top 4 预览区。
