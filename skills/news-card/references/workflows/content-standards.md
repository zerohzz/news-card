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
| 纯文字下限 | **≥ 400 字**（去 HTML 标签后） | 低于导致页面半空 |
| 总字符上限 | **≤ 900 字符**（含 HTML 标签） | 超过会被裁剪 |
| 可用高度 | ~1100px | 1920px - 标题区 ~320px - 页脚区 ~150px - 内边距 ~350px |
| 顶级组件上限 | **最多 4 个** | 段落 + 数据行 + 语义组件 + 结尾段落 |
| 组件硬限制 | **绝不超过 5 个** | 必然溢出导致页脚消失 |

**目标**：用信息把内容区填满但不溢出。写 400-500 字的深度内容，配合 1-2 个语义组件。

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

- content_html **≤ 900 字符**（含标签），包含 2-3 个 `<p>` 段落
- 至少使用 1 个语义组件（根据内容选择最合适的）
- **最多 4 个顶级组件**（段落、数据行、语义组件各算一个）
- 页面底部留有 footer 的空间 — 如果 footer 消失说明内容太长
- 所有 HTML class 名必须使用上表中列出的 class（模板已定义样式）

---

## Tier 2 — 第二梯队（Half-page，P6–P7）

### summary_zh

- **150–200 字**（硬上限 200 字），分为两个自然段
- 第一段：事件本身的描述（什么、谁、何时）
- 第二段：影响分析或背景补充（为什么重要、后续会怎样）

不要让半页留白太多，但也不要超出字数上限——超过 200 字会导致页脚被内容挤出可视区域。

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
