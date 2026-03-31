# 信息源完整清单

## 公司官方博客（authority_weight: 5）

| 源 | 类型 | URL | Fetch 策略 |
|----|------|-----|-----------|
| OpenAI Blog | RSS | `https://openai.com/blog/rss.xml` | title_only |
| Google AI Blog | RSS | `https://blog.google/technology/ai/rss/` | title_only |
| DeepMind Blog | RSS | `https://deepmind.google/blog/rss.xml` | title_only |
| NVIDIA Blog | RSS | `https://blogs.nvidia.com/feed/` | title_only |
| Google Research Blog | RSS | `https://blog.research.google/feeds/posts/default?alt=rss` | title_only |

> **Removed (404 as of 2026-03-27):** Anthropic Blog (`anthropic.com/rss.xml`), Meta AI Blog (`ai.meta.com/blog/rss/`)

## 一线科技媒体（authority_weight: 4）

| 源 | 类型 | URL | Fetch 策略 |
|----|------|-----|-----------|
| MIT Technology Review | RSS | `https://www.technologyreview.com/feed/` | metadata |
| The Verge (AI) | RSS | `https://www.theverge.com/rss/ai-artificial-intelligence/index.xml` | metadata |
| TechCrunch (AI) | RSS | `https://techcrunch.com/category/artificial-intelligence/feed/` | metadata |
| Ars Technica (AI) | RSS | `https://feeds.arstechnica.com/arstechnica/technology-lab` | metadata |
| Wired (AI) | RSS | `https://www.wired.com/feed/tag/ai/latest/rss` | metadata |
| 404 Media | RSS | `https://www.404media.co/rss/` | metadata |
| The Guardian (AI) | RSS | `https://www.theguardian.com/technology/artificialintelligenceai/rss` | metadata |
| The Register (AI) | RSS | `https://www.theregister.com/headlines.rss` | metadata |
| The Decoder | RSS | `https://the-decoder.com/feed/` | metadata |
| VentureBeat (AI) | RSS | `https://venturebeat.com/category/ai/feed/` | metadata |
| MIT News (AI) | RSS | `https://news.mit.edu/topic/artificial-intelligence2/feed` | metadata |

> **Removed (404 as of 2026-03-27):** The Batch (`deeplearning.ai/the-batch/feed/`)

## 社区 & 论文（authority_weight: 3）

| 源 | 类型 | URL | Fetch 策略 |
|----|------|-----|-----------|
| Hacker News | API | `https://hacker-news.firebaseio.com/v0/` | metadata |
| HuggingFace Daily Papers | API | `https://huggingface.co/api/daily_papers` | metadata |

## 行业 Newsletter（authority_weight: 3–4）

| 源 | 类型 | URL | Fetch 策略 | authority | status |
|----|------|-----|-----------|-----------|--------|
| Import AI (Jack Clark) | RSS | `https://importai.substack.com/feed` | summary | 4 | active |
| Latent Space | RSS | `https://www.latent.space/feed` | summary | 3 | active |
| Interconnects (Nathan Lambert) | RSS | `https://www.interconnects.ai/feed` | summary | 3 | active |
| AI Snake Oil | RSS | `https://aisnakeoil.substack.com/feed` | summary | 4 | active |
| One Useful Thing (Ethan Mollick) | RSS | `https://www.oneusefulthing.org/feed` | summary | 3 | active |
| Ahead of AI (Sebastian Raschka) | RSS | `https://magazine.sebastianraschka.com/feed` | summary | 3 | active |

> **Removed (404 as of 2026-03-27):** Ben's Bites (`bensbites.beehiiv.com/feed`)

## 独立博客（authority_weight: 3）

| 源 | 类型 | URL | Fetch 策略 |
|----|------|-----|-----------|
| Simon Willison's Weblog | RSS | `https://simonwillison.net/atom/everything/` | metadata |

## 编辑/媒体共识信号源（peer_review scoring only）

> 以下来源不进入候选池，仅输出 `newsletter-signals.json` 用于 peer_review 加权评分。

### 英文 Newsletter

| Source | 方式 | Authority | Sponsor Filter | Status |
|--------|------|-----------|----------------|--------|
| Import AI | RSS (Substack) | 4 | ✅ | active |
| The Rundown AI | RSS (Beehiiv) | 4 | ✅ | active |
| AlphaSignal | RSS (Substack) | 4 | ✅ | active |
| AI Supremacy | RSS (Substack) | 3 | ❌ | active |
| TLDR AI | Archive scraping | 3 | — | active |

### 中文科技媒体

| Source | 方式 | Authority | Lang | Status |
|--------|------|-----------|------|--------|
| 雷峰网 | RSS | 4 | zh | active |
| 36氪 | RSS | 3 | zh | active |
| 钛媒体 | RSS | 3 | zh | active |
| 爱范儿 | RSS | 3 | zh | active |
| IT之家 | RSS | 2 | zh | active |

---

## AI Builders on X（发现源）

> **X Source Policy**: 所有 X/Twitter 源均标记 `requires_confirmation: true`。
> X 单源内容（无其他独立来源交叉验证）不允许进入第一梯队。可作为早期信号保留在候选池中。

来源：[follow-builders](https://github.com/zarazhangrui/follow-builders) — 追踪真正在构建产品的一线 AI 从业者。

### Tier A — 官方/公司账号（authority_weight: 3）

| 账号 | 类型 | Fetch 策略 | requires_confirmation |
|------|------|-----------|----------------------|
| [Claude](https://x.com/claudeai) (@claudeai) | X/Twitter | title_only | true |
| [Sam Altman](https://x.com/sama) (@sama) | X/Twitter | title_only | true |
| [OpenAI](https://x.com/OpenAI) (@OpenAI) | X/Twitter | title_only | true |
| [AnthropicAI](https://x.com/AnthropicAI) (@AnthropicAI) | X/Twitter | title_only | true |
| [GoogleAI](https://x.com/GoogleAI) (@GoogleAI) | X/Twitter | title_only | true |
| [Google Labs](https://x.com/GoogleLabs) (@GoogleLabs) | X/Twitter | title_only | true |

### Tier B — Builder/从业者（authority_weight: 2）

| 账号 | 类型 | Fetch 策略 | requires_confirmation |
|------|------|-----------|----------------------|
| [Andrej Karpathy](https://x.com/karpathy) (@karpathy) | X/Twitter | title_only | true |
| [Swyx](https://x.com/swyx) (@swyx) | X/Twitter | title_only | true |
| [Kevin Weil](https://x.com/kevinweil) (@kevinweil) | X/Twitter | title_only | true |
| [Yann LeCun](https://x.com/ylecun) (@ylecun) | X/Twitter | title_only | true |
| [Josh Woodward](https://x.com/joshwoodward) (@joshwoodward) | X/Twitter | title_only | true |
| [Alex Albert](https://x.com/alexalbert__) (@alexalbert__) | X/Twitter | title_only | true |
| [Amanda Askell](https://x.com/AmandaAskell) (@AmandaAskell) | X/Twitter | title_only | true |
| [Amjad Masad](https://x.com/amasad) (@amasad) | X/Twitter | title_only | true |
| [Guillermo Rauch](https://x.com/rauchg) (@rauchg) | X/Twitter | title_only | true |
| [Aaron Levie](https://x.com/levie) (@levie) | X/Twitter | title_only | true |
| [Thariq](https://x.com/trq212) (@trq212) | X/Twitter | title_only | true |
| [Ryo Lu](https://x.com/ryolu_) (@ryolu_) | X/Twitter | title_only | true |
| [Nikunj Kothari](https://x.com/nikunj) (@nikunj) | X/Twitter | title_only | true |
| [Peter Steinberger](https://x.com/steipete) (@steipete) | X/Twitter | title_only | true |
| [Dan Shipper](https://x.com/danshipper) (@danshipper) | X/Twitter | title_only | true |
| [Aditya Agarwal](https://x.com/adityaag) (@adityaag) | X/Twitter | title_only | true |
| [Cat Wu](https://x.com/_catwu) (@_catwu) | X/Twitter | title_only | true |

### Tier C — 评论/投资者（authority_weight: 1）

| 账号 | 类型 | Fetch 策略 | requires_confirmation |
|------|------|-----------|----------------------|
| [Peter Yang](https://x.com/petergyang) (@petergyang) | X/Twitter | title_only | true |
| [Nan Yu](https://x.com/thenanyu) (@thenanyu) | X/Twitter | title_only | true |
| [Madhu Guru](https://x.com/realmadhuguru) (@realmadhuguru) | X/Twitter | title_only | true |
| [Garry Tan](https://x.com/garrytan) (@garrytan) | X/Twitter | title_only | true |
| [Matt Turck](https://x.com/mattturck) (@mattturck) | X/Twitter | title_only | true |
| [Zara Zhang](https://x.com/zarazhangrui) (@zarazhangrui) | X/Twitter | title_only | true |

## AI Builders 官方博客（authority_weight: 5）

| 源 | 类型 | URL | Fetch 策略 |
|----|------|-----|-----------|
| [Anthropic Engineering](https://www.anthropic.com/engineering) | Web | `https://www.anthropic.com/engineering` | metadata |
| [Claude Blog](https://claude.com/blog) | Web | `https://claude.com/blog` | metadata |

## AI Builders 播客（authority_weight: 3）

| 源 | 类型 | URL | Fetch 策略 | status |
|----|------|-----|-----------|--------|
| Latent Space (Podcast) | RSS | `https://www.latent.space/feed` | summary | active |
| Training Data | RSS | — | summary | placeholder |
| No Priors | RSS | — | summary | placeholder |
| Unsupervised Learning | RSS | — | summary | placeholder |
| Data Driven NYC | RSS | — | summary | placeholder |

## 中文 / 亚洲信息源

<!-- implementation_status: pending_verification -->

> 所有中文/亚洲源处于验证阶段，需确认 RSS/API 可用性后方可激活。

| 源 | 类型 | URL | Fetch 策略 | authority_weight | status |
|----|------|-----|-----------|-----------------|--------|
| 机器之心 (Synced) | RSS | `https://www.jiqizhixin.com/rss` | metadata | 4 | pending_verification |
| DeepSeek Blog | Web | `https://www.deepseek.com/blog` | metadata | 5 | pending_verification |
| 量子位 (QbitAI) | RSS | `https://www.qbitai.com/feed` | metadata | 3 | pending_verification |
| 通义官方博客 | Web | — | title_only | 5 | pending_verification |
| 智谱官方博客 | Web | — | title_only | 5 | pending_verification |
| Sakana AI | Web | `https://sakana.ai/blog` | title_only | 5 | pending_verification |

## 研究源

<!-- implementation_status: pending_verification -->

| 源 | 类型 | URL | Fetch 策略 | authority_weight | status |
|----|------|-----|-----------|-----------------|--------|
| arXiv CS.AI / CS.CL / CS.LG | API | `https://export.arxiv.org/api/query?...` | metadata | 4 | pending_verification |
| Papers With Code (trending) | API | `https://paperswithcode.com/api/v1/papers/` | metadata | 3 | pending_verification |
| GitHub Trending ML/AI | Web | `https://github.com/trending?since=daily` | title_only | 2 | pending_verification |

## 类别补缺源

<!-- implementation_status: pending_verification -->

| 源 | 类型 | URL | Fetch 策略 | authority_weight | status | 补缺类别 |
|----|------|-----|-----------|-----------------|--------|---------|
| NIST AI | RSS | `https://www.nist.gov/artificial-intelligence/rss.xml` | metadata | 4 | pending_verification | 政策监管 |
| Alignment Forum | RSS | `https://www.alignmentforum.org/feed.xml` | summary | 4 | pending_verification | 安全对齐 |
| AWS Machine Learning Blog | RSS | `https://aws.amazon.com/blogs/machine-learning/feed/` | metadata | 3 | pending_verification | 开发工具 |
| Azure AI Blog | RSS | — | metadata | 3 | pending_verification | 开发工具 |

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
