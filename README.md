# News Card — AI 新闻日报卡片生成器

Claude Code Skill，自动抓取 55+ 英文 AI 一手信息源（含 [follow-builders](https://github.com/zarazhangrui/follow-builders) 25 位一线 AI 构建者），多维度评分筛选，AI 选题分三梯队，生成 8 张 9:16（1080×1920px）小红书风格 PNG 卡片。

## 快速开始

```bash
# 安装依赖
npm install
npx playwright install chromium

# 说"今日 AI 日报"或运行：
bash skills/news-card/scripts/run-digest.sh
```

## 工作流

```
Fetch → Score → Curate (Claude) → Render HTML → Screenshot PNG
```

1. **Fetch** — 并行抓取 RSS、Hacker News API、HuggingFace Papers、Twitter/X
2. **Score** — 交叉验证 × 2.0 + 社区热度 × 1.5 + 来源权威度 × 1.0 + 时效性 × 0.8
3. **Curate** — Claude 从候选中选出 16 条，分为三梯队
4. **Render** — JSON 填入 HTML 模板，生成 8 个页面
5. **Screenshot** — Playwright 截图，输出 1080×1920 @2x PNG

## 输出结构

每次运行在 `output/` 下创建带时间戳的子目录：

```
output/
└── 2026-03-26_14-30-00/
    ├── slides/          ← 8 个 HTML 文件
    ├── images/          ← 8 张 PNG 卡片
    └── digest.json      ← 本次选题数据
```

## 三梯队

| 梯队 | 条数 | 页面 | 展示方式 |
|------|------|------|----------|
| 第一梯队 | 4 条 | 第 1–4 页 | 每页一条，整页展示 |
| 第二梯队 | 4 条 | 第 5–6 页 | 每页两条，半页展示 |
| 其他新闻 | ~8 条 | 第 7 页 | 2×4 方框卡片网格 |

封面（第 0 页）展示全部 16 条标题，按分类色块排列。

## 信息源（55+）

| 类别 | 来源 | 权威度 |
|------|------|--------|
| 公司博客 | [OpenAI](https://openai.com/blog), [Anthropic](https://www.anthropic.com/rss.xml), [Google AI](https://blog.google/technology/ai/), [DeepMind](https://deepmind.google/blog/), [Meta AI](https://ai.meta.com/blog/), [NVIDIA](https://blogs.nvidia.com/) | 5 |
| 科技媒体 | [MIT Tech Review](https://www.technologyreview.com), [The Verge](https://www.theverge.com/ai-artificial-intelligence), [TechCrunch](https://techcrunch.com/category/artificial-intelligence/), [Ars Technica](https://arstechnica.com/technology-lab/), [Wired](https://www.wired.com/tag/ai/), [404 Media](https://www.404media.co/) | 4 |
| 社区 & 论文 | [Hacker News](https://news.ycombinator.com/) (API), [HuggingFace Papers](https://huggingface.co/papers) (API) | 3 |
| Newsletter | [Import AI](https://importai.substack.com), [Ben's Bites](https://bensbites.beehiiv.com), [Latent Space](https://www.latent.space), [AI Snake Oil](https://aisnakeoil.substack.com), [One Useful Thing](https://www.oneusefulthing.org) | 3–4 |
| 独立博客 | [Simon Willison's Weblog](https://simonwillison.net/) | 3 |
| AI Builders on X | [Andrej Karpathy](https://x.com/karpathy), [Swyx](https://x.com/swyx), [Josh Woodward](https://x.com/joshwoodward), [Kevin Weil](https://x.com/kevinweil), [Peter Yang](https://x.com/petergyang), [Nan Yu](https://x.com/thenanyu), [Madhu Guru](https://x.com/realmadhuguru), [Amanda Askell](https://x.com/AmandaAskell), [Cat Wu](https://x.com/_catwu), [Thariq](https://x.com/trq212), [Google Labs](https://x.com/GoogleLabs), [Amjad Masad](https://x.com/amasad), [Guillermo Rauch](https://x.com/rauchg), [Alex Albert](https://x.com/alexalbert__), [Aaron Levie](https://x.com/levie), [Ryo Lu](https://x.com/ryolu_), [Garry Tan](https://x.com/garrytan), [Matt Turck](https://x.com/mattturck), [Zara Zhang](https://x.com/zarazhangrui), [Nikunj Kothari](https://x.com/nikunj), [Peter Steinberger](https://x.com/steipete), [Dan Shipper](https://x.com/danshipper), [Aditya Agarwal](https://x.com/adityaag), [Sam Altman](https://x.com/sama), [Claude](https://x.com/claudeai) | 5 |
| AI Builders 博客 | [Anthropic Engineering](https://www.anthropic.com/engineering), [Claude Blog](https://claude.com/blog) | 5 |
| AI Builders 播客 | [Latent Space](https://www.latent.space), Training Data, No Priors, Unsupervised Learning, Data Driven NYC | 5 |

## 项目结构

```
news-card/
├── CLAUDE.md                        # Claude Code 项目指令
├── README.md
├── package.json
├── skills/
│   ├── autoresearch/                # Meta-skill: 自动优化其他 skill
│   │   ├── SKILL.md                 # Autoresearch 入口指令
│   │   └── eval-guide.md           # 二元评估编写指南
│   └── news-card/                   # Skill 主体
│       ├── SKILL.md                 # Skill 入口指令
│       ├── templates/
│       │   ├── output.md            # Claude 填充的 Markdown 模板
│       │   ├── cover.html           # 封面页
│       │   ├── feature.html         # 第一梯队整页
│       │   ├── half-page.html       # 第二梯队半页
│       │   └── briefs.html          # 快讯 2×4 网格
│       ├── references/
│       │   ├── sources-spec.md      # 信息源清单 + 抓取策略
│       │   ├── scoring-spec.md      # 评分公式 + 阈值
│       │   ├── density-spec.md      # 信息密度准则
│       │   └── design-tokens.md     # 字体、色彩、字号
│       ├── scripts/
│       │   ├── fetch-all.sh         # 并行抓取所有源
│       │   ├── score.sh             # 评分 + 去重
│       │   ├── screenshot.sh        # Playwright 截图
│       │   ├── run-digest.sh        # 端到端主流程
│       │   └── lib/                 # Node.js 模块
│       ├── examples/
│       │   ├── sample-digest.json
│       │   └── sample-output.md
│       └── assets/fonts/
├── workspace/                       # 中间数据（gitignored）
└── output/                          # 最终产出（gitignored）
```

## 设计规范

- **尺寸**：1080×1920px（9:16），@2x 输出 2160×3840px
- **字体**：Noto Serif SC + Source Serif Pro（衬线体，永远不用无衬线体）
- **色彩**：Claude-like 暖白底 + 9 种分类色块
- **密度**：文字内容占比 50%–65%，禁止大面积留白

## 单独运行各步骤

```bash
# 仅抓取
bash skills/news-card/scripts/fetch-all.sh workspace/candidates.json

# 仅评分
bash skills/news-card/scripts/score.sh workspace/candidates.json workspace/scored.json

# 仅渲染（需要 digest.json）
node skills/news-card/scripts/lib/render-html.js \
  --input digest.json \
  --templates skills/news-card/templates \
  --output output/slides

# 仅截图
bash skills/news-card/scripts/screenshot.sh output/slides output/images
```

## 作为 Claude Code Skill 安装

```bash
cp -r skills/news-card ~/.claude/skills/
```

然后对 Claude 说「今日 AI 日报」即可触发。
