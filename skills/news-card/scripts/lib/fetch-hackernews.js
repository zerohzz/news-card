#!/usr/bin/env node

/**
 * Hacker News API fetcher.
 * Fetches top stories and filters for AI-related content.
 * Usage: node fetch-hackernews.js [--output file.json] [--limit 50]
 */

import { writeFileSync } from 'fs';
import { SOURCE_FAMILIES } from './pipeline-utils.js';

const HN_API = 'https://hacker-news.firebaseio.com/v0';

const AI_KEYWORDS = new Set([
  'ai', 'artificial intelligence', 'llm', 'gpt', 'claude', 'gemini',
  'machine learning', 'deep learning', 'neural network', 'transformer',
  'diffusion', 'rlhf', 'fine-tuning', 'fine tuning', 'agi', 'alignment',
  'openai', 'anthropic', 'deepmind', 'mistral', 'llama', 'open source model',
  'foundation model', 'reasoning', 'agent', 'rag', 'vector database',
  'embedding', 'multimodal', 'vision language', 'text-to-image',
  'text-to-video', 'robotics', 'ai regulation', 'ai safety', 'ai policy',
  'chatgpt', 'copilot', 'stable diffusion', 'midjourney', 'hugging face',
  'langchain', 'llamaindex', 'ollama', 'groq', 'perplexity',
]);

/**
 * Check if text contains AI-related keywords.
 */
function isAIRelated(text) {
  const lower = text.toLowerCase();
  for (const keyword of AI_KEYWORDS) {
    if (lower.includes(keyword)) return true;
  }
  return false;
}

/**
 * Fetch a single HN item by ID.
 */
async function fetchItem(id) {
  const resp = await fetch(`${HN_API}/item/${id}.json`);
  if (!resp.ok) return null;
  return resp.json();
}

/**
 * Fetch top HN stories, filter for AI content.
 */
async function fetchHackerNews(limit = 50) {
  try {
    const resp = await fetch(`${HN_API}/topstories.json`);
    if (!resp.ok) throw new Error(`HN API returned ${resp.status}`);
    const topIds = await resp.json();

    // Fetch top N stories in batches
    const ids = topIds.slice(0, Math.min(limit, 100));
    const batchSize = 20;
    const allItems = [];

    for (let i = 0; i < ids.length; i += batchSize) {
      const batch = ids.slice(i, i + batchSize);
      const items = await Promise.all(batch.map(fetchItem));
      allItems.push(...items.filter(Boolean));
    }

    // Filter for AI-related stories
    const aiStories = allItems
      .filter((item) => item.type === 'story' && item.title)
      .filter((item) => isAIRelated(item.title + ' ' + (item.text || '')))
      .map((item) => ({
        title: item.title,
        url: item.url || `https://news.ycombinator.com/item?id=${item.id}`,
        source: 'Hacker News',
        source_authority: 3,
        published: new Date(item.time * 1000).toISOString(),
        summary: item.text ? item.text.replace(/<[^>]*>/g, '').slice(0, 500) : '',
        fetch_strategy: 'metadata',
        source_family: SOURCE_FAMILIES.COMMUNITY_SIGNAL,
        source_collection: 'direct',
        community_metrics: {
          hn_points: item.score || 0,
          hn_comments: item.descendants || 0,
        },
      }));

    console.error(`[fetch-hn] Found ${aiStories.length} AI-related stories from ${allItems.length} top stories`);
    return aiStories;
  } catch (err) {
    console.error(`[fetch-hn] Failed: ${err.message}`);
    return [];
  }
}

const args = process.argv.slice(2);
const outputIdx = args.indexOf('--output');
const outputFile = outputIdx !== -1 ? args[outputIdx + 1] : null;
const limitIdx = args.indexOf('--limit');
const limit = limitIdx !== -1 ? parseInt(args[limitIdx + 1], 10) : 50;

const items = await fetchHackerNews(limit);
const output = JSON.stringify(items, null, 2);

if (outputFile) {
  writeFileSync(outputFile, output);
  console.error(`[fetch-hn] Wrote ${items.length} items to ${outputFile}`);
} else {
  process.stdout.write(output);
}

export { fetchHackerNews };
