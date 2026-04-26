const fs = require('fs');
const path = require('path');

const tpl = fs.readFileSync('skills/xhs-image-hero/templates/v3-cover.html', 'utf8');
const heroAbs = 'file:///C:/Users/AlexHuang/projects/news-card/output/2026-04-25_20-53-08/hero-image.png';

const ctHtml = [
  '      <div class="ct-line"><span class="ct-ink">Cook 卸任 </span><span class="ct-purple">Apple</span><span class="ct-ink"> 直面 </span><span class="kw kw-red ct-red">AI 大考</span></div>',
  '      <div class="ct-line"><span class="ct-blue">DeepSeek</span><span class="ct-ink"> V4 </span><span class="kw kw-gold ct-gold">追到闭源前沿</span></div>',
  '      <div class="ct-line"><span class="ct-purple">Anthropic</span><span class="ct-ink"> 拿 </span><span class="ct-blue">Google</span><span class="ct-ink"> </span><span class="kw kw-gold ct-gold">400 亿</span></div>',
].join('\n');

const out = tpl
  .replace('{{date_year}}', '2026')
  .replace('{{date_month}}', '04')
  .replace('{{date_day}}', '25')
  .replace('{{total}}', '24')
  .replace('{{sourceCount}}', '207')
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

const outPath = 'output/2026-04-25_20-53-08/slides/page-0-v3-cover.html';
fs.writeFileSync(outPath, out);
console.log('Wrote', outPath, 'length=', out.length);
