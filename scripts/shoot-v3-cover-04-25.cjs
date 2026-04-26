#!/usr/bin/env node
const { chromium } = require('playwright');
const path = require('path');

const TS = '2026-04-25_20-53-08';
const ROOT = path.resolve(__dirname, '..');
const HTML = path.join(ROOT, 'output', TS, 'slides/page-0-v3-cover.html');
const PNG = path.join(ROOT, 'output', TS, 'images/page-0-v3-cover.png');

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1080, height: 1920 }, deviceScaleFactor: 2 });
  await page.goto('file:///' + HTML.replace(/\\/g, '/'));
  await page.waitForLoadState('networkidle');

  const lineHeights = await page.evaluate(() =>
    Array.from(document.querySelectorAll('.ct-line')).map(el => ({
      text: el.innerText.replace(/\n/g, ' '),
      height: el.offsetHeight,
    }))
  );
  console.log('Line measurements:');
  let anyWrap = false;
  for (const { text, height } of lineHeights) {
    const ok = height <= 90;
    console.log(`  ${ok ? '✓' : '✗'} ${height}px — ${text}`);
    if (!ok) anyWrap = true;
  }

  await page.screenshot({ path: PNG, fullPage: false });
  console.log(`Saved: ${PNG}`);
  await browser.close();
  if (anyWrap) process.exit(1);
})();
