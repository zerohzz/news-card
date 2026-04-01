# 评分规则

## 总分公式

```
total_score = cross_validation × 2.0
            + community_heat  × 1.5
            + authority        × 1.0
            + recency          × 0.8
            + virality         × 1.2
            + actionability    × 0.6
            + peer_review      × 3.0
```

> ⚠️ peer_review 当前仍在主公式中计算。迁移至 2-stage rerank 见下方「2-Stage 评分流程」章节。

---

## 各维度计算

<!-- implementation_status: active -->

### 1. 交叉验证分（cross_validation）

<!-- implementation_status: active -->

同一事件被多个独立来源报道时加分：

| 条件 | 分数 |
|------|------|
| 仅 1 个来源 | 0 |
| 2 个独立来源 | 3 |
| 3 个独立来源 | 6 |
| 每多 1 个来源 | +3 |

"独立来源"定义：不同组织/媒体。同一组织的博客 + Twitter 算 1 个来源。

事件匹配规则：标题 Jaccard 相似度 > 0.2 或关键实体匹配（`entitiesMatch()`） → 视为同一事件。阈值比纯 Jaccard 更宽松，依赖实体匹配补偿。

### 2. 社区热度分（community_heat）

<!-- implementation_status: active -->

| 来源 | 条件 | 分数 |
|------|------|------|
| Hacker News | points > 100 | +2 |
| Hacker News | points > 300 | +4（不累加） |
| Hacker News | points > 500 | +6（不累加） |
| HuggingFace Papers | upvotes > 30 | +2 |
| HuggingFace Papers | upvotes > 80 | +4（不累加） |
| X/Twitter (follow-builders) | likes ≥ 300 | +2 |
| X/Twitter (follow-builders) | likes ≥ 1000 | +4（不累加） |
| X/Twitter (follow-builders) | likes ≥ 3000 | +6（不累加） |

### 3. 来源权威度（authority）

<!-- implementation_status: active -->

直接使用 `sources-spec.md` 中每个来源的 `authority_weight`（1–5 分）。

### 4. 时效性加分（recency）

<!-- implementation_status: active -->

使用指数衰减函数（替代早期的阶梯分），消除 24h 硬断崖：

```
maxScore = 3
halfLife = 12 hours
score = 3 × exp(-ln2/12 × hoursAgo)
```

- 0h → 3.0, 6h → 2.1, 12h → 1.5, 24h → 0.75, 36h → 0.4
- 低于 0.2 → 记为 0
- 四舍五入到 0.1

> 基准时间使用 `Date.now()` (UTC)。

### 5. 传播力（virality）

<!-- implementation_status: active -->

基于社交媒体互动数据评估新闻的传播力。灵感来源于 TLDR Newsletter 的「转发测试」（Would I forward this to my group chat?）。

| 来源类型 | 5 分 | 4 分 | 3 分 | 2 分 | 1 分 |
|---------|------|------|------|------|------|
| X/Twitter | ≥5000 赞 | ≥1000 赞 | ≥500 赞 | ≥100 赞 | >0 赞 |
| HN/其他 | ≥200 分 | ≥100 分 | ≥50 分 | ≥20 分 | >0 分 |

### 6. 可操作性（actionability）

<!-- implementation_status: active -->

基于标题和摘要中的关键词评估新闻的可操作性。灵感来源于 The Rundown AI 的「5分钟行动测试」。

| 分数 | 触发词 | 含义 |
|------|--------|------|
| 3 | launch, release, open-source, announce, available, free | 高可操作性：有新工具/产品可以立即使用 |
| 2 | raise, acquire, partner, invest, fund, merge | 中可操作性：有商业动态值得关注 |
| 1 | 其他 | 低可操作性：分析/评论类内容 |

### 7. 编辑/媒体共识（peer_review）

<!-- implementation_status: active -->

基于顶级 AI/Tech Newsletter 和科技媒体编辑的独立选题判断。字段名保留 `peer_review`，实际语义为 **editorial/media consensus**。

**信号来源（EN + CN 共 10 个）：**

| Source | 方式 | Authority | Sponsor Filter | Lang |
|--------|------|-----------|----------------|------|
| Import AI | RSS (Substack) | 4 | ✅ | EN |
| The Rundown AI | RSS (Beehiiv) | 4 | ✅ | EN |
| AlphaSignal | RSS (Substack) | 4 | ✅ | EN |
| AI Supremacy | RSS (Substack) | 3 | ❌ | EN |
| TLDR AI | Archive scraping | 3 | — | EN |
| 雷峰网 | RSS | 4 | ❌ | ZH |
| 36氪 | RSS | 3 | ❌ | ZH |
| 钛媒体 | RSS | 3 | ❌ | ZH |
| 爱范儿 | RSS | 3 | ❌ | ZH |
| IT之家 | RSS | 2 | ❌ | ZH |

**加权评分规则：**

每个 source match 按 authority 加权（而非等权 +1）：

| Authority | Weight |
|-----------|--------|
| 5 | 1.5 |
| 4 | 1.2 |
| 3 | 1.0 |
| 2 | 0.7 |

加权总分映射为 0–5：

| 加权总分 | peer_review 分数 | 含义 |
|---------|-----------------|------|
| ≥ 4.0 | 5 | 多个高权威来源共识 |
| ≥ 3.0 | 4 | 显著共识 |
| ≥ 2.0 | 3 | 有一定关注度 |
| ≥ 0.5 | 2 | 至少一个来源关注 |
| < 0.5 | 0 | 未被覆盖 |

**匹配策略（EN）：**
1. URL 精确匹配（去除协议、www、尾斜杠、query 参数）
2. 标题词 Jaccard（短标题 > 0.3，长标题 > 0.4）
3. 实体匹配（≥1 org + ≥1 product，或 ≥2 entities）
4. TLDR 关键词 containment match

**匹配策略（ZH）：**
- 中文实体交集：≥2 个共享实体直接命中
- 1 个共享实体 + 标题 Jaccard > 0.15 作为 fallback

**Sponsor 过滤：** EN 来源（Import AI, Rundown AI, AlphaSignal）已启用 sponsor filter。CN 来源未启用。

---

## 2-Stage 评分流程

<!-- implementation_status: future -->

### Stage 1 — 自动评分（当前实现）

使用主公式（含 peer_review）对所有候选新闻评分排序。

### Stage 2 — 编辑共识 Rerank（规划中）

取 Stage 1 的 top-40 候选，根据 editorial consensus 信号重新排序：

| 命中 Newsletter 数 | Rerank Bonus |
|-------------------|-------------|
| ≥ 3 | +6 |
| 2 | +4 |
| 1 | +2 |
| 0 | 0 |

> 当 newsletter 本身是该新闻的原始来源时，bonus 减半。

**迁移条件**（满足后可从 Stage 1 移除 peer_review 主权重）：
- Newsletter fetcher 稳定运行 > 2 周
- peer_review 维度有效信号覆盖率 > 30%
- 新阈值经过至少 3 次人工对照验证

### Newsletter 信号源注册表

| Source | 方式 | Authority | Status | 说明 |
|--------|------|-----------|--------|------|
| Import AI | RSS (Substack) | 4 | **active** | Jack Clark, AI 研究+政策 |
| The Rundown AI | RSS (Beehiiv) | 4 | **active** | 每日 AI 新闻速递 |
| AlphaSignal | RSS (Substack) | 4 | **active** | AI 研究信号 |
| AI Supremacy | RSS (Substack) | 3 | **active** | AI 行业分析 |
| TLDR AI | Archive scraping | 3 | **active** | 最大 AI digest, archive 页关键词抽取 |
| 雷峰网 | RSS | 4 | **active** | 中文 AI/科技深度报道 |
| 36氪 | RSS | 3 | **active** | 中文科技媒体 |
| 钛媒体 | RSS | 3 | **active** | 中文科技媒体 |
| 爱范儿 | RSS | 3 | **active** | 中文科技消费 |
| IT之家 | RSS | 2 | **active** | 中文泛科技媒体 |

> **Deprecated:** Ben's Bites (404 as of 2026-03-27), Platformer (replaced by The Rundown AI / AlphaSignal)

> authority（来源权威度）≠ editorial_consensus（被多个编辑选中）。peer_review 使用加权评分，高 authority source 贡献更大权重。

---

## 分级阈值

| 总分 | 级别 | 用途 |
|------|------|------|
| ≥ 12 | 重点关注 | 第一/第二梯队候选 |
| ≥ 6 | 值得关注 | 快讯候选 |
| < 6 | 丢弃 | 不进入最终产出 |

---

## X/Twitter 单源限制

<!-- implementation_status: active -->

当一条新闻仅由 X/Twitter 来源支撑时（`cross_validation = 0` 且唯一来源类型为 X/Twitter）：
- 总分 cap 按 community_heat 分级：heat ≥ 6 → cap 18 / heat ≥ 4 → cap 15 / 其他 → cap 11.9
- authority 分按 X tier 计算：Tier A（官方/公司）: 4 / Tier B（builder）: 3 / Tier C（评论/投资者）: 2
- follow-builders 精选账号额外 +1 authority（curated builder bonus），上限 5
- 可保留在候选池中作为早期信号

---

## 去重规则

在评分之后、选题之前执行去重：

1. **标题相似度**：Jaccard(tokenize(title_a), tokenize(title_b)) > 0.6 → 合并
2. **关键词重叠**：提取 top-5 关键词，重叠 > 70% → 合并
3. **合并策略**：保留 authority_weight 最高的来源版本，将其他来源记录在 `related_sources` 字段中（用于交叉验证加分）

Tokenize 规则：
- 转小写
- 去除标点和停用词（a, an, the, is, are, was, were, in, on, at, to, for, of, and, or, but, with, ...）
- 按空格分词

AI 领域停用词（已实现）：
<!-- implementation_status: active -->
`ai, artificial, intelligence, machine, learning, deep, model, neural, network, new, first, using, based, powered, driven, enables, announces, launches, introduces, reveals, unveils, tool, platform, update, feature, support, data, training, system, research, user`

> 通用停用词 + AI 领域停用词均已在 `dedup.js` 中生效。

---

## 未来接口定义

<!-- implementation_status: future -->

### event_id

同一事件的唯一标识符。由 cross_validation 阶段的事件分组产生。
格式：`evt_{YYYYMMDD}_{hash8}`，其中 hash8 为事件组首条标题的 SHA-256 前 8 位。

### doc_role

同一事件中各文档的角色标记：

| 角色 | 含义 | 示例 |
|------|------|------|
| `official_launch` | 官方发布 | 公司博客公告 |
| `media_analysis` | 媒体分析 | TechCrunch 报道 |
| `benchmark` | 基准评测 | HuggingFace 论文 |
| `reaction` | 社区反应 | X/Twitter 讨论 |
| `pricing` | 定价信息 | 产品定价页面 |
| `repo_update` | 代码更新 | GitHub release |

> event_id 和 doc_role 为 v2+ 预留接口，本轮仅完成规范定义。
