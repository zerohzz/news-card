#!/usr/bin/env node

/**
 * HuggingFace Daily Papers fetcher.
 * Usage: node fetch-huggingface.js [--output file.json]
 */

import { writeFileSync } from 'fs';
import { SOURCE_FAMILIES } from './pipeline-utils.js';

const HF_API = 'https://huggingface.co/api/daily_papers';

/**
 * Fetch today's papers from HuggingFace.
 */
async function fetchHuggingFacePapers() {
  try {
    const resp = await fetch(HF_API, {
      headers: {
        'User-Agent': 'NewsCardBot/0.1',
        Accept: 'application/json',
      },
    });

    if (!resp.ok) throw new Error(`HF API returned ${resp.status}`);
    const papers = await resp.json();

    const items = (Array.isArray(papers) ? papers : []).map((paper) => {
      const p = paper.paper || paper;
      return {
        title: p.title || paper.title || '',
        url: p.id
          ? `https://huggingface.co/papers/${p.id}`
          : paper.url || '',
        source: 'HuggingFace Papers',
        source_authority: 3,
        published: p.publishedAt || paper.publishedAt || new Date().toISOString(),
        summary: (p.summary || paper.summary || '').slice(0, 500),
        fetch_strategy: 'metadata',
        source_family: SOURCE_FAMILIES.RESEARCH_SIGNAL,
        source_collection: 'direct',
        community_metrics: {
          hf_upvotes: paper.paper?.upvotes || paper.upvotes || 0,
        },
        authors: (p.authors || []).map((a) => a.name || a.user || a).slice(0, 5),
      };
    });

    console.error(`[fetch-hf] Fetched ${items.length} papers from HuggingFace`);
    return items;
  } catch (err) {
    console.error(`[fetch-hf] Failed: ${err.message}`);
    return [];
  }
}

// CLI entry point
const args = process.argv.slice(2);
const outputIdx = args.indexOf('--output');
const outputFile = outputIdx !== -1 ? args[outputIdx + 1] : null;

const items = await fetchHuggingFacePapers();
const output = JSON.stringify(items, null, 2);

if (outputFile) {
  writeFileSync(outputFile, output);
  console.error(`[fetch-hf] Wrote ${items.length} items to ${outputFile}`);
} else {
  process.stdout.write(output);
}

export { fetchHuggingFacePapers };
