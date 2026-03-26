#!/usr/bin/env node

/**
 * Generic RSS/Atom fetcher.
 * Usage: node fetch-rss.js [--strategy title_only|metadata|summary] [--output file.json]
 *
 * Reads source list from sources-config.json or accepts a single URL via --url.
 */

import RSSParser from 'rss-parser';
import { readFileSync, writeFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const parser = new RSSParser({
  timeout: 15000,
  headers: {
    'User-Agent': 'NewsCardBot/0.1 (AI News Digest)',
    Accept: 'application/rss+xml, application/atom+xml, application/xml, text/xml',
  },
});

// Source registry with RSS URLs and authority weights
const RSS_SOURCES = [
  // Company blogs (authority: 5)
  { name: 'OpenAI Blog', url: 'https://openai.com/blog/rss.xml', authority: 5, strategy: 'title_only' },
  { name: 'Anthropic Blog', url: 'https://www.anthropic.com/rss.xml', authority: 5, strategy: 'title_only' },
  { name: 'Google AI Blog', url: 'https://blog.google/technology/ai/rss/', authority: 5, strategy: 'title_only' },
  { name: 'DeepMind Blog', url: 'https://deepmind.google/blog/rss.xml', authority: 5, strategy: 'title_only' },
  { name: 'Meta AI Blog', url: 'https://ai.meta.com/blog/rss/', authority: 5, strategy: 'title_only' },
  { name: 'NVIDIA Blog', url: 'https://blogs.nvidia.com/feed/', authority: 5, strategy: 'title_only' },
  { name: 'Google Research Blog', url: 'https://blog.research.google/feeds/posts/default?alt=rss', authority: 5, strategy: 'title_only' },

  // Tech media (authority: 4)
  { name: 'MIT Technology Review', url: 'https://www.technologyreview.com/feed/', authority: 4, strategy: 'metadata' },
  { name: 'The Verge (AI)', url: 'https://www.theverge.com/rss/ai-artificial-intelligence/index.xml', authority: 4, strategy: 'metadata' },
  { name: 'TechCrunch (AI)', url: 'https://techcrunch.com/category/artificial-intelligence/feed/', authority: 4, strategy: 'metadata' },
  { name: 'Ars Technica', url: 'https://feeds.arstechnica.com/arstechnica/technology-lab', authority: 4, strategy: 'metadata' },
  { name: 'Wired (AI)', url: 'https://www.wired.com/feed/tag/ai/latest/rss', authority: 4, strategy: 'metadata' },
  { name: '404 Media', url: 'https://www.404media.co/rss/', authority: 4, strategy: 'metadata' },
  { name: 'The Batch', url: 'https://www.deeplearning.ai/the-batch/feed/', authority: 4, strategy: 'metadata' },

  // Newsletters (authority: 3-4)
  { name: 'Import AI', url: 'https://importai.substack.com/feed', authority: 4, strategy: 'summary' },
  { name: "Ben's Bites", url: 'https://bensbites.beehiiv.com/feed', authority: 3, strategy: 'summary' },
  { name: 'Latent Space', url: 'https://www.latent.space/feed', authority: 3, strategy: 'summary' },
  { name: 'Interconnects', url: 'https://www.interconnects.ai/feed', authority: 3, strategy: 'summary' },
  { name: 'AI Snake Oil', url: 'https://aisnakeoil.substack.com/feed', authority: 4, strategy: 'summary' },
  { name: 'One Useful Thing', url: 'https://www.oneusefulthing.org/feed', authority: 3, strategy: 'summary' },
  { name: 'Ahead of AI', url: 'https://magazine.sebastianraschka.com/feed', authority: 3, strategy: 'summary' },

  // Indie blogs (authority: 3)
  { name: 'Simon Willison', url: 'https://simonwillison.net/atom/everything/', authority: 3, strategy: 'metadata' },
];

/**
 * Normalize an RSS item based on fetch strategy.
 */
function normalizeItem(item, source, strategy) {
  const result = {
    title: (item.title || '').trim(),
    url: item.link || item.guid || '',
    source: source.name,
    source_authority: source.authority,
    published: item.isoDate || item.pubDate || new Date().toISOString(),
    fetch_strategy: strategy,
  };

  if (strategy === 'metadata' || strategy === 'summary' || strategy === 'full_text') {
    result.summary = (item.contentSnippet || item.content || '').slice(0, 500).trim();
  }

  if (strategy === 'summary' || strategy === 'full_text') {
    const content = item['content:encoded'] || item.content || '';
    result.content_preview = content.slice(0, 2000).replace(/<[^>]*>/g, '').trim();
  }

  if (strategy === 'full_text') {
    result.full_content = (item['content:encoded'] || item.content || '').replace(/<[^>]*>/g, '').trim();
  }

  return result;
}

/**
 * Fetch a single RSS/Atom feed.
 */
async function fetchFeed(source, strategyOverride) {
  const strategy = strategyOverride || source.strategy || 'title_only';
  try {
    const feed = await parser.parseURL(source.url);
    const cutoff = new Date(Date.now() - 48 * 60 * 60 * 1000); // 48 hours
    const items = (feed.items || [])
      .filter((item) => {
        const pubDate = new Date(item.isoDate || item.pubDate || 0);
        return pubDate >= cutoff;
      })
      .map((item) => normalizeItem(item, source, strategy));

    return items;
  } catch (err) {
    console.error(`[fetch-rss] Failed to fetch ${source.name} (${source.url}): ${err.message}`);
    return [];
  }
}

/**
 * Fetch all RSS sources concurrently.
 */
async function fetchAllRSS(strategyOverride) {
  const results = await Promise.allSettled(
    RSS_SOURCES.map((source) => fetchFeed(source, strategyOverride))
  );

  const allItems = [];
  for (const result of results) {
    if (result.status === 'fulfilled') {
      allItems.push(...result.value);
    }
  }

  console.error(`[fetch-rss] Fetched ${allItems.length} items from ${RSS_SOURCES.length} RSS sources`);
  return allItems;
}

// CLI entry point
const args = process.argv.slice(2);
const outputIdx = args.indexOf('--output');
const outputFile = outputIdx !== -1 ? args[outputIdx + 1] : null;
const strategyIdx = args.indexOf('--strategy');
const strategyOverride = strategyIdx !== -1 ? args[strategyIdx + 1] : null;

// Single URL mode
const urlIdx = args.indexOf('--url');
if (urlIdx !== -1) {
  const url = args[urlIdx + 1];
  const nameIdx = args.indexOf('--name');
  const name = nameIdx !== -1 ? args[nameIdx + 1] : 'Custom';
  const items = await fetchFeed(
    { name, url, authority: 3, strategy: strategyOverride || 'metadata' },
    strategyOverride
  );
  const output = JSON.stringify(items, null, 2);
  if (outputFile) {
    writeFileSync(outputFile, output);
    console.error(`[fetch-rss] Wrote ${items.length} items to ${outputFile}`);
  } else {
    process.stdout.write(output);
  }
} else {
  // Fetch all registered sources
  const items = await fetchAllRSS(strategyOverride);
  const output = JSON.stringify(items, null, 2);
  if (outputFile) {
    writeFileSync(outputFile, output);
    console.error(`[fetch-rss] Wrote ${items.length} items to ${outputFile}`);
  } else {
    process.stdout.write(output);
  }
}

export { fetchAllRSS, fetchFeed, RSS_SOURCES };
