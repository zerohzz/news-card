---
name: xhs-image
description: >
  小红书信息图生成器，专为 zz AI 资讯日报定制。将日报内容转化为 1-10 张手绘卡通风格
  信息图封面，支持 11 种视觉风格 × 8 种信息布局，优化小红书互动与收藏表现。
version: 1.0.0
---

# XHS Image — 小红书信息图生成器

> **本 Skill 专为 zz AI 资讯日报服务。**
> 核心场景：为每日 AI 日报生成小红书封面配图、专题信息图、热点解读图。
> 通用场景同样支持：任意内容 → 小红书风格信息图系列。

## 概述

将任意内容转化为小红书（Little Red Book）风格的信息图系列。两个独立维度自由组合：

**视觉风格**（11 种）：
cute · fresh · warm · bold · minimal · retro · pop · notion · chalkboard · study-notes · screen-print

**信息布局**（8 种）：
sparse · balanced · dense · list · comparison · flow · mindmap · quadrant

## 触发方式

- "生成小红书配图"
- "为今天的日报做封面图"
- "make XHS images for today's digest"
- `$xhs-image`
- `$xhs-image --preset daily-cover`
- `$xhs-image --style notion --layout dense`

## 参数

| 参数 | 说明 | 默认 |
|------|------|------|
| `--style` | 视觉风格 (11 选 1) | 自动推荐 |
| `--layout` | 信息布局 (8 选 1) | 自动推荐 |
| `--preset` | 预设组合 (见下方) | — |
| `--count` | 图片数量 (1-10) | 自动推荐 |

### 日报专属预设

以下预设针对 AI 日报场景优化：

| --preset | Style | Layout | 场景 |
|----------|-------|--------|------|
| `daily-cover` | `notion` | `sparse` | 日报封面（默认推荐） |
| `daily-cover-v2` | HTML+NanoBanana | `quadrant` | 四格漫画混合封面（手动触发） |
| `daily-dense` | `notion` | `dense` | 日报信息密集版封面 |
| `hot-topic` | `bold` | `balanced` | 热点事件速报 |
| `tech-explain` | `chalkboard` | `flow` | 技术概念解读 |
| `ai-ranking` | `minimal` | `list` | AI 工具/模型排名 |
| `deep-dive` | `study-notes` | `dense` | 深度分析笔记 |
| `trend-poster` | `screen-print` | `sparse` | AI 趋势海报 |
| `weekly-recap` | `fresh` | `list` | 周报合集 |
| `model-compare` | `notion` | `comparison` | 模型对比 |
| `timeline` | `retro` | `flow` | AI 发展时间线 |

通用预设 → `references/style-presets.md`

### 风格画廊

| Style | Description |
|-------|-------------|
| `cute` | Sweet, adorable, girly — 经典小红书少女风 |
| `fresh` | Clean, refreshing, natural — 清新自然 |
| `warm` | Cozy, friendly, approachable — 温暖治愈 |
| `bold` | High impact, attention-grabbing — 高冲击力 |
| `minimal` | Ultra-clean, sophisticated — 极简高级 |
| `retro` | Vintage, nostalgic, trendy — 复古怀旧 |
| `pop` | Vibrant, energetic, eye-catching — 活力四射 |
| `notion` | Minimalist hand-drawn line art — 知识卡片风（**日报首推**） |
| `chalkboard` | Colorful chalk on black board — 黑板粉笔风 |
| `study-notes` | Realistic handwritten photo style — 学霸笔记风 |
| `screen-print` | Bold poster art, halftone textures — 丝网海报风 |

详细风格定义 → `references/presets/<style>.md`

### 布局画廊

| Layout | Description |
|--------|-------------|
| `sparse` | 极简信息，最大冲击力（1-2 个要点） |
| `balanced` | 标准内容布局（3-4 个要点） |
| `dense` | 高信息密度，知识卡片风格（5-8 个要点） |
| `list` | 列举/排名格式（4-7 项） |
| `comparison` | 左右对比布局 |
| `flow` | 流程/时间线布局（3-6 步） |
| `mindmap` | 中心辐射思维导图（4-8 分支） |
| `quadrant` | 四象限 / 环形分区布局 |

详细布局定义 → `references/elements/canvas.md`

### 自动风格匹配

| 内容信号 | Style | Layout | 推荐预设 |
|---------|-------|--------|---------|
| AI 日报、digest.json、每日新闻 | `notion` | sparse/dense | `daily-cover`, `daily-dense` |
| 热点新闻、重大事件、突发 | `bold` | balanced | `hot-topic` |
| 技术解释、概念科普、教程 | `chalkboard` | flow/balanced | `tech-explain` |
| 工具推荐、模型排名、榜单 | `minimal` | list | `ai-ranking` |
| 深度分析、论文解读、研究 | `study-notes` | dense | `deep-dive` |
| 趋势观点、行业评论、预测 | `screen-print` | sparse | `trend-poster` |
| 模型对比、产品测评、A vs B | `notion` | comparison | `model-compare` |
| AI 发展史、里程碑、回顾 | `retro` | flow | `timeline` |
| 周报、月度合集、盘点 | `fresh` | list | `weekly-recap` |

### Style × Layout 兼容矩阵

（✓✓ = 强烈推荐, ✓ = 可用, ✗ = 不建议）

| | sparse | balanced | dense | list | comparison | flow | mindmap | quadrant |
|---|:---:|:---:|:---:|:---:|:---:|:---:|:---:|:---:|
| cute | ✓✓ | ✓✓ | ✓ | ✓✓ | ✓ | ✓ | ✓ | ✓ |
| fresh | ✓✓ | ✓✓ | ✓ | ✓ | ✓ | ✓✓ | ✓ | ✓ |
| warm | ✓✓ | ✓✓ | ✓ | ✓ | ✓✓ | ✓ | ✓ | ✓ |
| bold | ✓✓ | ✓ | ✓ | ✓✓ | ✓✓ | ✓ | ✓ | ✓✓ |
| minimal | ✓✓ | ✓✓ | ✓✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| retro | ✓✓ | ✓✓ | ✓ | ✓✓ | ✓ | ✓ | ✓ | ✓ |
| pop | ✓✓ | ✓✓ | ✓ | ✓✓ | ✓✓ | ✓ | ✓ | ✓ |
| notion | ✓✓ | ✓✓ | ✓✓ | ✓✓ | ✓✓ | ✓✓ | ✓✓ | ✓✓ |
| chalkboard | ✓✓ | ✓✓ | ✓✓ | ✓✓ | ✓ | ✓✓ | ✓✓ | ✓ |
| study-notes | ✗ | ✓ | ✓✓ | ✓✓ | ✓ | ✓ | ✓✓ | ✓ |
| screen-print | ✓✓ | ✓✓ | ✗ | ✓ | ✓✓ | ✓ | ✗ | ✓✓ |

---

## 品牌调性（日报专属）

### 视觉身份

| 元素 | 规范 |
|------|------|
| 品牌名 | zz AI 资讯日报 |
| 品牌色 | 金色弧线 `#c5a059` + 暖白底 `#FAF9F6` |
| 强调色 | 琥珀 `#D97706` |
| 字体偏好 | 衬线体优先（Noto Serif SC），信息图中可用手绘体 |
| AI 标签 | `含AI辅助生成内容`，橙色 `#E8734A` 镂空徽章 |

### 分类色系

信息图中涉及 AI 新闻分类时，使用以下色彩体系：

| Category | 色值 | 用途 |
|----------|------|------|
| 模型发布 | #4A90D9 蓝 | 新模型、基准测试 |
| 产品应用 | #7B68EE 紫 | 产品上线、功能更新 |
| 安全对齐 | #E74C3C 红 | AI 安全研究 |
| 行业动态 | #F39C12 橙 | 融资、战略 |
| 开发工具 | #2ECC71 绿 | SDK、框架 |
| 研究前沿 | #1ABC9C 青 | 论文、突破 |
| 开源生态 | #E67E22 深橙 | 开源项目 |
| 政策监管 | #95A5A6 灰 | 法规、合规 |
| 劳动力影响 | #8E44AD 紫红 | AI 与就业 |

### 编辑人格

与 news-card Skill 一致——温柔但有力量的资深科技编辑：
- **反标题党**：标题陈述事实，不贩卖情绪
- **分析性视角**：回答「为什么重要」而非仅「发生了什么」
- **有温度的专业感**：像信任的前辈聊新闻，不像没有灵魂的简报

信息图的文案也必须遵循这一人格——**不使用夸张词、不用感叹号、不制造焦虑**。

---

## 工作流

### 进度清单

```
XHS Infographic Progress:
- [ ] Step 0: 检查偏好设置 (EXTEND.md) ⛔ BLOCKING
  - [ ] 找到 → 加载偏好 → 继续
  - [ ] 未找到 → 首次设置 → 必须完成后才能进入 Step 1
- [ ] Step 1: 分析内容 → analysis.md
- [ ] Step 2: 智能确认 ⚠️ 必须确认
  - [ ] 路径 A: 快速确认 → 生成推荐大纲
  - [ ] 路径 B: 自定义 → 调整后生成大纲
  - [ ] 路径 C: 详细模式 → 3 套大纲 → 二次确认 → 生成大纲
- [ ] Step 3: 顺序生成图片
- [ ] Step 4: 完成报告
```

### 流程图

```
Input → [Step 0: 偏好] ─┬─ 找到 → 继续
                        │
                        └─ 未找到 → 首次设置 ⛔ BLOCKING
                                    │
                                    └─ 完成设置 → 保存 EXTEND.md → 继续
                                                                      │
        ┌─────────────────────────────────────────────────────────────┘
        ↓
分析 → [智能确认] ─┬─ 快速: 确认推荐 → outline.md → 生成 → 完成
                   │
                   ├─ 自定义: 调整选项 → outline.md → 生成 → 完成
                   │
                   └─ 详细: 3 套大纲 → [二次确认] → outline.md → 生成 → 完成
```

### Step 0 — 加载偏好设置（阻塞步骤）

**CRITICAL**: 如果 EXTEND.md 未找到，必须先完成首次设置。不得跳过，不得先询问内容/风格/受众。

检查 EXTEND.md 存在性（优先级顺序）：

| 路径 | 位置 |
|------|------|
| `.xhs-image/EXTEND.md` | 项目目录 |
| `$HOME/.xhs-image/EXTEND.md` | 用户目录 |

| 结果 | 操作 |
|------|------|
| 找到 | 读取、解析、显示摘要 → 进入 Step 1 |
| 未找到 | ⛔ BLOCKING: 仅执行首次设置 → 保存 EXTEND.md → 然后 Step 1 |

首次设置流程 → `references/config/first-time-setup.md`
偏好格式 → `references/config/preferences-schema.md`

EXTEND.md 支持：水印 | 偏好风格/布局 | 自定义风格定义 | 语言偏好

### Step 1 — 深度内容分析

使用分析框架对输入内容进行深度分析：

1. 识别内容类型（日报封面 / 热点解读 / 技术科普 / 工具推荐 / 行业分析）
2. 评估标题钩子力度（1-5 星）
3. 确定目标受众画像（AI 从业者 / 技术爱好者 / 泛科技读者）
4. 分析互动潜力（收藏/分享/评论触发点）
5. 规划视觉表达机会
6. 设计滑动叙事弧

分析框架 → `references/workflows/analysis-framework.md`

**日报场景快捷判断**：
- 如果输入是 `digest.json` 或当日新闻列表 → 自动推荐 `daily-cover` 预设
- 如果输入是单条深度新闻 → 自动推荐 `hot-topic` 或 `deep-dive`
- 如果输入是技术概念解释 → 自动推荐 `tech-explain`
- 如果输入是工具/模型对比 → 自动推荐 `model-compare`

**输出**: 将分析结果保存为 `analysis.md`

### Step 2 — 智能确认（必须确认）

基于 Step 1 的分析，呈现自动推荐方案：

```
📊 分析结果：
- 内容类型：AI 日报封面
- 目标受众：AI 从业者 / 科技爱好者
- 推荐方案：notion + sparse（daily-cover），3 张图

三种路径可选：
1️⃣ 快速确认 — 直接使用推荐方案生成
2️⃣ 自定义 — 调整风格/布局/数量（一轮交互）
3️⃣ 详细模式 — 生成 3 种策略大纲供选择
```

#### 路径 1: 快速确认

用户回复确认 → 立即生成大纲 → 进入 Step 3

#### 路径 2: 自定义

用户可调整的选项（留空 = 保持推荐值）：

1. **策略风格**: A 信息密集(notion) | B 故事驱动(warm) | C 视觉冲击(screen-print)。或直接指定风格名/预设名
2. **布局**: sparse | balanced | dense | list | comparison | flow | mindmap | quadrant
3. **图片数量**: 2-10
4. **补充说明**（可选）: 重点强调、受众调整、颜色偏好等

调整后 → 生成大纲 → 保存 `outline.md` → 进入 Step 3

#### 路径 3: 详细模式

**Step 2a: 内容理解确认**

询问用户：
1. 核心卖点（多选）
2. 目标受众
3. 风格偏好: 真诚分享 / 专业测评 / 氛围感 / 自动
4. 补充说明（可选）

更新 `analysis.md`。

**Step 2b: 生成 3 套大纲**

| 策略 | 文件 | 推荐风格 | 焦点 |
|------|------|---------|------|
| A: 信息密集型 | `outline-strategy-a.md` | notion, minimal, chalkboard | 日报精选 + 数据亮点 + 行业洞察（**日报首推**） |
| B: 故事驱动型 | `outline-strategy-b.md` | warm, cute, fresh | 围绕当日最大新闻展开叙事 |
| C: 视觉冲击型 | `outline-strategy-c.md` | bold, pop, screen-print | 极简海报风，一个核心观点 |

大纲格式要求（YAML front matter + 内容）：
```yaml
---
strategy: a
name: Information-Dense
style: notion
style_reason: "Notion 风格的知识卡片感最适合日报信息密集呈现"
elements:
  background: solid-white
  decorations: [hand-drawn-lines, arrows-curvy]
  emphasis: circle-mark
  typography: none
layout: dense
image_count: 3
---
```

**差异化要求**：
- 每种策略必须有不同的大纲结构和不同的推荐风格
- 页数适配: A 通常 3-5, B 通常 4-6, C 通常 3-4
- 必须包含 `style_reason` 解释为什么这个风格适合该策略

**Step 2c: 大纲选择确认**

用户选择：
- Q1: 策略选择 (A / B / C / 混合)
- Q2: 视觉风格 (用推荐 | 选预设 | 选风格 | 自定义描述)
- Q3: 视觉元素 (用默认 | 调整背景 | 调整装饰 | 自定义)

确认后 → 保存 `outline.md` → 进入 Step 3

大纲模板 → `references/workflows/outline-template.md`

### Step 3 — 顺序生成图片

**按顺序逐张生成**，确保视觉一致性。

**对每张图（封面 + 内容 + 结尾）**：

1. 保存 prompt 到 `prompts/NN-{type}-[slug].md`（使用用户偏好语言）
   - **备份规则**: 如果 prompt 文件已存在，重命名为 `NN-{type}-[slug]-backup-YYYYMMDD-HHMMSS.md`
2. 生成图片：
   - **图片 1**: 直接生成（无 `--ref`），建立视觉锚点
   - **图片 2+**: 使用图片 1 作为 `--ref` 参考图，确保风格一致
   - **备份规则**: 如果图片文件已存在，重命名加时间戳后缀
3. 每张生成后报告进度

**当前仓库最小执行后端（Google / Gemini 官方 API）**：
- 命令入口：`node skills/xhs-image/scripts/generate.js`
- 图片 1：`node skills/xhs-image/scripts/generate.js --promptfile prompts/01-cover-topic.md --image images/01-cover-topic.png`
- 图片 2+：`node skills/xhs-image/scripts/generate.js --promptfile prompts/02-content-topic.md --image images/02-content-topic.png --ref images/01-cover-topic.png`
- 密钥加载：优先读取 shell 环境变量；若项目根目录存在 `.env`，也会自动加载其中的 `GOOGLE_API_KEY` 或 `GEMINI_API_KEY`
- 可选默认值：可在 `.xhs-image/EXTEND.md` 中添加 `image_generation.provider`、`image_generation.model`、`image_generation.quality`、`image_generation.aspect_ratio`
- 当前优先级：`命令行参数 > .env / shell 环境变量 > .xhs-image/EXTEND.md > 内置默认值`

Prompt 组装规则 → `references/workflows/prompt-assembly.md`

**水印应用**（如偏好中启用）：
在每张图的 prompt 中添加水印指令。参考 → `references/config/watermark-guide.md`

**Session 管理**：
如果图片生成工具支持 `--sessionId`：
1. 生成唯一 session ID: `xhs-{topic-slug}-{timestamp}`
2. 所有图片使用同一 session ID
3. 配合参考图链，确保最大视觉一致性

### Step 4 — 完成报告

```
Xiaohongshu Infographic Series Complete!

Topic: [topic]
Mode: [快速 / 自定义 / 详细]
Strategy: [A/B/C/混合]
Style: [style name]
Layout: [layout name or "varies"]
Location: [directory path]
Images: N total

✓ analysis.md
✓ outline.md
✓ outline-strategy-a/b/c.md (仅详细模式)

Files:
- 01-cover-[slug].png ✓ Cover (sparse)
- 02-content-[slug].png ✓ Content (balanced)
- 03-ending-[slug].png ✓ Ending (sparse)
```

---

## 图片修改

| 操作 | 步骤 |
|------|------|
| **编辑** | **先更新 prompt 文件** → 用同一 session ID 重新生成 |
| **添加** | 指定位置 → 创建 prompt → 生成 → 后续文件重新编号（NN+1）→ 更新大纲 |
| **删除** | 删除文件 → 后续文件重新编号（NN-1）→ 更新大纲 |

**IMPORTANT**: 修改图片时，**必须先更新 prompt 文件**再重新生成。这确保改动可记录、可复现。

## 内容拆分原则

1. **封面（图 1）**: 钩子 + 视觉冲击 → `sparse` 布局
2. **内容（中间）**: 每张一个核心价值点 → `balanced`/`dense`/`list`/`comparison`/`flow`
3. **结尾（最后）**: CTA / 总结 → `sparse` 或 `balanced`

---

## 文件组织

每次生成创建以下目录结构：

```
{topic-slug}-{timestamp}/
├── analysis.md          ← Step 1 分析结果
├── outline.md           ← 最终选定的大纲
├── outline-strategy-a.md  ← (详细模式) 策略 A
├── outline-strategy-b.md  ← (详细模式) 策略 B
├── outline-strategy-c.md  ← (详细模式) 策略 C
├── prompts/             ← 每张图的 prompt 文件
│   ├── 01-cover-{slug}.md
│   ├── 02-content-{slug}.md
│   └── ...
└── images/              ← 生成的图片
    ├── 01-cover-{slug}.png
    ├── 02-content-{slug}.png
    └── ...
```

如果目录下已有文件，重命名备份文件加时间戳后缀。

---

## 大纲策略详解

### 策略 A: 信息密集型（日报首推）

| 维度 | 说明 |
|------|------|
| **理念** | 价值优先，高效信息传递 |
| **特点** | 结构清晰、要点明确、专业可信 |
| **适合** | 日报封面、工具推荐、对比测评、知识卡片 |
| **结构** | 核心结论 → 信息卡 → 优劣对比 → 推荐 |
| **推荐风格** | notion, minimal, chalkboard |

### 策略 B: 故事驱动型

| 维度 | 说明 |
|------|------|
| **理念** | 以个人体验为主线，情感共鸣优先 |
| **特点** | 从痛点出发，展示前后变化，真实感强 |
| **适合** | 热点事件叙事、行业深度分析、趋势解读 |
| **结构** | 钩子 → 问题 → 发现 → 体验 → 总结 |
| **推荐风格** | warm, cute, fresh |

### 策略 C: 视觉冲击型

| 维度 | 说明 |
|------|------|
| **理念** | 视觉冲击为核心，极简文字 |
| **特点** | 大画面、强氛围、即时吸引 |
| **适合** | 趋势海报、重大事件速报、品牌宣传 |
| **结构** | 主视觉 → 细节 → 氛围场景 → CTA |
| **推荐风格** | bold, pop, retro, screen-print |

---

## 日报封面最佳实践

### 推荐封面结构（daily-cover 预设）

1. **封面图**（sparse）：日期 + 品牌标识 + 当日最大新闻标题 + 视觉钩子
2. **核心内容图**（dense/list）：Top 4 新闻 + 分类色块 + 关键数据
3. **互动引导图**（sparse）：CTA + 关注引导 + hashtag

### 封面图文案规则

- 标题 ≤ 20 字，遵循日报「零情绪化」原则
- 使用日期格式：`MM.DD` 或 `MM/DD`
- 品牌标识：`zz AI 资讯日报` 或简写 `zz AI Daily`
- 分类徽章使用对应分类色

### 小红书互动设计

- 封面图必须有明确的「看下去」动力
- 最后一张必须有 CTA（收藏/关注/评论引导）
- Hashtag 建议：#zz的AI资讯 #人工智能 #科技 + 当日热点 tag

---

## 核心设计元素

### 画布

- **默认比例**: 3:4 竖版（1242×1660px）— XHS 最高流量比例
- **安全区**: 避开底部 10%（标题栏）、右上角（点赞按钮）
- 详细规格 → `references/elements/canvas.md`

### 排版

- 手绘风格优先，拒绝电脑字体
- 文字层级: H1 → H2 → H3 → Body → Caption
- 中文排版: 间距 0.05em，行高 1.5-1.8x
- 详细规格 → `references/elements/typography.md`

### 装饰元素

- 强调标记、背景、涂鸦、边框、分隔线、贴纸
- 按风格匹配装饰元素
- 详细目录 → `references/elements/decorations.md`

### 图片效果

- 抠图、描边、滤镜、纹理、混合模式
- 按风格搭配效果组合
- 详细规格 → `references/elements/image-effects.md`

---

## 与 news-card Skill 的关系

| 维度 | news-card | xhs-image |
|------|-----------|-----------|
| 输出格式 | HTML → PNG（Playwright 截图） | AI 生成手绘信息图 |
| 风格 | 固定衬线体排版，9:16 卡片 | 11 种手绘风格，3:4 卡通图 |
| 用途 | 日报正式卡片（10 张/期） | 日报封面配图、专题图、社交传播图 |
| 触发 | `$news-card`（自动管线） | `$xhs-image`（按需生成） |
| 数据依赖 | 无（自行 fetch） | 可读取 news-card 的 digest.json |

**典型协作流程**：
1. `$news-card` 生成当日 10 张日报卡片
2. `$xhs-image --preset daily-cover` 基于 digest.json 生成额外的小红书封面图
3. 封面图用于小红书首图，吸引用户点击查看完整日报卡片

---

## V2 封面模式（daily-cover-v2）

HTML + NanoBanana 混合封面，专为小红书首图设计。

### 布局结构

```
┌─────────────────────────────┐  280px safe-top
│    日期 + zz AI每日资讯 logo │
│    精简 slogan（无 $10）     │
│    ════════════════════     │
│    N精选 | M+候选 | P+来源   │
│  ┌──────────┬──────────┐    │
│  │  news 1  │  news 2  │    │  ← 2×2 四格漫画
│  ├──────────┼──────────┤    │     placeholder / NanoBanana 生成
│  │  news 3  │  news 4  │    │
│  └──────────┴──────────┘    │
│              [含AI辅助生成内容]│
└─────────────────────────────┘  240px safe-bot
```

### 触发方式

用户必须明确说"现在用xhs-image生成封面"才会触发。默认不生成。

### 两阶段生成

1. **Phase A — HTML 渲染**：使用 `templates/v2-cover.html` 模板 + digest.json 数据渲染 → Playwright 截图。四格区域显示 placeholder（分类色底 + 标题文字）
2. **Phase B — NanoBanana 替换**（未来）：为 4 条 tier-1 新闻各生成一张漫画风配图 → 注入 `comic_image` 字段 → 重新渲染截图

### 模板变量

与 news-card hero-cover.html 相同：`date_year`, `date_md`, `date_dow`, `readingMinutes`, `savedHours`, `total`, `sourceCount`, `numSources`, `tier1[]`

额外变量：`tier1[].comic_image` — NanoBanana 生成的图片路径（可选，为空时显示 placeholder）

---

## 文件索引

| 用途 | 路径 |
|------|------|
| 本文件（Skill 入口） | `SKILL.md` |
| V2 封面 HTML 模板 | `templates/v2-cover.html` |
| 预设快捷方式 | `references/style-presets.md` |
| 首次设置流程 | `references/config/first-time-setup.md` |
| 偏好格式定义 | `references/config/preferences-schema.md` |
| 水印配置指南 | `references/config/watermark-guide.md` |
| 画布与布局规格 | `references/elements/canvas.md` |
| 排版系统 | `references/elements/typography.md` |
| 装饰元素目录 | `references/elements/decorations.md` |
| 图片效果规格 | `references/elements/image-effects.md` |
| 内容分析框架 | `references/workflows/analysis-framework.md` |
| 大纲模板 | `references/workflows/outline-template.md` |
| Prompt 组装指南 | `references/workflows/prompt-assembly.md` |
| 风格预设（11 种） | `references/presets/*.md` |

## Notes

- 生成失败自动重试一次 | 敏感人物使用卡通替代
- 使用用户确认的语言偏好 | 保持系列内风格一致性
- **智能确认（Step 2）必须执行** — 不可跳过；详细模式使用两次子确认
- 日报场景下默认推荐 `notion` 风格 — 知识卡片感最契合 AI 日报调性

## Extension Support

通过 EXTEND.md 自定义配置。见 **Step 0** 中的路径和支持选项。
