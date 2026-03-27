#!/usr/bin/env node

/**
 * Fetches pre-built feed JSON files from the follow-builders GitHub repo.
 * Sources: X/Twitter AI builders, podcasts, and blogs.
 * Usage: node fetch-follow-builders.js --output <file.json>
 */

import { writeFileSync } from 'fs';

const FEED_X_URL = 'https://raw.githubusercontent.com/zarazhangrui/follow-builders/main/feed-x.json';
const FEED_PODCASTS_URL = 'https://raw.githubusercontent.com/zarazhangrui/follow-builders/main/feed-podcasts.json';
const FEED_BLOGS_URL = 'https://raw.githubusercontent.com/zarazhangrui/follow-builders/main/feed-blogs.json';

// X/Twitter source authority by tier (sources-spec.md v2)
const X_AUTHORITY_TIERS = {
  'claudeai': 3, 'sama': 3, 'OpenAI': 3, 'AnthropicAI': 3, 'GoogleAI': 3,
  'petergyang': 1, 'thenanyu': 1, 'madhuguru_': 1, 'garrytan': 1, 'mattturck': 1, 'zarazhang': 1,
};
const X_DEFAULT_AUTHORITY = 2;

const REQUEST_TIMEOUT_MS = 30000;
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

async function fetchJson(url) {
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

// --- Converters ---

function truncate(text, maxLen) {
  if (!text) return '';
  if (text.length <= maxLen) return text;
  return text.slice(0, maxLen) + '...';
}

function convertTweet(builder, tweet) {
  const text = tweet.text || '';
  return {
    title: truncate(text, 100),
    url: tweet.url || '',
    source: `X/@${builder.handle} (${builder.name})`,
    published: tweet.createdAt || '',
    summary: text,
    authority: X_AUTHORITY_TIERS[builder.handle?.replace(/^@/, '')] ?? X_DEFAULT_AUTHORITY,
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
    authority: 4,
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
    authority: 5,
    community_metrics: { likes: 0, comments: 0, score: 0 },
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

  const candidates = [];
  let tweetCount = 0;
  let builderCount = 0;
  let podcastCount = 0;
  let blogCount = 0;

  // Process X/Twitter feed
  if (xResult.status === 'fulfilled' && xResult.value) {
    const builders = xResult.value.x || [];
    builderCount = builders.length;
    for (const builder of builders) {
      const tweets = builder.tweets || [];
      for (const tweet of tweets) {
        candidates.push(convertTweet(builder, tweet));
        tweetCount++;
      }
    }
  } else {
    const reason = xResult.status === 'rejected' ? xResult.reason?.message : 'empty';
    console.error(`${PREFIX} X feed failed: ${reason}`);
  }

  // Process podcasts feed
  if (podcastResult.status === 'fulfilled' && podcastResult.value) {
    const episodes = podcastResult.value.podcasts || [];
    for (const episode of episodes) {
      candidates.push(convertPodcast(episode));
      podcastCount++;
    }
  } else {
    const reason = podcastResult.status === 'rejected' ? podcastResult.reason?.message : 'empty';
    console.error(`${PREFIX} Podcasts feed failed: ${reason}`);
  }

  // Process blogs feed
  if (blogResult.status === 'fulfilled' && blogResult.value) {
    const posts = blogResult.value.blogs || [];
    for (const post of posts) {
      candidates.push(convertBlog(post));
      blogCount++;
    }
  } else {
    const reason = blogResult.status === 'rejected' ? blogResult.reason?.message : 'empty';
    console.error(`${PREFIX} Blogs feed failed: ${reason}`);
  }

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

main().catch((err) => {
  console.error(`${PREFIX} Fatal error: ${err.message}`);
  process.exit(1);
});
