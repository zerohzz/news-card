---
name: style-presets
description: Preset shortcuts mapping to style + layout combinations
---

# Style Presets

`--preset X` expands to a style + layout combination. Users can override either dimension.

| --preset | Style | Layout |
|----------|-------|--------|
| `knowledge-card` | `notion` | `dense` |
| `checklist` | `notion` | `list` |
| `concept-map` | `notion` | `mindmap` |
| `swot` | `notion` | `quadrant` |
| `tutorial` | `chalkboard` | `flow` |
| `classroom` | `chalkboard` | `balanced` |
| `study-guide` | `study-notes` | `dense` |
| `cute-share` | `cute` | `balanced` |
| `girly` | `cute` | `sparse` |
| `cozy-story` | `warm` | `balanced` |
| `product-review` | `fresh` | `comparison` |
| `nature-flow` | `fresh` | `flow` |
| `warning` | `bold` | `list` |
| `versus` | `bold` | `comparison` |
| `clean-quote` | `minimal` | `sparse` |
| `pro-summary` | `minimal` | `balanced` |
| `retro-ranking` | `retro` | `list` |
| `throwback` | `retro` | `balanced` |
| `pop-facts` | `pop` | `list` |
| `hype` | `pop` | `sparse` |
| `poster` | `screen-print` | `sparse` |
| `editorial` | `screen-print` | `balanced` |
| `cinematic` | `screen-print` | `comparison` |

## 日报专属预设（zz AI Daily）

| --preset | Style | Layout | 场景 |
|----------|-------|--------|------|
| `daily-cover` | `notion` | `sparse` | 日报封面（默认推荐） |
| `daily-dense` | `notion` | `dense` | 日报信息密集版封面 |
| `hot-topic` | `bold` | `balanced` | 热点事件速报 |
| `tech-explain` | `chalkboard` | `flow` | 技术概念解读 |
| `ai-ranking` | `minimal` | `list` | AI 工具/模型排名 |
| `deep-dive` | `study-notes` | `dense` | 深度分析笔记 |
| `trend-poster` | `screen-print` | `sparse` | AI 趋势海报 |
| `weekly-recap` | `fresh` | `list` | 周报合集 |
| `model-compare` | `notion` | `comparison` | 模型对比 |
| `timeline` | `retro` | `flow` | AI 发展时间线 |

## Override Examples

- `--preset knowledge-card --style chalkboard` = chalkboard style with dense layout
- `--preset poster --layout quadrant` = screen-print style with quadrant layout

Explicit `--style`/`--layout` flags always override preset values.
