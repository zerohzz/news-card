#!/usr/bin/env node

/**
 * Generic RSS/Atom fetcher.
 * Usage: node fetch-rss.js [--strategy title_only|metadata|summary] [--output file.json]
 *
 * Reads source list from RSS_SOURCES or accepts a single URL via --url.
 */

import RSSParser from 'rss-parser';
import { writeFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const USER_AGENT = 'Mozilla/5.0 NewsCard/1.0 (news aggregator)';
const REQUEST_TIMEOUT_MS = 15000;
const RETRY_BACKOFF_MS = 1000;
const RATE_LIMIT_BACKOFF_MS = 2000;
const MAX_RETRIES = 2;

const parser = new RSSParser({
  timeout: REQUEST_TIMEOUT_MS,
  headers: {
    'User-Agent': USER_AGENT,
    Accept: 'application/rss+xml, application/atom+xml, application/xml, text/xml',
  },
  requestOptions: {
    signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
  },
});

// Source registry with RSS URLs and authority weights
// Audited 2026-03-27: all URLs verified returning 200 + XML/RSS content
const RSS_SOURCES = [
  // Company blogs (authority: 5)
  { name: 'OpenAI Blog', url: 'https://openai.com/blog/rss.xml', authority: 5, strategy: 'title_only' },
  { name: 'Google AI Blog', url: 'https://blog.google/technology/ai/rss/', authority: 5, strategy: 'title_only' },
  { name: 'DeepMind Blog', url: 'https://deepmind.google/blog/rss.xml', authority: 5, strategy: 'title_only' },
  { name: 'NVIDIA Blog', url: 'https://blogs.nvidia.com/feed/', authority: 5, strategy: 'title_only' },
  { name: 'Google Research Blog', url: 'https://blog.research.google/feeds/posts/default?alt=rss', authority: 5, strategy: 'title_only' },

  // Tech media (authority: 4)
  { name: 'MIT Technology Review', url: 'https://www.technologyreview.com/feed/', authority: 4, strategy: 'metadata' },
  { name: 'The Verge (AI)', url: 'https://www.theverge.com/rss/ai-artificial-intelligence/index.xml', authority: 4, strategy: 'metadata' },
  { name: 'TechCrunch (AI)', url: 'https://techcrunch.com/category/artificial-intelligence/feed/', authority: 4, strategy: 'metadata' },
  { name: 'Ars Technica', url: 'https://feeds.arstechnica.com/arstechnica/technology-lab', authority: 4, strategy: 'metadata' },
  { name: 'Wired (AI)', url: 'https://www.wired.com/feed/tag/ai/latest/rss', authority: 4, strategy: 'metadata' },
  { name: '404 Media', url: 'https://www.404media.co/rss/', authority: 4, strategy: 'metadata' },

  // Newsletters (authority: 3-4)
  { name: 'Import AI', url: 'https://importai.substack.com/feed', authority: 4, strategy: 'summary' },
  { name: 'Latent Space', url: 'https://www.latent.space/feed', authority: 3, strategy: 'summary' },
  { name: 'Interconnects', url: 'https://www.interconnects.ai/feed', authority: 3, strategy: 'summary' },
  { name: 'AI Snake Oil', url: 'https://aisnakeoil.substack.com/feed', authority: 4, strategy: 'summary' },
  { name: 'One Useful Thing', url: 'https://www.oneusefulthing.org/feed', authority: 3, strategy: 'summary' },
  { name: 'Ahead of AI', url: 'https://magazine.sebastianraschka.com/feed', authority: 3, strategy: 'summary' },

  // Indie blogs (authority: 3)
  { name: 'Simon Willison', url: 'https://simonwillison.net/atom/everything/', authority: 3, strategy: 'metadata' },
];

/**
 * Sleep for a given number of milliseconds.
 */
function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Fetch a URL with retry logic for transient failures and rate limits.
 * @param {string} url - The URL to parse as RSS
 * @param {number} retries - Number of retries remaining (default: MAX_RETRIES)
 * @returns {Promise<object>} Parsed feed object from rss-parser
 */
async function fetchWithRetry(url, retries = MAX_RETRIES) {
  try {
    const feed = await parser.parseURL(url);
    return feed;
  } catch (err) {
    if (retries <= 0) {
      throw err;
    }

    const is429 = err.message && err.message.includes('429');
    const backoff = is429 ? RATE_LIMIT_BACKOFF_MS : RETRY_BACKOFF_MS;

    console.error(`[fetch-rss] Retrying ${url} in ${backoff}ms (${retries} retries left): ${err.message}`);
    await sleep(backoff);
    return fetchWithRetry(url, retries - 1);
  }
}

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
    const feed = await fetchWithRetry(source.url);
    const cutoff = new Date(Date.now() - 48 * 60 * 60 * 1000); // 48 hours
    const items = (feed.items || [])
      .filter((item) => {
        const pubDate = new Date(item.isoDate || item.pubDate || 0);
        return pubDate >= cutoff;
      })
      .map((item) => normalizeItem(item, source, strategy));

    return { items, success: true, name: source.name };
  } catch (err) {
    console.error(`[fetch-rss] Failed to fetch ${source.name} (${source.url}): ${err.message}`);
    return { items: [], success: false, name: source.name };
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
  let successCount = 0;
  let failCount = 0;

  for (const result of results) {
    if (result.status === 'fulfilled') {
      allItems.push(...result.value.items);
      if (result.value.success) {
        successCount++;
      } else {
        failCount++;
      }
    } else {
      failCount++;
    }
  }

  const totalSources = RSS_SOURCES.length;
  console.error(
    `[fetch-rss] Fetched ${allItems.length} items from ${successCount}/${totalSources} sources (${failCount} failed)`
  );
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
  const { items } = await fetchFeed(
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
