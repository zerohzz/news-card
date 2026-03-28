# Round B Implementation Plan — Scripts Match v2 Specs

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Make all scripts enforce the v2 spec rules — X authority tiers, dedup tuning, newsletter cleanup, and docs alignment.

**Architecture:** 7 independent tasks touching score-engine, dedup, fetch-newsletters, fetch-follow-builders, SKILL.md, and CLAUDE.md. No template or render changes.

**Tech Stack:** Node.js ESM, bash scripts, markdown docs

---

### Task 1: X Authority Tiers in score-engine.js

**Files:**
- Modify: `skills/news-card/scripts/lib/score-engine.js:239`

**Context:** Currently line 239 reads `source_authority` from each item, defaulting to 3. The fetch-follow-builders.js hardcodes authority=5 for all X items. We need score-engine to apply tier-based authority for X sources.

**Step 1: Add X tier authority mapping**

At line ~21 (after weight constants), add:

```javascript
// X/Twitter source authority by tier (sources-spec.md v2)
const X_AUTHORITY_TIERS = {
  // Tier A — Official/Company
  'claudeai': 3, 'sama': 3, 'OpenAI': 3, 'AnthropicAI': 3, 'GoogleAI': 3,
  // Tier B — Builder/Practitioner (default for X)
  // Everything else defaults to 2
  // Tier C — Commentary/Investor
  'petergyang': 1, 'thenanyu': 1, 'madhuguru_': 1, 'garrytan': 1, 'mattturck': 1, 'zarazhang': 1,
};
const X_DEFAULT_AUTHORITY = 2; // Tier B default
```

**Step 2: Update authority resolution (line 239)**

Replace:
```javascript
const authority = item.source_authority || 3;
```

With:
```javascript
let authority = item.source_authority || 3;
// Apply X tier-based authority override
if (item.source && item.source.startsWith('X/')) {
  const handle = item.source.replace(/^X\/@?/, '').split(' ')[0];
  authority = X_AUTHORITY_TIERS[handle] ?? X_DEFAULT_AUTHORITY;
}
```

**Step 3: Test**

```bash
cd C:/Users/AlexHuang/projects/news-card
bash skills/news-card/scripts/score.sh workspace/2026-03-27_22-03-31/candidates.json /tmp/test-roundb.json 2>&1
node -e "const items=JSON.parse(require('fs').readFileSync(process.argv[1],'utf8')); items.filter(i=>i.source&&i.source.startsWith('X/')).slice(0,10).forEach(i=>console.log('auth='+i.scores.authority+' | '+i.source.substring(0,35)))" "$(cygpath -w /tmp/test-roundb.json)"
```

Expected: X/@karpathy → authority=2, X/@claudeai → authority=3, X/@garrytan → authority=1

**Step 4: Commit**

```bash
git add skills/news-card/scripts/lib/score-engine.js
git commit -m "feat: X authority tiers (3/2/1) per sources-spec.md v2"
```

---

### Task 2: Dedup Threshold + AI Stop Words in dedup.js

**Files:**
- Modify: `skills/news-card/scripts/lib/dedup.js:12-19,96`

**Step 1: Add AI-domain stop words (line 12-19)**

Expand the STOP_WORDS set. Add after the existing words:

```javascript
const STOP_WORDS = new Set([
  // General English
  'a', 'an', 'the', 'is', 'are', 'was', 'were', 'in', 'on', 'at',
  'to', 'for', 'of', 'and', 'or', 'but', 'with', 'by', 'from',
  'that', 'this', 'it', 'its', 'has', 'have', 'had', 'be', 'been',
  'will', 'can', 'could', 'would', 'should', 'may', 'might',
  'not', 'no', 'do', 'does', 'did', 'as', 'if', 'how', 'what',
  'which', 'who', 'when', 'where', 'why', 'new', 'first',
  // AI domain (scoring-spec.md v2)
  'ai', 'artificial', 'intelligence', 'machine', 'learning', 'deep',
  'model', 'neural', 'network', 'using', 'based', 'powered', 'driven',
  'enables', 'announces', 'launches', 'introduces', 'reveals', 'unveils',
  'tool', 'platform', 'update', 'feature', 'support', 'data',
  'training', 'system', 'research', 'user',
]);
```

**Step 2: Raise Jaccard threshold (line 96)**

Replace:
```javascript
if (titleSim > 0.6 || kwOverlap > 0.7) {
```

With:
```javascript
if (titleSim > 0.7 || kwOverlap > 0.7) {
```

**Step 3: Test**

```bash
bash skills/news-card/scripts/score.sh workspace/2026-03-27_22-03-31/candidates.json /tmp/test-dedup.json 2>&1 | grep dedup
```

Expected: fewer items deduped (threshold is stricter → fewer false merges)

**Step 4: Commit**

```bash
git add skills/news-card/scripts/lib/dedup.js
git commit -m "feat: AI-domain stop words + raise Jaccard dedup threshold 0.6→0.7"
```

---

### Task 3: Remove Ben's Bites from fetch-newsletters.js

**Files:**
- Modify: `skills/news-card/scripts/lib/fetch-newsletters.js:12-19`

**Step 1: Remove Ben's Bites from RSS_SOURCES array**

Delete the Ben's Bites entry (lines 13-18):
```javascript
{
  name: "Ben's Bites",
  url: 'https://www.bensbites.com/feed',
  authority: 5,
  filterSponsors: true,
},
```

Keep Import AI and Platformer.

**Step 2: Test**

```bash
node skills/news-card/scripts/lib/fetch-newsletters.js --output /tmp/test-nl.json 2>&1
```

Expected: 3 sources (Import AI, Platformer, TLDR AI). No Ben's Bites.

**Step 3: Commit**

```bash
git add skills/news-card/scripts/lib/fetch-newsletters.js
git commit -m "fix: remove deprecated Ben's Bites from newsletter fetcher"
```

---

### Task 4: X Authority Tiers in fetch-follow-builders.js

**Files:**
- Modify: `skills/news-card/scripts/lib/fetch-follow-builders.js:59-73`

**Step 1: Add tier authority mapping**

Near the top of the file (after imports), add the same tier mapping:

```javascript
const X_AUTHORITY_TIERS = {
  'claudeai': 3, 'sama': 3, 'OpenAI': 3, 'AnthropicAI': 3, 'GoogleAI': 3,
  'petergyang': 1, 'thenanyu': 1, 'madhuguru_': 1, 'garrytan': 1, 'mattturck': 1, 'zarazhang': 1,
};
const X_DEFAULT_AUTHORITY = 2;
```

**Step 2: Update convertTweet function (line 67)**

Replace:
```javascript
authority: 5,
```

With:
```javascript
authority: X_AUTHORITY_TIERS[tweet.author?.replace(/^@/, '')] ?? X_DEFAULT_AUTHORITY,
requires_confirmation: true,
```

Note: Check the actual tweet object structure to get the correct field for the author handle.

**Step 3: Test**

```bash
node skills/news-card/scripts/lib/fetch-follow-builders.js --output /tmp/test-fb.json 2>&1
node -e "const d=JSON.parse(require('fs').readFileSync(process.argv[1],'utf8')); d.slice(0,5).forEach(i=>console.log('auth='+i.authority+' conf='+i.requires_confirmation+' | '+i.source.substring(0,35)))" "$(cygpath -w /tmp/test-fb.json)"
```

Expected: Items have tier-appropriate authority (2 for most builders) and `requires_confirmation: true`

**Step 4: Commit**

```bash
git add skills/news-card/scripts/lib/fetch-follow-builders.js
git commit -m "feat: X authority tiers + requires_confirmation in follow-builders fetcher"
```

---

### Task 5: X Single-Source Policy in score-engine.js

**Files:**
- Modify: `skills/news-card/scripts/lib/score-engine.js`

**Step 1: Add X single-source flag to output**

After the total score computation (line ~252), add logic to flag X-only items:

```javascript
const isXOnly = item.source?.startsWith('X/') && crossValidation === 0;
```

In the scores output object (around line 260), add:
```javascript
x_only: isXOnly,
requires_confirmation: item.requires_confirmation || false,
```

This flag is informational — the curate step (Claude) uses it to enforce the "no X-only in tier-1" rule.

**Step 2: Test**

```bash
bash skills/news-card/scripts/score.sh workspace/2026-03-27_22-03-31/candidates.json /tmp/test-xflag.json 2>&1
node -e "const d=JSON.parse(require('fs').readFileSync(process.argv[1],'utf8')); const xonly=d.filter(i=>i.scores.x_only); console.log('X-only items: '+xonly.length); xonly.slice(0,5).forEach(i=>console.log('  '+i.scores.total.toFixed(1)+' | '+i.source.substring(0,35)+' | '+i.title.substring(0,40)))"  "$(cygpath -w /tmp/test-xflag.json)"
```

Expected: X-only items flagged correctly

**Step 3: Commit**

```bash
git add skills/news-card/scripts/lib/score-engine.js
git commit -m "feat: flag X-only items with x_only and requires_confirmation in scores"
```

---

### Task 6: Fix SKILL.md Step Numbering

**Files:**
- Modify: `skills/news-card/SKILL.md`

**Context:** The linter output shows Step 3 (Enrich) appears AFTER Step 4 (Curate), which is wrong. The Enrich step should be between Score and Curate. Also, "输出 8 个 HTML" should be "9 个 HTML", and "8 张 PNG" should be "9 张 PNG".

**Step 1: Reorder steps**

Ensure the order is:
1. Step 1 — Fetch
2. Step 2 — Score + Dedup
3. Step 3 — Enrich (future)
4. Step 4 — Curate
5. Step 5 — Render HTML (update: "9 个 HTML")
6. Step 6 — Screenshot (update: "9 张 PNG")

**Step 2: Commit**

```bash
git add skills/news-card/SKILL.md
git commit -m "fix: correct SKILL.md step ordering and page counts"
```

---

### Task 7: Update CLAUDE.md Formula

**Files:**
- Modify: `CLAUDE.md:72`

**Step 1: Update the outdated formula**

Replace line 72:
```
Applies scoring formula: `cross_validation × 2.0 + community × 1.5 + authority × 1.0 + recency × 0.8`. Deduplicates via Jaccard similarity.
```

With:
```
Applies 7-dimension scoring formula (see `references/scoring-spec.md`): cross_validation, community_heat, authority, recency, virality, actionability, peer_review. Deduplicates via Jaccard similarity (threshold 0.7).
```

Also update any "8 PNG" references to "9 PNG" and "8 HTML" to "9 HTML".

**Step 2: Commit**

```bash
git add CLAUDE.md
git commit -m "docs: update CLAUDE.md formula reference and page counts to match v2"
```

---

## Verification (after all tasks)

```bash
# Full pipeline test
bash skills/news-card/scripts/score.sh workspace/2026-03-27_22-03-31/candidates.json /tmp/final-roundb.json 2>&1

# Check X authority tiers
node -e "..." # verify X sources have 3/2/1 authority

# Check dedup count changed
# Check newsletter signals (no Ben's Bites)
# Check X-only flagging
# Grep for consistency: no bare 'community' in scoring context
```
