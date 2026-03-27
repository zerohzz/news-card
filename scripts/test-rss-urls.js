#!/usr/bin/env node

/**
 * RSS URL validation script.
 * Tests every RSS URL in the source list and reports status code + content-type.
 */

import { RSS_SOURCES } from './skills/news-card/scripts/lib/fetch-rss.js';

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
