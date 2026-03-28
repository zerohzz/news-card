# 完整运行记录与候选列表：2026-03-28

> 本文档完整记录了 news-card pipeline 的 fetch → score → dedup 全过程，
> 包含每一条候选新闻的详细分数，供审阅和选题使用。

---

## 1. 信息源抓取结果

| # | 信息源 | 类型 | 抓取数 | 状态 | 备注 |
|---|--------|------|--------|------|------|
| 1 | RSS Feeds (18 个) | RSS | 59 | ✅ 成功 | TechCrunch, Wired, Verge, Ars, MIT TR, Google AI, OpenAI 等 |
| 2 | Hacker News | API | 8 | ✅ 成功 | 从 Top 50 中筛选 AI 相关 |
| 3 | HuggingFace Papers | API | 50 | ✅ 成功 | 每日新论文 |
| 4 | Anthropic Blog | Web scrape | 13 | ✅ 成功 | 链接提取 |
| 5 | Meta AI Blog | Web scrape | 0 | ❌ 失败 | SPA 渲染，静态 HTML 无内容 |
| 6 | X/Twitter Builders (18 人) | Feed JSON | 41 | ✅ 成功 | 推文，无播客/博客更新 |
| | **总计** | | **171** | | |

### 未实现的规划源（仅在 sources-spec.md 中，无抓取代码）

| 源 | 状态 | 说明 |
|---|--------|------|
| 机器之心 (Synced) | pending_verification | Round A spec only，无 fetcher |
| DeepSeek Blog | pending_verification | Round A spec only，无 fetcher |
| 量子位 (QbitAI) | pending_verification | Round A spec only，无 fetcher |
| 通义/智谱/Sakana AI | pending_verification | Round A spec only，无 fetcher |
| arXiv CS.AI (beyond HF) | pending_verification | Round A spec only，无 fetcher |
| Papers With Code | pending_verification | Round A spec only，无 fetcher |
| NIST AI / Alignment Forum | pending_verification | Round A spec only，无 fetcher |
| AWS/Azure AI Blog | pending_verification | Round A spec only，无 fetcher |

> ⚠️ 以上中文/亚洲源和研究源在 Round A 仅完成了规范定义，**尚未编写抓取脚本**。
> 当前 pipeline 实际只抓取英文源。

---

## 2. Newsletter 信号（用于 peer_review 评分）

### Import AI (20 items, status: active)

| # | 标题 |
|---|------|
| 1 | Import AI 450: China's electronic warfare model; traumatized LLMs; and a scaling |
| 2 | ImportAI 449: LLMs training other LLMs; 72B distributed training run; computer v |
| 3 | Import AI 448: AI R&D; Bytedance's CUDA-writing agent; on-device satellite AI |
| 4 | Import AI 447: The AGI economy; testing AIs with generated games; and agent ecol |
| 5 | Import AI 446: Nuclear LLMs; China's big AI benchmark; measurement and AI policy |
| 6 | Import AI 445: Timing superintelligence; AIs solve frontier math proofs; a new M |
| 7 | Import AI 444: LLM societies; Huawei makes kernels with AI; ChipBench |
| 8 | Import AI 443: Into the mist: Moltbook, agent ecologies, and the internet in tra |
| 9 | Import AI 442: Winners and losers in the AI economy; math proof automation; and  |
| 10 | Import AI 441: My agents are working. Are yours? |
| 11 | Import AI 440: Red queen AI; AI regulating AI; o-ring automation |
| 12 | Import AI 439: AI kernels; decentralized training; and universal representations |
| 13 | Import AI 438: Silent sirens, flashing for us all |
| 14 | Import AI 437: Co-improving AI; RL dreams; AI labels might be annoying |
| 15 | Import AI 436: Another 2GW datacenter; why regulation is scary; how to fight a s |
| 16 | Import AI 435: 100k training runs; AI systems absorb human power; intelligence p |
| 17 | Import AI 434: Pragmatic AI personhood; SPACE COMPUTERS; and global government o |
| 18 | Import AI 433: AI auditors; robot dreams; and software for helping an AI run a l |
| 19 | Import AI 432: AI malware; frankencomputing; and Poolside's big cluster |
| 20 | Import AI 431: Technological Optimism and Appropriate Fear |

### Platformer (15 items, status: active)

| # | 标题 |
|---|------|
| 1 | Spotify takes on its doppelgänger problem |
| 2 | Following: Elon tried to tank Twitter |
| 3 | Meta's new support bot probably can't get you your account back |
| 4 | Following: OpenAI wrestles with business strategy (and adult content) |
| 5 | Why Meta is retreating from encryption |
| 6 | I have been released from my responsibilities as an unwilling editor for Grammar |
| 7 | Bluesky changes course |
| 8 | Grammarly turned me into an AI editor against my will and I hate it |
| 9 | Inside the backlash to the AI war machine |
| 10 | Where does Anthropic go from here? |
| 11 | What is OpenAI going to do when the truth comes out? |
| 12 | The authoritarian AI crisis has arrived |
| 13 | Following: Anthropic vs. the Pentagon |
| 14 | The shallow impact of India’s AI summit |
| 15 | The infinite scroll goes on trial |

### TLDR AI (15 items, status: active)

| # | 标题 |
|---|------|
| 1 | >Anthropic weighs October IPO |
| 2 | Gemini 3.1 Flash Live ️ |
| 3 | Cursor real-time RL |
| 4 | >Google Turboquant |
| 5 | ARC-AGI-3 |
| 6 | Manus founders detained |
| 7 | >Claude Auto Mode |
| 8 | ChatGPT product discovery |
| 9 | long running harnesses ‍ |
| 10 | >OpenAI PE deal terms |
| 11 | ChatGPT Library |
| 12 | building an AI chip |
| 13 | >OpenAI’s automated researcher |
| 14 | Cursor + Kimi 2.5 |
| 15 | Musk&#x27;s $20B Terafab ️ |

---

## 3. 评分与去重

### 评分公式



### X 源权重分级（v2 新规则）

| 级别 | authority | 示例 |
|------|-----------|------|
| Tier A 官方 | 3 | @claudeai, @sama, @OpenAI |
| Tier B Builder | 2 | @karpathy, @swyx, @kevinweil |
| Tier C 评论 | 1 | @garrytan, @mattturck |

### 去重结果

- 去重前: 171 条
- 去重后: **169 条** (移除 2 条)
- Jaccard 阈值: 0.7 (v2 升级, 原 0.6)
- AI 停用词: 启用 (20 个 AI 高频词过滤)

---

## 4. 完整候选列表（169 条，按总分降序）

| # | 总分 | CV | CH | Auth | Rec | Vir | Act | PR | X-only | 来源 | 标题 |
|---|------|----|----|------|-----|-----|-----|----|--------|------|------|
| 1 | 11.6 | 3 | 0 | 5 | 0 | 0 | 1 | 0 |  | Google AI Blog | Gemini 3.1 Flash Live: Making audio AI more natural and reli |
| 2 | 11.2 | 0 | 4 | 3 | 2 | 0 | 1 | 0 |  | Hacker News | AI got the blame for the Iran school bombing. The truth is m |
| 3 | 10.6 | 3 | 0 | 4 | 0 | 0 | 1 | 0 |  | The Verge (AI) | Wikipedia bans AI-generated articles |
| 4 | 10.4 | 0 | 4 | 3 | 1 | 0 | 1 | 0 |  | Hacker News | Anatomy of the .claude/ folder |
| 5 | 9.8 | 0 | 0 | 2 | 0 | 5 | 3 | 0 | Y | X/@trq212 (Thariq) | To manage growing demand for Claude we're adjusting our 5 ho |
| 6 | 9.6 | 0 | 4 | 3 | 0 | 0 | 1 | 0 |  | HuggingFace Papers | Calibri: Enhancing Diffusion Transformers via Parameter-Effi |
| 7 | 9.6 | 0 | 4 | 3 | 0 | 0 | 1 | 0 |  | HuggingFace Papers | PixelSmile: Toward Fine-Grained Facial Expression Editing |
| 8 | 9.6 | 0 | 4 | 3 | 0 | 0 | 1 | 0 |  | HuggingFace Papers | RealRestorer: Towards Generalizable Real-World Image Restora |
| 9 | 9.6 | 0 | 4 | 3 | 0 | 0 | 1 | 0 |  | HuggingFace Papers | Intern-S1-Pro: Scientific Multimodal Foundation Model at Tri |
| 10 | 9.6 | 0 | 4 | 3 | 0 | 0 | 1 | 0 |  | HuggingFace Papers | SlopCodeBench: Benchmarking How Coding Agents Degrade Over L |
| 11 | 9.6 | 0 | 4 | 3 | 0 | 0 | 1 | 0 |  | HuggingFace Papers | MACRO: Advancing Multi-Reference Image Generation with Struc |
| 12 | 9.6 | 0 | 4 | 3 | 0 | 0 | 1 | 0 |  | HuggingFace Papers | Voxtral TTS |
| 13 | 9.6 | 0 | 4 | 3 | 0 | 0 | 1 | 0 |  | HuggingFace Papers | EVA: Efficient Reinforcement Learning for End-to-End Video A |
| 14 | 9.6 | 0 | 4 | 3 | 0 | 0 | 1 | 0 |  | HuggingFace Papers | T-MAP: Red-Teaming LLM Agents with Trajectory-aware Evolutio |
| 15 | 9.6 | 0 | 4 | 3 | 0 | 0 | 1 | 0 |  | HuggingFace Papers | Why Does Self-Distillation (Sometimes) Degrade the Reasoning |
| 16 | 9.6 | 0 | 4 | 3 | 0 | 0 | 1 | 0 |  | HuggingFace Papers | UI-Voyager: A Self-Evolving GUI Agent Learning via Failed Ex |
| 17 | 9.6 | 0 | 4 | 3 | 0 | 0 | 1 | 0 |  | HuggingFace Papers | CUA-Suite: Massive Human-annotated Video Demonstrations for  |
| 18 | 9.2 | 0 | 0 | 3 | 1 | 4 | 1 | 0 | Y | X/@sama (Sam Altman) | The coolest meeting I had this week with was Paul, who used  |
| 19 | 8.6 | 0 | 0 | 2 | 0 | 4 | 3 | 0 | Y | X/@karpathy (Andrej Karpa | When I built menugen ~1 year ago, I observed that the hardes |
| 20 | 8.2 | 0 | 2 | 3 | 2 | 0 | 1 | 0 |  | Hacker News | DOJ confirms FBI Director Kash Patel's personal email was ha |
| 21 | 8.0 | 0 | 0 | 5 | 3 | 0 | 1 | 0 |  | OpenAI Blog | STADLER reshapes knowledge work at a 230-year-old company |
| 22 | 7.8 | 0 | 2 | 3 | 0 | 0 | 3 | 0 |  | HuggingFace Papers | 4DGS360: 360° Gaussian Reconstruction of Dynamic Objects fro |
| 23 | 7.4 | 0 | 0 | 4 | 2 | 0 | 3 | 0 |  | The Verge (AI) | The latest in data centers, AI, and energy |
| 24 | 7.4 | 0 | 0 | 2 | 0 | 4 | 1 | 0 | Y | X/@joshwoodward (Josh Woo | New in Gemini: Live's biggest upgrade yet  Faster responses. |
| 25 | 7.4 | 0 | 0 | 2 | 0 | 4 | 1 | 0 | Y | X/@AmandaAskell (Amanda A | Tech companies pay millions of dollars for their employees a |
| 26 | 7.4 | 0 | 0 | 2 | 0 | 4 | 1 | 0 | Y | X/@steipete (Peter Steinb | Talked with @durov and Telegram folks offered uncomplicated  |
| 27 | 7.0 | 0 | 0 | 2 | 1 | 2 | 3 | 0 | Y | X/@rauchg (Guillermo Rauc | 1961: We should ship a CLI 2026: We should ship a CLI https: |
| 28 | 6.8 | 0 | 0 | 2 | 0 | 3 | 2 | 0 | Y | X/@trq212 (Thariq) | Overall weekly limits stay the same, just how they're distri |
| 29 | 6.6 | 0 | 0 | 4 | 1 | 0 | 3 | 0 |  | Wired (AI) | I Asked ChatGPT 500 Questions. Here Are the Ads I Saw Most O |
| 30 | 6.6 | 0 | 2 | 3 | 0 | 0 | 1 | 0 |  | Hacker News | Everything old is new again: memory optimization |
| 31 | 6.6 | 0 | 2 | 3 | 0 | 0 | 1 | 0 |  | HuggingFace Papers | VFIG: Vectorizing Complex Figures in SVG with Vision-Languag |
| 32 | 6.6 | 0 | 2 | 3 | 0 | 0 | 1 | 0 |  | HuggingFace Papers | AVControl: Efficient Framework for Training Audio-Visual Con |
| 33 | 6.6 | 0 | 2 | 3 | 0 | 0 | 1 | 0 |  | HuggingFace Papers | MuRF: Unlocking the Multi-Scale Potential of Vision Foundati |
| 34 | 6.6 | 0 | 2 | 3 | 0 | 0 | 1 | 0 |  | HuggingFace Papers | Less Gaussians, Texture More: 4K Feed-Forward Textured Splat |
| 35 | 6.6 | 0 | 2 | 3 | 0 | 0 | 1 | 0 |  | HuggingFace Papers | MSA: Memory Sparse Attention for Efficient End-to-End Memory |
| 36 | 6.6 | 0 | 2 | 3 | 0 | 0 | 1 | 0 |  | HuggingFace Papers | The Pulse of Motion: Measuring Physical Frame Rate from Visu |
| 37 | 6.6 | 0 | 2 | 3 | 0 | 0 | 1 | 0 |  | HuggingFace Papers | Understanding the Challenges in Iterative Generative Optimiz |
| 38 | 6.6 | 0 | 2 | 3 | 0 | 0 | 1 | 0 |  | HuggingFace Papers | SpectralSplats: Robust Differentiable Tracking via Spectral  |
| 39 | 6.6 | 0 | 2 | 3 | 0 | 0 | 1 | 0 |  | HuggingFace Papers | Qworld: Question-Specific Evaluation Criteria for LLMs |
| 40 | 6.6 | 0 | 2 | 3 | 0 | 0 | 1 | 0 |  | HuggingFace Papers | LagerNVS: Latent Geometry for Fully Neural Real-time Novel V |
| 41 | 6.6 | 0 | 2 | 3 | 0 | 0 | 1 | 0 |  | HuggingFace Papers | StreamingClaw Technical Report |
| 42 | 6.6 | 0 | 2 | 3 | 0 | 0 | 1 | 0 |  | HuggingFace Papers | GameplayQA: A Benchmarking Framework for Decision-Dense POV- |
| 43 | 6.6 | 0 | 2 | 3 | 0 | 0 | 1 | 0 |  | HuggingFace Papers | When Models Judge Themselves: Unsupervised Self-Evolution fo |
| 44 | 6.6 | 0 | 2 | 3 | 0 | 0 | 1 | 0 |  | HuggingFace Papers | Can LLM Agents Be CFOs? A Benchmark for Resource Allocation  |
| 45 | 6.2 | 0 | 0 | 4 | 2 | 0 | 1 | 0 |  | TechCrunch (AI) | Why SoftBank’s new $40B loan points to a 2026 OpenAI IPO |
| 46 | 6.2 | 0 | 0 | 4 | 2 | 0 | 1 | 0 |  | TechCrunch (AI) | Memory chip giant SK hynix could help end ‘RAMmageddon’ with |
| 47 | 6.2 | 0 | 0 | 4 | 2 | 0 | 1 | 0 |  | Wired (AI) | AI Research Is Getting Harder to Separate From Geopolitics |
| 48 | 6.2 | 0 | 0 | 2 | 0 | 3 | 1 | 0 | Y | X/@trq212 (Thariq) | We've landed a lot of efficiency wins to offset this, but ~7 |
| 49 | 6.2 | 0 | 0 | 2 | 0 | 2 | 3 | 0 | Y | X/@rauchg (Guillermo Rauc | Agents need computers  Your agents’ performance improves wit |
| 50 | 6.2 | 0 | 0 | 2 | 0 | 3 | 1 | 0 | Y | X/@levie (Aaron Levie) | We dramatically underestimate how much change management it  |
| 51 | 6.0 | 0 | 0 | 3 | 3 | 0 | 1 | 0 |  | Simon Willison | datasette-showboat 0.1a2 |
| 52 | 5.8 | 0 | 0 | 4 | 0 | 0 | 3 | 0 |  | The Verge (AI) | Google&#8217;s &#8216;live&#8217; AI search assistant can ha |
| 53 | 5.8 | 0 | 0 | 4 | 0 | 0 | 3 | 0 |  | The Verge (AI) | Meta gets ready to launch two new Ray-Ban AI glasses |
| 54 | 5.8 | 0 | 0 | 4 | 0 | 0 | 3 | 0 |  | The Verge (AI) | Senators are pushing to find out how much electricity data c |
| 55 | 5.8 | 0 | 0 | 4 | 0 | 0 | 3 | 0 |  | TechCrunch (AI) | Cohere launches an open source voice model specifically for  |
| 56 | 5.8 | 0 | 0 | 4 | 0 | 0 | 3 | 0 |  | TechCrunch (AI) | Mistral releases a new open source model for speech generati |
| 57 | 5.8 | 0 | 0 | 4 | 0 | 0 | 3 | 0 |  | 404 Media | Apple Gives FBI a User’s Real Name Hidden Behind ’Hide My Em |
| 58 | 5.6 | 0 | 0 | 5 | 0 | 0 | 1 | 0 |  | Google AI Blog | Watch James Manyika talk AI and creativity with LL COOL J. |
| 59 | 5.6 | 0 | 0 | 5 | 0 | 0 | 1 | 0 |  | Google AI Blog | Transform your headphones into a live personal translator on |
| 60 | 5.6 | 0 | 0 | 5 | 0 | 0 | 1 | 0 |  | Google AI Blog | Search Live is expanding globally |
| 61 | 5.6 | 0 | 0 | 5 | 0 | 0 | 1 | 0 |  | NVIDIA Blog | Into the Omniverse: NVIDIA GTC Showcases Virtual Worlds Powe |
| 62 | 5.6 | 0 | 0 | 5 | 0 | 0 | 1 | 0 |  | NVIDIA Blog | Game On: Five New Titles Now Streaming on GeForce NOW |
| 63 | 5.4 | 0 | 0 | 4 | 1 | 0 | 1 | 0 |  | MIT Technology Review | The Download: the internet’s best weather app, and why peopl |
| 64 | 5.4 | 0 | 0 | 4 | 1 | 0 | 1 | 0 |  | MIT Technology Review | Here’s why some people choose cryonics to store their bodies |
| 65 | 5.4 | 0 | 0 | 4 | 1 | 0 | 1 | 0 |  | TechCrunch (AI) | VCs are betting billions on AI’s next wave, so why is OpenAI |
| 66 | 5.4 | 0 | 0 | 4 | 1 | 0 | 1 | 0 |  | TechCrunch (AI) | OpenAI shuts down Sora while Meta gets shut out in court |
| 67 | 5.4 | 0 | 0 | 4 | 1 | 0 | 1 | 0 |  | Wired (AI) | Apple Still Plans to Sell iPhones When It Turns 100 |
| 68 | 5.4 | 0 | 0 | 4 | 1 | 0 | 1 | 0 |  | Wired (AI) | The Latest AI Documentary Asks: Just How Scared Should We Be |
| 69 | 5.4 | 0 | 0 | 4 | 1 | 0 | 1 | 0 |  | 404 Media | Slopaganda and Sora, lol |
| 70 | 5.4 | 0 | 0 | 4 | 1 | 0 | 1 | 0 |  | 404 Media | Iran Is Winning the AI Slop Propaganda War |
| 71 | 5.2 | 0 | 0 | 3 | 2 | 0 | 1 | 0 |  | Simon Willison | Quoting Richard Fontana |
| 72 | 5.2 | 0 | 0 | 3 | 2 | 0 | 1 | 0 |  | Simon Willison | Vibe coding SwiftUI apps is a lot of fun |
| 73 | 5.2 | 0 | 0 | 3 | 2 | 0 | 1 | 0 |  | Hacker News | Namespace: We've raised $23M to build the compute layer for  |
| 74 | 5.0 | 0 | 0 | 2 | 0 | 2 | 1 | 0 | Y | X/@joshwoodward (Josh Woo | New in Gemini: Import memory &amp; chats to Gemini  It's now |
| 75 | 5.0 | 0 | 0 | 2 | 0 | 2 | 1 | 0 | Y | X/@AmandaAskell (Amanda A | Maybe the move to remote work actually made this worse for p |
| 76 | 5.0 | 0 | 0 | 2 | 0 | 2 | 1 | 0 | Y | X/@amasad (Amjad Masad) | Ran into Senator Josh Hawley at a conference and had a great |
| 77 | 5.0 | 0 | 0 | 2 | 0 | 2 | 1 | 0 | Y | X/@rauchg (Guillermo Rauc | 10 minutes with @rohdeali. I love this format https://t.co/u |
| 78 | 5.0 | 0 | 0 | 2 | 0 | 2 | 1 | 0 | Y | X/@zarazhangrui (Zara Zha | “How do you get your product ideas?”  I don’t get ideas by “ |
| 79 | 5.0 | 0 | 0 | 2 | 0 | 2 | 1 | 0 | Y | X/@nikunj (Nikunj Kothari | Step 1: Open @claudeai Code Step 2: Connect @googlecalendar  |
| 80 | 5.0 | 0 | 0 | 2 | 0 | 2 | 1 | 0 | Y | X/@steipete (Peter Steinb | See ya there! https://t.co/R3jtgqi5wA |
| 81 | 5.0 | 0 | 0 | 2 | 0 | 2 | 1 | 0 | Y | X/@steipete (Peter Steinb | Microsoft already shipped some amazing MS Teams improvements |
| 82 | 5.0 | 0 | 0 | 2 | 0 | 2 | 1 | 0 | Y | X/@adityaag (Aditya Agarw | https://t.co/FmjXBCw4XO |
| 83 | 5.0 | 0 | 0 | 2 | 0 | 2 | 1 | 0 | Y | X/@adityaag (Aditya Agarw | There's a lot of conventional wisdom in Silicon Valley that  |
| 84 | 4.8 | 0 | 0 | 3 | 0 | 0 | 3 | 0 |  | Latent Space | [AINews] The Biggest Claude Launch of All Time |
| 85 | 4.8 | 0 | 0 | 3 | 0 | 0 | 3 | 0 |  | HuggingFace Papers | WAFT-Stereo: Warping-Alone Field Transforms for Stereo Match |
| 86 | 4.8 | 0 | 0 | 3 | 0 | 0 | 3 | 0 |  | HuggingFace Papers | Nudging Hidden States: Training-Free Model Steering for Chai |
| 87 | 4.8 | 0 | 0 | 3 | 0 | 0 | 3 | 0 |  | HuggingFace Papers | S2D2: Fast Decoding for Diffusion LLMs via Training-Free Sel |
| 88 | 4.8 | 0 | 0 | 3 | 0 | 0 | 3 | 0 |  | HuggingFace Papers | UniFunc3D: Unified Active Spatial-Temporal Grounding for 3D  |
| 89 | 4.8 | 0 | 0 | 3 | 0 | 0 | 3 | 0 |  | HuggingFace Papers | OmniWeaving: Towards Unified Video Generation with Free-form |
| 90 | 4.8 | 0 | 0 | 3 | 0 | 0 | 3 | 0 |  | Anthropic Blog | Claude is a space to think |
| 91 | 4.6 | 0 | 0 | 4 | 0 | 0 | 1 | 0 |  | MIT Technology Review | The Download: a battery pivot to AI, and rewriting math |
| 92 | 4.6 | 0 | 0 | 4 | 0 | 0 | 1 | 0 |  | MIT Technology Review | The snow gods: How a couple of ski bums built the internet’s |
| 93 | 4.6 | 0 | 0 | 4 | 0 | 0 | 1 | 0 |  | MIT Technology Review | Are high gas prices good news for EVs? It’s complicated. |
| 94 | 4.6 | 0 | 0 | 4 | 0 | 0 | 1 | 0 |  | The Verge (AI) | Judge sides with Anthropic to temporarily block the Pentagon |
| 95 | 4.6 | 0 | 0 | 4 | 0 | 0 | 1 | 0 |  | The Verge (AI) | David Sacks is no longer the White House AI and Crypto Czar |
| 96 | 4.6 | 0 | 0 | 4 | 0 | 0 | 1 | 0 |  | The Verge (AI) | Google is making it easier to import another AI’s memory int |
| 97 | 4.6 | 0 | 0 | 4 | 0 | 0 | 1 | 0 |  | The Verge (AI) | Apple will reportedly allow other AI chatbots to plug into S |
| 98 | 4.6 | 0 | 0 | 4 | 0 | 0 | 1 | 0 |  | The Verge (AI) | Apple’s AI Playlist Playground is bad at music |
| 99 | 4.6 | 0 | 0 | 4 | 0 | 0 | 1 | 0 |  | TechCrunch (AI) | David Sacks is done as AI czar — here’s what he’s doing inst |
| 100 | 4.6 | 0 | 0 | 4 | 0 | 0 | 1 | 0 |  | TechCrunch (AI) | Anthropic wins injunction against Trump administration over  |
| 101 | 4.6 | 0 | 0 | 4 | 0 | 0 | 1 | 0 |  | TechCrunch (AI) | You can now transfer your chats and personal information fro |
| 102 | 4.6 | 0 | 0 | 4 | 0 | 0 | 1 | 0 |  | TechCrunch (AI) | Wikipedia cracks down on the use of AI in article writing |
| 103 | 4.6 | 0 | 0 | 4 | 0 | 0 | 1 | 0 |  | TechCrunch (AI) | OpenAI abandons yet another side quest: ChatGPT’s erotic mod |
| 104 | 4.6 | 0 | 0 | 4 | 0 | 0 | 1 | 0 |  | TechCrunch (AI) | Data centers get ready — the Senate wants to see your power  |
| 105 | 4.6 | 0 | 0 | 4 | 0 | 0 | 1 | 0 |  | TechCrunch (AI) | ByteDance’s new AI video generation model, Dreamina Seedance |
| 106 | 4.6 | 0 | 0 | 4 | 0 | 0 | 1 | 0 |  | TechCrunch (AI) | Conntour raises $7M from General Catalyst, YC to build an AI |
| 107 | 4.6 | 0 | 0 | 4 | 0 | 0 | 1 | 0 |  | TechCrunch (AI) | A ‘pound of flesh’ from data centers: one senator’s answer t |
| 108 | 4.6 | 0 | 0 | 4 | 0 | 0 | 1 | 0 |  | Wired (AI) | Anthropic Supply-Chain-Risk Designation Halted by Judge |
| 109 | 4.6 | 0 | 0 | 4 | 0 | 0 | 1 | 0 |  | Wired (AI) | Meet the Tech Reporters Using AI to Help Write and Edit Thei |
| 110 | 4.6 | 0 | 0 | 4 | 0 | 0 | 1 | 0 |  | Wired (AI) | Senators Demand to Know How Much Energy Data Centers Use |
| 111 | 4.6 | 0 | 0 | 4 | 0 | 0 | 1 | 0 |  | Wired (AI) | ‘She’s Never Going to Age’: Porn Stars Are Embracing AI Clon |
| 112 | 4.6 | 0 | 0 | 4 | 0 | 0 | 1 | 0 |  | 404 Media | Police Used Flock to Give a Man a Traffic Ticket |
| 113 | 4.6 | 0 | 0 | 2 | 1 | 1 | 1 | 0 | Y | X/@swyx (Swyx) | @claudeai i have now published my 2026 mac setup as my own s |
| 114 | 4.6 | 0 | 0 | 2 | 1 | 1 | 1 | 0 | Y | X/@swyx (Swyx) | we basically covered the entire history of information techn |
| 115 | 4.6 | 0 | 0 | 2 | 1 | 1 | 1 | 0 | Y | X/@kevinweil (Kevin Weil) | Paul used ChatGPT + AlphaFold to create a personalized mRNA  |
| 116 | 4.6 | 0 | 0 | 2 | 1 | 1 | 1 | 0 | Y | X/@levie (Aaron Levie) | Box just launched its plugin within Codex, which means you c |
| 117 | 4.4 | 0 | 0 | 3 | 1 | 0 | 1 | 0 |  | Hacker News | Telnyx package compromised on PyPI |
| 118 | 4.2 | 0 | 0 | 3 | 0 | 0 | 2 | 0 |  | Anthropic Blog | Anthropic invests $100 million into the Claude Partner Netwo |
| 119 | 3.8 | 0 | 0 | 2 | 0 | 1 | 1 | 0 | Y | X/@swyx (Swyx) | bought a new mac to give my clanker a hand-me-down and reali |
| 120 | 3.8 | 0 | 0 | 2 | 0 | 1 | 1 | 0 | Y | X/@joshwoodward (Josh Woo | Useful technique for visual creation! https://t.co/1zCQ6ahtI |
| 121 | 3.8 | 0 | 0 | 2 | 0 | 1 | 1 | 0 | Y | X/@zarazhangrui (Zara Zha | “We’d rather waste tokens than waste time”   - founder of on |
| 122 | 3.8 | 0 | 0 | 2 | 0 | 1 | 1 | 0 | Y | X/@nikunj (Nikunj Kothari | “What do you think?”  This question really pains me. Not bec |
| 123 | 3.8 | 0 | 0 | 2 | 0 | 1 | 1 | 0 | Y | X/@nikunj (Nikunj Kothari | Vol. I of this @stripe 🤝 @Railway collab. Don't miss the ma |
| 124 | 3.8 | 0 | 0 | 2 | 0 | 1 | 1 | 0 | Y | X/@danshipper (Dan Shippe | come to Demo Day tomorrow!! https://t.co/Eu09MPI8Pj |
| 125 | 3.8 | 0 | 0 | 2 | 0 | 1 | 1 | 0 | Y | X/@danshipper (Dan Shippe | dang they are shipping FAST https://t.co/vnsU31ywJC |
| 126 | 3.8 | 0 | 0 | 2 | 0 | 1 | 1 | 0 | Y | X/@adityaag (Aditya Agarw | Watch on YouTube https://t.co/7dwDKFNvVw  Listen on Spotify  |
| 127 | 3.6 | 0 | 0 | 3 | 0 | 0 | 1 | 0 |  | Latent Space | [AINews] Everything is CLI |
| 128 | 3.6 | 0 | 0 | 3 | 0 | 0 | 1 | 0 |  | Simon Willison | We Rewrote JSONata with AI in a Day, Saved $500K/Year |
| 129 | 3.6 | 0 | 0 | 3 | 0 | 0 | 1 | 0 |  | Simon Willison | My minute-by-minute response to the LiteLLM malware attack |
| 130 | 3.6 | 0 | 0 | 3 | 0 | 0 | 1 | 0 |  | Simon Willison | Quantization from the ground up |
| 131 | 3.6 | 0 | 0 | 3 | 0 | 0 | 1 | 0 |  | Hacker News | 21,864 Yugoslavian .yu domains |
| 132 | 3.6 | 0 | 0 | 3 | 0 | 0 | 1 | 0 |  | Hacker News | Solving Semantle with the Wrong Embeddings |
| 133 | 3.6 | 0 | 0 | 3 | 0 | 0 | 1 | 0 |  | HuggingFace Papers | AVO: Agentic Variation Operators for Autonomous Evolutionary |
| 134 | 3.6 | 0 | 0 | 3 | 0 | 0 | 1 | 0 |  | HuggingFace Papers | Reaching Beyond the Mode: RL for Distributional Reasoning in |
| 135 | 3.6 | 0 | 0 | 3 | 0 | 0 | 1 | 0 |  | HuggingFace Papers | Can MLLMs Read Students' Minds? Unpacking Multimodal Error A |
| 136 | 3.6 | 0 | 0 | 3 | 0 | 0 | 1 | 0 |  | HuggingFace Papers | Pixel-level Scene Understanding in One Token: Visual States  |
| 137 | 3.6 | 0 | 0 | 3 | 0 | 0 | 1 | 0 |  | HuggingFace Papers | PMT: Plain Mask Transformer for Image and Video Segmentation |
| 138 | 3.6 | 0 | 0 | 3 | 0 | 0 | 1 | 0 |  | HuggingFace Papers | IQuest-Coder-V1 Technical Report |
| 139 | 3.6 | 0 | 0 | 3 | 0 | 0 | 1 | 0 |  | HuggingFace Papers | MemMA: Coordinating the Memory Cycle through Multi-Agent Rea |
| 140 | 3.6 | 0 | 0 | 3 | 0 | 0 | 1 | 0 |  | HuggingFace Papers | Revisiting On-Policy Distillation: Empirical Failure Modes a |
| 141 | 3.6 | 0 | 0 | 3 | 0 | 0 | 1 | 0 |  | HuggingFace Papers | Electrostatic Photoluminescence Tuning in All-Solid-State Pe |
| 142 | 3.6 | 0 | 0 | 3 | 0 | 0 | 1 | 0 |  | HuggingFace Papers | Representation Alignment for Just Image Transformers is not  |
| 143 | 3.6 | 0 | 0 | 3 | 0 | 0 | 1 | 0 |  | HuggingFace Papers | Extending Precipitation Nowcasting Horizons via Spectral Fus |
| 144 | 3.6 | 0 | 0 | 3 | 0 | 0 | 1 | 0 |  | HuggingFace Papers | FinMCP-Bench: Benchmarking LLM Agents for Real-World Financi |
| 145 | 3.6 | 0 | 0 | 3 | 0 | 0 | 1 | 0 |  | HuggingFace Papers | BioVITA: Biological Dataset, Model, and Benchmark for Visual |
| 146 | 3.6 | 0 | 0 | 3 | 0 | 0 | 1 | 0 |  | HuggingFace Papers | Vega: Learning to Drive with Natural Language Instructions |
| 147 | 3.6 | 0 | 0 | 3 | 0 | 0 | 1 | 0 |  | HuggingFace Papers | 6Bit-Diffusion: Inference-Time Mixed-Precision Quantization  |
| 148 | 3.6 | 0 | 0 | 3 | 0 | 0 | 1 | 0 |  | HuggingFace Papers | Unleashing Spatial Reasoning in Multimodal Large Language Mo |
| 149 | 3.6 | 0 | 0 | 3 | 0 | 0 | 1 | 0 |  | HuggingFace Papers | PLDR-LLMs Reason At Self-Organized Criticality |
| 150 | 3.6 | 0 | 0 | 3 | 0 | 0 | 1 | 0 |  | HuggingFace Papers | Toward Physically Consistent Driving Video World Models unde |
| 151 | 3.6 | 0 | 0 | 3 | 0 | 0 | 1 | 0 |  | Anthropic Blog | Introducing Claude Sonnet 4.6 |
| 152 | 3.6 | 0 | 0 | 3 | 0 | 0 | 1 | 0 |  | Anthropic Blog | Introducing Claude Opus 4.6 |
| 153 | 3.6 | 0 | 0 | 3 | 0 | 0 | 1 | 0 |  | Anthropic Blog | Introducing The Anthropic Institute |
| 154 | 3.6 | 0 | 0 | 3 | 0 | 0 | 1 | 0 |  | Anthropic Blog | Sydney will become Anthropic’s fourth office in Asia-Pacific |
| 155 | 3.6 | 0 | 0 | 3 | 0 | 0 | 1 | 0 |  | Anthropic Blog | Partnering with Mozilla to improve Firefox’s security |
| 156 | 3.6 | 0 | 0 | 3 | 0 | 0 | 1 | 0 |  | Anthropic Blog | Where things stand with the Department of War |
| 157 | 3.6 | 0 | 0 | 3 | 0 | 0 | 1 | 0 |  | Anthropic Blog | Statement on the comments from Secretary of War Pete Hegseth |
| 158 | 3.6 | 0 | 0 | 3 | 0 | 0 | 1 | 0 |  | Anthropic Blog | Statement from Dario Amodei on our discussions with the Depa |
| 159 | 3.6 | 0 | 0 | 3 | 0 | 0 | 1 | 0 |  | Anthropic Blog | Anthropic acquires Vercept to advance Claude's computer use  |
| 160 | 3.6 | 0 | 0 | 3 | 0 | 0 | 1 | 0 |  | Anthropic Blog | Anthropic’s Responsible Scaling Policy: Version 3.0 |
| 161 | 3.6 | 0 | 0 | 3 | 0 | 0 | 1 | 0 |  | Anthropic Blog | Detecting and preventing distillation attacks |
| 162 | 3.6 | 0 | 0 | 1 | 1 | 1 | 1 | 0 | Y | X/@petergyang (Peter Yang | Ok do I know anyone who's on the product team for @spotifycr |
| 163 | 3.6 | 0 | 0 | 1 | 1 | 1 | 1 | 0 | Y | X/@petergyang (Peter Yang | "Part of a new "Capybara" series of models, which are larger |
| 164 | 3.6 | 0 | 0 | 1 | 1 | 1 | 1 | 0 | Y | X/@garrytan (Garry Tan) | OK 6 more big bug fixes https://t.co/WxkgY8RE9f |
| 165 | 3.6 | 0 | 0 | 1 | 1 | 1 | 1 | 0 | Y | X/@garrytan (Garry Tan) | Merged 7 PRs from the community. The constant gardening neve |
| 166 | 3.6 | 0 | 0 | 1 | 1 | 1 | 1 | 0 | Y | X/@garrytan (Garry Tan) | 3 times lmao https://t.co/xK2ZUfDwel https://t.co/sd5eiBskfd |
| 167 | 2.8 | 0 | 0 | 1 | 0 | 1 | 1 | 0 | Y | X/@thenanyu (Nan Yu) | IYKYK https://t.co/2Ziks9u0d9 |
| 168 | 2.8 | 0 | 0 | 1 | 0 | 1 | 1 | 0 | Y | X/@thenanyu (Nan Yu) | heroku addons:create YOU HAD IT ALL  https://t.co/Z8h3PgbrbH |
| 169 | 2.8 | 0 | 0 | 1 | 0 | 1 | 1 | 0 | Y | X/@thenanyu (Nan Yu) | Heroku fumbled so hard. https://t.co/eYuPLyqYlp |

### 图例

- **CV**: cross_validation（交叉验证，×2.0）
- **CH**: community_heat（社区热度，×1.5）
- **Auth**: authority（来源权威度，×1.0）
- **Rec**: recency（时效性，×0.8）
- **Vir**: virality（传播力，×1.2）
- **Act**: actionability（可操作性，×0.6）
- **PR**: peer_review（同行评审，×3.0）
- **X-only**: 仅由 X/Twitter 源支撑，无交叉验证（不允许进入第一梯队）

---

## 5. 分数分布

| 区间 | 数量 | 占比 | 用途 |
|------|------|------|------|
| ≥12 (spotlight) | 0 | 0.0% | 第一/第二梯队候选 |
| 6-11.9 (notable) | 51 | 30.2% | 第二/第三梯队候选 |
| <6 (discard) | 118 | 69.8% | 丢弃 |

### X-only 候选分析

- X-only 候选总数: **41** / 169
- 根据 v2 规则，这些候选 **不允许** 进入第一梯队
- 可进入第二/第三梯队作为补充信号

---

## 6. 来源分布

| 来源类型 | 条数 | 占比 |
|---------|------|------|
| HuggingFace | 50 | 29.6% |
| X/Twitter Builders | 41 | 24.3% |
| TechCrunch | 15 | 8.9% |
| Anthropic | 13 | 7.7% |
| The | 10 | 5.9% |
| Hacker | 8 | 4.7% |
| Wired | 8 | 4.7% |
| Simon | 6 | 3.6% |
| MIT | 5 | 3.0% |
| 404 | 4 | 2.4% |
| Google | 4 | 2.4% |
| NVIDIA | 2 | 1.2% |
| Latent | 2 | 1.2% |
| OpenAI | 1 | 0.6% |

