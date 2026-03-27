#!/usr/bin/env node
/**
 * Newsletter signal fetcher for peer-review scoring.
 * Fetches editorial picks from top AI/tech newsletters.
 * Output: newsletter-signals.json (used by score-engine.js)
 */

import { writeFileSync } from 'fs';
import { parseArgs } from 'util';
import RssParser from 'rss-parser';

const RSS_SOURCES = [
  {
    name: "Ben's Bites",
    url: 'https://www.bensbites.com/feed',
    authority: 5,
    filterSponsors: true,
  },
  {
    name: 'Import AI',
    url: 'https://importai.substack.com/feed',
    authority: 4,
    filterSponsors: false,
  },
  {
    name: 'Platformer',
    url: 'https://www.platformer.news/feed',
    authority: 4,
    filterSponsors: true,
  },
];

const TLDR_ARCHIVE_URL = 'https://tldr.tech/ai/archives';

const SPONSOR_PATTERNS = [
  /brought to you by/i,
  /sponsored by/i,
  /\bsponsor(ed)?\b/i,
  /\bpartner content\b/i,
  /\bincogni\b/i,
  /\breevo\b/i,
  /\bassemblyai\b/i,
  /\bspeechmatics\b/i,
  /\bviktor\b/i,
];

function isSponsored(title, content) {
  const text = (title || '') + ' ' + (content || '').substring(0, 2000);
  return SPONSOR_PATTERNS.some(p => p.test(text));
}

async function fetchRSS(source) {
  const parser = new RssParser({ timeout: 15000 });
  try {
    const feed = await parser.parseURL(source.url);
    let items = (feed.items || []).map(item => ({
      title: (item.title || '').trim(),
      url: (item.link || '').trim(),
      published: item.pubDate || item.isoDate || '',
      _content: item['content:encoded'] || item.contentSnippet || '',
    }));

    const beforeFilter = items.length;
    if (source.filterSponsors) {
      items = items.filter(item => !isSponsored(item.title, item._content));
    }
    const filtered = beforeFilter - items.length;

    // Remove internal _content field
    items = items.map(({ _content, ...rest }) => rest);

    console.error(`[fetch-nl] ${source.name}: ${items.length} items${filtered > 0 ? ` (${filtered} sponsors filtered)` : ''}`);
    return { newsletter: source.name, authority: source.authority, items };
  } catch (err) {
    console.error(`[fetch-nl] ${source.name}: FAILED — ${err.message}`);
    return { newsletter: source.name, authority: source.authority, items: [] };
  }
}

async function fetchTLDR() {
  try {
    const res = await fetch(TLDR_ARCHIVE_URL, { signal: AbortSignal.timeout(15000) });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const html = await res.text();

    // Extract newsletter issue titles from the archive page
    // Titles look like: "Google Turboquant ⚡, ARC-AGI-3 🧩, Manus founders detained 👮🏼"
    const titlePattern = /(?:>|")([^<"]*?(?:⚡|🧩|👮|🤖|🛒|👨‍💻|🚀|💡|🔬|📱|💰|🏢|⚖️|🔒|📊|🎯|🌐|🧠|📝|🎨|🔧|📈|🤝|⚠️|🏗️|🎮|📸|🎬)[^<"]*)/g;
    const keywords = [];
    let match;
    let issueCount = 0;

    while ((match = titlePattern.exec(html)) !== null && issueCount < 5) {
      const title = match[1].trim();
      if (title.length < 10 || title.length > 200) continue;

      // Split by comma to get individual topic keywords
      const topics = title.split(/[,，]/).map(t => t.replace(/[\p{Emoji_Presentation}\p{Extended_Pictographic}]/gu, '').trim()).filter(t => t.length > 3);
      keywords.push(...topics);
      issueCount++;
    }

    // Deduplicate
    const uniqueKeywords = [...new Set(keywords)];
    const items = uniqueKeywords.map(kw => ({ title: kw, url: '', published: '' }));

    console.error(`[fetch-nl] TLDR AI: ${items.length} keywords from ${issueCount} issues`);
    return { newsletter: 'TLDR AI', authority: 5, items };
  } catch (err) {
    console.error(`[fetch-nl] TLDR AI: FAILED — ${err.message}`);
    return { newsletter: 'TLDR AI', authority: 5, items: [] };
  }
}

async function main() {
  const { values } = parseArgs({
    options: { output: { type: 'string', short: 'o' } },
  });

  const outputPath = values.output;
  if (!outputPath) {
    console.error('Usage: node fetch-newsletters.js --output <file>');
    process.exit(1);
  }

  // Fetch all sources in parallel
  const results = await Promise.all([
    ...RSS_SOURCES.map(fetchRSS),
    fetchTLDR(),
  ]);

  const output = {
    fetchedAt: new Date().toISOString(),
    signals: results,
  };

  writeFileSync(outputPath, JSON.stringify(output, null, 2));
  const totalItems = results.reduce((sum, r) => sum + r.items.length, 0);
  console.error(`[fetch-nl] Wrote ${totalItems} signals from ${results.length} newsletters to ${outputPath}`);
}

main().catch(err => {
  console.error(`[fetch-nl] Fatal: ${err.message}`);
  process.exit(1);
});
