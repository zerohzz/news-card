---
name: xhs-cover-title
description: >
  为 zz AI 资讯日报 V3 封面生成 3 行钩子标题。读取 digest-xhs.json 的 tier-1 新闻，
  产出 {{cover_title_html}} HTML 片段，填入 V3 封面模板。
  在 news-card pipeline 中，digest 完成后、V3 封面渲染前调用。
---

# V3 封面标题生成

> 将今日 3 条头条新闻浓缩为 3 行大字标题，用于 V3 封面的安全区顶部。

## 输入 / 输出

- **输入**：`digest-xhs.json` 中 4 条 tier-1 新闻（选其中 3 条视觉反差最强的）
- **输出**：`{{cover_title_html}}` — 3 个 `<div class="ct-line">` 元素，含彩色文字 + 背景高亮

---

## 布局约束

| 约束 | 值 |
|------|---|
| 行数 | 恰好 3 行 |
| 每行字数 | 13–14 个 CJK 字符（英文字母更窄，混排可多几个） |
| 可用宽度 | 960px（1080px 页面 - 左右各 60px） |
| 字体 | NotoSerifSC Black 64px, letter-spacing 2px |
| 行间距 | 20px gap |
| 每行 = 1 条新闻 | 浓缩为一句有冲击力的陈述 |

**宽度估算**：CJK 字符约 66px/字，英文大写约 42px/字，英文小写约 35px/字。

---

## HTML 输出格式

```html
<div class="ct-line">
  <span class="ct-purple">Anthropic</span>
  <span class="ct-ink">发布</span>
  <span class="kw kw-gold ct-gold">云端Agent平台</span>
</div>
<div class="ct-line">
  <span class="ct-blue">Meta</span>
  <span class="kw kw-red ct-red">打破承诺</span>
  <span class="ct-ink">发首个闭源模型</span>
</div>
<div class="ct-line">
  <span class="ct-ink">AI聊天</span>
  <span class="kw kw-accent ct-accent">两成半引用</span>
  <span class="ct-ink">来自新闻业</span>
</div>
```

### 文字颜色（`ct-*`）

| 场景 | class | 色值 |
|------|-------|------|
| 普通文字 | `ct-ink` | #1C1917 近黑 |
| Anthropic / OpenAI | `ct-purple` | #7B68EE 紫 |
| Meta / Google | `ct-blue` | #4A90D9 蓝 |
| 反差 / 负面惊讶 | `ct-red` | #DC2626 红 |
| 数字 / 统计 | `ct-gold` | #B8852A 金 |
| 发布 / 工具 / 正面 | `ct-green` | #059669 绿 |
| 强调 | `ct-accent` | #E8734A 橙 |

### 背景高亮（`kw kw-*`）

高亮 = 半透明背景色，类似笔记工具的文字选中效果。

| class | 背景色 |
|-------|--------|
| `kw-gold` | rgba(212,168,85,0.25) 暖金 |
| `kw-red` | rgba(220,38,38,0.18) 红 |
| `kw-accent` | rgba(232,115,74,0.20) 橙 |
| `kw-blue` | rgba(74,144,217,0.20) 蓝 |
| `kw-green` | rgba(5,150,105,0.18) 绿 |

### 着色规则

- 每行 1–2 个彩色 span（不要全部上色）
- 每行恰好 1 个 `.kw` 高亮 span（落在最有冲击力的词组上）
- 公司名用对应颜色（Anthropic→紫, Meta→蓝）但不加高亮
- 高亮颜色与文字颜色配对使用：`ct-red` + `kw-red`，`ct-gold` + `kw-gold`

---

## 写作公式（5 个）

从 4 条 tier-1 新闻中选 3 条，每条套用一个公式：

| 公式 | 模板 | 示例 |
|------|------|------|
| 反差冲击 | [主体][打破/竟然/首次] + [反转事实] | Meta打破承诺发首个闭源模型 |
| 数字+效果 | [主题] + [从X到Y的变化] | Agent部署从数月压缩到几天 |
| 数据揭示 | [主体][具体数字] + [意外发现] | AI聊天两成半引用来自新闻业 |
| 悬念+主体 | [知名公司] + [意想不到的动作] | OpenAI公开儿童保护技术蓝图 |
| 对立并列 | [A动作] + [B动作] | 开源巨头闭源 闭源巨头开放 |

**选题原则**：3 行覆盖 3 个不同子领域（如：产品+模型+行业），不要 3 条都是同一公司。

---

## 生成步骤

1. **读取** digest-xhs.json 的 4 条 tier-1，提取 `headline_zh`、`category`、`source`
2. **选 3 条**：挑视觉反差最大、涵盖不同领域的 3 条
3. **为每条选公式**：反差/数字/数据/悬念，3 行公式不重复
4. **写初稿**：每行 13–14 CJK 字符，具体陈述事实（不要模糊钩子）
5. **上色**：公司名用颜色，punchline 加高亮
6. **自检**：跑一遍下方 review checklist

---

## Review Checklist

输出前逐项验证：

- [ ] 恰好 3 行，每行一个 `<div class="ct-line">`
- [ ] 每行填满 ≥85% 的 960px 宽度（无短行）
- [ ] 每行不换行（不会被挤成两行）
- [ ] 每行恰好 1 个 `.kw` 高亮
- [ ] 颜色与新闻主题匹配（不是随机上色）
- [ ] 内容是具体新闻事实（"Meta打破承诺" 而非 "开源铁粉也闭源了"）
- [ ] 3 行覆盖 3 条不同新闻
- [ ] 无 XHS 敏感词（对照 `references/config/sensitive-word-dict.md`）

---
