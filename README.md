# News Card — AI 新闻日报卡片生成器

Claude Code Skill，自动抓取 65+ 英文 AI 信息源（含 [follow-builders](https://github.com/zarazhangrui/follow-builders) 25 位一线 AI 构建者），多维度评分筛选，AI 选题分四梯队，生成 10 张卡片（全部 1080×1920px 9:16）用于小红书分享。

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

1. **Fetch** — 并行抓取 RSS、Hacker News API、HuggingFace Papers、Twitter/X（信号池单独维护）
2. **Score** — 7 维度评分：`cross_validation × 2.0 + community_heat × 1.5 + authority × 1.0 + recency × 0.8 + virality + actionability + peer_review`；Jaccard 去重（阈值 0.7）
3. **Curate** — Claude 从 100+ 候选中精选 24 条，分四梯队（4 头条 + 4 值得关注 + 8 快讯 + 8 研究/Builder 动态）
4. **Render** — JSON 注入 HTML 模板，生成 10 个页面
5. **Screenshot** — Playwright 截图，全部 1080×1920 @2x（2160×3840px）

## 输出结构

每次运行在 `output/` 下创建带时间戳的子目录：

```
output/
└── 2026-03-30_14-30-00/
    ├── slides/          ← 10 个 HTML 文件
    ├── images/          ← 10 张 PNG 卡片（2160×3840 @2x）
    └── digest.json      ← 本次选题数据
```

## 页面结构

| 页面 | 文件 | 内容 |
|------|------|------|
| P0 封面 | `hero-cover.html` | 品牌标识 + 日期 + Slogan + 今日 Top 4 新闻 |
| P1 目录 | `cover.html` | 全部 24 条标题按分类索引 |
| P2–P5 | `feature.html` | 第一梯队，每页一条 + 150 字摘要 + 语义组件 |
| P6–P7 | `half-page.html` | 第二梯队，每页两条 + 150 字摘要 |
| P8 | `briefs.html` | 快讯速览，8 条 2×4 网格 |
| P9 | `briefs.html` | 研究前沿 / Builder 动态，8 条 2×4 网格 |

## 设计规范

- **封面（P0）** — `1080×1920px`，内容在中间 3:4 安全区（上 280px / 下 240px padding），确保小红书缩略图不裁切内容
- **所有页面** — `1080×1920px`，@2x 输出 `2160×3840px`
- **字体** — Logo：`Noto Serif SC 900`（本地）；正文：`Noto Serif SC + Source Serif Pro`（衬线，永远不用无衬线体）；品牌装饰：`ChillDuanHei`
- **色彩** — 暖白底 `#FFF9F5` + 9 种分类色块 + 强调色 `#E8734A`
- **密度** — 内页文字占比 50%–65%；封面为品牌钩子页，开放式排版

## 品牌标识（Logo）

封面 Logo 为纯 CSS/SVG 实现（无图片依赖），设计源自 `skills/news-card/assets/logo/`：

- 双弧金环（SVG `path`，`stroke: #c5a059`）
- `zz` — `Noto Serif SC 900`，金色
- `AI每日资讯` — `Noto Serif SC 900`，墨黑，白色横条切断弧线

## 项目结构

```
news-card/
├── CLAUDE.md                           # Claude Code 项目指令
├── README.md
├── package.json
├── gen-templates.cjs                   # 模板生成器（设计改动时重跑）
├── skills/
│   ├── news-card/                      # 主技能：AI 新闻日报
│   │   ├── SKILL.md                    # Skill 入口指令
│   │   ├── templates/
│   │   │   ├── hero-cover.html         # P0 封面（由 gen-templates.cjs 生成）
│   │   │   ├── cover-source.html       # P1 目录原始模板（gen-templates 的输入）
│   │   │   ├── cover.html              # P1 目录（由 gen-templates.cjs 生成）
│   │   │   ├── feature.html            # P2–P5 第一梯队
│   │   │   ├── half-page.html          # P6–P7 第二梯队
│   │   │   ├── briefs.html             # P8–P9 快讯
│   │   │   └── output.md              # Claude 填充的 Markdown 模板
│   │   ├── references/
│   │   │   ├── sources-spec.md         # 信息源清单 + 抓取策略
│   │   │   ├── scoring-spec.md         # 评分公式 + 阈值
│   │   │   ├── components-spec.md      # 语义 HTML 组件规范
│   │   │   ├── density-spec.md         # 信息密度准则
│   │   │   └── design-tokens.md        # 字体、色彩、字号
│   │   ├── scripts/
│   │   │   ├── fetch-all.sh            # 并行抓取所有源
│   │   │   ├── score.sh                # 评分 + 去重
│   │   │   ├── screenshot.sh           # Playwright 截图
│   │   │   ├── run-digest.sh           # 端到端主流程
│   │   │   └── lib/
│   │   │       ├── render-html.js      # HTML 渲染引擎
│   │   │       ├── score-engine.js     # 评分算法
│   │   │       ├── dedup.js            # Jaccard 去重
│   │   │       ├── entities.js         # 实体提取（用于 peer review）
│   │   │       ├── pipeline-utils.js   # 共享常量 + 工具函数
│   │   │       ├── fetch-rss.js        # RSS/Atom 抓取（30+ 源）
│   │   │       ├── fetch-blogs.js      # 非 RSS 博客抓取
│   │   │       ├── fetch-hackernews.js # Hacker News API
│   │   │       ├── fetch-huggingface.js # HuggingFace Daily Papers
│   │   │       ├── fetch-follow-builders.js # X/Podcast/Blog via follow-builders
│   │   │       └── fetch-newsletters.js # Newsletter 信号（peer_review 评分用）
│   │   ├── assets/
│   │   │   ├── fonts/
│   │   │   │   ├── NotoSerifSC-Black.ttf          # Logo 字体（本地）
│   │   │   │   └── ChillDuanHeiSongPro_Regular.otf # 品牌装饰字体（本地）
│   │   │   └── logo/                              # zz-ai-daily-logo 源项目
│   │   └── examples/
│   │       └── sample-digest.json
│   ├── XHS-writer/                     # 小红书笔记创作技能
│   │   └── SKILL.md
│   └── autoresearch/                   # 自动优化技能（meta-skill）
│       └── SKILL.md
├── workspace/                          # 中间数据（gitignored）
└── output/                             # 最终产出（gitignored）
```

## 可复用 vs 每次重新生成

**一次生成，长期复用：**
- `hero-cover.html` / `cover.html` — 仅设计改动时重跑 `node gen-templates.cjs`
- `assets/fonts/` — 本地字体，一次下载
- `assets/logo/` — Logo 源码，静态

**每次 run 都重新生成：**
| 步骤 | 产物 |
|------|------|
| `fetch-all.sh` | `workspace/candidates.json`（100+ 候选） |
| `score.sh` | `workspace/scored.json` |
| Claude 精选 | `workspace/digest.json`（24 条） |
| `render-html.js` | `output/<timestamp>/slides/*.html` |
| `screenshot.sh` | `output/<timestamp>/images/*.png` |

## 单独运行各步骤

```bash
# 仅抓取
bash skills/news-card/scripts/fetch-all.sh workspace/candidates.json

# 仅评分
bash skills/news-card/scripts/score.sh workspace/candidates.json workspace/scored.json

# 仅渲染（需要 digest.json，--source-count 传入实际抓取数）
node skills/news-card/scripts/lib/render-html.js \
  --input workspace/digest.json \
  --templates skills/news-card/templates \
  --output output/slides \
  --source-count 130

# 仅截图
bash skills/news-card/scripts/screenshot.sh output/slides output/images

# 重新生成模板（设计改动后）
node gen-templates.cjs
```

## 作为 Claude Code Skill 安装

```bash
cp -r skills/news-card ~/.claude/skills/
```

然后对 Claude 说「今日 AI 日报」即可触发。
