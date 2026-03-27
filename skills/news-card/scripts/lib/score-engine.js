#!/usr/bin/env node

/**
 * Multi-dimension scoring engine.
 * Formula: total = cross_validation × 2.0 + community × 1.5 + authority × 1.0 + recency × 0.8 + virality × 1.2 + actionability × 0.6
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

/**
 * Calculate recency score based on hours since publication.
 */
function recencyScore(publishedISO) {
  const published = new Date(publishedISO);
  const hoursAgo = (Date.now() - published.getTime()) / (1000 * 60 * 60);

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
  const score = metrics.score || 0;

  // X/Twitter tweets — use likes as primary signal
  if (item.source?.startsWith('X/')) {
    if (likes >= 5000) return 5;
    if (likes >= 1000) return 4;
    if (likes >= 500) return 3;
    if (likes >= 100) return 2;
    return likes > 0 ? 1 : 0;
  }

  // HN, HF, general — use score/points
  if (score >= 200) return 5;
  if (score >= 100) return 4;
  if (score >= 50) return 3;
  if (score >= 20) return 2;
  return score > 0 ? 1 : 0;
}

/**
 * Score actionability based on keywords in title and summary.
 */
function scoreActionability(item) {
  const text = ((item.title || '') + ' ' + (item.summary || '')).toLowerCase();
  const highAction = /\b(launch|release|open.?source|announc|introduc|available|free|open beta|ship|deploy|now available)\b/i;
  const medAction = /\b(rais|acquir|partner|invest|fund|merge|hire|expand)\b/i;

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
 * Group items by event similarity for cross-validation scoring.
 * Items about the same event get grouped together.
 */
function groupByEvent(items) {
  const groups = [];
  const assigned = new Set();

  for (let i = 0; i < items.length; i++) {
    if (assigned.has(i)) continue;

    const group = [i];
    const tokensI = tokenize(items[i].title);

    for (let j = i + 1; j < items.length; j++) {
      if (assigned.has(j)) continue;

      const tokensJ = tokenize(items[j].title);
      const similarity = jaccardSimilarity(tokensI, tokensJ);

      if (similarity > 0.4) {
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
 * Score all candidates.
 */
function scoreAll(candidates) {
  // Group by event for cross-validation
  const eventGroups = groupByEvent(candidates);

  // Build cross-validation map: item index → number of sources covering same event
  const crossMap = new Map();
  for (const group of eventGroups) {
    // Count unique sources in this event group
    const sources = new Set(group.map((idx) => candidates[idx].source));
    for (const idx of group) {
      crossMap.set(idx, sources.size);
    }
  }

  // Score each candidate
  const scored = candidates.map((item, idx) => {
    const sourceCount = crossMap.get(idx) || 1;
    const crossValidation = sourceCount > 1 ? (sourceCount - 1) * 3 : 0;
    const community = communityScore(item.community_metrics);
    const authority = item.source_authority || 3;
    const recency = recencyScore(item.published);
    const virality = scoreVirality(item);
    const actionability = scoreActionability(item);

    const totalScore =
      crossValidation * W_CROSS +
      community * W_COMMUNITY +
      authority * W_AUTHORITY +
      recency * W_RECENCY +
      virality * W_VIRALITY +
      actionability * W_ACTIONABILITY;

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
        total: Math.round(totalScore * 10) / 10,
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

if (inputIdx === -1) {
  console.error('Usage: node score-engine.js --input candidates.json [--output scored.json]');
  process.exit(1);
}

const inputFile = args[inputIdx + 1];
const outputFile = outputIdx !== -1 ? args[outputIdx + 1] : null;

const candidates = JSON.parse(readFileSync(inputFile, 'utf-8'));
const scored = scoreAll(candidates);

console.error(`[score] Scored ${scored.length} candidates`);
console.error(`[score] Score distribution: ≥12: ${scored.filter((s) => s.scores.total >= 12).length}, ≥6: ${scored.filter((s) => s.scores.total >= 6).length}, <6: ${scored.filter((s) => s.scores.total < 6).length}`);

const output = JSON.stringify(scored, null, 2);
if (outputFile) {
  writeFileSync(outputFile, output);
  console.error(`[score] Wrote to ${outputFile}`);
} else {
  process.stdout.write(output);
}

export { scoreAll, tokenize, jaccardSimilarity };
