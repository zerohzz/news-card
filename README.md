# News Card — AI 新闻日报卡片生成器

Claude Code Skill 集合，自动抓取 65+ AI 信息源，多维度评分筛选，AI 选题分四梯队，
生成 11 张卡片（10 张内容页 + 1 张 V3 Hero 封面）用于小红书分享。

- **主排名**：`scored-news.json`（RSS + Blogs + follow-builders Blog/Podcast）
- **信号池**：`scored-signals.json`（X/Twitter + Hacker News + HuggingFace Papers）
- **follow-builders** 25 位 AI 构建者：[zarazhangrui/follow-builders](https://github.com/zarazhangrui/follow-builders)

---

## 快速开始

```bash
# 安装依赖
npm install
npx playwright install chromium

# 触发：对 Claude 说「今日 AI 日报」，或手动跑：
bash skills/news-card/scripts/run-digest.sh
```

---

## 端到端流水线

```
Fetch → Score → Curate (Claude) → XHS Review → Render HTML → Screenshot
                                 ↓
                          digest.json → digest-xhs.json（和谐版，供下游使用）
                                 ↓
                       Hero Image (xhs-image-hero) → V3 Cover
```

| 步骤 | 产物 | 说明 |
|------|------|------|
| Step 1 Fetch | `workspace/candidates.json` | 并行抓 65+ 源，输出 100+ 候选 |
| Step 2 Score | `workspace/scored-news.json` / `scored-signals.json` | 8 维打分 + Jaccard 去重 |
| Step 3 Curate | `output/<ts>/digest.json` | Claude 精选 24 条（4+4+8+8） |
| Step 3.5 评分报告 | `scored-candidates.md` | 全候选审计表 |
| Step 3.6 XHS 文案 | `xiaohongshu-post.md` | XHS-writer 风格正文 + 5 备选标题 |
| **Step 3.7 话题配额** | — | `check-topic-quota.js` 验证选题分布 |
| Step 3.9 字数自检 | — | `validate-digest.js` 验证字符约束 |
| Step 3.95 XHS 合规 | `digest-xhs.json` | 7 维合规审核后的和谐版 |
| Step 4 Render | `slides/*.html` | HTML 渲染（10 页） |
| Step 5 Screenshot | `images/*.png` | Playwright 1080×1920 @2x |
| Step 6 附带文档 | `selection-rationale.md` / `pipeline-issues.md` | 选题理由 + 问题记录 |
| Phase 2 Hero + V3 | `hero-image.png` / `v3-cover.{html,png}` | Gemini 生成 4 格漫画 + V3 封面 |

---

## 评分体系（8 维）

```
total_score = cross_validation × 2.0     # 交叉验证（多源报道加分）
            + community_heat   × 1.5     # HN/HF/X 热度
            + authority        × 1.0     # 来源权威度 1-5
            + recency          × 0.8     # 指数衰减，半衰期 8h
            + virality         × 1.2     # 互动量
            + actionability    × 0.6     # launch/release/benchmark 关键词
            + peer_review      × 3.0     # Newsletter 多源共识
            + topic_adjustment × 1.0     # XHS 平台适配度（第 8 维）
```

### 第 8 维：话题偏向（2026-04-13 新增）

`classifyTopic()` 按 first-match-wins 优先级分类：

| 优先级 | 话题 | 调整 | 处理 |
|-------|------|------|------|
| 1 | `sovereignty` | **−20（硬剔除）** | 台独/港独/疆独/藏独 — 任何梯队都不出现 |
| 2 | `unrest` | −4 | 枪击/袭击/抗议/示威/attack on home |
| 3 | `politics` | −3 | 共和党/民主党/Trump officials/两党/白宫/国防部/财政部 |
| 4 | `health_ai` | −1 | cancer/NHS/pharma/医疗/诊疗/处方（XHS 医疗黑名单） |
| 5 | `finance_ai` | −1 | bank/stock/hedge/保险公司/银行/炒股（XHS 金融黑名单） |
| 6 | `religion_ethics` | −2 | christian/clergy/基督教/牧师/宗教 |
| 7 | `china_ai_positive` | **+3** | Qwen/DeepSeek/Kimi/通义/智谱/昇腾 × 发布/开源 |
| 8 | `tech` | +2 | launch/release/benchmark/paper/发布/开源/论文 |
| 9 | `ai_reg` | −1 | EU AI Act / AI 行政令 |
| 10 | `neutral` | 0 | 默认 |

Topic 在 score-engine 初次打分后、dedup 合并后都会**重新分类一次**，保证最终条目的 `topic_hint` 与 `adjustment` 指向实际保留的条目。

### 话题配额（curation 硬约束）

| Tier | 技术/neutral | 中国 AI 正面 | 医疗/金融 | 政策/监管 | 宗教伦理 | 政治/冲突 |
|------|-:|-:|-:|-:|-:|-:|
| T1 (4)    | ≥ 3 | 鼓励无上限 | 0 | 0（除特例）| 0 | 0 |
| T2 (4)    | ≥ 2 | 鼓励无上限 | ≤ 1 | ≤ 1 | ≤ 1 | 0 |
| T3×2 (16) | ≥ 8 | 鼓励无上限 | ≤ 2 | ≤ 2 | ≤ 2 | ≤ 2 |

「特别特别特别重要」的政策例外（三选一命中即可放入 T1）：
1. 直接决定主流大模型能否在某市场发布产品（EU AI Act / chip export）
2. AI 公司战略级事件（CEO 人事 / 股权 / 破产）
3. 对 Builder 有直接影响的法规

`check-topic-quota.js` 在 Step 3.7 自动验证。

---

## 输出结构

每次运行在 `output/` 下创建带时间戳子目录：

```
output/2026-04-13_20-33-48/
├── slides/                      # 11 HTML 文件
│   ├── page-0-cover.html        # P0 品牌封面
│   ├── page-1-menu.html         # P1 目录
│   ├── page-2..5-top*.html      # T1 整页
│   ├── page-6..7-second.html    # T2 半页
│   ├── page-8..9-briefs.html    # T3 快讯
│   └── v3-cover.html            # V3 Hero 封面（可选）
├── images/                      # 11 PNG @2x（2160×3840）
├── digest.json                  # 原始 24 条选题
├── digest-xhs.json              # XHS 合规和谐版（下游用）
├── scored-candidates.md         # 全候选评分审计
├── selection-rationale.md       # 选题理由说明
├── pipeline-issues.md           # 管线问题记录
├── xiaohongshu-post.md          # XHS 发布文案（含 5 备选标题）
├── hero-prompt.md               # Hero 图生成 prompt
└── hero-image.png               # 2048×2048 四格漫画
```

---

## 页面结构

| 页 | 模板 | 梯队 | 内容 |
|----|------|------|------|
| P0 | `hero-cover.html` | — | 品牌 Logo + 日期 + Slogan + Top 4 预览 |
| P0' | `xhs-image-hero/templates/v3-cover.html` | — | V3 Hero：四格漫画 + 3 行钩子标题 |
| P1 | `cover.html` | — | 24 条目录按分类索引 |
| P2–P5 | `feature.html` | T1 | 整页，每页 1 条 + 500 字 `content_html` + 1 语义组件 |
| P6–P7 | `half-page.html` | T2 | 半页，每页 2 条 + 180–250 字 |
| P8 | `briefs.html` | T3 news | 8 条 2×4 网格，60–90 字 |
| P9 | `briefs.html` | T3 signals | 研究前沿 / Builder 动态 |

---

## 设计规范

| 项目 | 规格 |
|------|------|
| 画布 | `1080 × 1920px`，@2x 输出 `2160 × 3840px` |
| 安全区 | 上 280px / 下 240px padding（XHS 缩略图不裁切） |
| 字体 | Noto Serif SC（400/600/700/900） + Source Serif Pro；品牌装饰 ChillDuanHei |
| 主题色 | 暖白底 `#FFF9F5` + 强调橙 `#E8734A` + 金弧 `#c5a059` |
| 分类色 | 9 种：模型/产品/安全/行业/开发/研究/开源/政策/劳动力 |
| 密度 | 内页 50–65% 文字占比；封面开放式 |
| 排版 | 仅衬线体；绝不用 PingFang / Helvetica / 无衬线 |

Logo 为纯 CSS/SVG（无图片依赖）：双弧金环 + `zz` + `AI每日资讯`。

---

## Skill 体系

| Skill | 用途 | 何时调用 |
|-------|------|---------|
| **news-card** | 日报主管线 | 用户说「今日 AI 日报」/ `$news-card` |
| **XHS-writer** | 小红书文案 | 主管线 Step 3.6 + 用户直接请求 |
| **xhs-reviewer** | 合规 7 维审核 | 主管线 Step 3.95 + 用户请求审核 |
| **xhs-image-hero** | Hero 图 + V3 封面 | 用户手动触发 |
| **xhs-cover-title** | V3 封面 3 行钩子标题 | xhs-image-hero 之后 |
| **xhs-image** | 旧 V2 封面（保留） | 手动触发 |
| **autoresearch** | 元技能：优化其他 skill | 仅在用户明确要求时 |

---

## 项目结构

```
news-card/
├── CLAUDE.md                                # 项目指令（Claude 读取）
├── README.md                                # 本文件
├── package.json
├── gen-templates.cjs                        # 模板生成器（设计改动时重跑）
├── skills/
│   ├── news-card/                           # 主管线
│   │   ├── SKILL.md
│   │   ├── templates/*.html                 # 10 页 HTML 模板
│   │   ├── references/
│   │   │   ├── config/
│   │   │   │   ├── sensitive-word-dict.md   # XHS 敏感词 + 话题聚类
│   │   │   │   └── output-structure.md
│   │   │   ├── elements/
│   │   │   │   ├── canvas.md                # 画布与安全区
│   │   │   │   ├── typography.md
│   │   │   │   └── tier-system.md           # 24 条 4+4+8+8 分配
│   │   │   ├── workflows/
│   │   │   │   ├── curation-framework.md    # 选题 + 话题配额
│   │   │   │   ├── content-standards.md     # 各梯队字数规则
│   │   │   │   └── xhs-post-guide.md
│   │   │   ├── sources-spec.md
│   │   │   ├── scoring-spec.md              # 8 维评分公式
│   │   │   ├── components-spec.md
│   │   │   ├── density-spec.md
│   │   │   └── design-tokens.md
│   │   ├── scripts/
│   │   │   ├── run-digest.sh                # 端到端
│   │   │   ├── fetch-all.sh                 # 并行抓取
│   │   │   ├── score.sh                     # 打分 + 去重
│   │   │   ├── screenshot.sh                # 截图
│   │   │   ├── validate-digest.js           # Step 3.9 字数自检
│   │   │   ├── check-topic-quota.js         # Step 3.7 话题配额自检
│   │   │   └── lib/
│   │   │       ├── score-engine.js          # 8 维打分 + classifyTopic
│   │   │       ├── dedup.js                 # Jaccard + 实体 + topic 重算
│   │   │       ├── render-html.js           # 模板引擎
│   │   │       ├── generate-score-report.js
│   │   │       ├── fetch-*.js               # 各源抓取器
│   │   │       └── entities.js
│   │   ├── assets/
│   │   │   ├── fonts/                       # 本地字体（NotoSerifSC / ChillDuanHei）
│   │   │   ├── logo/                        # Logo 源项目
│   │   │   └── zz-IP-Ref.png                # 博主 IP 形象参考图
│   │   └── examples/sample-digest.json
│   ├── XHS-writer/SKILL.md
│   ├── xhs-reviewer/SKILL.md                # 7 维合规审核
│   ├── xhs-image-hero/                      # Hero 图 + V3 封面
│   │   ├── SKILL.md
│   │   ├── references/hero-prompt-template.md
│   │   ├── templates/v2-cover.html
│   │   ├── templates/v3-cover.html
│   │   └── scripts/generate.js              # Gemini / NanoBanana 包装
│   ├── xhs-cover-title/                     # V3 三行钩子标题
│   ├── xhs-image/                           # 旧 V2 封面（保留）
│   └── autoresearch/SKILL.md
├── workspace/                               # 中间数据（gitignored）
└── output/                                  # 最终产出（gitignored）
```

---

## 单独运行各步骤

```bash
# 抓取
bash skills/news-card/scripts/fetch-all.sh workspace/candidates.json

# 评分 + 去重（产出 scored-news / scored-signals / scored-candidates.md）
bash skills/news-card/scripts/score.sh workspace/candidates.json workspace/scored.json

# 话题配额验证
node skills/news-card/scripts/check-topic-quota.js output/<ts>/digest.json

# 字数验证
node skills/news-card/scripts/validate-digest.js output/<ts>/digest.json

# 渲染 10 页
node skills/news-card/scripts/lib/render-html.js \
  --input output/<ts>/digest-xhs.json \
  --templates skills/news-card/templates \
  --output output/<ts>/slides \
  --source-count 131 --num-sources 65

# 截图
bash skills/news-card/scripts/screenshot.sh output/<ts>/slides output/<ts>/images

# Hero 图生成（Gemini flash image）
node skills/xhs-image-hero/scripts/generate.js \
  --promptfile output/<ts>/hero-prompt.md \
  --image output/<ts>/hero-image.png \
  --ref skills/news-card/assets/zz-IP-Ref.png \
  --ar 1:1 --quality 2k --model gemini-3.1-flash-image-preview

# 重生成模板（仅设计改动时）
node gen-templates.cjs
```

---

## 作为 Claude Code Skill 安装

```bash
cp -r skills/news-card ~/.claude/skills/
cp -r skills/XHS-writer ~/.claude/skills/
cp -r skills/xhs-reviewer ~/.claude/skills/
cp -r skills/xhs-image-hero ~/.claude/skills/
cp -r skills/xhs-cover-title ~/.claude/skills/
```

然后对 Claude 说「今日 AI 日报」即可触发完整管线。

---

## 设计原则

1. **一次生成、长期复用**：`hero-cover.html` / `cover.html` 由 `gen-templates.cjs` 生成，仅设计改动时重跑
2. **每次 run 都重新生成**：所有 `workspace/` 和 `output/<ts>/` 内容
3. **Skill 独立运行**：news-card / XHS-writer / xhs-reviewer / xhs-image-hero 互不调用，除非 SKILL.md 明确要求
4. **硬编码视口**：1080×1920，不考虑其他尺寸（XHS 9:16）
5. **平台适配先于新闻价值**：第 8 维 topic_adjustment 把 XHS 限流约束前置到评分阶段
