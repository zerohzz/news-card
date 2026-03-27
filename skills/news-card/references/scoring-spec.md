# 评分规则

## 总分公式

```
total_score = cross_validation × 2.0
            + community_heat  × 1.5
            + authority        × 1.0
            + recency          × 0.8
            + virality         × 1.2
            + actionability    × 0.6
```

---

## 各维度计算

### 1. 交叉验证分（cross_validation）

同一事件被多个独立来源报道时加分：

| 条件 | 分数 |
|------|------|
| 仅 1 个来源 | 0 |
| 2 个独立来源 | 3 |
| 3 个独立来源 | 6 |
| 每多 1 个来源 | +3 |

"独立来源"定义：不同组织/媒体。同一组织的博客 + Twitter 算 1 个来源。

事件匹配规则：标题 Jaccard 相似度 > 0.4 或关键实体（公司名 + 产品名）相同 → 视为同一事件。

### 2. 社区热度分（community_heat）

| 来源 | 条件 | 分数 |
|------|------|------|
| Hacker News | points > 100 | +2 |
| Hacker News | points > 300 | +4（不累加） |
| Hacker News | points > 500 | +6（不累加） |
| HuggingFace Papers | upvotes > 5 | +2 |
| HuggingFace Papers | upvotes > 20 | +4（不累加） |
| Twitter/X | 无量化指标（guest mode 不返回） | 0 |

### 3. 来源权威度（authority）

直接使用 `sources-spec.md` 中每个来源的 `authority_weight`（1–5 分）。

### 4. 时效性加分（recency）

以 fetch 时间为基准：

| 发布距今 | 分数 |
|---------|------|
| < 6 小时 | 3 |
| < 12 小时 | 2 |
| < 24 小时 | 1 |
| ≥ 24 小时 | 0 |

---

## 分级阈值

| 总分 | 级别 | 用途 |
|------|------|------|
| ≥ 12 | 重点关注 | 第一/第二梯队候选 |
| ≥ 6 | 值得关注 | 快讯候选 |
| < 6 | 丢弃 | 不进入最终产出 |

---

## 去重规则

在评分之后、选题之前执行去重：

1. **标题相似度**：Jaccard(tokenize(title_a), tokenize(title_b)) > 0.6 → 合并
2. **关键词重叠**：提取 top-5 关键词，重叠 > 70% → 合并
3. **合并策略**：保留 authority_weight 最高的来源版本，将其他来源记录在 `related_sources` 字段中（用于交叉验证加分）

Tokenize 规则：
- 转小写
- 去除标点和停用词（a, an, the, is, are, was, were, in, on, at, to, for, of, and, or, but, with）
- 按空格分词

---

## 新增评分维度

### 传播力 (virality) — 权重 1.2

基于社交媒体互动数据评估新闻的传播力。灵感来源于 TLDR Newsletter 的「转发测试」（Would I forward this to my group chat?）。

| 来源类型 | 5 分 | 4 分 | 3 分 | 2 分 | 1 分 |
|---------|------|------|------|------|------|
| X/Twitter | ≥5000 赞 | ≥1000 赞 | ≥500 赞 | ≥100 赞 | >0 赞 |
| HN/其他 | ≥200 分 | ≥100 分 | ≥50 分 | ≥20 分 | >0 分 |

### 可操作性 (actionability) — 权重 0.6

基于标题和摘要中的关键词评估新闻的可操作性。灵感来源于 The Rundown AI 的「5分钟行动测试」。

| 分数 | 触发词 | 含义 |
|------|--------|------|
| 3 | launch, release, open-source, announce, available, free | 高可操作性：有新工具/产品可以立即使用 |
| 2 | raise, acquire, partner, invest, fund, merge | 中可操作性：有商业动态值得关注 |
| 1 | 其他 | 低可操作性：分析/评论类内容 |

## 同行评审 (peer_review) — 权重 3.0（最高）

基于顶级 AI/Tech Newsletter 编辑的独立选题判断。如果一条新闻被多个专业编辑同时选中，说明它确实重要。类似学术界的「同行评审」机制。

**信号来源：**
- Ben's Bites (RSS) — AI 工具和 builder 圈最有影响力的 newsletter
- Import AI (RSS) — AI 研究和政策领域的权威 newsletter (Jack Clark)
- Platformer (RSS) — 科技平台与民主治理的深度报道
- TLDR AI (Archive scraping) — 最大的每日 AI digest

**评分规则：**

| 被提及 Newsletter 数 | 分数 | 含义 |
|---------------------|------|------|
| 4 个 | 5 | 全行业共识的重大新闻 |
| 3 个 | 4 | 多数编辑认为重要 |
| 2 个 | 3 | 有一定关注度 |
| 1 个 | 2 | 至少一位编辑关注 |
| 0 个 | 0 | 未被任何 newsletter 覆盖 |

**匹配策略：**
1. URL 精确匹配（去除协议、www、尾斜杠、query 参数）
2. 标题词重叠（Jaccard 系数 > 0.4）
3. TLDR 关键词匹配（标题包含 TLDR 提取的话题关键词）

**Sponsor 过滤：** 自动过滤 newsletter 中的赞助内容（"sponsored by", "brought to you by" 等关键词），避免商业推广污染评分。

**更新后的完整评分公式：**
```
total = cross_validation × 2.0 + community × 1.5 + authority × 1.0 +
        recency × 0.8 + virality × 1.2 + actionability × 0.6 +
        peer_review × 3.0
```
