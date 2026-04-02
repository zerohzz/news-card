---
name: output-structure
description: 输出目录结构、交付物清单、文档格式规范
---

# 输出目录结构

## 目录约定

每次运行在项目根目录的 `output/` 下创建以当前日期时间命名的子目录：

```
output/
└── YYYY-MM-DD_HH-MM-SS/
    ├── slides/                ← 10 个 HTML 文件
    │   ├── page-0-cover.html      (P0: Hero Cover)
    │   ├── page-1-menu.html       (P1: Menu / 目录)
    │   ├── page-2-top1.html       (P2: Tier 1 #1)
    │   ├── page-3-top2.html       (P3: Tier 1 #2)
    │   ├── page-4-top3.html       (P4: Tier 1 #3)
    │   ├── page-5-top4.html       (P5: Tier 1 #4)
    │   ├── page-6-second.html     (P6: Tier 2 上半)
    │   ├── page-7-second.html     (P7: Tier 2 下半)
    │   ├── page-8-briefs.html     (P8: 快讯速览)
    │   └── page-9-briefs.html     (P9: 研究前沿)
    ├── images/                ← 10 张 PNG 卡片 (2160×3840px @2x)
    ├── digest.json            ← 本次选题数据（恰好 24 条）
    ├── scored-candidates.md   ← 全部候选新闻评分报告
    ├── selection-rationale.md ← 选题理由说明
    ├── pipeline-issues.md     ← 管线问题记录
    └── xiaohongshu-post.md    ← 小红书发布文案
```

**Never overwrite** previous运行——每次生成独立的时间戳目录。

或使用一键脚本（自动创建带时间戳的目录）：

```bash
bash skills/news-card/scripts/run-digest.sh
```

---

## 交付物格式规范

### Step 3.5 — 评分报告 (`scored-candidates.md`)

将 `workspace/scored.json` 中**全部候选新闻**（不只是入选的 24 条）整理为 Markdown 格式。

```markdown
# AI 日报候选评分 — YYYY-MM-DD

> 共 N 条候选，Spotlight N 条 / Notable N 条 / Discard N 条
> 信号源：N 个 Newsletter（N EN + N CN），共 N 条信号

## Spotlight 梯队（total ≥ 12）

| # | Score | Source | Title | CV | Heat | Auth | Rec | Vir | Act | PR | Related |
|---|-------|--------|-------|----|------|------|-----|-----|-----|----|---------|
| 1 | 32.6 | TechCrunch | Claude popularity skyrocketing | 6 | 4 | 4 | 0.3 | 3 | 3 | 5 | +4 src |

## Notable 梯队（6 ≤ total < 12）

（同上表格式）

## Discard 梯队（total < 6）

（同上表格式，可折叠或简化为仅 Title + Score）

## 维度活跃度

| Dimension | Non-Zero | Coverage |
|-----------|----------|----------|
| cross_validation | 7/126 | 5.6% |
| peer_review | 15/126 | 11.9% |
| ... | | |

## 入选标记

在 Spotlight/Notable 表格中，最终被选入 digest.json 的 24 条用 **✅** 标注。
```

此报告用于：
- 每次运行后审计评分算法质量
- 追踪算法迭代的改进效果
- 检查是否有高分候选被遗漏或低分候选被误选

---

### 6a. 选题理由说明 (`selection-rationale.md`)

```markdown
# 选题理由 — YYYY-MM-DD

## 第一梯队（4 条）
| # | 标题 | 入选理由 |
|---|------|---------|
| 1 | ... | 多源交叉验证（3+ 媒体）、行业影响大、叙事方式独特 |

## 第二梯队（4 条）
（同上格式）

## 第三梯队（16 条）
### 快讯速览（8 条）
### 研究前沿 / Builder 动态（8 条）
（同上格式，理由可简短）

## 落选说明
列出 3-5 条高分但未入选的候选，说明为什么没选。
```

---

### 6b. 管线问题记录 (`pipeline-issues.md`)

```markdown
# Pipeline Issues — YYYY-MM-DD Run

| # | Issue | Step | Severity | Fixed? | 说明 |
|---|-------|------|----------|--------|------|
| 1 | ... | Fetch | BLOCKING | Yes | ... |

## 详细描述
（每个 issue 的症状、根因、修复方式）

## 改进建议
（基于本次运行，对管线代码或配置的改进建议）
```

---

### 6c. 小红书发布文案 (`xiaohongshu-post.md`)

详细规则见 → `workflows/xhs-post-guide.md`
