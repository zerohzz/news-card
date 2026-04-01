#!/usr/bin/env node
/**
 * validate-digest.js — Step 3.9 automated validation for digest.json
 *
 * Usage:
 *   node skills/news-card/scripts/validate-digest.js workspace/digest.json [--prev output/YYYY-MM-DD_HH-MM-SS/digest.json]
 *
 * If --prev is omitted, auto-detects the latest previous digest in output/.
 * Exit code 0 = all pass, 1 = violations found.
 */

import { readFileSync, readdirSync, existsSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const projectRoot = resolve(__dirname, '../../..');

// ── Config ──────────────────────────────────────────────────────────────
const LIMITS = Object.freeze({
  TOTAL_ITEMS: 24,
  TIER1_COUNT: 4,
  TIER2_COUNT: 4,
  TIER3_COUNT: 16,
  HEADLINE_ZH_MAX: 25,
  T3_SUMMARY_MIN: 60,
  T3_SUMMARY_MAX: 90,
  T1_HTML_MAX: 900,
  T1_TEXT_MIN: 400,
  DEDUP_T1_MAX: 1,
  DEDUP_T2_MAX: 2,
});

// ── Helpers ─────────────────────────────────────────────────────────────
function stripHtml(html) {
  return html
    .replace(/<[^>]*>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&gt;/g, '>')
    .replace(/&lt;/g, '<')
    .replace(/&amp;/g, '&');
}

function findLatestPrevDigest(currentPath) {
  const outputDir = resolve(projectRoot, 'output');
  if (!existsSync(outputDir)) return null;

  const currentDir = dirname(resolve(currentPath));
  const dirs = readdirSync(outputDir, { withFileTypes: true })
    .filter(d => d.isDirectory())
    .map(d => d.name)
    .sort()
    .reverse();

  for (const dir of dirs) {
    const candidate = resolve(outputDir, dir, 'digest.json');
    if (existsSync(candidate) && resolve(outputDir, dir) !== currentDir) {
      return candidate;
    }
  }
  return null;
}

// ── Validators ──────────────────────────────────────────────────────────
function validate(data, prevPath) {
  const errors = [];
  const warnings = [];

  // Total count
  if (data.length !== LIMITS.TOTAL_ITEMS) {
    errors.push(`TOTAL: expected ${LIMITS.TOTAL_ITEMS}, got ${data.length}`);
  }

  // Tier distribution
  const tiers = { 1: [], 2: [], 3: [] };
  for (const item of data) {
    (tiers[item.tier] || []).push(item);
  }
  if (tiers[1].length !== LIMITS.TIER1_COUNT) errors.push(`TIER1: expected ${LIMITS.TIER1_COUNT}, got ${tiers[1].length}`);
  if (tiers[2].length !== LIMITS.TIER2_COUNT) errors.push(`TIER2: expected ${LIMITS.TIER2_COUNT}, got ${tiers[2].length}`);
  if (tiers[3].length !== LIMITS.TIER3_COUNT) errors.push(`TIER3: expected ${LIMITS.TIER3_COUNT}, got ${tiers[3].length}`);

  // headline_zh ≤ 25
  for (const [i, item] of data.entries()) {
    const len = item.headline_zh.length;
    if (len > LIMITS.HEADLINE_ZH_MAX) {
      const over = len - LIMITS.HEADLINE_ZH_MAX;
      errors.push(`HEADLINE[${i}]: "${item.headline_zh}" = ${len} chars (+${over} over limit)`);
    } else if (len > LIMITS.HEADLINE_ZH_MAX - 3) {
      warnings.push(`HEADLINE[${i}]: "${item.headline_zh}" = ${len} chars (close to ${LIMITS.HEADLINE_ZH_MAX} limit)`);
    }
  }

  // tier-3 summary_zh 60–90
  for (const [i, item] of tiers[3].entries()) {
    const text = item.summary_zh.replace(/\n/g, '');
    const len = text.length;
    if (len < LIMITS.T3_SUMMARY_MIN) errors.push(`T3_SUMMARY[${i}]: "${item.headline_zh}" = ${len} chars (min ${LIMITS.T3_SUMMARY_MIN})`);
    if (len > LIMITS.T3_SUMMARY_MAX) errors.push(`T3_SUMMARY[${i}]: "${item.headline_zh}" = ${len} chars (max ${LIMITS.T3_SUMMARY_MAX}, +${len - LIMITS.T3_SUMMARY_MAX} over)`);
  }

  // tier-1 content_html
  for (const [i, item] of tiers[1].entries()) {
    if (!item.content_html) {
      errors.push(`T1_CONTENT[${i}]: "${item.headline_zh}" missing content_html`);
      continue;
    }
    const htmlLen = item.content_html.length;
    const textLen = stripHtml(item.content_html).length;
    const htmlRemaining = LIMITS.T1_HTML_MAX - htmlLen;
    const textOver = LIMITS.T1_TEXT_MIN - textLen;

    if (htmlLen > LIMITS.T1_HTML_MAX) errors.push(`T1_HTML[${i}]: "${item.headline_zh}" = ${htmlLen} chars (+${htmlLen - LIMITS.T1_HTML_MAX} over ${LIMITS.T1_HTML_MAX} limit)`);
    if (textLen < LIMITS.T1_TEXT_MIN) errors.push(`T1_TEXT[${i}]: "${item.headline_zh}" = ${textLen} chars (need ${textOver} more to reach ${LIMITS.T1_TEXT_MIN})`);

    console.log(`  T1[${i}] html=${htmlLen}/${LIMITS.T1_HTML_MAX} (${htmlRemaining >= 0 ? htmlRemaining + ' remaining' : Math.abs(htmlRemaining) + ' OVER'}) | text=${textLen}/${LIMITS.T1_TEXT_MIN}+ ${textLen >= LIMITS.T1_TEXT_MIN ? '✓' : '✗'}`);
  }

  // content_html should NOT exist for tier 2/3
  for (const item of [...tiers[2], ...tiers[3]]) {
    if (item.content_html) {
      errors.push(`NON_T1_CONTENT: "${item.headline_zh}" (tier ${item.tier}) should not have content_html`);
    }
  }

  // Cross-period dedup
  if (prevPath && existsSync(prevPath)) {
    const prev = JSON.parse(readFileSync(prevPath, 'utf8'));
    const prevT1urls = prev.filter(x => x.tier === 1).map(x => x.source_url);
    const prevT12urls = prev.filter(x => x.tier <= 2).map(x => x.source_url);

    const t1overlap = tiers[1].filter(x => prevT1urls.includes(x.source_url));
    const t2overlap = tiers[2].filter(x => prevT12urls.includes(x.source_url));

    if (t1overlap.length > LIMITS.DEDUP_T1_MAX) {
      errors.push(`DEDUP_T1: ${t1overlap.length} overlaps with prev T1 (max ${LIMITS.DEDUP_T1_MAX}): ${t1overlap.map(x => x.headline_zh).join(', ')}`);
    }
    if (t2overlap.length > LIMITS.DEDUP_T2_MAX) {
      errors.push(`DEDUP_T2: ${t2overlap.length} overlaps with prev T1+T2 (max ${LIMITS.DEDUP_T2_MAX}): ${t2overlap.map(x => x.headline_zh).join(', ')}`);
    }
    console.log(`  Dedup: T1 overlap=${t1overlap.length}/${LIMITS.DEDUP_T1_MAX}, T2 overlap=${t2overlap.length}/${LIMITS.DEDUP_T2_MAX}`);
  } else {
    warnings.push('DEDUP: no previous digest found, skipping cross-period dedup check');
  }

  // Smart quotes check
  const raw = readFileSync(resolve(process.argv[2]), 'utf8');
  if (raw.includes('\u201c') || raw.includes('\u201d')) {
    errors.push('QUOTES: found smart quotes (\u201c\u201d), must use corner brackets 「」');
  }

  return { errors, warnings };
}

// ── Main ────────────────────────────────────────────────────────────────
const digestPath = process.argv[2];
if (!digestPath) {
  console.error('Usage: node validate-digest.js <digest.json> [--prev <prev-digest.json>]');
  process.exit(1);
}

const prevIdx = process.argv.indexOf('--prev');
const prevPath = prevIdx !== -1
  ? process.argv[prevIdx + 1]
  : findLatestPrevDigest(digestPath);

const data = JSON.parse(readFileSync(digestPath, 'utf8'));

console.log(`\n📋 Validating ${digestPath} (${data.length} items)`);
if (prevPath) console.log(`  Previous digest: ${prevPath}`);
console.log();

const { errors, warnings } = validate(data, prevPath);

if (warnings.length > 0) {
  console.log(`\n⚠️  ${warnings.length} warning(s):`);
  for (const w of warnings) console.log(`  ⚠️  ${w}`);
}

if (errors.length === 0) {
  console.log('\n✅ ALL CHECKS PASSED\n');
  process.exit(0);
} else {
  console.log(`\n❌ ${errors.length} violation(s):`);
  for (const e of errors) console.log(`  ❌ ${e}`);
  console.log();
  process.exit(1);
}
