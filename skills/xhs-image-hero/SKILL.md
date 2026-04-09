---
name: xhs-image-hero
description: >
  为 zz AI 资讯日报 V2 封面生成 Hero Image。读取 digest.json 的 4 条 tier-1 新闻，
  通过 NanoBanana/Gemini 生成一张 1:1 四格漫画风合成图，嵌入 V2 封面 HTML 模板。
version: 1.0.0
---

# xhs-image-hero — Hero Image Generator

> 专为 V2 封面设计。将 4 条头条新闻转化为一张 1:1 四格漫画风 Hero Image。

## 触发方式

- "现在用xhs-image生成封面"
- `$xhs-image-hero`

**手动触发专用** — 不会在 news-card 管线中自动执行。

---

## 图片规格

| 项目 | 值 |
|------|-----|
| 尺寸 | 1:1 正方形 |
| 分辨率 | 2048×2048px（2k quality） |
| 风格 | 手绘编辑风漫画，Notion 线描启发 |
| 内容 | 2×2 网格，每格 = 1 条 tier-1 新闻 |
| 语言 | 中文标题 + 英文来源名 |
| 输出 | `output/<timestamp>/hero-image.png` |

---

## 品牌标识

### 色彩

| 角色 | 色值 | 用途 |
|------|------|------|
| 背景 | `#FFF9F5` 暖白 | 画布底色 |
| 墨色 | `#1C1917` 近黑 | 线条、标题文字 |
| 金色 | `#c5a059` | 品牌弧线、装饰强调 |
| 强调 | `#E8734A` 橙 | AI 标签、分隔线 |

### 分类色（每格漫画的色彩标识）

| 分类 | 色值 |
|------|------|
| 模型发布 | `#4A90D9` 蓝 |
| 产品应用 | `#7B68EE` 紫 |
| 安全对齐 | `#E74C3C` 红 |
| 行业动态 | `#F39C12` 橙 |
| 开发工具 | `#2ECC71` 绿 |
| 研究前沿 | `#1ABC9C` 青 |
| 开源生态 | `#E67E22` 深橙 |
| 政策监管 | `#95A5A6` 灰 |
| 劳动力影响 | `#8E44AD` 紫红 |

### 字体

| 用途 | 字体 |
|------|------|
| 中文标题 | Noto Serif SC 700/900 |
| 英文标识 | Source Serif Pro 700 |
| 信息图中 | 手绘体（AI 生成，非电脑字体） |

### 编辑人格

- **反标题党**：标题陈述事实，不贩卖情绪
- **分析性视角**：回答「为什么重要」而非仅「发生了什么」
- **不使用夸张词、不用感叹号、不制造焦虑**

---

## 工作流

```
digest.json → 提取 4 条 tier-1 → 组装 prompt → 生成图片 → 嵌入 V2 封面
```

### Step 1 — 读取数据

从 `workspace/digest.json`（或当前 run 的 digest）提取 4 条 tier-1 新闻：

```json
{
  "headline_zh": "Anthropic源码泄露引发IPO危机",
  "headline_en": "Anthropic Claude Code Source Leak",
  "category": "行业动态",
  "color_tag": "#F39C12",
  "source": "The Register"
}
```

### Step 2 — 组装 Prompt

使用 `references/hero-prompt-template.md` 作为骨架，将 4 条新闻填入对应面板。

每条新闻需要：
1. `headline_zh` — 中文标题（**必须使用 digest.json 中的完整标题，禁止截断**）
2. `category` + `color_tag` — 分类色标识（也作为面板边框颜色）
3. `primary_tag` — 右上角关键词标签（公司名/产品名/核心主题，**不是色号**）
4. `3 keyword tags` — 底部三个关键词 pill（苹果风圆角空心框）
5. `visual_concept` — **由 Claude 基于标题生成**的视觉概念描述（1-2 句英文）

**面板结构（每格，从上到下）**：
- 左上：分类色点 + 分类名
- 右上：Primary tag（如 "Anthropic"、"健康"、"Gemini"）
- 上部居中：手绘中文标题（**每格只出现一次，不可重复**）
- 下部居中：手绘插图（在标题下方、关键词上方）
- 底部：3 个关键词 pill badge（空心圆角矩形）
- 边框：使用分类色（非黑色），苹果风大圆角

**⚠️ 常见错误：标题在每格中出现两次（插图上方和下方各一次）。标题只出现一次。**

**博主 IP 客串**：
- 随机在 1-2 个面板中加入博主 zz 卡通形象（卷发、圆框眼镜、西装领带）
- 表情匹配新闻情绪，小型客串（≤15% 面板面积）
- 参考形象：`assets/zz-IP-Ref.png`
- 详见 → `references/hero-prompt-template.md` 的博主 IP 客串机制

**视觉概念生成规则**：
- 用具体可画的场景描述，不用抽象词
- 匹配新闻主题：源码泄露 → 碎裂的代码屏幕；医疗 AI → 机器人与听诊器
- 风格统一：简洁线描，几何形状，不画真人面孔

### Step 3 — 生成图片

```bash
node skills/xhs-image-hero/scripts/generate.js \
  --promptfile output/<timestamp>/hero-prompt.md \
  --image output/<timestamp>/hero-image.png \
  --ar 1:1 \
  --quality 2k
```

- 先将组装好的 prompt 保存为 `hero-prompt.md`
- 生成失败自动重试一次
- 敏感人物使用卡通替代

### Step 4 — 嵌入 V2 封面

将生成的图片路径注入 `templates/v2-cover.html` 的 `{{hero_image}}` 变量，然后用 Playwright 截图产出最终 V2 封面 PNG。

---

## Prompt 模板

详见 → `references/hero-prompt-template.md`

核心结构：
1. 图片规格（1:1, 手绘风）
2. 视觉风格（Notion 线描，暖白底，分类色点缀）
3. 4 个面板内容（标题 + 视觉概念 + 分类色）
4. 规则约束（手绘字体、无真人、视觉一致性）

---

## V2 封面模板变量

| 变量 | 来源 | 示例 |
|------|------|------|
| `{{date_year}}` | render-html.js | `2026` |
| `{{date_dow_zh}}` | render-html.js | `周一` |
| `{{date_month}}` | render-html.js | `4` |
| `{{date_day}}` | render-html.js | `07` |
| `{{readingMinutes}}` | 动态计算 | `3` |
| `{{savedHours}}` | 固定 | `3` |
| `{{total}}` | digest.json 条数 | `24` |
| `{{sourceCount}}` | CLI `--source-count` | `136` |
| `{{numSources}}` | CLI `--num-sources` | `65` |
| `{{hero_image}}` | hero-image.png 路径 | `file:///...` |

---

## 文件索引

| 用途 | 路径 |
|------|------|
| 本文件（Skill 入口） | `SKILL.md` |
| Prompt 模板 | `references/hero-prompt-template.md` |
| 图片生成脚本 | `scripts/generate.js` |
| V2 封面 HTML 模板 | `templates/v2-cover.html` |
| 博主头像 | `../news-card/assets/Avatar-zz.png` |
| 博主 IP 表情参考 | `../news-card/assets/zz-IP-Ref.png` |
