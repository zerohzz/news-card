#!/usr/bin/env node

/**
 * Deduplication engine.
 * Merges items that cover the same event, keeping the highest-authority version.
 *
 * Usage: node dedup.js --input scored.json --output deduped.json
 */

import { readFileSync, writeFileSync } from 'fs';

const STOP_WORDS = new Set([
  'a', 'an', 'the', 'is', 'are', 'was', 'were', 'in', 'on', 'at',
  'to', 'for', 'of', 'and', 'or', 'but', 'with', 'by', 'from',
  'that', 'this', 'it', 'its', 'has', 'have', 'had', 'be', 'been',
  'will', 'can', 'could', 'would', 'should', 'may', 'might',
  'not', 'no', 'do', 'does', 'did', 'as', 'if', 'how', 'what',
  'which', 'who', 'when', 'where', 'why', 'new', 'first',
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
 * Deduplicate scored items.
 * Threshold: Jaccard > 0.6 OR keyword overlap > 70% → merge.
 * Keep highest-authority version, accumulate related_sources.
 */
function dedup(items) {
  const merged = new Set(); // indices that have been merged into another item
  const result = [];

  // Pre-compute tokens and keywords
  const tokenized = items.map((item) => ({
    tokens: tokenize(item.title),
    keywords: extractKeywords(item.title),
  }));

  for (let i = 0; i < items.length; i++) {
    if (merged.has(i)) continue;

    const current = { ...items[i] };
    const relatedSources = [...(current.related_sources || [])];

    for (let j = i + 1; j < items.length; j++) {
      if (merged.has(j)) continue;

      const titleSim = jaccard(tokenized[i].tokens, tokenized[j].tokens);
      const kwOverlap = keywordOverlap(tokenized[i].keywords, tokenized[j].keywords);

      if (titleSim > 0.6 || kwOverlap > 0.7) {
        // Merge: keep higher authority
        merged.add(j);
        relatedSources.push({
          source: items[j].source,
          url: items[j].url,
        });

        // If the duplicate has higher authority, swap
        if ((items[j].source_authority || 0) > (current.source_authority || 0)) {
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

    current.related_sources = relatedSources;
    result.push(current);
  }

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
