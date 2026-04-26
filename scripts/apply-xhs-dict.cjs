const fs = require('fs');

const inPath = process.argv[2] || 'output/2026-04-21_20-53-06/digest.json';
const outPath = process.argv[3] || 'output/2026-04-21_20-53-06/digest-xhs.json';

const d = JSON.parse(fs.readFileSync(inPath, 'utf8'));

const sub = (s) => {
  if (!s) return s;
  return s
    .replace(/数据中心/g, '数据设施')
    .replace(/安全/g, '防护')
    .replace(/融资/g, '获投')
    .replace(/估值/g, '身价')
    .replace(/硬件成本曲线/g, '硬件花费曲线')
    .replace(/推理成本/g, '推理花费')
    .replace(/成本/g, '花费')
    .replace(/基础设施/g, '底层架构')
    .replace(/评论者/g, '观察者')
    .replace(/被曝/g, '被披露')
    .replace(/年度最佳/g, '年度首选')
    .replace(/最有/g, '特别有')
    .replace(/最大/g, '头号')
    .replace(/(?<![一不头])最(?![新近后终初初])/g, '特别');
};

for (const it of d) {
  it.headline_zh = sub(it.headline_zh);
  it.summary_zh = sub(it.summary_zh);
  if (it.content_html) it.content_html = sub(it.content_html);
  if (it.highlight) it.highlight = sub(it.highlight);
}

fs.writeFileSync(outPath, JSON.stringify(d, null, 2));
console.log('Wrote', outPath);
