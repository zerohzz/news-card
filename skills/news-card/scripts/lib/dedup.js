#!/usr/bin/env node

/**
 * Deduplication engine.
 * Merges items that cover the same event, keeping the highest-authority version.
 * Uses title Jaccard similarity, keyword overlap, AND entity matching.
 *
 * Usage: node dedup.js --input scored.json --output deduped.json
 */

import { readFileSync, writeFileSync } from 'fs';

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

/**
 * Tokenize text: lowercase, remove punctuation, remove stop words.
 */
function tokenize(text) {
  return text
    .toLowerCase()
    .replace(/[^\w\s]/g, ' ')
    .split(/\s+/)
    .filter((w) => w.length > 1 && !STOP_WORDS.has(w));
}

/**
 * Jaccard similarity between two token arrays.
 */
function jaccard(tokensA, tokensB) {
  const setA = new Set(tokensA);
  const setB = new Set(tokensB);
  const intersection = [...setA].filter((x) => setB.has(x)).length;
  const union = new Set([...setA, ...setB]).size;
  return union === 0 ? 0 : intersection / union;
}

/**
 * Extract top-N most frequent non-stop keywords from title.
 */
function extractKeywords(title, n = 5) {
  const tokens = tokenize(title);
  const freq = {};
  for (const t of tokens) {
    freq[t] = (freq[t] || 0) + 1;
  }
  return Object.entries(freq)
    .sort((a, b) => b[1] - a[1])
    .slice(0, n)
    .map(([word]) => word);
}

/**
 * Check keyword overlap ratio.
 */
function keywordOverlap(kwA, kwB) {
  if (kwA.length === 0 || kwB.length === 0) return 0;
  const setA = new Set(kwA);
  const setB = new Set(kwB);
  const overlap = [...setA].filter((x) => setB.has(x)).length;
  return overlap / Math.min(setA.size, setB.size);
}

/**
 * Extract key entities from title + summary for entity-based dedup.
 * Reuses the same entity lists as score-engine.js.
 */
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
  'stable diffusion', 'aquila', 'deepseek',
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

function entitiesMatch(entA, entB, titleJaccard = 0) {
  const sharedOrgs = [...entA.orgs].filter(o => entB.orgs.has(o));
  const sharedProducts = [...entA.products].filter(p => entB.products.has(p));
  if (sharedOrgs.length >= 1 && sharedProducts.length >= 1) return true;
  if (sharedProducts.length >= 2) return true;
  if (sharedOrgs.length >= 1 && titleJaccard > 0.3) return true;
  return false;
}

/**
 * Deduplicate scored items.
 * Merge criteria: Jaccard > 0.6 OR keyword overlap > 70% OR entity match.
 * Keep highest-authority version, accumulate related_sources.
 */
function dedup(items) {
  const merged = new Set(); // indices that have been merged into another item
  const result = [];

  // Pre-compute tokens, keywords, and entities
  const precomputed = items.map((item) => ({
    tokens: tokenize(item.title),
    keywords: extractKeywords(item.title),
    entities: extractEntities((item.title || '') + ' ' + (item.summary || '')),
  }));

  for (let i = 0; i < items.length; i++) {
    if (merged.has(i)) continue;

    const current = { ...items[i] };
    const relatedSources = [...(current.related_sources || [])];

    for (let j = i + 1; j < items.length; j++) {
      if (merged.has(j)) continue;

      const titleSim = jaccard(precomputed[i].tokens, precomputed[j].tokens);
      const kwOverlap = keywordOverlap(precomputed[i].keywords, precomputed[j].keywords);
      const entityMatch = entitiesMatch(precomputed[i].entities, precomputed[j].entities, titleSim);

      if (titleSim > 0.6 || kwOverlap > 0.7 || entityMatch) {
        // Merge: keep higher authority
        merged.add(j);

        // Accumulate related sources from the absorbed item
        relatedSources.push(
          ...(items[j].related_sources || []),
          { source: items[j].source, url: items[j].url },
        );

        // If the duplicate has higher authority, swap primary
        const jAuthority = items[j].scores?.authority || items[j].source_authority || 0;
        const curAuthority = current.scores?.authority || current.source_authority || 0;
        if (jAuthority > curAuthority) {
          current.title = items[j].title;
          current.url = items[j].url;
          current.source = items[j].source;
          current.source_authority = items[j].source_authority;
          current.summary = items[j].summary || current.summary;
        }

        // Keep the higher score
        if (items[j].scores && items[j].scores.total > (current.scores?.total || 0)) {
          current.scores = items[j].scores;
        }
      }
    }

    // Deduplicate related_sources by url
    const seen = new Set();
    current.related_sources = relatedSources.filter(rs => {
      const key = rs.url || rs.source;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
    result.push(current);
  }

  // Re-sort by score after merges may have swapped scores
  result.sort((a, b) => (b.scores?.total || 0) - (a.scores?.total || 0));

  console.error(`[dedup] ${items.length} → ${result.length} items (removed ${items.length - result.length} duplicates)`);
  return result;
}

// CLI entry point
const args = process.argv.slice(2);
const inputIdx = args.indexOf('--input');
const outputIdx = args.indexOf('--output');

if (inputIdx === -1) {
  console.error('Usage: node dedup.js --input scored.json [--output deduped.json]');
  process.exit(1);
}

const inputFile = args[inputIdx + 1];
const outputFile = outputIdx !== -1 ? args[outputIdx + 1] : null;

const items = JSON.parse(readFileSync(inputFile, 'utf-8'));
const deduped = dedup(items);

const output = JSON.stringify(deduped, null, 2);
if (outputFile) {
  writeFileSync(outputFile, output);
  console.error(`[dedup] Wrote to ${outputFile}`);
} else {
  process.stdout.write(output);
}

export { dedup, tokenize, jaccard };
