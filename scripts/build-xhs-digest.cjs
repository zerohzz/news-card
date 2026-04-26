#!/usr/bin/env node
// Produce digest-xhs.json by applying sensitive-word replacements to digest.json.
// Scans headline_zh, summary_zh, highlight, content_html — skips category.

const fs = require('fs');
const path = require('path');

const [inPath, outPath] = process.argv.slice(2);
if (!inPath || !outPath) {
  console.error('Usage: node build-xhs-digest.cjs <digest.json> <digest-xhs.json>');
  process.exit(1);
}

// Replacements (ordered — more specific first)
const RULES = [
  // context-specific compound words first
  ['多智能体', '多 Agent'],
  ['数据中心', '数据设施'],
  ['网络安全', '网络防御'],
  ['AI 安全', 'AI 防护'],
  ['安全顾问', '防护顾问'],
  ['安全技术', '防御技术'],
  ['安全', '防护'],
  ['融资', '拿了'],
  ['黑客', '远程工'],
  ['基础设施', '底层架构'],
  ['新闻', '动态'],
];

function apply(text) {
  if (typeof text !== 'string') return text;
  let out = text;
  for (const [from, to] of RULES) {
    out = out.split(from).join(to);
  }
  return out;
}

const data = JSON.parse(fs.readFileSync(inPath, 'utf8'));
const result = data.map(item => {
  const copy = { ...item };
  const fields = ['headline_zh', 'summary_zh', 'highlight', 'content_html'];
  for (const f of fields) {
    if (copy[f]) copy[f] = apply(copy[f]);
  }
  return copy;
});

fs.writeFileSync(outPath, JSON.stringify(result, null, 2) + '\n');
console.log(`Wrote ${result.length} items to ${outPath}`);
