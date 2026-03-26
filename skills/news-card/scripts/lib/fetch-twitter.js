#!/usr/bin/env node

/**
 * Twitter/X fetcher using Rettiwt-API guest mode (no auth required).
 * This is inherently fragile — the pipeline continues if this fails.
 * Usage: node fetch-twitter.js [--output file.json]
 */

import { writeFileSync } from 'fs';

// Key AI accounts to monitor
const AI_ACCOUNTS = [
  'OpenAI', 'AnthropicAI', 'GoogleAI', 'ylecun', 'kaborez', 'sama',
  'GoogleDeepMind', 'nvidia', 'MetaAI', 'MistralAI',
];

/**
 * Attempt to fetch recent tweets from AI accounts using guest token.
 * Returns empty array on failure — this source is optional.
 */
async function fetchTwitter() {
  console.error('[fetch-twitter] Twitter/X fetcher (guest mode)');
  console.error('[fetch-twitter] Note: Guest mode access is rate-limited and may fail.');

  const items = [];

  // Guest mode search via nitter instances or similar public endpoints
  // This is a best-effort approach — Twitter frequently changes their API
  try {
    // Try to search for AI-related tweets from key accounts
    const query = AI_ACCOUNTS.map((a) => `from:${a}`).join(' OR ');
    const searchUrl = `https://api.fxtwitter.com/search?q=${encodeURIComponent(query)}&limit=20`;

    const resp = await fetch(searchUrl, {
      headers: { 'User-Agent': 'NewsCardBot/0.1' },
      signal: AbortSignal.timeout(10000),
    });

    if (resp.ok) {
      const data = await resp.json();
      const tweets = data.tweets || data.results || [];

      for (const tweet of tweets) {
        items.push({
          title: (tweet.text || '').slice(0, 140),
          url: tweet.url || tweet.link || '',
          source: `X/@${tweet.author?.screen_name || tweet.user || 'unknown'}`,
          source_authority: 2,
          published: tweet.created_at || new Date().toISOString(),
          summary: (tweet.text || '').slice(0, 280),
          fetch_strategy: 'title_only',
          community_metrics: {},
        });
      }
    }
  } catch (err) {
    console.error(`[fetch-twitter] Search failed (expected): ${err.message}`);
  }

  // Fallback: try individual account timeline via public proxies
  if (items.length === 0) {
    for (const account of AI_ACCOUNTS.slice(0, 3)) {
      try {
        const resp = await fetch(`https://api.fxtwitter.com/${account}`, {
          headers: { 'User-Agent': 'NewsCardBot/0.1' },
          signal: AbortSignal.timeout(5000),
        });

        if (resp.ok) {
          const data = await resp.json();
          const tweets = data.tweets || [];
          for (const tweet of tweets.slice(0, 3)) {
            items.push({
              title: (tweet.text || '').slice(0, 140),
              url: tweet.url || `https://x.com/${account}`,
              source: `X/@${account}`,
              source_authority: 2,
              published: tweet.created_at || new Date().toISOString(),
              summary: (tweet.text || '').slice(0, 280),
              fetch_strategy: 'title_only',
              community_metrics: {},
            });
          }
        }
      } catch {
        // Expected — move on to next account
      }
    }
  }

  console.error(`[fetch-twitter] Collected ${items.length} tweets (0 is acceptable)`);
  return items;
}

// CLI entry point
const args = process.argv.slice(2);
const outputIdx = args.indexOf('--output');
const outputFile = outputIdx !== -1 ? args[outputIdx + 1] : null;

const items = await fetchTwitter();
const output = JSON.stringify(items, null, 2);

if (outputFile) {
  writeFileSync(outputFile, output);
  console.error(`[fetch-twitter] Wrote ${items.length} items to ${outputFile}`);
} else {
  process.stdout.write(output);
}

export { fetchTwitter };
