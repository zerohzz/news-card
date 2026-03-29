#!/usr/bin/env node

/**
 * Blog scraper for non-RSS sources (Anthropic, Meta AI).
 * Scrapes blog index pages and extracts article metadata from
 * structured data (JSON-LD, __NEXT_DATA__) or HTML link parsing.
 *
 * Usage: node fetch-blogs.js [--output file.json]
 */

import { writeFileSync } from 'fs';

const USER_AGENT = 'Mozilla/5.0 (compatible; NewsCardBot/1.0)';

/** Common HTML entity map for decoding extracted text. */
const HTML_ENTITIES = {
  '&amp;': '&', '&lt;': '<', '&gt;': '>', '&quot;': '"',
  '&#39;': "'", '&#x27;': "'", '&apos;': "'", '&nbsp;': ' ',
};

/** Decode common HTML entities in a string. */
function decodeHtmlEntities(text) {
  return text
    .replace(/&#x([0-9a-fA-F]+);/g, (_, hex) => String.fromCodePoint(parseInt(hex, 16)))
    .replace(/&#(\d+);/g, (_, dec) => String.fromCodePoint(parseInt(dec, 10)))
    .replace(/&(?:amp|lt|gt|quot|apos|nbsp|#39|#x27);/g, (entity) => HTML_ENTITIES[entity] || entity);
}
const REQUEST_TIMEOUT_MS = 15_000;

/** Blog sources to scrape. */
const BLOG_SOURCES = [
  {
    name: 'Anthropic Blog',
    indexUrl: 'https://www.anthropic.com/news',
    baseUrl: 'https://www.anthropic.com',
    pathPattern: /^\/(?:news|research)\/[\w-]+/,
    authority: 5,
  },
  {
    name: 'Meta AI Blog',
    indexUrl: 'https://ai.meta.com/blog/',
    baseUrl: 'https://ai.meta.com',
    pathPattern: /^\/blog\/[\w-]+/,
    authority: 5,
  },
];

/**
 * Fetch HTML content from a URL with timeout and User-Agent.
 * Returns null on failure.
 */
async function fetchPage(url) {
  try {
    const resp = await fetch(url, {
      headers: { 'User-Agent': USER_AGENT },
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    });
    if (!resp.ok) {
      console.error(`[fetch-blogs] ${url} returned ${resp.status}`);
      return null;
    }
    return await resp.text();
  } catch (err) {
    console.error(`[fetch-blogs] Failed to fetch ${url}: ${err.message}`);
    return null;
  }
}

/**
 * Try extracting articles from __NEXT_DATA__ JSON embedded in the page.
 * Next.js sites embed their page props in a <script id="__NEXT_DATA__"> tag.
 */
function extractFromNextData(html, source) {
  const match = html.match(/<script\s+id="__NEXT_DATA__"[^>]*>([\s\S]*?)<\/script>/i);
  if (!match) return [];

  try {
    const data = JSON.parse(match[1]);
    const props = data?.props?.pageProps;
    if (!props) return [];

    // Next.js pages store blog posts in various shapes — try common patterns
    const posts = props.posts || props.articles || props.items || props.blogPosts || [];
    if (!Array.isArray(posts) || posts.length === 0) return [];

    return posts.map((post) => {
      const slug = post.slug || post.id || '';
      const path = post.url || post.href || (slug ? `/news/${slug}` : '');
      const url = path.startsWith('http') ? path : `${source.baseUrl}${path}`;
      return {
        title: post.title || post.name || '',
        url,
        source: source.name,
        published: post.publishedAt || post.date || post.createdAt || new Date().toISOString(),
        summary: post.description || post.summary || post.excerpt || '',
        source_authority: source.authority,
      };
    }).filter((item) => item.title && item.url);
  } catch (err) {
    console.error(`[fetch-blogs] __NEXT_DATA__ parse error for ${source.name}: ${err.message}`);
    return [];
  }
}

/**
 * Try extracting articles from JSON-LD structured data.
 */
function extractFromJsonLd(html, source) {
  const items = [];
  const regex = /<script\s+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi;
  let match;

  while ((match = regex.exec(html)) !== null) {
    try {
      const data = JSON.parse(match[1]);
      const entries = Array.isArray(data) ? data : [data];

      for (const entry of entries) {
        // Look for BlogPosting, NewsArticle, Article types
        if (entry['@type'] && /Blog|Article|News/i.test(entry['@type'])) {
          items.push({
            title: entry.headline || entry.name || '',
            url: entry.url || entry.mainEntityOfPage || '',
            source: source.name,
            published: entry.datePublished || entry.dateCreated || new Date().toISOString(),
            summary: entry.description || entry.abstract || '',
            source_authority: source.authority,
          });
        }

        // ItemList with itemListElement (common for blog index pages)
        if (entry['@type'] === 'ItemList' && Array.isArray(entry.itemListElement)) {
          for (const el of entry.itemListElement) {
            const item = el.item || el;
            items.push({
              title: item.headline || item.name || '',
              url: item.url || '',
              source: source.name,
              published: item.datePublished || item.dateCreated || new Date().toISOString(),
              summary: item.description || '',
              source_authority: source.authority,
            });
          }
        }
      }
    } catch {
      // Malformed JSON-LD block — skip
    }
  }

  return items.filter((item) => item.title && item.url);
}

/** Known blog category labels to strip from extracted titles. */
const CATEGORY_LABELS = [
  'Announcements', 'Product', 'Research', 'Company', 'Policy', 'Safety',
  'Alignment', 'Engineering', 'Interpretability', 'AI Safety',
];

/** Date pattern: "Mon DD, YYYY" or "MonDD, YYYY" */
const DATE_PATTERN = /(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\s*\d{1,2},?\s*\d{4}/g;

/**
 * Clean a raw blog title extracted from HTML. Separates the actual title
 * from embedded date/category/summary text.
 * Returns { title, published, summary }.
 */
function cleanBlogTitle(rawText) {
  let text = rawText;

  // Extract date if present
  const dateMatch = text.match(DATE_PATTERN);
  let published = null;
  if (dateMatch) {
    try {
      published = new Date(dateMatch[0]).toISOString();
    } catch {
      // ignore invalid date
    }
    // Remove all date occurrences
    text = text.replace(DATE_PATTERN, '');
  }

  // Remove category labels (may be concatenated without space, e.g. "ProductTitle")
  for (const label of CATEGORY_LABELS) {
    text = text.replace(new RegExp(`^${label}`, 'i'), '');
    text = text.trim();
  }

  // Collapse whitespace
  text = text.replace(/\s+/g, ' ').trim();

  // Heuristic: if the remaining text has a sentence that looks like a description
  // (ends with period and is after the first sentence), split title from summary.
  // Common pattern: "Title TextDescription that follows."
  // Try splitting at the boundary where a lowercase letter is followed by an uppercase letter
  // after the title portion, or at the first period.
  let title = text;
  let summary = '';

  // Look for a natural break: a sentence ending with a period
  const periodIdx = text.indexOf('.');
  if (periodIdx > 20 && periodIdx < text.length - 5) {
    // Check if there's a reasonable title before the description
    // Try to find where title ends and description begins
    // Pattern: title text followed by a description starting with uppercase
    const segments = text.split(/(?<=\S)(?=[A-Z][a-z])/);
    if (segments.length >= 2) {
      // Find the likely title-description boundary
      // The title is usually shorter; look for the first segment break after ~20 chars
      let accumulated = '';
      let splitAt = -1;
      for (let i = 0; i < segments.length; i++) {
        accumulated += segments[i];
        if (accumulated.length >= 15 && i < segments.length - 1) {
          // Check if the next segment looks like a description start
          const next = segments[i + 1];
          if (next && /^[A-Z][a-z]/.test(next) && accumulated.length < 200) {
            splitAt = i;
            break;
          }
        }
      }
      if (splitAt >= 0) {
        title = segments.slice(0, splitAt + 1).join('').trim();
        summary = segments.slice(splitAt + 1).join('').trim();
      }
    }
  }

  return { title, published, summary };
}

/**
 * Fall back to regex-based link extraction from HTML.
 * Looks for <a> tags whose href matches the blog's path pattern.
 */
function extractFromLinks(html, source) {
  const items = [];
  const seen = new Set();

  // Match <a> tags with href and extract nearby text
  const linkRegex = /<a\s[^>]*href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi;
  let match;

  while ((match = linkRegex.exec(html)) !== null) {
    const href = match[1];
    const innerHtml = match[2];

    if (!source.pathPattern.test(href)) continue;

    const fullUrl = href.startsWith('http') ? href : `${source.baseUrl}${href}`;

    // Deduplicate by URL path
    const path = href.replace(/[?#].*$/, '');
    if (seen.has(path)) continue;
    seen.add(path);

    // Strip HTML tags and decode HTML entities to get title
    const rawText = decodeHtmlEntities(innerHtml.replace(/<[^>]+>/g, '')).trim();
    if (!rawText || rawText.length < 5) continue;

    // Clean up title: remove leading date patterns (e.g. "Mar 12, 2026") and
    // category labels (e.g. "Announcements", "Product", "Research")
    const { title, published: extractedDate, summary: extractedSummary } = cleanBlogTitle(rawText);
    if (!title || title.length < 5) continue;

    items.push({
      title,
      url: fullUrl,
      source: source.name,
      published: extractedDate || new Date().toISOString(),
      summary: extractedSummary,
      authority: source.authority,
    });
  }

  return items;
}

/**
 * Scrape a single blog source. Tries extraction strategies in order:
 * 1. __NEXT_DATA__ (Next.js sites)
 * 2. JSON-LD structured data
 * 3. Regex link extraction (fallback)
 */
async function scrapeBlog(source) {
  console.error(`[fetch-blogs] Scraping ${source.name} (${source.indexUrl})`);

  const html = await fetchPage(source.indexUrl);
  if (!html) return [];

  // Strategy 1: __NEXT_DATA__
  const nextItems = extractFromNextData(html, source);
  if (nextItems.length > 0) {
    console.error(`[fetch-blogs] ${source.name}: ${nextItems.length} items from __NEXT_DATA__`);
    return nextItems;
  }

  // Strategy 2: JSON-LD
  const jsonLdItems = extractFromJsonLd(html, source);
  if (jsonLdItems.length > 0) {
    console.error(`[fetch-blogs] ${source.name}: ${jsonLdItems.length} items from JSON-LD`);
    return jsonLdItems;
  }

  // Strategy 3: Link extraction fallback
  const linkItems = extractFromLinks(html, source);
  console.error(`[fetch-blogs] ${source.name}: ${linkItems.length} items from link extraction`);
  return linkItems;
}

/**
 * Scrape all blog sources. Errors in one blog do not affect others.
 */
async function fetchBlogs() {
  console.error('[fetch-blogs] Blog scraper for non-RSS sources');

  const results = await Promise.allSettled(
    BLOG_SOURCES.map((source) => scrapeBlog(source))
  );

  const items = [];
  for (const result of results) {
    if (result.status === 'fulfilled') {
      items.push(...result.value);
    } else {
      console.error(`[fetch-blogs] Source failed: ${result.reason?.message}`);
    }
  }

  console.error(`[fetch-blogs] Total: ${items.length} items from ${BLOG_SOURCES.length} blogs`);

  // 48h recency filter — same cutoff as RSS fetcher
  const cutoff = Date.now() - 48 * 60 * 60 * 1000;
  const fresh = items.filter(item => {
    const pub = new Date(item.published);
    return !isNaN(pub.getTime()) && pub.getTime() > cutoff;
  });
  console.error(`[fetch-blogs] Recency filter: ${items.length} → ${fresh.length} (48h cutoff)`);
  return fresh;
}

// CLI entry point
const args = process.argv.slice(2);
const outputIdx = args.indexOf('--output');
const outputFile = outputIdx !== -1 ? args[outputIdx + 1] : null;

const items = await fetchBlogs();
const output = JSON.stringify(items, null, 2);

if (outputFile) {
  writeFileSync(outputFile, output);
  console.error(`[fetch-blogs] Wrote ${items.length} items to ${outputFile}`);
} else {
  process.stdout.write(output);
}

export { fetchBlogs };
