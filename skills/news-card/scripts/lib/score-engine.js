#!/usr/bin/env node

/**
 * Multi-dimension scoring engine.
 * Formula: total = cross_validation × 2.0 + community × 1.5 + authority × 1.0 + recency × 0.8 + virality × 1.2 + actionability × 0.6 + peer_review × 3.0
 *
 * Usage: node score-engine.js --input candidates.json --output scored.json
 */

import { readFileSync, writeFileSync } from 'fs';

// Weights
const W_CROSS = 2.0;
const W_COMMUNITY = 1.5;
const W_AUTHORITY = 1.0;
const W_RECENCY = 0.8;
const W_VIRALITY = 1.2;
const W_ACTIONABILITY = 0.6;
const W_PEER_REVIEW = 3.0;

// X/Twitter source authority by tier (sources-spec.md v2)
const X_AUTHORITY_TIERS = {
  // Tier A — Official/Company (authority: 3)
  'claudeai': 3, 'sama': 3, 'OpenAI': 3, 'AnthropicAI': 3, 'GoogleAI': 3,
  // Tier C — Commentary/Investor (authority: 1)
  'petergyang': 1, 'thenanyu': 1, 'madhuguru_': 1, 'garrytan': 1, 'mattturck': 1, 'zarazhang': 1,
};
const X_DEFAULT_AUTHORITY = 2; // Tier B — Builder/Practitioner

/**
 * Calculate recency score based on hours since publication.
 */
function recencyScore(publishedISO) {
  const published = new Date(publishedISO);
  if (isNaN(published.getTime())) return 0;
  const hoursAgo = (Date.now() - published.getTime()) / (1000 * 60 * 60);

  if (hoursAgo < 0) return 0; // future dates
  if (hoursAgo < 6) return 3;
  if (hoursAgo < 12) return 2;
  if (hoursAgo < 24) return 1;
  return 0;
}

/**
 * Calculate community heat score from metrics.
 */
function communityScore(metrics) {
  if (!metrics) return 0;
  let score = 0;

  // Hacker News
  const hnPoints = metrics.hn_points || 0;
  if (hnPoints > 500) score = Math.max(score, 6);
  else if (hnPoints > 300) score = Math.max(score, 4);
  else if (hnPoints > 100) score = Math.max(score, 2);

  // HuggingFace
  const hfUpvotes = metrics.hf_upvotes || 0;
  if (hfUpvotes > 20) score = Math.max(score, 4);
  else if (hfUpvotes > 5) score = Math.max(score, 2);

  return score;
}

/**
 * Score virality based on community engagement metrics.
 */
function scoreVirality(item) {
  const metrics = item.community_metrics || {};
  const likes = metrics.likes || 0;

  // X/Twitter tweets — use likes as primary signal
  if (item.source?.startsWith('X/')) {
    if (likes >= 5000) return 5;
    if (likes >= 1000) return 4;
    if (likes >= 500) return 3;
    if (likes >= 100) return 2;
    return likes > 0 ? 1 : 0;
  }

  // HN, HF, general — use the best available metric
  const points = metrics.hn_points || metrics.hf_upvotes || metrics.score || 0;
  if (points >= 200) return 5;
  if (points >= 100) return 4;
  if (points >= 50) return 3;
  if (points >= 20) return 2;
  return points > 0 ? 1 : 0;
}

/**
 * Score actionability based on keywords in title and summary.
 */
function scoreActionability(item) {
  const text = ((item.title || '') + ' ' + (item.summary || '')).toLowerCase();
  const highAction = /\b(launch\w*|release[sd]?|open.?source[sd]?|announc\w*|introduc\w*|available|free|open beta|shipp?\w*|deploy\w*|now available)\b/;
  const medAction = /\b(rais\w*|acquir\w*|partner\w*|invest\w*|fund\w*|merg\w*|hir\w*|expand\w*)\b/;

  if (highAction.test(text)) return 3;
  if (medAction.test(text)) return 2;
  return 1;
}

/**
 * Tokenize a title for similarity comparison.
 */
function tokenize(text) {
  const stopWords = new Set([
    'a', 'an', 'the', 'is', 'are', 'was', 'were', 'in', 'on', 'at',
    'to', 'for', 'of', 'and', 'or', 'but', 'with', 'by', 'from',
    'that', 'this', 'it', 'its', 'has', 'have', 'had', 'be', 'been',
    'will', 'can', 'could', 'would', 'should', 'may', 'might',
    'not', 'no', 'do', 'does', 'did', 'as', 'if', 'how', 'what',
    'which', 'who', 'when', 'where', 'why', 'new', 'first',
  ]);

  return text
    .toLowerCase()
    .replace(/[^\w\s]/g, ' ')
    .split(/\s+/)
    .filter((w) => w.length > 1 && !stopWords.has(w));
}

/**
 * Jaccard similarity between two token sets.
 */
function jaccardSimilarity(tokensA, tokensB) {
  const setA = new Set(tokensA);
  const setB = new Set(tokensB);
  const intersection = new Set([...setA].filter((x) => setB.has(x)));
  const union = new Set([...setA, ...setB]);
  return union.size === 0 ? 0 : intersection.size / union.size;
}

/**
 * Extract key entities (company/org + product/model names) from title text.
 * Returns { org: Set, product: Set } of lowercased entity names.
 */
// Org keywords that require word-boundary matching to avoid substring false positives.
// Each entry: [regex, canonical_org]
const ORG_PATTERNS = [
  [/\bopenai\b/, 'openai'],
  [/\banthropic\b/, 'anthropic'],
  [/\bgoogle\b/, 'google'], [/\bdeepmind\b/, 'google'],
  [/\bmeta ai\b/, 'meta'], [/\bmeta\b(?=.*\b(release|announce|launch|model|llama|sam\s*\d))/, 'meta'],
  [/\bmicrosoft\b/, 'microsoft'], [/\bgithub\b/, 'microsoft'],
  [/\bnvidia\b/, 'nvidia'],
  [/\bapple\b/, 'apple'],
  [/\bmistral\b/, 'mistral'],
  [/\bstability\s*ai\b/, 'stability'],
  [/\bhugging\s*face\b/, 'huggingface'],
  [/\bcursor\b/, 'cursor'],
  [/\brunway\b/, 'runway'], [/\brunwayml\b/, 'runway'],
  [/\bfigure\s*ai\b/, 'figure'],
  [/\bbaai\b/, 'baai'],
  [/\bdeepseek\b/, 'deepseek'],
];

// Product names — matched with word boundaries to avoid substring collisions.
// Sorted longest-first so "gpt-4o" matches before "gpt-4".
const PRODUCT_PATTERNS = [
  'gpt-5', 'gpt-4o', 'gpt-4', 'chatgpt',
  'claude 4', 'claude 3', 'claude',
  'gemini 2.5', 'gemini pro', 'gemini',
  'llama 4', 'llama 3', 'llama',
  'mistral large',
  'copilot agent', 'copilot',
  'alphafold 3', 'alphafold',
  'blackwell', 'b300',
  'phi-4', 'phi-3',
  'sam 3', 'sam 2',
  'gen-4', 'gen-3',
  'stable diffusion',
  'aquila', 'deepseek',
  'sora', 'dall-e',
].map(p => ({ re: new RegExp(`\\b${p.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`), name: p }));

function extractEntities(text) {
  const lower = text.toLowerCase();
  const orgs = new Set();
  const products = new Set();

  for (const [re, canonical] of ORG_PATTERNS) {
    if (re.test(lower)) orgs.add(canonical);
  }
  for (const { re, name } of PRODUCT_PATTERNS) {
    if (re.test(lower)) products.add(name);
  }

  return { orgs, products };
}

/**
 * Check if two items likely cover the same event using entity overlap.
 * Returns true if they share at least one org AND one product,
 * or share at least 2 products.
 * Also accepts titleJaccard as optional context — shared org + moderate title
 * similarity (>0.3) indicates same event for non-product news (funding, policy).
 */
function entitiesMatch(entA, entB, titleJaccard = 0) {
  const sharedOrgs = [...entA.orgs].filter(o => entB.orgs.has(o));
  const sharedProducts = [...entA.products].filter(p => entB.products.has(p));

  if (sharedOrgs.length >= 1 && sharedProducts.length >= 1) return true;
  if (sharedProducts.length >= 2) return true;
  // Shared org + moderate title similarity → same event (e.g., funding news)
  if (sharedOrgs.length >= 1 && titleJaccard > 0.3) return true;
  return false;
}

/**
 * Map a source string to its canonical organization name.
 * Used to enforce "same org blog + twitter = 1 independent source."
 */
const SOURCE_ORG_MAP = new Map([
  ['openai blog', 'openai'], ['x/@openai', 'openai'], ['x/@sama', 'openai'],
  ['anthropic blog', 'anthropic'], ['x/@anthropicai', 'anthropic'], ['x/@claudeai', 'anthropic'],
  ['google ai blog', 'google'], ['deepmind blog', 'google'], ['x/@googleai', 'google'],
  ['google research blog', 'google'],
  ['nvidia blog', 'nvidia'],
  ['meta ai blog', 'meta'],
  ['mistral blog', 'mistral'],
]);

function sourceToOrg(source) {
  const lower = (source || '').toLowerCase();
  for (const [prefix, org] of SOURCE_ORG_MAP) {
    if (lower.startsWith(prefix)) return org;
  }
  return lower;
}

/**
 * Group items by event similarity for cross-validation scoring.
 * Uses both title Jaccard similarity AND entity matching.
 */
function groupByEvent(items) {
  const groups = [];
  const assigned = new Set();

  // Pre-compute tokens and entities
  const precomputed = items.map((item) => ({
    tokens: tokenize(item.title),
    entities: extractEntities((item.title || '') + ' ' + (item.summary || '')),
  }));

  for (let i = 0; i < items.length; i++) {
    if (assigned.has(i)) continue;

    const group = [i];

    for (let j = i + 1; j < items.length; j++) {
      if (assigned.has(j)) continue;

      const titleSim = jaccardSimilarity(precomputed[i].tokens, precomputed[j].tokens);
      const entityMatch = entitiesMatch(precomputed[i].entities, precomputed[j].entities, titleSim);

      // Match if title similarity > 0.3 OR entities match (which may use titleSim as context)
      if (titleSim > 0.3 || entityMatch) {
        group.push(j);
        assigned.add(j);
      }
    }

    assigned.add(i);
    groups.push(group);
  }

  return groups;
}

/**
 * Normalize a URL for comparison (strip protocol, www, trailing slashes, query params).
 */
function normalizeUrl(url) {
  return (url || '').replace(/^https?:\/\//, '').replace(/\/+$/, '').replace(/\?.*$/, '').replace(/^www\./, '').toLowerCase();
}

/**
 * Extract title words as a Set for similarity comparison.
 */
function titleWords(title) {
  return new Set((title || '').toLowerCase().split(/[\s\-–—:,;.!?()[\]{}'"]+/).filter(w => w.length > 2));
}

/**
 * Jaccard similarity between two Sets.
 */
function jaccardSimilarityPeer(setA, setB) {
  if (setA.size === 0 || setB.size === 0) return 0;
  let intersection = 0;
  for (const w of setA) { if (setB.has(w)) intersection++; }
  const union = new Set([...setA, ...setB]).size;
  return intersection / union;
}

/**
 * Score peer review based on newsletter signal matches.
 */
function scorePeerReview(item, signals) {
  if (!signals || signals.length === 0) return 0;

  const candidateUrl = normalizeUrl(item.url || item.source_url || '');
  const candidateWords = titleWords(item.title || '');
  let mentionCount = 0;

  for (const newsletter of signals) {
    let mentioned = false;
    for (const signal of newsletter.items) {
      // Primary: URL match
      if (candidateUrl && signal.url && normalizeUrl(signal.url) === candidateUrl) {
        mentioned = true;
        break;
      }
      // Secondary: title word overlap (Jaccard > 0.4)
      const signalWords = titleWords(signal.title);
      if (jaccardSimilarityPeer(candidateWords, signalWords) > 0.4) {
        mentioned = true;
        break;
      }
    }
    if (mentioned) mentionCount++;
  }

  if (mentionCount >= 4) return 5;
  if (mentionCount >= 3) return 4;
  if (mentionCount >= 2) return 3;
  if (mentionCount >= 1) return 2;
  return 0;
}

/**
 * Score all candidates.
 */
function scoreAll(candidates, newsletterSignals) {
  // Group by event for cross-validation
  const eventGroups = groupByEvent(candidates);

  // Build cross-validation map: item index → number of independent sources covering same event
  const crossMap = new Map();
  for (const group of eventGroups) {
    // Count unique organizations (not just source strings) for independent source counting
    const orgs = new Set(group.map((idx) => sourceToOrg(candidates[idx].source)));
    for (const idx of group) {
      crossMap.set(idx, orgs.size);
    }
  }

  // Score each candidate
  const scored = candidates.map((item, idx) => {
    const sourceCount = crossMap.get(idx) || 1;
    const crossValidation = Math.min(sourceCount > 1 ? (sourceCount - 1) * 3 : 0, 12);
    const community = communityScore(item.community_metrics);
    let authority = item.source_authority || 3;
    // Apply X tier-based authority override (sources-spec.md v2)
    if (item.source && item.source.startsWith('X/')) {
      const handle = item.source.replace(/^X\/@?/, '').split(' ')[0];
      authority = X_AUTHORITY_TIERS[handle] ?? X_DEFAULT_AUTHORITY;
    }
    const recency = recencyScore(item.published);
    const virality = scoreVirality(item);
    const actionability = scoreActionability(item);
    const peerReview = scorePeerReview(item, newsletterSignals);

    let totalScore =
      crossValidation * W_CROSS +
      community * W_COMMUNITY +
      authority * W_AUTHORITY +
      recency * W_RECENCY +
      virality * W_VIRALITY +
      actionability * W_ACTIONABILITY +
      peerReview * W_PEER_REVIEW;

    const isXOnly = item.source?.startsWith('X/') && crossValidation === 0;

    // X-only items cannot enter spotlight tier (scoring-spec.md: "不得进入第一梯队")
    if (isXOnly) {
      totalScore = Math.min(totalScore, 11.9);
    }

    // Find related sources from the same event group
    const eventGroup = eventGroups.find((g) => g.includes(idx)) || [idx];
    const relatedSources = eventGroup
      .filter((i) => i !== idx)
      .map((i) => ({ source: candidates[i].source, url: candidates[i].url }));

    return {
      ...item,
      scores: {
        cross_validation: crossValidation,
        community_heat: community,
        authority,
        recency,
        virality,
        actionability,
        peer_review: peerReview,
        total: Math.round(totalScore * 10) / 10,
        x_only: isXOnly,
        requires_confirmation: item.requires_confirmation || isXOnly,
      },
      related_sources: relatedSources,
    };
  });

  // Sort by total score descending
  scored.sort((a, b) => b.scores.total - a.scores.total);

  return scored;
}

// CLI entry point
const args = process.argv.slice(2);
const inputIdx = args.indexOf('--input');
const outputIdx = args.indexOf('--output');
const signalsIdx = args.indexOf('--signals');

if (inputIdx === -1) {
  console.error('Usage: node score-engine.js --input candidates.json [--output scored.json] [--signals newsletter-signals.json]');
  process.exit(1);
}

const inputFile = args[inputIdx + 1];
const outputFile = outputIdx !== -1 ? args[outputIdx + 1] : null;
const signalsPath = signalsIdx !== -1 ? args[signalsIdx + 1] : null;

let newsletterSignals = [];
if (signalsPath) {
  try {
    const data = JSON.parse(readFileSync(signalsPath, 'utf-8'));
    newsletterSignals = data.signals || [];
    console.error(`[score] Loaded ${newsletterSignals.length} newsletter signal sources`);
  } catch (err) {
    console.error(`[score] Warning: could not load signals: ${err.message}`);
  }
}

const candidates = JSON.parse(readFileSync(inputFile, 'utf-8'));
const scored = scoreAll(candidates, newsletterSignals);

console.error(`[score] Scored ${scored.length} candidates`);
console.error(`[score] Score distribution: ≥12: ${scored.filter((s) => s.scores.total >= 12).length}, ≥6: ${scored.filter((s) => s.scores.total >= 6).length}, <6: ${scored.filter((s) => s.scores.total < 6).length}`);

const output = JSON.stringify(scored, null, 2);
if (outputFile) {
  writeFileSync(outputFile, output);
  console.error(`[score] Wrote to ${outputFile}`);
} else {
  process.stdout.write(output);
}

export { scoreAll, tokenize, jaccardSimilarity, extractEntities, sourceToOrg };
