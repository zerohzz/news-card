#!/usr/bin/env node

/**
 * RSS URL validation script.
 * Tests every RSS URL in the source list and reports status code + content-type.
 */

const RSS_SOURCES = [
  { name: 'OpenAI Blog', url: 'https://openai.com/blog/rss.xml' },
  { name: 'Anthropic Blog', url: 'https://www.anthropic.com/rss.xml' },
  { name: 'Google AI Blog', url: 'https://blog.google/technology/ai/rss/' },
  { name: 'DeepMind Blog', url: 'https://deepmind.google/blog/rss.xml' },
  { name: 'Meta AI Blog', url: 'https://ai.meta.com/blog/rss/' },
  { name: 'NVIDIA Blog', url: 'https://blogs.nvidia.com/feed/' },
  { name: 'Google Research Blog', url: 'https://blog.research.google/feeds/posts/default?alt=rss' },
  { name: 'MIT Technology Review', url: 'https://www.technologyreview.com/feed/' },
  { name: 'The Verge (AI)', url: 'https://www.theverge.com/rss/ai-artificial-intelligence/index.xml' },
  { name: 'TechCrunch (AI)', url: 'https://techcrunch.com/category/artificial-intelligence/feed/' },
  { name: 'Ars Technica', url: 'https://feeds.arstechnica.com/arstechnica/technology-lab' },
  { name: 'Wired (AI)', url: 'https://www.wired.com/feed/tag/ai/latest/rss' },
  { name: '404 Media', url: 'https://www.404media.co/rss/' },
  { name: 'The Batch', url: 'https://www.deeplearning.ai/the-batch/feed/' },
  { name: 'Import AI', url: 'https://importai.substack.com/feed' },
  { name: "Ben's Bites", url: 'https://bensbites.beehiiv.com/feed' },
  { name: 'Latent Space', url: 'https://www.latent.space/feed' },
  { name: 'Interconnects', url: 'https://www.interconnects.ai/feed' },
  { name: 'AI Snake Oil', url: 'https://aisnakeoil.substack.com/feed' },
  { name: 'One Useful Thing', url: 'https://www.oneusefulthing.org/feed' },
  { name: 'Ahead of AI', url: 'https://magazine.sebastianraschka.com/feed' },
  { name: 'Simon Willison', url: 'https://simonwillison.net/atom/everything/' },
];

async function testUrl(source) {
  try {
    const response = await fetch(source.url, {
      headers: { 'User-Agent': 'Mozilla/5.0 NewsCard/1.0' },
      signal: AbortSignal.timeout(10000),
      redirect: 'follow',
    });
    const contentType = response.headers.get('content-type') || 'unknown';
    const isXml = /xml|rss|atom/i.test(contentType);
    const status = response.ok && isXml ? 'OK' : 'FAIL';
    return {
      name: source.name,
      url: source.url,
      status,
      httpStatus: response.status,
      contentType,
    };
  } catch (err) {
    return {
      name: source.name,
      url: source.url,
      status: 'FAIL',
      httpStatus: 0,
      contentType: 'N/A',
      error: err.message,
    };
  }
}

const results = await Promise.all(RSS_SOURCES.map(testUrl));

console.log('\n=== RSS URL Audit Results ===\n');
console.log('Status | HTTP | Name | Content-Type | URL');
console.log('-------|------|------|-------------|----');

const ok = [];
const fail = [];

for (const r of results) {
  const line = `${r.status.padEnd(6)} | ${String(r.httpStatus).padEnd(4)} | ${r.name.padEnd(25)} | ${(r.contentType || '').slice(0, 40).padEnd(40)} | ${r.url}`;
  console.log(line);
  if (r.status === 'OK') {
    ok.push(r);
  } else {
    fail.push(r);
  }
}

console.log(`\n--- Summary ---`);
console.log(`OK:   ${ok.length}/${results.length}`);
console.log(`FAIL: ${fail.length}/${results.length}`);

if (fail.length > 0) {
  console.log('\nFailed sources:');
  for (const f of fail) {
    console.log(`  - ${f.name}: HTTP ${f.httpStatus} ${f.error || ''}`);
  }
}
