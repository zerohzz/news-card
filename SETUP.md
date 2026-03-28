# Environment Setup Guide

This guide ensures the `news-card` pipeline runs correctly on a fresh machine or sandbox environment.

---

## Prerequisites

| Dependency | Version | Purpose |
|------------|---------|---------|
| **Node.js** | v18+ | Runtime for all scripts |
| **npm** | v8+ | Package manager |
| **Bun** | v1.0+ | Required by gstack skills |
| **Git** | v2+ | Version control |
| **Playwright Chromium** | (auto-installed) | HTML → PNG screenshot |

---

## Step 1: Install Node.js Dependencies

```bash
cd /path/to/news-card
npm install
```

This installs:
- `rss-parser` — RSS feed parsing (used by `fetch-rss.js`, `fetch-newsletters.js`)
- `playwright` — Headless browser for screenshots

### Verify Playwright Browser

```bash
npx playwright install chromium
```

> If running in a sandboxed environment without access to `storage.googleapis.com`, Playwright Chromium may fail to download. The fetch + score pipeline still works; only the screenshot step (`screenshot.sh`) requires Chromium.

---

## Step 2: Install Skills (Optional, for development workflow)

### gstack (code review, QA, investigation)

```bash
git clone --single-branch --depth 1 https://github.com/garrytan/gstack.git ~/.claude/skills/gstack
cd ~/.claude/skills/gstack && ./setup
```

Key skills for this project: `/review`, `/investigate`, `/plan-eng-review`, `/autoplan`

### superpowers (planning, TDD, debugging)

```bash
git clone --single-branch --depth 1 https://github.com/obra/superpowers.git ~/.claude/skills/superpowers
```

Key skills for this project: `/brainstorm`, `/write-plan`, `/execute-plan`, `systematic-debugging`

---

## Step 3: Verify Pipeline

```bash
# Test fetch (requires internet access to RSS feeds, HN API, HuggingFace API)
bash skills/news-card/scripts/fetch-all.sh workspace/candidates.json

# Test score + dedup
bash skills/news-card/scripts/score.sh workspace/candidates.json workspace/scored.json
```

---

## Network Requirements

The fetch step requires outbound HTTPS access to:

| Host | Purpose |
|------|---------|
| `news.ycombinator.com` | Hacker News API |
| `huggingface.co` | HuggingFace Papers API |
| Various RSS feed domains | RSS source fetching (see `references/sources-spec.md`) |
| `x.com` / `api.x.com` | Twitter/X guest mode (optional, may fail) |
| `www.anthropic.com`, `ai.meta.com`, etc. | Blog scraping |
| `*.substack.com` | Newsletter signal fetching |

> If any source is unreachable, the pipeline continues with partial results. Only `rss-parser` (npm) is a hard dependency for the fetch step.

---

## Troubleshooting

| Symptom | Cause | Fix |
|---------|-------|-----|
| `Cannot find package 'rss-parser'` | npm dependencies not installed | Run `npm install` |
| `fetch failed` on all sources | No outbound network access | Check firewall / proxy settings |
| Playwright Chromium download fails | `storage.googleapis.com` blocked | Run `npx playwright install chromium` manually, or set `PLAYWRIGHT_BROWSERS_PATH` |
| gstack `./setup` fails at Chromium | Same as above | Core skills still work; browser skills (`/browse`, `/qa`) won't |
| `0 candidates` after fetch | Network partially blocked or all feeds down | Check individual fetcher logs in stderr |

---

## API Keys (Future)

Currently no API keys are required. Future integrations may need:

| API | Env Variable | Purpose | Status |
|-----|-------------|---------|--------|
| Twitter/X API | `TWITTER_BEARER_TOKEN` | Authenticated tweet fetching | Planned |
| OpenAI / Claude | `ANTHROPIC_API_KEY` | LLM-assisted curation (Stage 2 rerank) | Planned |

---

## Quick Start (Copy-Paste)

```bash
# One-liner for fresh environment
npm install && npx playwright install chromium

# Full pipeline
bash skills/news-card/scripts/run-digest.sh
```
