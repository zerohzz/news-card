const fs = require('fs');
const path = require('path');

const tpl = fs.readFileSync('skills/xhs-image-hero/templates/v3-cover.html', 'utf8');

const coverTitle = `<div class="ct-line">
        <span class="ct-purple">Anthropic</span>
        <span class="ct-ink">桌面版</span>
        <span class="kw kw-red ct-red">私装扩展</span>
      </div>
      <div class="ct-line">
        <span class="ct-ink">机器人半马</span>
        <span class="kw kw-gold ct-gold">50分</span>
        <span class="ct-ink">破人类纪录</span>
      </div>
      <div class="ct-line">
        <span class="ct-red">Kimi K2.6</span>
        <span class="kw kw-green ct-green">开源追</span>
        <span class="ct-ink">GPT-5.4</span>
      </div>`;

const heroAbs = path.resolve('output/2026-04-21_20-53-06/hero-image.png');
const heroUrl = 'file:///' + heroAbs.split(path.sep).join('/');

const vars = {
  date_year: '2026',
  date_month: '04',
  date_day: '21',
  total: '24',
  sourceCount: '162',
  numSources: '65',
  readingMinutes: '3',
  savedHours: '3',
  hero_image: heroUrl,
  cover_title_html: coverTitle,
};

let out = tpl;
for (const [k, v] of Object.entries(vars)) {
  out = out.split('{{' + k + '}}').join(v);
}

const leftover = out.match(/\{\{[a-zA-Z_]+\}\}/g);
if (leftover) {
  console.error('ERROR unresolved:', leftover);
  process.exit(1);
}

const outPath = 'output/2026-04-21_20-53-06/slides/page-0-v3-cover.html';
fs.writeFileSync(outPath, out);
console.log('Wrote', outPath, '(' + out.length + ' bytes)');
