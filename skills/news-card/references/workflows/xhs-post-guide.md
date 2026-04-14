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
M/DD·<当日最大亮点，一句话>
```

示例：`3/30·Bluesky 用 Claude 让你自己定义算法`

标题 prefix 永远是 `M/DD·`（无空格），不可省略。月份不补零（4 而非 04）。

**⚠️ 必须生成 5 个备选标题**，每个标注策略类型（按 XHS-writer SKILL.md 第三步执行）。最终选用 1 个作为正文标题，其余 4 个放在文末「备选标题」区。不要只写 1 个标题就跳过。

---

## 正文模板

```markdown
# M/DD·<亮点>

<开头：50 字内，直接切入当日最有料的故事细节。必须同时命中关键词+钩子+情绪点。见 XHS-writer SKILL.md §前 50 字黄金区>

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

#zz的AI资讯 #人工智能 #科技
```

---

## 约束

| 约束 | 要求 |
|------|------|
| 全文字数 | **硬上限 950 字**（含标题、正文、编辑点评、hashtag，不含备选标题区） |
| 语言 | 中文，简洁有力 |
| Hashtag | 固定 3 个（`#zz的AI资讯 #人工智能 #科技`）+ 当日热点 tag，共约 8-10 个。**禁止使用** `#新闻` `#资讯` `#科技新闻` `#AI资讯` `#AI新闻` 等会被平台归类为资讯号的 tag |
| 文风 | 读起来像编辑部晨报简报，不像新闻稿罗列 |
| 句式 | 4 条 tier-1 描述不得使用相同语法结构（避免 AI 痕迹） |
| 品牌 slogan | **禁止在正文中出现封面 slogan**（如「每天阅读X分钟，节约X小时无效刷新」）。Slogan 是封面品牌元素，不是文案内容 |

---

## 敏感词规避（CRITICAL）

小红书会对特定词汇限流。生成文案后必须对照权威替换表逐词检查。

**完整替换对照表（唯一权威来源）** → `references/config/sensitive-word-dict.md`

替换优先级：中文同义改写 > 英文正确大写 > Unicode 数学字体。

> **注意**：「数据」「攻击」「漏洞」已确认**无需替换**（2026-04-14 用户修订）。
> 反 AI 检测策略 → `skills/XHS-writer/SKILL.md`

---

## 敏感词替换库（持续更新）

详见 → `references/config/sensitive-word-dict.md`

生成 `xiaohongshu-post.md` 后，**必须**对照替换库逐词检查并替换。

### 截图反馈工作流

用户每期发布后可能提供小红书限流截图。收到截图时：

1. **识别截图中被标记/限流的词**
2. **在当期 `xiaohongshu-post.md` 中替换**（英文或同义词）
3. **将新发现的敏感词追加到 `references/config/sensitive-word-dict.md`**（含替代方案、来源、日期）
4. 替换后的文案重新输出给用户
