# 信息源完整清单

## 公司官方博客（authority_weight: 5）

| 源 | 类型 | URL | Fetch 策略 |
|----|------|-----|-----------|
| OpenAI Blog | RSS | `https://openai.com/blog/rss.xml` | title_only |
| Anthropic Blog | RSS | `https://www.anthropic.com/rss.xml` | title_only |
| Google AI Blog | RSS | `https://blog.google/technology/ai/rss/` | title_only |
| DeepMind Blog | RSS | `https://deepmind.google/blog/rss.xml` | title_only |
| Meta AI Blog | RSS | `https://ai.meta.com/blog/rss/` | title_only |
| NVIDIA Blog | RSS | `https://blogs.nvidia.com/feed/` | title_only |
| Google Research Blog | RSS | `https://blog.research.google/feeds/posts/default?alt=rss` | title_only |

## 一线科技媒体（authority_weight: 4）

| 源 | 类型 | URL | Fetch 策略 |
|----|------|-----|-----------|
| MIT Technology Review | RSS | `https://www.technologyreview.com/feed/` | metadata |
| The Verge (AI) | RSS | `https://www.theverge.com/rss/ai-artificial-intelligence/index.xml` | metadata |
| TechCrunch (AI) | RSS | `https://techcrunch.com/category/artificial-intelligence/feed/` | metadata |
| Ars Technica (AI) | RSS | `https://feeds.arstechnica.com/arstechnica/technology-lab` | metadata |
| Wired (AI) | RSS | `https://www.wired.com/feed/tag/ai/latest/rss` | metadata |
| 404 Media | RSS | `https://www.404media.co/rss/` | metadata |
| The Batch (Andrew Ng) | RSS | `https://www.deeplearning.ai/the-batch/feed/` | metadata |

## 社区 & 论文（authority_weight: 3）

| 源 | 类型 | URL | Fetch 策略 |
|----|------|-----|-----------|
| Hacker News | API | `https://hacker-news.firebaseio.com/v0/` | metadata |
| HuggingFace Daily Papers | API | `https://huggingface.co/api/daily_papers` | metadata |

## 行业 Newsletter（authority_weight: 3–4）

| 源 | 类型 | URL | Fetch 策略 | authority |
|----|------|-----|-----------|-----------|
| Import AI (Jack Clark) | RSS | `https://importai.substack.com/feed` | summary | 4 |
| Ben's Bites | RSS | `https://bensbites.beehiiv.com/feed` | summary | 3 |
| Latent Space | RSS | `https://www.latent.space/feed` | summary | 3 |
| Interconnects (Nathan Lambert) | RSS | `https://www.interconnects.ai/feed` | summary | 3 |
| AI Snake Oil | RSS | `https://aisnakeoil.substack.com/feed` | summary | 4 |
| One Useful Thing (Ethan Mollick) | RSS | `https://www.oneusefulthing.org/feed` | summary | 3 |
| Ahead of AI (Sebastian Raschka) | RSS | `https://magazine.sebastianraschka.com/feed` | summary | 3 |

## 独立博客（authority_weight: 3）

| 源 | 类型 | URL | Fetch 策略 |
|----|------|-----|-----------|
| Simon Willison's Weblog | RSS | `https://simonwillison.net/atom/everything/` | metadata |

## 社交媒体（authority_weight: 2–3）

| 源 | 类型 | 账号/话题 | Fetch 策略 |
|----|------|----------|-----------|
| X/Twitter | Rettiwt API | @OpenAI, @AnthropicAI, @GoogleAI, @ylecun, @kaborez, @sama | title_only |

---

## Fetch 策略定义

| 策略 | 抓什么 | Token 成本 | 适用场景 |
|------|--------|-----------|---------|
| `title_only` | 标题 + URL + 发布时间 | 极低 | 高权威源（标题即信号） |
| `metadata` | 标题 + 摘要 + 社区指标 | 低 | 社区源、媒体 |
| `summary` | 前 500 字 + 元数据 | 中 | Newsletter |
| `full_text` | 全文 | 高 | **仅在进入第一梯队后按需 fetch** |

## AI 关键词过滤（用于 HN 等通用源）

```
AI, artificial intelligence, LLM, GPT, Claude, Gemini, machine learning,
deep learning, neural network, transformer, diffusion, RLHF, fine-tuning,
AGI, alignment, OpenAI, Anthropic, DeepMind, Mistral, Llama, open source model,
foundation model, reasoning, agent, RAG, vector database, embedding,
multimodal, vision language, text-to-image, text-to-video, robotics AI,
AI regulation, AI safety, AI policy
```
