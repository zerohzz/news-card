---
name: hero-prompt-template
description: Prompt template for generating 2×2 comic grid hero image
---

# Hero Image Prompt Template

将以下模板中的 `{placeholder}` 替换为实际新闻数据后，作为 `--promptfile` 传入 `generate.js`。

---

## 模板

```
Create a 2×2 comic-style editorial infographic with 4 panels:

## Image Specifications

- **Aspect Ratio**: 1:1 (square)
- **Resolution**: High resolution 2048px
- **Style**: Hand-drawn editorial illustration, Notion-inspired clean line art
- **Layout**: 2×2 grid, each panel has its own CATEGORY-COLORED border (rounded corners, Apple-style)

## Visual Style

- Clean hand-drawn ink line art on warm white (#FFF9F5) background
- Simple geometric shapes, minimal doodles, subtle pastel accents
- Each panel: one central illustration + hand-drawn headline text
- Each panel's BORDER COLOR matches its category accent color (not black)
- Grid dividers: thin gold (#c5a059) lines between panels
- Consistent line weight and illustration style across all 4 panels
- Light paper grain texture for warmth
- Apple-style rounded corners (large radius) on each panel border

## Panel Structure (each panel, top to bottom)

1. **Top-left**: Category dot (colored circle) + category name in Chinese
2. **Top-right**: Primary tag with # prefix — the MOST RELEVANT keyword prefixed with "#" (e.g. "#Anthropic", "#健康", "#Gemini"). NOT a color hex code.
3. **Center**: Hand-drawn illustration + hand-drawn Chinese headline
4. **Bottom**: 3 keyword tags in Apple-style hollow rounded-rect pill badges, spaced evenly. Each badge is an outlined (not filled) rounded rectangle with the keyword inside.

## Brand Colors

- Background: #FFF9F5 (warm white / cream)
- Lines and text: #1C1917 (near-black)
- Grid dividers: #c5a059 (gold), thin 2px lines
- Panel borders: each panel uses its own category accent color (see below)

## Content — 4 Panels

### Panel 1 (top-left)
- Category: {category_1} — border & accent color {color_1}
- Primary tag: {primary_tag_1}
- Headline (hand-drawn Chinese): {headline_zh_1}
- 3 keyword tags: {tag_1a}, {tag_1b}, {tag_1c}
- Visual: {visual_concept_1}

### Panel 2 (top-right)
- Category: {category_2} — border & accent color {color_2}
- Primary tag: {primary_tag_2}
- Headline (hand-drawn Chinese): {headline_zh_2}
- 3 keyword tags: {tag_2a}, {tag_2b}, {tag_2c}
- Visual: {visual_concept_2}

### Panel 3 (bottom-left)
- Category: {category_3} — border & accent color {color_3}
- Primary tag: {primary_tag_3}
- Headline (hand-drawn Chinese): {headline_zh_3}
- 3 keyword tags: {tag_3a}, {tag_3b}, {tag_3c}
- Visual: {visual_concept_3}

### Panel 4 (bottom-right)
- Category: {category_4} — border & accent color {color_4}
- Primary tag: {primary_tag_4}
- Headline (hand-drawn Chinese): {headline_zh_4}
- 3 keyword tags: {tag_4a}, {tag_4b}, {tag_4c}
- Visual: {visual_concept_4}

## Blogger IP Cameo (OPTIONAL)

{ip_cameo_instruction}

## Rules (CRITICAL)

1. ALL text MUST be hand-drawn style — NO computer-generated or realistic fonts
2. Keep each headline concise, maximum 15 Chinese characters
3. Each panel has a distinct illustration but shares the same art style
4. Maintain visual consistency: same line weight, same color temperature
5. NO realistic or photographic elements — everything is hand-drawn
6. Panel borders use CATEGORY COLOR, not black
7. Top-right tag is "#keyword" format (e.g. #Anthropic), NOT a hex color code
8. Bottom of each panel has 3 keyword pills in outlined rounded-rect badges
9. Leave breathing room — do not overcrowd any panel
10. Keyword pill badges: outlined (hollow), rounded corners, hand-drawn style

Aspect ratio: 1:1.
High resolution 2048px.
```

---

## 字段生成指南

### Primary Tag（右上角标签）

从新闻标题中提取最核心的**一个关键词**：

| 新闻类型 | Primary Tag 示例 |
|---------|----------------|
| 公司新闻 | 公司名（Anthropic, OpenAI, Google） |
| 产品更新 | 产品名（Gemini, ChatGPT, Claude） |
| 研究论文 | 核心主题（对齐, 推理, 安全） |
| 行业趋势 | 领域（健康, 教育, 金融） |

### 3 Keyword Tags（底部三个标签）

每条新闻提取 3 个关键词，放在苹果风圆角空心 pill 中：
- 每个关键词 2-4 个中文字
- 覆盖：主体 + 事件 + 影响/领域
- 示例：`源码泄露` `IPO危机` `安全审计`

### Visual Concept（视觉概念）

| 新闻主题 | 视觉概念示例 |
|---------|------------|
| 模型发布/基准测试 | A glowing brain icon with ascending benchmark bars |
| 产品上线/功能更新 | A smartphone screen with sparkle effects and new UI elements |
| 源码泄露/安全事件 | A cracked shield with code fragments floating outward |
| 医疗 AI | A stethoscope intertwined with circuit board patterns |
| 地图/规划工具 | A compass rose overlaid on a geometric city grid |
| AI 研究/论文 | An open book with neural network diagrams emerging |
| 融资/IPO | Rising bar chart with a flag at the peak |
| 开源项目 | A tree with branching nodes, open-source logo leaves |
| 政策/监管 | A balanced scale with a gavel and microchip |
| AI 与就业 | A hand reaching toward a robot hand, puzzle pieces between |

**原则**：具体、可画、无真人、与新闻主题直接相关。

---

## 博主 IP 客串机制

### IP 形象描述

博主 zz 的卡通形象（用于 prompt 中描述，配合 `--ref assets/zz-IP-Ref.png` 参考图）：
- **外貌**：年轻男性，卷发/蓬松黑发，戴圆框眼镜，穿西装打领带
- **风格**：黑白线描漫画风，与面板整体手绘风格一致
- **表情库**：开心、思考、惊讶、满意、严肃、得意等（参考 `assets/zz-IP-Ref.png`）
- **呈现方式**：**全身或半身**卡通人物，不仅仅是头像。要融入新闻场景中扮演角色。

### 客串规则

| 规则 | 说明 |
|------|------|
| 频率 | **仅出现在 1 个面板**（4 格中选 1 格） |
| 角色融入 | zz 必须以**角色扮演**方式融入该面板的新闻场景，而非单纯站在角落 |
| 服装变化 | 可根据场景换装：医疗→白大褂、安全→盾牌/警示、技术→实验服等，但保留核心特征（卷发、圆框眼镜） |
| 大小 | 中等，约占面板 20-30% 面积，作为场景中的角色之一 |
| 表情 | 匹配新闻情绪和角色 |

### 角色融入示例

| 新闻主题 | zz 的角色 |
|---------|----------|
| 源码泄露/安全事件 | zz 穿西装，惊讶地看着碎裂的屏幕，手里拿着放大镜 |
| 医疗 AI/健康 | zz 穿白大褂，戴听诊器，认真地看着数据 |
| 地图/导航产品 | zz 拿着地图或指南针，好奇地研究路线 |
| AI 安全/认知偏差 | zz 头上冒问号，被甜言蜜语的对话气泡包围，表情困惑 |
| 模型发布/基准 | zz 兴奋地指着上升的图表 |
| 开源项目 | zz 坐在电脑前，开心地写代码 |

### Prompt 注入方式

`{ip_cameo_instruction}` 替换为以下内容（Claude 选择 1 个最适合的面板）：

```
IMPORTANT: The reference image provided shows the blogger character "zz" — a young male with curly/messy black hair and round glasses. Use this reference to draw "zz" consistently.

In exactly ONE of the 4 panels, include the blogger character "zz" as a FULL-BODY or HALF-BODY cartoon character integrated into the scene:
- Core features (MUST keep): curly/messy black hair, round glasses
- Outfit: adapt to the panel's theme (e.g. lab coat for health, suit for business, casual for tech)
- Size: medium, about 20-30% of panel area — he is a CHARACTER in the scene, not a tiny icon
- Role: he should be DOING something relevant to the news story, not just standing there
- This panel's specific role for zz: {zz_role_description}
```

### 是否启用客串的判断

默认启用。Claude 在组装 prompt 时：
1. 从 4 条新闻中选择**最适合角色融入**的 1 条
2. 为 zz 设计具体的角色和动作描述（填入 `{zz_role_description}`）
3. 生成时必须传入 `--ref assets/zz-IP-Ref.png` 以确保形象一致性
