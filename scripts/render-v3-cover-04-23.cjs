#!/usr/bin/env node
// Render V3 cover for 2026-04-23: substitute all {{...}} placeholders.

const fs = require('fs');
const path = require('path');

const TS = '2026-04-23_20-41-36';
const ROOT = path.resolve(__dirname, '..');
const TEMPLATE = path.join(ROOT, 'skills/xhs-image-hero/templates/v3-cover.html');
const OUT_HTML = path.join(ROOT, 'output', TS, 'slides/page-0-v3-cover.html');
const HERO_IMG = path.join(ROOT, 'output', TS, 'hero-image.png').replace(/\\/g, '/');

const candidates = require(path.join(ROOT, 'workspace/candidates.json'));

const coverTitleHtml = `<div class="ct-line">
  <span class="ct-purple">OpenAI</span><span class="ct-ink">让</span><span class="ct-purple">ChatGPT</span><span class="ct-ink">变</span><span class="kw kw-accent ct-accent">工作台</span>
</div>
<div class="ct-line">
  <span class="ct-green">Claude</span><span class="ct-ink">桌面</span><span class="kw kw-red ct-red">反超 Cursor</span>
</div>
<div class="ct-line">
  <span class="ct-blue">Qwen3.6 27B</span><span class="ct-ink">追上</span><span class="kw kw-gold ct-gold">旗舰编码榜</span>
</div>`;

const vars = {
  date_year: '2026',
  date_month: '04',
  date_day: '23',
  total: 24,
  sourceCount: candidates.length,
  numSources: 65,
  readingMinutes: 5,
  savedHours: 3,
  hero_image: `file:///${HERO_IMG}`,
  cover_title_html: coverTitleHtml,
};

let html = fs.readFileSync(TEMPLATE, 'utf8');
for (const [key, val] of Object.entries(vars)) {
  html = html.split(`{{${key}}}`).join(String(val));
}

// Sanity check: no {{...}} left
const leftover = html.match(/\{\{[^}]+\}\}/g);
if (leftover) {
  console.error('ERROR: leftover placeholders:', leftover);
  process.exit(1);
}

fs.writeFileSync(OUT_HTML, html);
console.log(`Rendered V3 cover → ${OUT_HTML}`);
console.log(`sourceCount = ${vars.sourceCount}`);
