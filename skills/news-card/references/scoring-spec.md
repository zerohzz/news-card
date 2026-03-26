# 评分规则

## 总分公式

```
total_score = cross_validation × 2.0
            + community_heat  × 1.5
            + authority        × 1.0
            + recency          × 0.8
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
