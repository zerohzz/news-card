# News Card — AI 新闻日报卡片生成器

自动抓取 65+ AI 信息源，8 维评分筛选，生成 10 张小红书卡片 + V3 Hero 封面。作为 Claude Code Skill 运行。

---

## 快速开始

```bash
npm install && npx playwright install chromium

# 对 Claude 说「今日 AI 日报」，或：
bash skills/news-card/scripts/run-digest.sh
```

---

## 流水线

```
Fetch (65+ 源) → Score (8 维) → Curate (24 条) → XHS Review → Render → Screenshot → V3 Cover
```

| 步骤 | 说明 | 产物 |
|------|------|------|
| 1 Fetch | 并行抓取 RSS / HN / HF / X / Newsletters | `candidates.json` |
| 2 Score + Dedup | 8 维打分 + Jaccard 去重 + 话题分类 | `scored-news.json` / `scored-signals.json` |
| 3 Curate | Claude 按话题配额精选 24 条（4+4+8+8） | `digest.json` |
| 3.6 XHS 文案 | XHS-writer 编辑风格正文 + 5 备选标题 | `xiaohongshu-post.md` |
| 3.7 话题配额 | `check-topic-quota.js` 验证 T1 以技术为主 | — |
| 3.9 字数自检 | `validate-digest.js` 验证字数约束 | — |
| 3.95 XHS 合规 | 7 维审核 + 敏感词替换 → 和谐版 | `digest-xhs.json` |
| 4 Render | digest-xhs.json → 10 页 HTML | `slides/*.html` |
| 5 Screenshot | Playwright 1080×1920 @2x | `images/*.png` |
| 6 文档 | 选题理由 + 管线问题 | `selection-rationale.md` / `pipeline-issues.md` |
| Hero + V3 | Gemini 四格漫画 + 3 行钩子标题封面 | `hero-image.png` / `v3-cover.png` |

---

## 评分公式（8 维）

```
total = cross_validation × 2.0 + community_heat × 1.5 + authority × 1.0
      + recency × 0.8 + virality × 1.2 + actionability × 0.6
      + peer_review × 3.0 + topic_adjustment × 1.0
```

第 8 维 `topic_adjustment` 按话题分类调整（first-match-wins）：

| 话题 | 调整 | 触发词 |
|------|------|--------|
| `sovereignty` | **−20** | 台独/港独/疆独/藏独 — 硬剔除 |
| `unrest` | −4 | 袭击/抗议/示威/燃烧瓶 |
| `politics` | −3 | 两党/共和党/民主党/白宫/国防部/财政部 |
| `religion_ethics` | −2 | 基督教/牧师/宗教 |
| `health_ai` | −1 | 医疗/诊疗/处方/cancer/NHS |
| `finance_ai` | −1 | 银行/炒股/股价/理财 |
| `china_ai_positive` | **+3** | Qwen/DeepSeek/Kimi/通义/智谱/昇腾 |
| `tech` | **+2** | launch/release/benchmark/paper/发布/开源 |
| `ai_reg` | −1 | AI Act / AI 行政令 |

---

## 话题配额

| Tier | 技术/neutral | 中国 AI 正面 | 医疗/金融 | 政策 | 宗教 | 政治/冲突 |
|------|-:|-:|-:|-:|-:|-:|
| T1 (4) | ≥ 3 | 无限 | 0 | 0 | 0 | 0 |
| T2 (4) | ≥ 2 | 无限 | ≤ 1 | ≤ 1 | ≤ 1 | 0 |
| T3 (16) | ≥ 8 | 无限 | ≤ 2 | ≤ 2 | ≤ 2 | ≤ 2 |

---

## 敏感词替换

**唯一权威来源**：`skills/news-card/references/config/sensitive-word-dict.md`

所有其他 skill（XHS-writer / xhs-reviewer / xhs-post-guide）引用此文件，不维护内嵌子表。

**不替换的词**（保留原文）：数据、攻击、漏洞、过失射击、健康、解雇、源码、视频生成、覆盖、心理、焦虑

**主要替换**：

| 原词 | → 替代 |
|------|--------|
| 数据中心 | 数据设施 |
| 安全 | 防护 |
| 枪击 | 袭击 |
| 咨询 | 请教 |
| 医疗 | 诊疗 |
| 成本 | 花费 |
| 评论 | 留言 |

**不可替换的 category**：`可信对齐`（红色 #E74C3C，永远保留原文）

---

## 9 种内容分类

| Category | 色值 | CSS 变量 |
|----------|------|---------|
| 模型发布 | #4A90D9 蓝 | `--cat-model-release` |
| 产品应用 | #7B68EE 紫 | `--cat-product` |
| 可信对齐 | #E74C3C 红 | `--cat-safety` |
| 行业动态 | #F39C12 橙 | `--cat-industry` |
| 开发工具 | #2ECC71 绿 | `--cat-devtools` |
| 研究前沿 | #1ABC9C 青 | `--cat-research` |
| 开源生态 | #E67E22 深橙 | `--cat-opensource` |
| 政策监管 | #95A5A6 灰 | `--cat-policy` |
| 劳动力影响 | #8E44AD 紫红 | `--cat-labor` |

---

## 页面结构

| 页 | 梯队 | 内容 |
|----|------|------|
| P0 | — | 品牌封面（Logo + Slogan + Top 4） |
| V3 | — | Hero 四格漫画 + 3 行钩子标题 |
| P1 | — | 24 条目录索引 |
| P2–P5 | T1 | 整页，≥ 500 字 `content_html` + 语义组件 |
| P6–P7 | T2 | 半页，180–250 字 |
| P8 | T3 news | 8 条快讯，60–90 字 |
| P9 | T3 signals | 研究前沿 / Builder 动态 |

---

## 输出结构

```
output/<timestamp>/
├── slides/          # 10 HTML + v3-cover.html
├── images/          # 10 PNG + v3-cover.png（@2x 2160×3840）
├── digest.json      # 原始 24 条
├── digest-xhs.json  # XHS 和谐版（下游用）
├── scored-candidates.md
├── selection-rationale.md
├── pipeline-issues.md
├── xiaohongshu-post.md
├── hero-prompt.md
└── hero-image.png   # 2048×2048 四格漫画
```

---

## Skill 体系

| Skill | 用途 | 触发 |
|-------|------|------|
| **news-card** | 日报主管线 | 「今日 AI 日报」 |
| **XHS-writer** | 小红书文案 | Step 3.6 + 直接请求 |
| **xhs-reviewer** | 7 维合规审核 | Step 3.95 + 直接请求 |
| **xhs-image-hero** | Hero 图 + V3 封面 | 手动触发 |
| **xhs-cover-title** | V3 三行钩子标题 | Hero 之后 |
| **autoresearch** | 元技能优化 | 仅明确要求时 |

---

## 项目结构

```
news-card/
├── CLAUDE.md                        # 项目指令
├── package.json
├── gen-templates.cjs                # 模板生成器
├── skills/
│   ├── news-card/                   # 主管线
│   │   ├── SKILL.md
│   │   ├── templates/               # 10 页 HTML 模板
│   │   ├── references/
│   │   │   ├── config/
│   │   │   │   └── sensitive-word-dict.md  ← 唯一替换表
│   │   │   ├── elements/            # canvas / typography / tier-system
│   │   │   ├── workflows/           # curation / content-standards / xhs-post-guide
│   │   │   ├── scoring-spec.md      # 8 维公式
│   │   │   ├── design-tokens.md     # 色彩 / 字体 / 字号
│   │   │   └── ...
│   │   ├── scripts/
│   │   │   ├── lib/
│   │   │   │   ├── score-engine.js  # classifyTopic + 8 维打分
│   │   │   │   ├── dedup.js         # 去重 + topic 重算
│   │   │   │   ├── render-html.js
│   │   │   │   └── fetch-*.js       # 各源抓取器
│   │   │   ├── check-topic-quota.js # Step 3.7
│   │   │   ├── validate-digest.js   # Step 3.9
│   │   │   └── screenshot.sh
│   │   ├── assets/                  # 字体 / Logo / IP 参考图
│   │   └── examples/
│   ├── XHS-writer/SKILL.md
│   ├── xhs-reviewer/SKILL.md
│   ├── xhs-image-hero/             # Hero 图 + V3 封面
│   ├── xhs-cover-title/            # V3 三行标题
│   └── autoresearch/SKILL.md
├── workspace/                       # 中间数据（gitignored）
└── output/                          # 最终产出（gitignored）
```

---

## 设计规范

- **画布** `1080×1920px`，@2x 输出 `2160×3840px`
- **安全区** 上 280px / 下 240px（XHS 缩略图不裁切）
- **字体** Noto Serif SC + Source Serif Pro（仅衬线）；品牌装饰 ChillDuanHei
- **主题色** 暖白 `#FFF9F5` + 强调橙 `#E8734A` + 金弧 `#c5a059`
- **Logo** 纯 CSS/SVG：双弧金环 + `zz` + `AI每日资讯`

---

## 单独运行

```bash
bash skills/news-card/scripts/fetch-all.sh workspace/candidates.json
bash skills/news-card/scripts/score.sh workspace/candidates.json workspace/scored.json
node skills/news-card/scripts/check-topic-quota.js output/<ts>/digest.json
node skills/news-card/scripts/validate-digest.js output/<ts>/digest.json
node skills/news-card/scripts/lib/render-html.js --input output/<ts>/digest-xhs.json --templates skills/news-card/templates --output output/<ts>/slides --source-count 131 --num-sources 65
bash skills/news-card/scripts/screenshot.sh output/<ts>/slides output/<ts>/images
node skills/xhs-image-hero/scripts/generate.js --promptfile output/<ts>/hero-prompt.md --image output/<ts>/hero-image.png --ref skills/news-card/assets/zz-IP-Ref.png --ar 1:1 --quality 2k
```

---

## 安装为 Claude Code Skill

```bash
cp -r skills/news-card skills/XHS-writer skills/xhs-reviewer skills/xhs-image-hero skills/xhs-cover-title ~/.claude/skills/
```

说「今日 AI 日报」即可触发。
