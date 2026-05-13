#!/usr/bin/env node
/**
 * Render the V3 hero cover for a given timestamped output directory.
 *
 * Usage:
 *   node scripts/render-v3-cover.cjs <output-dir> [cover-title-file]
 *
 * <output-dir>        e.g. output/2026-05-12_20-30-15 — must contain hero-image.png
 * [cover-title-file]  optional HTML fragment with 3 .ct-line blocks.
 *                     Defaults to <output-dir>/cover-title.html if present.
 *
 * The output is written to <output-dir>/slides/page-0-v3-cover.html.
 */

const fs = require('fs');
const path = require('path');

const [outputDir, coverTitleFile] = process.argv.slice(2);
if (!outputDir) {
  console.error('Usage: node scripts/render-v3-cover.cjs <output-dir> [cover-title-file]');
  process.exit(1);
}

const repoRoot = path.resolve(__dirname, '..');
const templatePath = path.join(repoRoot, 'skills/xhs-image-hero/templates/v3-cover.html');
const assetBase = 'file:///' + path.join(repoRoot, 'skills/news-card/assets').split(path.sep).join('/');

const tpl = fs.readFileSync(templatePath, 'utf8');

const heroPng = path.resolve(outputDir, 'hero-image.png');
if (!fs.existsSync(heroPng)) {
  console.error(`hero-image.png not found at ${heroPng}`);
  process.exit(1);
}
const heroUrl = 'file:///' + heroPng.split(path.sep).join('/');

const titlePath = coverTitleFile
  ? path.resolve(coverTitleFile)
  : path.join(outputDir, 'cover-title.html');
let coverTitleHtml = '';
if (fs.existsSync(titlePath)) {
  coverTitleHtml = fs.readFileSync(titlePath, 'utf8');
} else {
  console.warn(`[render-v3-cover] No cover title fragment at ${titlePath}; leaving placeholder empty.`);
}

const today = new Date();
const vars = {
  assetBase,
  date_year: String(today.getFullYear()),
  date_month: String(today.getMonth() + 1).padStart(2, '0'),
  date_day: String(today.getDate()).padStart(2, '0'),
  total: '24',
  sourceCount: process.env.SOURCE_COUNT || '150',
  numSources: process.env.NUM_SOURCES || '65',
  readingMinutes: process.env.READING_MINUTES || '3',
  savedHours: process.env.SAVED_HOURS || '3',
  hero_image: heroUrl,
  cover_title_html: coverTitleHtml,
};

let out = tpl;
for (const [k, v] of Object.entries(vars)) {
  out = out.split('{{' + k + '}}').join(String(v));
}

const leftover = out.match(/\{\{[a-zA-Z_]+\}\}/g);
if (leftover) {
  console.error('Unresolved template variables:', leftover);
  process.exit(1);
}

const outPath = path.join(outputDir, 'slides', 'page-0-v3-cover.html');
fs.mkdirSync(path.dirname(outPath), { recursive: true });
fs.writeFileSync(outPath, out);
console.log(`Wrote ${outPath} (${out.length} bytes)`);
