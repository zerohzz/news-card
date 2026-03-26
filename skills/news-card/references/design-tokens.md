# 设计变量（Design Tokens）

本文件仅包含设计变量。布局规则（padding, margin, grid, flex）在各 HTML 模板中定义，不在此文件中。

---

## 字体

```css
--font-zh: 'Noto Serif SC', 'Source Han Serif SC', 'PingFang SC', serif;
--font-en: 'Source Serif Pro', 'Noto Serif', serif;
--font-mono: 'JetBrains Mono', 'SF Mono', monospace;
```

**强制规则**：永远使用衬线体，永远不用无衬线体（如 Helvetica, Arial, PingFang SC Regular 等）。

Google Fonts 引入：
```html
<link href="https://fonts.googleapis.com/css2?family=Noto+Serif+SC:wght@400;600;700;900&family=Source+Serif+Pro:wght@400;600;700;900&display=swap" rel="stylesheet">
```

---

## 主题色（Claude-like 风格）

```css
--bg-primary: #FAF9F6;       /* 页面底色：暖白 */
--bg-card: #FFFFFF;           /* 卡片背景：纯白 */
--text-primary: #1A1A1A;      /* 主文字：近黑 */
--text-secondary: #6B7280;    /* 次要文字：灰 */
--accent: #D97706;            /* 强调色：琥珀 */
--divider: #E5E7EB;           /* 分割线：浅灰 */
```

---

## 分类色块

```css
--cat-model-release: #4A90D9;  /* 模型发布 — 蓝 */
--cat-product: #7B68EE;        /* 产品应用 — 紫 */
--cat-safety: #E74C3C;         /* 安全对齐 — 红 */
--cat-industry: #F39C12;       /* 行业动态 — 橙 */
--cat-devtools: #2ECC71;       /* 开发工具 — 绿 */
--cat-research: #1ABC9C;       /* 研究前沿 — 青 */
--cat-opensource: #E67E22;     /* 开源生态 — 深橙 */
--cat-policy: #95A5A6;         /* 政策监管 — 灰 */
--cat-labor: #8E44AD;          /* 劳动力影响 — 紫红 */
```

Category → CSS 变量映射：

| Category | CSS 变量 | 色值 |
|----------|---------|------|
| 模型发布 | `--cat-model-release` | #4A90D9 |
| 产品应用 | `--cat-product` | #7B68EE |
| 安全对齐 | `--cat-safety` | #E74C3C |
| 行业动态 | `--cat-industry` | #F39C12 |
| 开发工具 | `--cat-devtools` | #2ECC71 |
| 研究前沿 | `--cat-research` | #1ABC9C |
| 开源生态 | `--cat-opensource` | #E67E22 |
| 政策监管 | `--cat-policy` | #95A5A6 |
| 劳动力影响 | `--cat-labor` | #8E44AD |

---

## 字号层级（1080px 宽度下）

```css
--size-hero: 56px;      /* 封面大标题 */
--size-title: 40px;     /* 第一梯队标题 */
--size-subtitle: 28px;  /* 第二梯队标题 */
--size-body: 24px;      /* 正文 */
--size-caption: 20px;   /* 来源/标注 */
--size-brief: 18px;     /* 快讯正文 */
--size-brief-title: 22px; /* 快讯标题 */
```

---

## 行高

```css
--lh-title: 1.3;
--lh-body: 1.6;
--lh-brief: 1.4;
```

---

## 圆角

```css
--radius-card: 12px;
--radius-tag: 6px;
```
