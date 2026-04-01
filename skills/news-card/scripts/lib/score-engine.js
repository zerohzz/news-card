#!/usr/bin/env node

/**
 * Multi-dimension scoring engine.
 * Formula: total = cross_validation × 2.0 + community × 1.5 + authority × 1.0 + recency × 0.8 + virality × 1.2 + actionability × 0.6 + peer_review × 3.0
 *
 * Usage: node score-engine.js --input candidates.json --output scored.json
 */

import { readFileSync, writeFileSync } from 'fs';
import { pathToFileURL } from 'url';
import { extractEntities, entitiesMatch } from './entities.js';
import { normalizeCandidateSchema } from './pipeline-utils.js';

// Weights
const W_CROSS = 2.0;
const W_COMMUNITY = 1.5;
const W_AUTHORITY = 1.0;
const W_RECENCY = 0.8;
const W_VIRALITY = 1.2;
const W_ACTIONABILITY = 0.6;
const W_PEER_REVIEW = 3.0;

// X/Twitter source authority by tier.
const X_AUTHORITY_TIERS = {
  // Tier A: official/company
  claudeai: 4,
  sama: 4,
  openai: 4,
  anthropicai: 4,
  googleai: 4,
  deepmind: 4,
  demishassabis: 4,
  // Tier C: commentary/investor
  petergyang: 2,
  thenanyu: 2,
  madhuguru_: 2,
  garrytan: 2,
  mattturck: 2,
  zarazhang: 2,
};
const X_DEFAULT_AUTHORITY = 3; // Tier B: builder/practitioner

/**
 * Calculate recency score using exponential decay.
 * Replaces the step-function (3/2/1/0) with smooth decay to eliminate the 24h cliff.
 * Half-life = 8 hours: score halves every 8h. Below 0.2 → rounds to 0.
 */
function recencyScore(publishedISO) {
  const published = new Date(publishedISO);
  if (isNaN(published.getTime())) return 0;
  const hoursAgo = (Date.now() - published.getTime()) / (1000 * 60 * 60);

  if (hoursAgo < 0) return 0; // future dates
  const maxScore = 3;
  const halfLifeHours = 12;
  const minScore = 0.2;
  const lambda = Math.LN2 / halfLifeHours;
  const raw = maxScore * Math.exp(-lambda * hoursAgo);
  return raw < minScore ? 0 : Math.round(raw * 10) / 10;
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

  // HuggingFace (raised thresholds — >20 upvotes is too common on HF daily papers)
  const hfUpvotes = metrics.hf_upvotes || 0;
  if (hfUpvotes > 80) score = Math.max(score, 4);
  else if (hfUpvotes > 30) score = Math.max(score, 2);

  // X/Twitter — follow-builders data already includes likes/comments
  const xLikes = metrics.likes || 0;
  if (xLikes >= 3000) score = Math.max(score, 6);
  else if (xLikes >= 1000) score = Math.max(score, 4);
  else if (xLikes >= 300) score = Math.max(score, 2);

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

  let score = 1;
  if (highAction.test(text)) score = 3;
  else if (medAction.test(text)) score = 2;

  // Academic sources: "we introduce", "code available" ≠ product launch actionability
  const isAcademic = /huggingface|arxiv|papers/i.test(item.source || '');
  if (isAcademic && score === 3) return 2;

  return score;
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
// Entity extraction and matching imported from shared module (entities.js)

/**
 * Map a source string to its canonical organization name.
 * Used to enforce "same org blog + twitter = 1 independent source."
 */
const SOURCE_ORG_MAP = new Map([
  ['openai blog', 'openai'], ['x/@openai', 'openai'], ['x/@sama', 'openai'],
  ['anthropic blog', 'anthropic'], ['x/@anthropicai', 'anthropic'], ['x/@claudeai', 'anthropic'],
  ['google ai blog', 'google'], ['deepmind blog', 'google'], ['x/@googleai', 'google'],
  ['x/@deepmind', 'google'], ['x/@demishassabis', 'google'],
  ['google research blog', 'google'],
  ['nvidia blog', 'nvidia'],
  ['meta ai blog', 'meta'],
  ['mistral blog', 'mistral'],
  ['blog/openai', 'openai'],
  ['blog/anthropic', 'anthropic'],
  ['blog/google', 'google'],
  ['blog/deepmind', 'google'],
  ['blog/nvidia', 'nvidia'],
  ['blog/meta', 'meta'],
  ['blog/mistral', 'mistral'],
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

      // Match if title similarity > 0.2 OR entities match (which may use titleSim as context)
      if (titleSim > 0.2 || entityMatch) {
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
 * Extract entity names from candidate for cross-language matching.
 * Uses the same extractEntities from entities.js.
 */
function candidateEntityNames(item) {
  const ent = extractEntities((item.title || '') + ' ' + (item.summary || ''));
  return new Set([...ent.orgs, ...ent.products]);
}

/**
 * Score peer review based on newsletter signal matches.
 * Supports both English (title Jaccard) and Chinese (entity-based) matching.
 */
function scorePeerReview(item, signals) {
  if (!signals || signals.length === 0) return 0;

  const candidateUrl = normalizeUrl(item.url || item.source_url || '');
  const candidateWords = titleWords(item.title || '');
  const candidateEntities = candidateEntityNames(item);
  let mentionCount = 0;
  let weightedSum = 0;

  for (const newsletter of signals) {
    let mentioned = false;
    const isChinese = newsletter.lang === 'zh';

    for (const signal of newsletter.items) {
      // Primary: URL match (EN sources only — CN sources rarely share URLs)
      if (!isChinese && candidateUrl && signal.url && normalizeUrl(signal.url) === candidateUrl) {
        mentioned = true;
        break;
      }

      if (isChinese) {
        // Chinese matching: use cn_entities extracted during fetch
        // Require ≥2 shared entities, OR 1 entity + title keyword overlap
        // Single-entity matches (e.g. just "OpenAI") are too loose
        const cnEnts = signal.cn_entities || [];
        if (cnEnts.length > 0) {
          const shared = cnEnts.filter(e => candidateEntities.has(e));
          if (shared.length >= 2) {
            mentioned = true;
            break;
          }
          // 1 shared entity + title keyword overlap as fallback
          if (shared.length === 1) {
            const signalTitleWords = titleWords(signal.title || '');
            if (jaccardSimilarityPeer(candidateWords, signalTitleWords) > 0.15) {
              mentioned = true;
              break;
            }
          }
        }
      } else {
        // English matching strategy 1: URL match (handled above)
        // Strategy 2: title word Jaccard
        const signalWords = titleWords(signal.title);
        const jaccThreshold = signalWords.size <= 5 ? 0.3 : 0.4;
        if (jaccardSimilarityPeer(candidateWords, signalWords) > jaccThreshold) {
          mentioned = true;
          break;
        }
        // Strategy 3: entity-based matching for EN newsletters
        // If signal and candidate share ≥1 org+product or ≥2 entities, match
        const signalEntities = extractEntities(signal.title || '');
        const sharedOrgs = [...signalEntities.orgs].filter(o => candidateEntities.has(o));
        const sharedProducts = [...signalEntities.products].filter(p => candidateEntities.has(p));
        if (sharedOrgs.length >= 1 && sharedProducts.length >= 1) {
          mentioned = true;
          break;
        }
        if (sharedOrgs.length + sharedProducts.length >= 2) {
          mentioned = true;
          break;
        }
        // Strategy 4: containment match for keyword-style signals (TLDR)
        if (signalWords.size >= 2 && signalWords.size <= 8) {
          const fullWords = titleWords((item.title || '') + ' ' + (item.summary || ''));
          let contained = 0;
          for (const w of signalWords) { if (fullWords.has(w)) contained++; }
          const threshold = signalWords.size <= 3 ? 1.0 : 0.6;
          if (contained / signalWords.size >= threshold) {
            mentioned = true;
            break;
          }
        }
      }
    }
    if (mentioned) {
      // Weight by source authority: high-authority newsletters count more
      const auth = newsletter.authority || 3;
      const weight = auth >= 5 ? 1.5 : auth >= 4 ? 1.2 : auth >= 3 ? 1.0 : 0.7;
      weightedSum += weight;
      mentionCount++;
    }
  }

  // Map weighted sum to 0–5 score (preserves existing range + W_PEER_REVIEW = 3.0)
  if (weightedSum >= 4.0) return 5;
  if (weightedSum >= 3.0) return 4;
  if (weightedSum >= 2.0) return 3;
  if (weightedSum >= 0.5) return 2;
  return 0;
}

/**
 * Score all candidates.
 */
function scoreAll(candidates, newsletterSignals) {
  const normalizedCandidates = candidates.map((candidate, index) =>
    normalizeCandidateSchema(candidate, {
      index,
      warn: (message) => console.error(message),
    })
  );

  // Group by event for cross-validation
  const eventGroups = groupByEvent(normalizedCandidates);

  // Build cross-validation map: item index → number of independent sources covering same event
  const crossMap = new Map();
  for (const group of eventGroups) {
    // Count unique organizations (not just source strings) for independent source counting
    const orgs = new Set(group.map((idx) => sourceToOrg(normalizedCandidates[idx].source)));
    for (const idx of group) {
      crossMap.set(idx, orgs.size);
    }
  }

  // Score each candidate
  const scored = normalizedCandidates.map((item, idx) => {
    const sourceCount = crossMap.get(idx) || 1;
    const crossValidation = Math.min(sourceCount > 1 ? (sourceCount - 1) * 3 : 0, 12);
    const community = communityScore(item.community_metrics);
    let authority = item.source_authority || 3;
    // Apply X tier-based authority override.
    if (item.source && item.source.startsWith('X/')) {
      const handle = item.source.replace(/^X\/@?/, '').split(' ')[0].toLowerCase();
      authority = X_AUTHORITY_TIERS[handle] ?? X_DEFAULT_AUTHORITY;
    }
    // Curated builder bonus: follow-builders X accounts are hand-picked, +1 authority
    const isCuratedBuilder = item.source_collection === 'follow-builders'
      && item.source_family === 'follow_builders_x';
    if (isCuratedBuilder) authority = Math.min(authority + 1, 5);
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

    // X-only cap: tiered by community heat (curated builders with viral posts deserve higher caps)
    if (isXOnly) {
      if (community >= 6) totalScore = Math.min(totalScore, 18);
      else if (community >= 4) totalScore = Math.min(totalScore, 15);
      else totalScore = Math.min(totalScore, 11.9);
    }

    // Find related sources from the same event group
    const eventGroup = eventGroups.find((g) => g.includes(idx)) || [idx];
    const relatedSources = eventGroup
      .filter((i) => i !== idx)
      .map((i) => ({ source: normalizedCandidates[i].source, url: normalizedCandidates[i].url }));

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
const isDirectExecution = process.argv[1]
  && import.meta.url === pathToFileURL(process.argv[1]).href;

if (isDirectExecution && inputIdx === -1) {
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

if (isDirectExecution) {
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
}

export { scoreAll, tokenize, jaccardSimilarity, extractEntities, sourceToOrg };
