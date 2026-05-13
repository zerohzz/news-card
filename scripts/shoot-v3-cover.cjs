#!/usr/bin/env node
/**
 * Screenshot the V3 hero cover at 1080×1920 @2x.
 *
 * Usage:
 *   node scripts/shoot-v3-cover.cjs <output-dir>
 *
 * Reads  <output-dir>/slides/page-0-v3-cover.html
 * Writes <output-dir>/images/page-0-v3-cover.png
 * Exits non-zero if any title line wraps (rendered height > 83px).
 */

const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');

const [outputDir] = process.argv.slice(2);
if (!outputDir) {
  console.error('Usage: node scripts/shoot-v3-cover.cjs <output-dir>');
  process.exit(1);
}

const htmlPath = path.resolve(outputDir, 'slides', 'page-0-v3-cover.html');
const screenshotPath = path.resolve(outputDir, 'images', 'page-0-v3-cover.png');

if (!fs.existsSync(htmlPath)) {
  console.error(`HTML not found at ${htmlPath}`);
  process.exit(1);
}
fs.mkdirSync(path.dirname(screenshotPath), { recursive: true });

(async () => {
  const browser = await chromium.launch();
  const context = await browser.newContext({
    viewport: { width: 1080, height: 1920 },
    deviceScaleFactor: 2,
  });
  const page = await context.newPage();
  await page.goto('file:///' + htmlPath.split(path.sep).join('/'));
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(500);

  const lineHeights = await page.evaluate(() =>
    Array.from(document.querySelectorAll('.ct-line')).map((el) => el.offsetHeight)
  );
  console.log('ct-line heights:', lineHeights);

  await page.screenshot({ path: screenshotPath, fullPage: false });
  console.log('Saved', screenshotPath);
  await browser.close();

  const wrapped = lineHeights.some((h) => h > 83);
  if (wrapped) {
    console.error('LINE WRAP DETECTED — shorten title lines or adjust font size.');
    process.exit(1);
  }
})();
