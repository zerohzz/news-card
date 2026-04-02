---
name: xhs-post-guide
description: 小红书发布文案生成规则、敏感词规避、文风要求
---

# 小红书发布文案指南

> **⚠️ CRITICAL：动笔前必须先读取 `skills/XHS-writer/SKILL.md` 并以其作为写作的底层规范。**
> XHS-writer 是小红书文案的唯一写作标准——文风人格、限流词/敏感词速查表、反 AI 检测策略、输出前自检清单全部以该 skill 为准。
> 下方的格式模板和敏感词表是对 XHS-writer 的补充，不是替代。如有冲突，以 XHS-writer 为准。

---

## 标题格式

**20 字内，强制格式：**

```
MM/DD日报 · <当日最大亮点，一句话>
```

示例：`03/30日报 · Bluesky 用 Claude 让你自己定义算法`

标题 prefix 永远是 `MM/DD日报 · `，不可省略。

---

## 正文模板

```markdown
# MM/DD日报 · <亮点>

📈 𝙏𝙤𝙥 𝙉𝙚𝙬𝙨
1. <tier-1 headline> — <一句话说明>
2. <tier-1 headline> — <一句话说明>
3. <tier-1 headline> — <一句话说明>
4. <tier-1 headline> — <一句话说明>

📰 𝙆𝙚𝙮 𝙐𝙥𝙙𝙖𝙩𝙚𝙨
5. <tier-2 headline> — <一句话说明>
6. <tier-2 headline> — <一句话说明>
7. <tier-2 headline> — <一句话说明>
8. <tier-2 headline> — <一句话说明>

⚡ 𝙉𝙚𝙬𝙨 𝘽𝙧𝙞𝙚𝙛𝙨
· <tier-3 headline>
· <tier-3 headline>
...

#zz的AI日报 #AI资讯 #科技新闻
```

---

## 约束

| 约束 | 要求 |
|------|------|
| 全文字数 | **硬上限 950 字**（含标题、正文、编辑点评、hashtag，不含备选标题区） |
| 语言 | 中文，简洁有力 |
| Hashtag | 固定 3 个 + XHS-writer 推荐 + 今日新闻相关，共约 10 个供挑选 |
| 文风 | 读起来像编辑部晨报简报，不像新闻稿罗列 |
| 句式 | 4 条 tier-1 描述不得使用相同语法结构（避免 AI 痕迹） |

---

## 敏感词规避（CRITICAL）

小红书会对特定词汇限流。生成文案后必须逐词检查。

### 替换优先级

1. **英文替代**：用对应英文词替换中文敏感词
2. **Unicode 数学字体替代**：若英文本身也是敏感词，使用 Unicode Mathematical Sans-Serif Bold Italic 字体（如 `𝙁𝙪𝙣𝙙𝙞𝙣𝙜`）

### 已知高频敏感词

| 中文敏感词 | 推荐替代 | 说明 |
|-----------|---------|------|
| 数据 | data | 科技语境常见 |
| 融资 | funding / 融了→拿了 | 金融限流词 |
| 估值 | valuation | 金融限流词 |
| 医疗 | 健康 / health | 医疗类限流 |
| 解雇 | 开了 / 不再合作 | 负面用语限流 |
| 源码 | source code | 技术术语 |
| 视频生成 | video generation | 组合敏感 |

替换后需保持句子通顺自然，不要为规避而写出生硬的表达。

> 完整敏感词库和反 AI 检测策略请参照 `skills/XHS-writer/SKILL.md`。
