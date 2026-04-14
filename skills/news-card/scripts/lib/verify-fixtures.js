#!/usr/bin/env node

import assert from 'assert/strict';
import { mkdtempSync, readFileSync, readdirSync, rmSync } from 'fs';
import { tmpdir } from 'os';
import { join, resolve } from 'path';
import { fileURLToPath } from 'url';
import { dedup } from './dedup.js';
import { convertFeeds } from './fetch-follow-builders.js';
import { CN_RSS_SOURCES, EN_RSS_SOURCES, isSponsored } from './fetch-newsletters.js';
import { renderAll } from './render-html.js';
import { splitCandidates } from './pipeline-utils.js';
import { scoreAll } from './score-engine.js';
import { extractEntities, entitiesMatch } from './entities.js';

const __dirname = fileURLToPath(new URL('.', import.meta.url));
const skillRoot = resolve(__dirname, '..', '..');
const fixturesDir = resolve(skillRoot, 'examples', 'fixtures');
const templatesDir = resolve(skillRoot, 'templates');
const sampleDigestPath = resolve(skillRoot, 'examples', 'sample-digest.json');

function loadJson(path) {
  return JSON.parse(readFileSync(path, 'utf-8'));
}

function verifyFollowBuildersConversion() {
  const raw = loadJson(join(fixturesDir, 'follow-builders-input.json'));
  const empty = loadJson(join(fixturesDir, 'follow-builders-empty.json'));

  const converted = convertFeeds(raw);
  assert.equal(converted.candidates.length, 4, 'expected 4 converted follow-builders candidates');

  const [tweetOfficial, tweetCommentary, podcast, blog] = converted.candidates;
  assert.equal(tweetOfficial.source_family, 'follow_builders_x');
  assert.equal(tweetOfficial.source_collection, 'follow-builders');
  assert.equal(tweetOfficial.source_authority, 4);

  assert.equal(tweetCommentary.source_family, 'follow_builders_x');
  assert.equal(tweetCommentary.source_authority, 2);

  assert.equal(podcast.source_family, 'follow_builders_podcast');
  assert.equal(podcast.source_collection, 'follow-builders');
  assert.equal(podcast.source_authority, 4);

  assert.equal(blog.source_family, 'follow_builders_blog');
  assert.equal(blog.source_collection, 'follow-builders');
  assert.equal(blog.source_authority, 5);

  const emptyConverted = convertFeeds(empty);
  assert.equal(emptyConverted.candidates.length, 0, 'empty follow-builders feeds should stay empty');
}

function verifyScoringAndSplit() {
  const candidates = loadJson(join(fixturesDir, 'scoring-candidates.json'));
  const newsletterSignals = loadJson(join(fixturesDir, 'newsletter-signals.json')).signals;
  const scored = scoreAll(candidates, newsletterSignals);

  const crossValidatedX = scored.find((item) => item.source === 'X/@OpenAI (OpenAI)');
  assert.ok(crossValidatedX, 'expected OpenAI X candidate to exist');
  assert.ok(crossValidatedX.scores.cross_validation > 0, 'follow_builders_x should participate in cross_validation');
  assert.ok((crossValidatedX.related_sources || []).length >= 2, 'cross-validated X item should carry related_sources');

  const xOnly = scored.find((item) => item.source === 'X/@AnthropicAI (Anthropic)');
  assert.ok(xOnly, 'expected Anthropic X-only candidate to exist');
  assert.equal(xOnly.scores.x_only, true, 'single-source X item should be marked x_only');
  assert.ok(xOnly.scores.total < 12, 'single-source X item should stay below tier-1 threshold');

  const { news, signals } = splitCandidates(scored);
  assert.ok(news.some((item) => item.source_family === 'follow_builders_blog'), 'follow_builders_blog should stay in news ranking');
  assert.ok(news.some((item) => item.source_family === 'follow_builders_podcast'), 'follow_builders_podcast should stay in news ranking');
  assert.ok(signals.some((item) => item.source_family === 'follow_builders_x'), 'follow_builders_x should stay in signal pool');
  assert.ok(signals.some((item) => item.source_family === 'community_signal'), 'Hacker News should be in signal pool');
  assert.ok(signals.some((item) => item.source_family === 'research_signal'), 'HuggingFace Papers should be in signal pool');

  const deduped = dedup(scored);
  const splitAfterDedup = splitCandidates(deduped);
  // Blog may be merged into a higher-authority duplicate during dedup — that's correct.
  // Verify an Agents SDK item survives dedup (blog or its merged winner).
  const survivingSDK = [...splitAfterDedup.news, ...splitAfterDedup.signals]
    .find((item) => item.title?.includes('Agents SDK'));
  assert.ok(survivingSDK, 'an Agents SDK item should survive dedup');
  assert.ok(splitAfterDedup.signals.some((item) => item.source === 'X/@AnthropicAI (Anthropic)'), 'dedup should preserve unique follow_builders_x signals');
}

function verifyPeerReviewConfig() {
  const requiredSponsorFilter = new Set(['Import AI', 'The Rundown AI', 'AlphaSignal']);
  for (const source of EN_RSS_SOURCES) {
    if (requiredSponsorFilter.has(source.name)) {
      assert.equal(source.filterSponsors, true, `${source.name} should enable sponsor filtering`);
    }
  }

  for (const source of CN_RSS_SOURCES) {
    assert.equal(source.filterSponsors, false, `${source.name} should keep sponsor filtering disabled`);
  }

  assert.equal(
    isSponsored('This section is brought to you by AssemblyAI', 'Partner content'),
    true,
    'sponsor filter should detect sponsored content'
  );
}

function verifyRenderContract() {
  const tempDir = mkdtempSync(join(tmpdir(), 'news-card-render-'));

  try {
    const pages = renderAll(sampleDigestPath, templatesDir, tempDir, 24, 65);
    assert.equal(pages.length, 10, 'render should output 10 HTML pages');

    const htmlFiles = readdirSync(tempDir).filter((file) => file.endsWith('.html')).sort();
    assert.equal(htmlFiles.length, 10, 'render output directory should contain 10 HTML files');

    const featureHtml = readFileSync(join(tempDir, 'page-2-top1.html'), 'utf-8');
    const briefs1Html = readFileSync(join(tempDir, 'page-8-briefs.html'), 'utf-8');
    const briefs2Html = readFileSync(join(tempDir, 'page-9-briefs.html'), 'utf-8');

    assert.ok(featureHtml.includes('/ 9'), 'feature page should show / 9 page count (hero cover excluded)');
    assert.ok(briefs1Html.includes('快讯速览'), 'page 8 should render the general briefs title');
    assert.ok(briefs2Html.includes('研究前沿'), 'page 9 should render the research briefs title');
    assert.ok(briefs1Html.includes('/ 9'), 'briefs page should show / 9 page count (hero cover excluded)');
  } finally {
    rmSync(tempDir, { recursive: true, force: true });
  }
}

function verifyPersonOrgResolution() {
  // Person names should resolve to their org
  const zuck = extractEntities('Mark Zuckerberg is building an AI clone');
  assert.ok(zuck.orgs.has('meta'), 'Zuckerberg should resolve to meta');

  const altman = extractEntities('Sam Altman announces new model');
  assert.ok(altman.orgs.has('openai'), 'Altman should resolve to openai');

  const musk = extractEntities('Elon Musk unveils Grok 3');
  assert.ok(musk.orgs.has('xai'), 'Musk should resolve to xai');
  assert.ok(musk.products.has('grok'), 'Grok should be a product');

  // Cross-validation: two articles about the same Zuckerberg/Meta event should match
  const entA = extractEntities('Meta creating AI version of Mark Zuckerberg so staff can talk to the boss');
  const entB = extractEntities('Mark Zuckerberg is reportedly building an AI clone to replace him in meetings');
  assert.ok(entA.orgs.has('meta'), 'Guardian title should have meta org');
  assert.ok(entB.orgs.has('meta'), 'Verge title should have meta org via person resolution');
  assert.ok(entitiesMatch(entA, entB, 0.1875), 'Zuckerberg pair should match with jaccard 0.1875');

  // Should NOT match unrelated articles just because they share a person-resolved org
  const unrelated = extractEntities('Apple launches new MacBook Pro with M4 chip');
  assert.ok(!entitiesMatch(entB, unrelated, 0.05), 'Unrelated articles should not match');

  console.log('  ✓ person-org resolution');
}

function main() {
  verifyFollowBuildersConversion();
  verifyScoringAndSplit();
  verifyPeerReviewConfig();
  verifyRenderContract();
  verifyPersonOrgResolution();
  console.log('verify-fixtures: OK');
}

main();
