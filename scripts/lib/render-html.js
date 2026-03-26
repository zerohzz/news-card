#!/usr/bin/env node

/**
 * Render digest.json into HTML files using templates.
 * Usage: node render-html.js --input digest.json --templates ./templates --output ./html
 */

import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'fs';
import { resolve, join } from 'path';

// Category → color mapping (from design-tokens.md)
const CATEGORY_COLORS = {
  '模型发布': '#4A90D9',
  '产品应用': '#7B68EE',
  '安全对齐': '#E74C3C',
  '行业动态': '#F39C12',
  '开发工具': '#2ECC71',
  '研究前沿': '#1ABC9C',
  '开源生态': '#E67E22',
  '政策监管': '#95A5A6',
  '劳动力影响': '#8E44AD',
};

/**
 * Simple template engine: replace {{var}} and process {{#each}} / {{#if}} blocks.
 */
function renderTemplate(template, data) {
  let result = template;

  // Process {{#each collection}} ... {{/each}} blocks
  result = result.replace(
    /\{\{#each\s+(\w+)\}\}([\s\S]*?)\{\{\/each\}\}/g,
    (match, key, inner) => {
      const items = data[key] || [];
      return items
        .map((item, index) => {
          const itemData = { ...item, '@index': index };
          // Handle {{../var}} for parent context
          let rendered = inner.replace(/\{\{\.\.\/(\w+)\}\}/g, (m, parentKey) => {
            return item[parentKey] !== undefined ? item[parentKey] : data[parentKey] || '';
          });
          // Handle nested {{#each}} — one level deep
          rendered = rendered.replace(
            /\{\{#each\s+(\w+)\}\}([\s\S]*?)\{\{\/each\}\}/g,
            (m2, subKey, subInner) => {
              const subItems = itemData[subKey] || [];
              return subItems
                .map((subItem) => {
                  let subRendered = subInner;
                  // Parent of nested each
                  subRendered = subRendered.replace(/\{\{\.\.\/(\w+)\}\}/g, (m3, pk) => {
                    return itemData[pk] !== undefined ? itemData[pk] : '';
                  });
                  // Sub-item vars
                  subRendered = subRendered.replace(/\{\{(\w+)\}\}/g, (m3, sk) => {
                    return subItem[sk] !== undefined ? subItem[sk] : '';
                  });
                  return subRendered;
                })
                .join('');
            }
          );
          // Render item-level variables
          rendered = rendered.replace(/\{\{(\w+)\}\}/g, (m, k) => {
            return itemData[k] !== undefined ? itemData[k] : data[k] || '';
          });
          return rendered;
        })
        .join('');
    }
  );

  // Process {{#if var}} ... {{/if}} blocks
  result = result.replace(
    /\{\{#if\s+(\w+)\}\}([\s\S]*?)\{\{\/if\}\}/g,
    (match, key, inner) => {
      return data[key] ? inner : '';
    }
  );

  // Replace remaining {{var}} placeholders
  result = result.replace(/\{\{(\w+)\}\}/g, (match, key) => {
    return data[key] !== undefined ? data[key] : '';
  });

  return result;
}

/**
 * Group items by category for cover page.
 */
function groupByCategory(items) {
  const groups = {};
  for (const item of items) {
    const cat = item.category || '其他';
    if (!groups[cat]) {
      groups[cat] = {
        name: cat,
        color: item.color_tag || CATEGORY_COLORS[cat] || '#95A5A6',
        items: [],
      };
    }
    groups[cat].items.push(item);
  }
  return Object.values(groups);
}

/**
 * Render all pages from digest.json.
 */
function renderAll(digestPath, templatesDir, outputDir) {
  const digest = JSON.parse(readFileSync(digestPath, 'utf-8'));
  const items = Array.isArray(digest) ? digest : digest.items || digest.stories || [];

  if (items.length === 0) {
    console.error('[render] Error: No items in digest.json');
    process.exit(1);
  }

  mkdirSync(outputDir, { recursive: true });

  // Read templates
  const coverTpl = readFileSync(join(templatesDir, 'cover.html'), 'utf-8');
  const featureTpl = readFileSync(join(templatesDir, 'feature.html'), 'utf-8');
  const halfPageTpl = readFileSync(join(templatesDir, 'half-page.html'), 'utf-8');
  const briefsTpl = readFileSync(join(templatesDir, 'briefs.html'), 'utf-8');

  const today = new Date().toISOString().slice(0, 10);
  const issue = Math.floor(Date.now() / 86400000) % 10000;

  // Split by tier
  const tier1 = items.filter((i) => i.tier === 1).slice(0, 4);
  const tier2 = items.filter((i) => i.tier === 2).slice(0, 4);
  const tier3 = items.filter((i) => i.tier === 3).slice(0, 8);

  // Ensure color_tag is set
  for (const item of [...tier1, ...tier2, ...tier3]) {
    if (!item.color_tag) {
      item.color_tag = CATEGORY_COLORS[item.category] || '#95A5A6';
    }
  }

  const pages = [];

  // Page 0: Cover
  const allItems = [...tier1, ...tier2, ...tier3];
  const coverHTML = renderTemplate(coverTpl, {
    date: today,
    total: allItems.length,
    issue,
    categories: groupByCategory(allItems),
  });
  const coverPath = join(outputDir, 'page-0-cover.html');
  writeFileSync(coverPath, coverHTML);
  pages.push(coverPath);
  console.error(`[render] Page 0: Cover (${allItems.length} items)`);

  // Pages 1-4: Feature (tier 1)
  for (let i = 0; i < tier1.length; i++) {
    const item = tier1[i];
    const relatedStr = (item.related_sources || [])
      .map((s) => s.source)
      .join(', ');
    const html = renderTemplate(featureTpl, {
      ...item,
      page_num: i + 1,
      date: today,
      issue,
      related_sources: relatedStr,
    });
    const pagePath = join(outputDir, `page-${i + 1}-top${i + 1}.html`);
    writeFileSync(pagePath, html);
    pages.push(pagePath);
    console.error(`[render] Page ${i + 1}: Feature — ${item.headline_zh}`);
  }

  // Pages 5-6: Half-page (tier 2, 2 per page)
  for (let i = 0; i < 2; i++) {
    const stories = tier2.slice(i * 2, i * 2 + 2);
    if (stories.length === 0) break;
    const html = renderTemplate(halfPageTpl, {
      page_num: 5 + i,
      date: today,
      issue,
      stories,
    });
    const pagePath = join(outputDir, `page-${5 + i}-second.html`);
    writeFileSync(pagePath, html);
    pages.push(pagePath);
    console.error(`[render] Page ${5 + i}: Half-page (${stories.length} stories)`);
  }

  // Page 7: Briefs (tier 3)
  if (tier3.length > 0) {
    const html = renderTemplate(briefsTpl, {
      page_num: 7,
      date: today,
      issue,
      briefs: tier3,
    });
    const pagePath = join(outputDir, 'page-7-briefs.html');
    writeFileSync(pagePath, html);
    pages.push(pagePath);
    console.error(`[render] Page 7: Briefs (${tier3.length} items)`);
  }

  console.error(`[render] Generated ${pages.length} HTML files in ${outputDir}`);
  return pages;
}

// CLI entry point
const args = process.argv.slice(2);
const inputIdx = args.indexOf('--input');
const templatesIdx = args.indexOf('--templates');
const outputIdx = args.indexOf('--output');

if (inputIdx === -1 || templatesIdx === -1 || outputIdx === -1) {
  console.error('Usage: node render-html.js --input digest.json --templates ./templates --output ./html');
  process.exit(1);
}

const digestPath = resolve(args[inputIdx + 1]);
const templatesDir = resolve(args[templatesIdx + 1]);
const outputDir = resolve(args[outputIdx + 1]);

renderAll(digestPath, templatesDir, outputDir);

export { renderAll, renderTemplate, CATEGORY_COLORS };
