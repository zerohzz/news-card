#!/usr/bin/env node
/**
 * check-overflow.js — Step 5.5 rendered overflow check for T1 feature pages
 *
 * Uses Playwright to measure actual rendered content height vs footer position.
 * Catches overflow that character-count validators miss.
 *
 * Usage:
 *   node skills/news-card/scripts/check-overflow.js output/<timestamp>/slides
 *
 * Exit code 0 = all pass, 1 = overflow detected.
 */

import { chromium } from 'playwright';
import { readdirSync } from 'fs';
import { resolve } from 'path';

const slidesDir = process.argv[2];
if (!slidesDir) {
  console.error('Usage: node check-overflow.js <slides-dir>');
  process.exit(1);
}

const OVERFLOW_TOLERANCE = 10; // px — allow tiny rounding errors

const featurePages = readdirSync(slidesDir)
  .filter(f => /^page-[2-5]-top\d\.html$/.test(f))
  .sort();

if (featurePages.length === 0) {
  console.error('No feature pages (page-2 to page-5) found in', slidesDir);
  process.exit(1);
}

console.log(`\n📐 Checking rendered overflow for ${featurePages.length} feature pages\n`);

const browser = await chromium.launch();
const violations = [];

for (const file of featurePages) {
  const url = `file:///${resolve(slidesDir, file).replace(/\\/g, '/')}`;
  const page = await browser.newPage();
  await page.setViewportSize({ width: 1080, height: 1920 });
  await page.goto(url, { waitUntil: 'networkidle' });

  const metrics = await page.evaluate(() => {
    // Find all content elements (paragraphs, components)
    const contentEls = document.querySelectorAll(
      'p, .concept-map, .data-row, .numbered-grid, .chat-bubble, .timeline, ' +
      '.flowchart, .compare-grid, .progress-group, .pros-cons, .tag-cloud, ' +
      '.compare-table, .definition-list, .decision-tree, .cycle, .fishbone, ' +
      '.quadrant, .venn, .bubble-chart, .person-card, .callout, .formula-box, ' +
      '.badge-list, .checklist, .blockquote, .funnel, .gantt, .highlight, ' +
      'ul.key-points'
    );
    let lastContentBottom = 0;
    contentEls.forEach(el => {
      const b = el.getBoundingClientRect().bottom;
      if (b > lastContentBottom) lastContentBottom = b;
    });

    // Find footer
    const footerEl = document.querySelector('[class*="footer"]');
    const footerTop = footerEl ? footerEl.getBoundingClientRect().top : 1920;

    // Find source bar
    const srcBar = document.querySelector('[class*="source"]');
    const srcBarTop = srcBar ? srcBar.getBoundingClientRect().top : footerTop;

    return {
      lastContentBottom: Math.round(lastContentBottom),
      srcBarTop: Math.round(srcBarTop),
      footerTop: Math.round(footerTop),
    };
  });

  const overflow = metrics.lastContentBottom - metrics.srcBarTop;
  const status = overflow > OVERFLOW_TOLERANCE ? '❌ OVERFLOW' : '✅ OK';
  console.log(`  ${file}: content=${metrics.lastContentBottom}px, srcBar=${metrics.srcBarTop}px, footer=${metrics.footerTop}px → ${overflow > 0 ? '+' : ''}${overflow}px ${status}`);

  if (overflow > OVERFLOW_TOLERANCE) {
    violations.push({ file, overflow, ...metrics });
  }

  await page.close();
}

await browser.close();

if (violations.length > 0) {
  console.log(`\n❌ ${violations.length} page(s) have content overflow:`);
  for (const v of violations) {
    console.log(`  ${v.file}: content exceeds source bar by ${v.overflow}px — trim content_html or use a more compact component`);
  }
  console.log();
  process.exit(1);
} else {
  console.log('\n✅ ALL FEATURE PAGES FIT — no overflow detected\n');
  process.exit(0);
}
