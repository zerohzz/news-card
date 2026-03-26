# News Card — AI 新闻日报卡片生成器

Claude Code Skill，自动抓取 25+ 英文 AI 一手信息源，多维度评分筛选，AI 选题分三梯队，生成 8 张 9:16（1080×1920px）小红书风格 PNG 卡片。

## 快速开始

```bash
# 安装依赖
npm install
npx playwright install chromium

# 说"今日 AI 日报"或运行：
bash scripts/run-digest.sh
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

## 信息源（25+）

| 类别 | 来源 | 权威度 |
|------|------|--------|
| 公司博客 | OpenAI, Anthropic, Google AI, DeepMind, Meta, NVIDIA | 5 |
| 科技媒体 | MIT Tech Review, The Verge, TechCrunch, Ars Technica, Wired, 404 Media | 4 |
| 社区 & 论文 | Hacker News (API), HuggingFace Papers (API) | 3 |
| Newsletter | Import AI, Ben's Bites, Latent Space, AI Snake Oil, One Useful Thing | 3–4 |
| 独立博客 | Simon Willison's Weblog | 3 |

## 目录结构

```
news-card/
├── SKILL.md                 # Claude Code 入口指令
├── package.json
├── templates/
│   ├── output.md            # Claude 填充的 Markdown 模板
│   ├── cover.html           # 封面页
│   ├── feature.html         # 第一梯队整页
│   ├── half-page.html       # 第二梯队半页
│   └── briefs.html          # 快讯 2×4 网格
├── references/
│   ├── sources-spec.md      # 信息源清单 + 抓取策略
│   ├── scoring-spec.md      # 评分公式 + 阈值
│   ├── density-spec.md      # 信息密度准则
│   └── design-tokens.md     # 字体、色彩、字号
├── scripts/
│   ├── fetch-all.sh         # 并行抓取所有源
│   ├── score.sh             # 评分 + 去重
│   ├── screenshot.sh        # Playwright 截图
│   ├── run-digest.sh        # 端到端主流程
│   └── lib/
│       ├── fetch-rss.js     # RSS/Atom 通用抓取器（22 源）
│       ├── fetch-hackernews.js
│       ├── fetch-huggingface.js
│       ├── fetch-twitter.js # Guest mode，可选
│       ├── score-engine.js  # 多维度评分引擎
│       ├── dedup.js         # Jaccard 去重
│       ├── render-html.js   # JSON → HTML
│       └── screenshot-playwright.js
├── examples/
│   ├── sample-digest.json   # 16 条样例新闻
│   └── sample-output.md     # 样例 Markdown 输出
└── assets/fonts/            # 字体文件（可选）
```

## 设计规范

- **尺寸**：1080×1920px（9:16），@2x 输出 2160×3840px
- **字体**：Noto Serif SC + Source Serif Pro（衬线体，永远不用无衬线体）
- **色彩**：Claude-like 暖白底 + 9 种分类色块
- **密度**：文字内容占比 50%–65%，禁止大面积留白

## 单独运行各步骤

```bash
# 仅抓取
bash scripts/fetch-all.sh workspace/candidates.json

# 仅评分
bash scripts/score.sh workspace/candidates.json workspace/scored.json

# 仅渲染（需要 digest.json）
node scripts/lib/render-html.js --input digest.json --templates templates --output output/slides

# 仅截图
bash scripts/screenshot.sh output/slides output/images
```

## 作为 Claude Code Skill 安装

```bash
cp -r news-card ~/.claude/skills/
```

然后对 Claude 说「今日 AI 日报」即可触发。
