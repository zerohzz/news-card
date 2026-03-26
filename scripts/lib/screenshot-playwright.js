#!/usr/bin/env node

/**
 * Playwright screenshot engine.
 * Takes HTML files and produces PNG screenshots at 1080×1920 @2x.
 *
 * Usage: node screenshot-playwright.js --input ./html --output ./png
 */

import { chromium } from 'playwright';
import { readdirSync, mkdirSync } from 'fs';
import { resolve, join, basename } from 'path';

// Hardcoded — do not override
const VIEWPORT_WIDTH = 1080;
const VIEWPORT_HEIGHT = 1920;
const DEVICE_SCALE_FACTOR = 2;

/**
 * Screenshot all HTML files in a directory.
 */
async function screenshotAll(inputDir, outputDir) {
  mkdirSync(outputDir, { recursive: true });

  const htmlFiles = readdirSync(inputDir)
    .filter((f) => f.endsWith('.html'))
    .sort();

  if (htmlFiles.length === 0) {
    console.error('[screenshot] No HTML files found in', inputDir);
    process.exit(1);
  }

  console.error(`[screenshot] Found ${htmlFiles.length} HTML files`);
  console.error(`[screenshot] Viewport: ${VIEWPORT_WIDTH}×${VIEWPORT_HEIGHT} @${DEVICE_SCALE_FACTOR}x`);

  const browser = await chromium.launch({
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });

  const context = await browser.newContext({
    viewport: { width: VIEWPORT_WIDTH, height: VIEWPORT_HEIGHT },
    deviceScaleFactor: DEVICE_SCALE_FACTOR,
  });

  const results = [];

  for (const htmlFile of htmlFiles) {
    const inputPath = resolve(join(inputDir, htmlFile));
    const pngName = htmlFile.replace('.html', '.png');
    const outputPath = join(outputDir, pngName);

    try {
      const page = await context.newPage();

      // Load HTML file
      await page.goto(`file://${inputPath}`, {
        waitUntil: 'networkidle',
        timeout: 30000,
      });

      // Wait for fonts to load
      await page.evaluate(() => document.fonts.ready);

      // Small extra wait for rendering
      await page.waitForTimeout(500);

      // Take screenshot
      await page.screenshot({
        path: outputPath,
        clip: {
          x: 0,
          y: 0,
          width: VIEWPORT_WIDTH,
          height: VIEWPORT_HEIGHT,
        },
      });

      await page.close();
      results.push(outputPath);
      console.error(`[screenshot] ✅ ${htmlFile} → ${pngName}`);
    } catch (err) {
      console.error(`[screenshot] ❌ ${htmlFile}: ${err.message}`);
    }
  }

  await browser.close();

  console.error(`[screenshot] Done: ${results.length}/${htmlFiles.length} screenshots`);
  return results;
}

// CLI entry point
const args = process.argv.slice(2);
const inputIdx = args.indexOf('--input');
const outputIdx = args.indexOf('--output');

if (inputIdx === -1 || outputIdx === -1) {
  console.error('Usage: node screenshot-playwright.js --input ./html --output ./png');
  process.exit(1);
}

const inputDir = resolve(args[inputIdx + 1]);
const outputDir = resolve(args[outputIdx + 1]);

await screenshotAll(inputDir, outputDir);

export { screenshotAll };
