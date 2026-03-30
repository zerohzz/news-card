#!/usr/bin/env node
/**
 * Newsletter signal fetcher for peer-review scoring.
 * Fetches editorial picks from top AI/tech newsletters (EN + CN).
 * Output: newsletter-signals.json (used by score-engine.js)
 */

import { writeFileSync } from 'fs';
import { parseArgs } from 'util';
import { pathToFileURL } from 'url';
import RssParser from 'rss-parser';
import { SOURCE_FAMILIES } from './pipeline-utils.js';

// ─── English newsletter sources ──────────────────────────────────────────────
const EN_RSS_SOURCES = [
  {
    name: 'Import AI',
    url: 'https://importai.substack.com/feed',
    authority: 4,
    filterSponsors: true,
  },
  {
    name: 'The Rundown AI',
    url: 'https://rss.beehiiv.com/feeds/2R3C6Bt5wj.xml',
    authority: 4,
    filterSponsors: true,
  },
  {
    name: 'AlphaSignal',
    url: 'https://alphasignalai.substack.com/feed',
    authority: 4,
    filterSponsors: true,
  },
  {
    name: 'AI Supremacy',
    url: 'https://aisupremacy.substack.com/feed',
    authority: 3,
    filterSponsors: false,
  },
];

// ─── Chinese tech media sources ──────────────────────────────────────────────
const CN_RSS_SOURCES = [
  {
    name: '雷峰网',
    url: 'https://www.leiphone.com/feed',
    authority: 4,
    filterSponsors: false,
    lang: 'zh',
  },
  {
    name: '36氪',
    url: 'https://36kr.com/feed',
    authority: 3,
    filterSponsors: false,
    lang: 'zh',
  },
  {
    name: '钛媒体',
    url: 'https://www.tmtpost.com/feed',
    authority: 3,
    filterSponsors: false,
    lang: 'zh',
  },
  {
    name: '爱范儿',
    url: 'https://www.ifanr.com/feed',
    authority: 3,
    filterSponsors: false,
    lang: 'zh',
  },
  {
    name: 'IT之家',
    url: 'https://www.ithome.com/feed',
    authority: 2,
    filterSponsors: false,
    lang: 'zh',
  },
];

const ALL_RSS_SOURCES = [...EN_RSS_SOURCES, ...CN_RSS_SOURCES];

const TLDR_ARCHIVE_URL = 'https://tldr.tech/ai/archives';

// ─── AI keyword filter for Chinese sources ───────────────────────────────────
const CN_AI_KEYWORDS = /AI|人工智能|大模型|LLM|GPT|Claude|Gemini|Llama|智能体|Agent|机器人|自动驾驶|OpenAI|Anthropic|DeepMind|英伟达|NVIDIA|芯片|算力|Token|模型|深度学习|神经网络|Sora|Copilot|RAG|向量|AGI/i;

function isCnAiRelated(title) {
  return CN_AI_KEYWORDS.test(title);
}

// ─── Sponsor filtering ───────────────────────────────────────────────────────
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

// ─── CN→EN entity mapping for cross-language matching ────────────────────────
const CN_ENTITY_MAP = [
  ['谷歌', 'google'], ['Google', 'google'],
  ['苹果', 'apple'], ['Apple', 'apple'],
  ['英伟达', 'nvidia'], ['NVIDIA', 'nvidia'],
  ['微软', 'microsoft'], ['Microsoft', 'microsoft'],
  ['Meta', 'meta'],
  ['OpenAI', 'openai'],
  ['Anthropic', 'anthropic'],
  ['Claude', 'claude'],
  ['GPT', 'gpt'],
  ['Gemini', 'gemini'],
  ['特斯拉', 'tesla'],
  ['字节跳动', 'bytedance'], ['ByteDance', 'bytedance'],
  ['百度', 'baidu'],
  ['阿里', 'alibaba'],
  ['腾讯', 'tencent'],
  ['华为', 'huawei'],
  ['小米', 'xiaomi'],
  ['DeepSeek', 'deepseek'],
  ['Llama', 'llama'],
  ['Sora', 'sora'],
  ['Copilot', 'copilot'],
  ['Mistral', 'mistral'],
  ['HuggingFace', 'huggingface'],
  ['Cursor', 'cursor'],
];

/**
 * Extract entity tags from a Chinese title for cross-language peer review matching.
 * Returns array of lowercase English entity names found in the title.
 */
function extractCnEntities(title) {
  const entities = [];
  for (const [pattern, canonical] of CN_ENTITY_MAP) {
    if (title.includes(pattern)) {
      entities.push(canonical);
    }
  }
  return [...new Set(entities)];
}

// ─── RSS fetcher ─────────────────────────────────────────────────────────────
async function fetchRSS(source) {
  const parser = new RssParser({
    timeout: 15000,
    headers: { 'User-Agent': 'Mozilla/5.0 (compatible; NewsCardBot/1.0)' },
  });
  try {
    const feed = await parser.parseURL(source.url);
    let items = (feed.items || []).map(item => ({
      title: (item.title || '').trim(),
      url: (item.link || '').trim(),
      published: item.pubDate || item.isoDate || '',
      _content: item['content:encoded'] || item.contentSnippet || '',
    }));

    // Filter sponsors
    const beforeFilter = items.length;
    if (source.filterSponsors) {
      items = items.filter(item => !isSponsored(item.title, item._content));
    }
    const filtered = beforeFilter - items.length;

    // Filter Chinese sources to AI-related only
    if (source.lang === 'zh') {
      const beforeAi = items.length;
      items = items.filter(item => isCnAiRelated(item.title));
      const aiFiltered = beforeAi - items.length;
      if (aiFiltered > 0) {
        console.error(`[fetch-nl] ${source.name}: filtered ${aiFiltered} non-AI items`);
      }
    }

    // Extract CN entities and remove internal _content field
    items = items.map(({ _content, ...rest }) => ({
      ...rest,
      source_family: SOURCE_FAMILIES.NEWSLETTER_SIGNAL,
      source_collection: 'editorial-consensus',
      ...(source.lang === 'zh' ? { cn_entities: extractCnEntities(rest.title) } : {}),
    }));

    console.error(`[fetch-nl] ${source.name}: ${items.length} items${filtered > 0 ? ` (${filtered} sponsors filtered)` : ''}`);
    return { newsletter: source.name, authority: source.authority, items, lang: source.lang || 'en' };
  } catch (err) {
    console.error(`[fetch-nl] ${source.name}: FAILED — ${err.message}`);
    return { newsletter: source.name, authority: source.authority, items: [], lang: source.lang || 'en' };
  }
}

// ─── TLDR AI archive scraper ─────────────────────────────────────────────────
async function fetchTLDR() {
  try {
    const res = await fetch(TLDR_ARCHIVE_URL, { signal: AbortSignal.timeout(15000) });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const html = await res.text();

    const titlePattern = /(?:>|")([^<"]*?(?:⚡|🧩|👮|🤖|🛒|👨‍💻|🚀|💡|🔬|📱|💰|🏢|⚖️|🔒|📊|🎯|🌐|🧠|📝|🎨|🔧|📈|🤝|⚠️|🏗️|🎮|📸|🎬)[^<"]*)/g;
    const keywords = [];
    let match;
    let issueCount = 0;

    while ((match = titlePattern.exec(html)) !== null && issueCount < 5) {
      const title = match[1].trim();
      if (title.length < 10 || title.length > 200) continue;

      const topics = title.split(/[,，]/).map(t => t.replace(/[\p{Emoji_Presentation}\p{Extended_Pictographic}]/gu, '').trim()).filter(t => t.length > 3);
      keywords.push(...topics);
      issueCount++;
    }

    const uniqueKeywords = [...new Set(keywords)];
    const items = uniqueKeywords.map(kw => ({ title: kw, url: '', published: '' }));

    console.error(`[fetch-nl] TLDR AI: ${items.length} keywords from ${issueCount} issues`);
    return { newsletter: 'TLDR AI', authority: 5, items, lang: 'en' };
  } catch (err) {
    console.error(`[fetch-nl] TLDR AI: FAILED — ${err.message}`);
    return { newsletter: 'TLDR AI', authority: 5, items: [], lang: 'en' };
  }
}

// ─── Main ────────────────────────────────────────────────────────────────────
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
    ...ALL_RSS_SOURCES.map(fetchRSS),
    fetchTLDR(),
  ]);

  const output = {
    fetchedAt: new Date().toISOString(),
    signals: results,
  };

  writeFileSync(outputPath, JSON.stringify(output, null, 2));
  const totalItems = results.reduce((sum, r) => sum + r.items.length, 0);
  const enCount = results.filter(r => r.lang === 'en').reduce((s, r) => s + r.items.length, 0);
  const cnCount = results.filter(r => r.lang === 'zh').reduce((s, r) => s + r.items.length, 0);
  console.error(`[fetch-nl] Wrote ${totalItems} signals (${enCount} EN + ${cnCount} CN) from ${results.length} newsletters to ${outputPath}`);
}

const isDirectExecution = process.argv[1]
  && import.meta.url === pathToFileURL(process.argv[1]).href;

if (isDirectExecution) {
  main().catch(err => {
    console.error(`[fetch-nl] Fatal: ${err.message}`);
    process.exit(1);
  });
}

export {
  EN_RSS_SOURCES,
  CN_RSS_SOURCES,
  fetchRSS,
  fetchTLDR,
  isSponsored,
  main,
};
