# Run Report: 2026-03-28

## 元信息

- **运行时间**: 2026-03-28 14:06 UTC+8
- **分支**: `feat/news-card-v2-fetch-and-layout`
- **Scoring 版本**: v2 (7-dimension + X tiers + dedup 0.7)
- **输出目录**: `output/2026-03-28_14-06-06/`

---

## Step 1: Fetch

### 各源抓取结果

| 源 | 抓取数 | 状态 | 备注 |
|----|--------|------|------|
| RSS (18 feeds) | 59 | OK | 比昨日少 (78→59)，部分 feed 今日无新条目 |
| Hacker News | 9 | OK | 从 50 条 top stories 中筛选出 9 条 AI 相关 |
| HuggingFace Papers | 50 | OK | 每日固定 50 篇 |
| Anthropic Blog | 13 | OK | 链接提取方式 |
| Meta AI Blog | 0 | **失败** | SPA 渲染，静态 HTML 无法提取链接（已知问题） |
| Follow Builders (X) | 41 | OK | 18 builders 的 41 条推文，0 播客，0 博客 |
| **总计** | **172** | | |

### Newsletter 信号

| Newsletter | 信号数 | 状态 |
|-----------|--------|------|
| Import AI | 20 | active |
| Platformer | 15 | active |
| TLDR AI | 15 keywords | pending_verification |
| Ben's Bites | — | **deprecated** (已移除) |
| **总计** | **50** | |

### 失败项分析

1. **Meta AI Blog (0 items)**: Client-rendered SPA，fetch 返回空壳 HTML。需要 Playwright 抓取。优先级：低（Anthropic Blog 正常工作）。
2. **播客/博客源 (0 items)**: follow-builders 的 podcast 和 blog feed 今日无新内容。正常行为。

---

## Step 2: Score + Dedup

### 评分维度

| 维度 | 权重 | 说明 |
|------|------|------|
| cross_validation | ×2.0 | 多源交叉验证 |
| community_heat | ×1.5 | HN/HF 社区热度 |
| authority | ×1.0 | 来源权威度 (X: 3/2/1 tiers) |
| recency | ×0.8 | 时效性 |
| virality | ×1.2 | 社交传播力 |
| actionability | ×0.6 | 可操作性关键词 |
| peer_review | ×3.0 | Newsletter 编辑共识 |

### 评分分布

| 区间 | 数量 | 用途 |
|------|------|------|
| ≥12 (spotlight) | **0** | 今日无超高分候选 |
| ≥6 (notable) | **54** | 候选池 |
| <6 (discard) | **116** | 丢弃 |

### 去重

- 去重前: 172
- 去重后: **170** (移除 2 条重复)
- 阈值: Jaccard 0.7 + 关键词重叠 0.7
- AI 领域停用词: 已启用 (20 个 AI 高频词)

### X-only 标记

- X-only 候选: **41 条** (全部 X 源内容均无交叉验证)
- 全部标记 `requires_confirmation: true`
- 第一梯队入选限制: **已生效**

### 关键观察

**今日无 ≥12 分候选** — 原因分析：
1. X authority 从 5 降至 2-3，直接降低了 X 源候选分数
2. 今日 HN AI 相关仅 9 条（昨日 16 条），cross_validation 机会减少
3. RSS 产出 59 条（昨日 78 条），整体候选池较小
4. peer_review 信号与今日候选时间窗口不重叠（newsletter 报道昨日内容）

**应对**：降低 tier-1 入选阈值，从 "≥12 spotlight" 改为 "top-4 by total score"。

---

## Step 3: Curate

### 选题结果

#### 第一梯队 (4 条 Feature)

| # | Score | Source | Headline | 选题依据 |
|---|-------|--------|----------|---------|
| 1 | 11.6 | Google AI Blog | Gemini Flash Live 实时语音模型 | 最高分+交叉验证(cv=3)+产品发布 |
| 2 | 11.2 | Hacker News | AI 被错误归咎于伊朗校园爆炸案 | HN 热议+独特叙事角度 |
| 3 | 10.6 | The Verge/Wired | 维基百科禁止 AI 生成文章 | 交叉验证(cv=3)+政策影响 |
| 4 | 10.4 | Hacker News | 解剖 .claude/ 文件夹 | 开发者工具+与我们产品直接相关 |

**X-only 限制执行情况**：排名第 5 的 X/@trq212 (score=9.8, x_only=true) 未被选入 tier-1，改为 tier-2。规则正常生效。

#### 第二梯队 (4 条 Half-page)

| # | Source | Headline |
|---|--------|----------|
| 1 | X/@trq212 | Claude 因需求激增调整使用上限 |
| 2 | X/@sama | ChatGPT+AlphaFold 精准医疗案例 |
| 3 | X/@karpathy | AI 幻觉问题比想象中更微妙 |
| 4 | Hacker News | DOJ 确认 FBI 局长使用个人邮箱 |

#### 第三梯队 (16 条 Briefs, 分两页)

Page 7 (8 条): Calibri, Intern-S1-Pro, Voxtral TTS, EVA, T-MAP, UI-Voyager, STADLER, Gemini Live 升级
Page 8 (8 条): Amanda Askell, PixelSmile, Steinberger+Durov, MACRO, 自蒸馏, CUA-Suite, RealRestorer, 数据中心能源

**总计**: 24 条 (4+4+16)

---

## Step 4: Render

| 页面 | 文件名 | 模板 | 状态 |
|------|--------|------|------|
| 0 Cover | page-0-cover.html | cover.html (1080×1800) | OK |
| 1 Feature | page-1-top1.html | feature.html | OK |
| 2 Feature | page-2-top2.html | feature.html | OK |
| 3 Feature | page-3-top3.html | feature.html | OK |
| 4 Feature | page-4-top4.html | feature.html | OK |
| 5 Half-page | page-5-second.html | half-page.html | OK |
| 6 Half-page | page-6-second.html | half-page.html | OK |
| 7 Briefs | page-7-briefs.html | briefs.html | OK |
| 8 Briefs | page-8-briefs.html | briefs.html | OK |

**9/9 HTML 文件生成成功**

Cover 显示: "今日 AI 领域 24 条精选 · 来自 172 条候选"

---

## Step 5: Screenshot

| 页面 | 文件名 | 尺寸 | 状态 |
|------|--------|------|------|
| 0 Cover | page-0-cover.png | 2160×3600 (3:5) | OK |
| 1 Feature | page-1-top1.png | 2160×3840 (9:16) | OK |
| 2 Feature | page-2-top2.png | 2160×3840 | OK |
| 3 Feature | page-3-top3.png | 2160×3840 | OK |
| 4 Feature | page-4-top4.png | 2160×3840 | OK |
| 5 Half-page | page-5-second.png | 2160×3840 | OK |
| 6 Half-page | page-6-second.png | 2160×3840 | OK |
| 7 Briefs | page-7-briefs.png | 2160×3840 | OK |
| 8 Briefs | page-8-briefs.png | 2160×3840 | OK |

**9/9 PNG 截图生成成功**

---

## 总结

### 关键数字

| 指标 | 数值 |
|------|------|
| 信息源类型 | 6 种 |
| 总候选 | 172 条 |
| 去重后 | 170 条 |
| Newsletter 信号 | 50 条 (3 sources) |
| 最终选题 | 24 条 (4+4+16) |
| 输出页数 | 9 张 PNG |

### 遇到的问题及处理

| 问题 | 严重性 | 处理方式 |
|------|--------|---------|
| Meta AI Blog 返回 0 条 | 低 | 已知 SPA 问题，无影响 |
| 今日无 ≥12 分候选 | 中 | X authority 降级导致。按 top-N 选取替代固定阈值 |
| RSS 产出较昨日减少 (78→59) | 低 | 正常波动，部分 feed 今日无新条目 |
| peer_review 信号全为 0 | 低 | 时间窗口不重叠，newsletter 报道昨日内容 |

### 最终输出

```
C:\Users\AlexHuang\projects\news-card\output\2026-03-28_14-06-06\
├── slides/   ← 9 HTML files
├── images/   ← 9 PNG cards
└── digest.json
```

### v2 评分系统首次完整运行评估

本次是 v2 评分系统 (X tiers + dedup 0.7 + AI stop words) 的首次完整运行。主要观察：

1. **X authority 降级效果显著** — X 源从主导排序降为辅助信号，RSS/HN/HF 源自然上升
2. **x_only 标记正常工作** — 41 条 X 内容全部标记，tier-1 准入限制生效
3. **去重数量稳定** — 0.7 阈值 + AI 停用词后仅去除 2 条（与 0.6 时持平）
4. **Newsletter 信号尚未产生实际影响** — 需要同一日内容才能匹配，长期价值待验证
