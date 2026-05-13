# Setup

This guide walks through getting `news-card` running on a fresh machine.

---

## Prerequisites

| Dependency | Version | Why |
|------------|---------|-----|
| Node.js | ≥ 18 | Runtime for every script |
| npm | ≥ 8 | Package manager |
| Git | ≥ 2 | Source control |
| Playwright Chromium | auto-installed | HTML → PNG rendering |

The pipeline runs offline once the feeds are cached. Only the fetch step needs the public internet.

---

## Install

```bash
git clone https://github.com/zerohzz/news-card.git
cd news-card
npm install
npx playwright install chromium
```

If `npx playwright install chromium` fails because `storage.googleapis.com` is blocked, the fetch / score / curate / render steps still work — only the screenshot step needs Chromium.

---

## Optional: Gemini for the hero cover

The four-panel hero image and V3 cover use Google Gemini. Without a key the rest of the pipeline still produces 10 finished cards; you just won't get the V3 hero.

```bash
cp .env.example .env
# Get a key at https://aistudio.google.com/apikey and paste it into .env
```

Either `GEMINI_API_KEY` or `GOOGLE_API_KEY` works — they're aliases.

---

## Smoke test

```bash
# Fetch + score (needs outbound HTTPS to the source list)
bash skills/news-card/scripts/fetch-all.sh workspace/candidates.json
bash skills/news-card/scripts/score.sh    workspace/candidates.json workspace/scored.json
```

If you see `workspace/scored-news.json` and `workspace/scored-signals.json`, the pipeline is healthy.

---

## Network endpoints

The fetch step makes outbound HTTPS requests to:

| Host | Purpose |
|------|---------|
| `news.ycombinator.com` | Hacker News API |
| `huggingface.co` | HuggingFace Papers API |
| RSS feed domains (~65) | See [`skills/news-card/references/sources-spec.md`](skills/news-card/references/sources-spec.md) |
| `*.substack.com` | Newsletter signal fetching |
| Vendor blogs (`anthropic.com`, `ai.meta.com`, etc.) | Blog scraping |

If a source is unreachable the pipeline continues with partial results.

---

## Troubleshooting

| Symptom | Cause | Fix |
|---------|-------|-----|
| `Cannot find package 'rss-parser'` | npm deps not installed | `npm install` |
| `fetch failed` everywhere | No outbound network | Check firewall / proxy |
| Playwright Chromium download fails | `storage.googleapis.com` blocked | `npx playwright install chromium`, or `PLAYWRIGHT_BROWSERS_PATH=...` |
| `0 candidates` after fetch | Most feeds blocked or down | Inspect per-fetcher stderr |
| Hero image step errors out | Missing `GEMINI_API_KEY` | Skip the hero step or add a key |

---

## One-liner for fresh environments

```bash
npm install && npx playwright install chromium && bash skills/news-card/scripts/run-digest.sh
```
