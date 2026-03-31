#!/usr/bin/env node

/**
 * Fetches pre-built feed JSON files from the follow-builders GitHub repo.
 * Sources: X/Twitter AI builders, podcasts, and blogs.
 * Usage: node fetch-follow-builders.js --output <file.json>
 */

import { writeFileSync } from 'fs';
import { execSync } from 'child_process';
import { pathToFileURL } from 'url';
import { SOURCE_FAMILIES } from './pipeline-utils.js';

const FEED_X_URL = 'https://raw.githubusercontent.com/zarazhangrui/follow-builders/main/feed-x.json';
const FEED_PODCASTS_URL = 'https://raw.githubusercontent.com/zarazhangrui/follow-builders/main/feed-podcasts.json';
const FEED_BLOGS_URL = 'https://raw.githubusercontent.com/zarazhangrui/follow-builders/main/feed-blogs.json';

// X/Twitter source authority by tier.
// Official/company accounts are elevated to 4.
// Builder/practitioner accounts default to 3.
// Commentary/investor accounts are lowered to 2.
const X_AUTHORITY_TIERS = {
  claudeai: 4,
  sama: 4,
  openai: 4,
  anthropicai: 4,
  googleai: 4,
  deepmind: 4,
  demishassabis: 4,
  petergyang: 2,
  thenanyu: 2,
  madhuguru_: 2,
  garrytan: 2,
  mattturck: 2,
  zarazhang: 2,
};
const X_DEFAULT_AUTHORITY = 3;

const REQUEST_TIMEOUT_MS = 30000;
const MAX_RETRIES = 2;
const RETRY_BACKOFF_MS = 1000;
const PREFIX = '[fetch-fb]';

// --- CLI arg parsing ---

function parseArgs(argv) {
  const args = argv.slice(2);
  let output = null;
  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--output' && args[i + 1]) {
      output = args[i + 1];
      i++;
    }
  }
  return { output };
}

// --- Fetch helpers ---

async function fetchJsonOnce(url) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  try {
    const res = await fetch(url, {
      signal: controller.signal,
      headers: { 'User-Agent': 'Mozilla/5.0 NewsCard/1.0 (news aggregator)' },
    });
    if (!res.ok) {
      throw new Error(`HTTP ${res.status} ${res.statusText}`);
    }
    return await res.json();
  } finally {
    clearTimeout(timeout);
  }
}

function fetchJsonViaCurl(url) {
  console.error(`${PREFIX} Falling back to curl for ${url}`);
  const stdout = execSync(
    `curl -sS --max-time 30 -H "User-Agent: Mozilla/5.0 NewsCard/1.0" "${url}"`,
    { encoding: 'utf-8', timeout: 35000 },
  );
  return JSON.parse(stdout);
}

async function fetchJson(url) {
  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    try {
      return await fetchJsonOnce(url);
    } catch (err) {
      const isLastAttempt = attempt === MAX_RETRIES;
      const reason = err.name === 'AbortError' ? 'timeout' : err.message;
      console.error(`${PREFIX} fetch attempt ${attempt + 1}/${MAX_RETRIES + 1} failed for ${url}: ${reason}`);
      if (isLastAttempt) {
        return fetchJsonViaCurl(url);
      }
      await new Promise((r) => setTimeout(r, RETRY_BACKOFF_MS * (attempt + 1)));
    }
  }
}

// --- Converters ---

function truncate(text, maxLen) {
  if (!text) return '';
  if (text.length <= maxLen) return text;
  return text.slice(0, maxLen) + '...';
}

function convertTweet(builder, tweet) {
  const text = tweet.text || '';
  const handle = builder.handle?.replace(/^@/, '').toLowerCase() || '';
  return {
    title: truncate(text, 100),
    url: tweet.url || '',
    source: `X/@${builder.handle} (${builder.name})`,
    published: tweet.createdAt || '',
    summary: text,
    source_authority: X_AUTHORITY_TIERS[handle] ?? X_DEFAULT_AUTHORITY,
    source_family: SOURCE_FAMILIES.FOLLOW_BUILDERS_X,
    source_collection: 'follow-builders',
    fetch_strategy: 'metadata',
    requires_confirmation: true,
    community_metrics: {
      likes: tweet.likes || 0,
      comments: tweet.replies || 0,
      score: (tweet.likes || 0) + (tweet.retweets || 0) * 2,
    },
  };
}

function convertPodcast(episode) {
  return {
    title: episode.title || '',
    url: episode.url || '',
    source: `Podcast/${episode.name || 'Unknown'}`,
    published: episode.publishedAt || '',
    summary: truncate(episode.transcript || '', 500),
    source_authority: 4,
    source_family: SOURCE_FAMILIES.FOLLOW_BUILDERS_PODCAST,
    source_collection: 'follow-builders',
    fetch_strategy: 'summary',
    community_metrics: { likes: 0, comments: 0, score: 0 },
  };
}

function convertBlog(post) {
  return {
    title: post.title || '',
    url: post.url || '',
    source: `Blog/${post.name || 'Unknown'}`,
    published: post.publishedAt || '',
    summary: truncate(post.content || post.description || '', 500),
    source_authority: 5,
    source_family: SOURCE_FAMILIES.FOLLOW_BUILDERS_BLOG,
    source_collection: 'follow-builders',
    fetch_strategy: 'summary',
    community_metrics: { likes: 0, comments: 0, score: 0 },
  };
}

function convertFeeds({ x = [], podcasts = [], blogs = [] } = {}) {
  const candidates = [];
  let tweetCount = 0;
  let builderCount = x.length;
  let podcastCount = 0;
  let blogCount = 0;

  for (const builder of x) {
    const tweets = builder.tweets || [];
    for (const tweet of tweets) {
      candidates.push(convertTweet(builder, tweet));
      tweetCount++;
    }
  }

  for (const episode of podcasts) {
    candidates.push(convertPodcast(episode));
    podcastCount++;
  }

  for (const post of blogs) {
    candidates.push(convertBlog(post));
    blogCount++;
  }

  return {
    candidates,
    stats: {
      tweetCount,
      builderCount,
      podcastCount,
      blogCount,
    },
  };
}

// --- Main ---

async function main() {
  const { output } = parseArgs(process.argv);

  const [xResult, podcastResult, blogResult] = await Promise.allSettled([
    fetchJson(FEED_X_URL),
    fetchJson(FEED_PODCASTS_URL),
    fetchJson(FEED_BLOGS_URL),
  ]);

  const payload = {
    x: [],
    podcasts: [],
    blogs: [],
  };

  // Process X/Twitter feed
  if (xResult.status === 'fulfilled' && xResult.value) {
    payload.x = xResult.value.x || [];
  } else {
    const reason = xResult.status === 'rejected' ? xResult.reason?.message : 'empty';
    console.error(`${PREFIX} X feed failed: ${reason}`);
  }

  // Process podcasts feed
  if (podcastResult.status === 'fulfilled' && podcastResult.value) {
    payload.podcasts = podcastResult.value.podcasts || [];
  } else {
    const reason = podcastResult.status === 'rejected' ? podcastResult.reason?.message : 'empty';
    console.error(`${PREFIX} Podcasts feed failed: ${reason}`);
  }

  // Process blogs feed
  if (blogResult.status === 'fulfilled' && blogResult.value) {
    payload.blogs = blogResult.value.blogs || [];
  } else {
    const reason = blogResult.status === 'rejected' ? blogResult.reason?.message : 'empty';
    console.error(`${PREFIX} Blogs feed failed: ${reason}`);
  }

  const {
    candidates,
    stats: {
      tweetCount,
      builderCount,
      podcastCount,
      blogCount,
    },
  } = convertFeeds(payload);

  console.error(
    `${PREFIX} Fetched ${tweetCount} tweets from ${builderCount} builders, ${podcastCount} podcast episodes, ${blogCount} blog posts`
  );

  const json = JSON.stringify(candidates, null, 2);

  if (output) {
    writeFileSync(output, json);
    console.error(`${PREFIX} Wrote ${candidates.length} candidates to ${output}`);
  } else {
    process.stdout.write(json + '\n');
  }
}

const isDirectExecution = process.argv[1]
  && import.meta.url === pathToFileURL(process.argv[1]).href;

if (isDirectExecution) {
  main().catch((err) => {
    console.error(`${PREFIX} Fatal error: ${err.message}`);
    process.exit(1);
  });
}

export {
  X_AUTHORITY_TIERS,
  X_DEFAULT_AUTHORITY,
  convertTweet,
  convertPodcast,
  convertBlog,
  convertFeeds,
  main,
};
