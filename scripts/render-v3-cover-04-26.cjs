const fs = require('fs');
const path = require('path');

const tpl = fs.readFileSync('skills/xhs-image-hero/templates/v3-cover.html', 'utf8');
const heroAbs = 'file:///C:/Users/AlexHuang/projects/news-card/output/2026-04-26_18-26-17/hero-image.png';

const ctHtml = [
  '      <div class="ct-line"><span class="ct-blue">GPT-5.5</span><span class="ct-ink"> 把 </span><span class="ct-blue">API</span><span class="ct-ink"> </span><span class="kw kw-red ct-red">价钱翻倍</span></div>',
  '      <div class="ct-line"><span class="ct-blue">Qwen3.6</span><span class="ct-ink"> 越级</span><span class="kw kw-blue ct-blue">吊打前代</span></div>',
  '      <div class="ct-line"><span class="ct-purple">Anthropic</span><span class="ct-ink"> 让 agent </span><span class="kw kw-gold ct-gold">彼此付钱</span></div>',
].join('\n');

const out = tpl
  .replace('{{date_year}}', '2026')
  .replace('{{date_month}}', '04')
  .replace('{{date_day}}', '26')
  .replace('{{total}}', '24')
  .replace('{{sourceCount}}', '148')
  .replace('{{numSources}}', '65')
  .replace('{{readingMinutes}}', '5')
  .replace('{{savedHours}}', '3')
  .replace('{{hero_image}}', heroAbs)
  .replace('{{cover_title_html}}', ctHtml);

if (out.includes('{{')) {
  const remaining = [...out.matchAll(/\{\{[^}]+\}\}/g)].map(m => m[0]);
  console.error('UNFILLED placeholders:', remaining);
  process.exit(1);
}

const outPath = 'output/2026-04-26_18-26-17/slides/page-0-v3-cover.html';
fs.writeFileSync(outPath, out);
console.log('Wrote', outPath, 'length=', out.length);
